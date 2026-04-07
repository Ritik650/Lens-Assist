import asyncio
import json
from typing import Optional, AsyncGenerator
import anthropic
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

MODEL = "claude-sonnet-4-5"


async def analyze_image(
    image_base64: str,
    media_type: str,
    user_profile: dict,
    scan_mode: str = "auto",
    pet_info: Optional[dict] = None,
    vehicle_info: Optional[dict] = None,
    scan_history: Optional[list] = None,
    family_members: Optional[list] = None,
) -> dict:
    system_prompt = _build_system_prompt(user_profile, scan_mode, pet_info, vehicle_info, scan_history, family_members)
    user_prompt = _build_user_prompt(scan_mode)

    def _call():
        return client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": user_prompt},
                    ],
                }
            ],
        )

    message = await asyncio.to_thread(_call)
    response_text = message.content[0].text
    cleaned = response_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return json.loads(cleaned.strip())


async def stream_summary(scan_result: dict, user_profile: dict) -> AsyncGenerator[str, None]:
    """Stream a human-readable summary of a scan result using Claude."""
    r = scan_result
    product = r.get("product_name") or r.get("detected_type", "scanned item")
    alerts = []
    if r.get("allergen_warnings"):
        allergens = [w["allergen"] for w in r["allergen_warnings"]]
        alerts.append(f"ALLERGEN ALERT: Contains {', '.join(allergens)}")
    if r.get("safety_info", {}).get("is_expired"):
        alerts.append(f"EXPIRED: {r['safety_info'].get('expiry_date', 'date unknown')}")
    if r.get("drug_info", {}) and r["drug_info"].get("interactions_with_user_meds"):
        alerts.append(f"DRUG INTERACTION WARNING with {', '.join(m['medication'] for m in r['drug_info']['interactions_with_user_meds'])}")

    lang = user_profile.get("preferred_lang", "en")
    prompt = f"""You are LensAssist's AI assistant. Give a friendly, conversational summary of this scan result for the user.

Scan result: {json.dumps(r, indent=2)}

User profile: Name={user_profile.get('name', 'User')}, Allergies={user_profile.get('allergies', [])}, Conditions={user_profile.get('conditions', [])}

ALERTS: {'; '.join(alerts) if alerts else 'None'}

Instructions:
- Start with what was scanned and whether it's safe for THIS specific user
- Highlight any alerts FIRST in bold (use **text** for emphasis)
- Give 2-3 key insights relevant to the user's profile
- End with a one-sentence action recommendation
- Use a friendly, direct tone like a knowledgeable friend
- Keep it under 200 words
- Respond in language code: {lang}"""

    def _stream_call():
        with client.messages.stream(
            model=MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    # Run the sync streaming generator in a thread, yield chunks
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def _producer():
        try:
            for chunk in _stream_call():
                loop.call_soon_threadsafe(queue.put_nowait, chunk)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    import threading
    thread = threading.Thread(target=_producer, daemon=True)
    thread.start()

    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        yield chunk


async def analyze_family_member(scan_result: dict, member: dict) -> dict:
    """Analyze a scan result for a specific family member."""
    prompt = f"""Analyze this scan result for a specific family member:

FAMILY MEMBER:
- Name: {member.get('name', 'Family Member')}
- Age: {member.get('age', 'Unknown')}
- Allergies: {', '.join(member.get('allergies', [])) or 'None'}
- Medical Conditions: {', '.join(member.get('conditions', [])) or 'None'}
- Diet: {member.get('diet_type', 'none')}

SCAN RESULT:
{json.dumps(scan_result, indent=2)}

Return JSON:
{{
  "is_safe": true/false,
  "safety_level": "safe|caution|danger",
  "primary_concern": "string or null",
  "allergen_alerts": ["list of allergens found"],
  "dietary_issues": ["list of dietary conflicts"],
  "recommendation": "1-2 sentence recommendation for this person"
}}"""

    message = await asyncio.to_thread(
        lambda: client.messages.create(
            model=MODEL,
            max_tokens=512,
            system="You are a safety analysis engine. Return JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )
    )
    text = message.content[0].text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


async def compare_products(scan_a: dict, scan_b: dict, user_profile: dict) -> dict:
    prompt = f"""Compare these two products for this user:

USER PROFILE:
{json.dumps(user_profile, indent=2)}

PRODUCT A:
{json.dumps(scan_a, indent=2)}

PRODUCT B:
{json.dumps(scan_b, indent=2)}

Return JSON:
{{
  "winner": "A or B",
  "reason": "1-2 sentence explanation tailored to user profile",
  "comparison": [
    {{"category": "string", "product_a": "value", "product_b": "value", "better": "A|B|tie"}}
  ],
  "health_recommendation": "personalized recommendation",
  "warnings": ["any warnings for either product"]
}}"""

    message = await asyncio.to_thread(
        lambda: client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system="You are LensAssist's comparison engine. Compare two products and recommend the best option based on the user's profile. Return JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )
    )
    text = message.content[0].text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


async def ask_followup(
    scan_result: dict,
    conversation_history: list,
    question: str,
    user_profile: dict,
) -> str:
    messages = []
    for msg in conversation_history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append(
        {
            "role": "user",
            "content": f"""Based on this scan result:
{json.dumps(scan_result, indent=2)}

User profile: {json.dumps(user_profile, indent=2)}

User's question: {question}

Answer in the user's preferred language ({user_profile.get('preferred_lang', 'en')}).
Be concise, direct, and prioritize safety. If unsure, say so.""",
        }
    )

    message = await asyncio.to_thread(
        lambda: client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=messages,
        )
    )
    return message.content[0].text


def _build_system_prompt(
    user_profile: dict,
    scan_mode: str,
    pet_info: Optional[dict] = None,
    vehicle_info: Optional[dict] = None,
    scan_history: Optional[list] = None,
    family_members: Optional[list] = None,
) -> str:
    pet_section = ""
    if pet_info:
        pet_section = f"""
- Pet Name: {pet_info.get('pet_name', 'Unknown')}
- Species: {pet_info.get('species', 'Unknown')}
- Pet Allergies: {', '.join(pet_info.get('known_allergies', [])) or 'None'}
- Pet Conditions: {', '.join(pet_info.get('conditions', [])) or 'None'}"""

    vehicle_section = ""
    if vehicle_info:
        vehicle_section = f"""
- Vehicle: {vehicle_info.get('year', '')} {vehicle_info.get('make', '')} {vehicle_info.get('model', '')}
- Fuel Type: {vehicle_info.get('fuel_type', 'Unknown')}"""

    # Scan Memory Graph — cross-reference against past scans
    memory_section = ""
    if scan_history:
        memory_lines = []
        for s in scan_history[:15]:
            line_parts = [f"  • {s.get('detected_type', 'unknown')}: {s.get('product_name', 'unnamed')}"]
            r = s.get("result", {})
            if r.get("allergen_warnings"):
                allergens = [w["allergen"] for w in r["allergen_warnings"]]
                line_parts.append(f"[ALLERGENS: {', '.join(allergens)}]")
            if r.get("drug_info", {}) and r["drug_info"].get("generic_name"):
                line_parts.append(f"[DRUG: {r['drug_info']['generic_name']}]")
            if r.get("safety_info", {}) and r["safety_info"].get("is_expired"):
                line_parts.append("[EXPIRED]")
            memory_lines.append(" ".join(line_parts))
        memory_section = f"""

## SCAN MEMORY (User's previous scans — cross-reference for interactions)
{chr(10).join(memory_lines)}

CRITICAL: Check if this new item interacts with ANY previously scanned items above. Examples:
- Grapefruit with statins, blood thinners
- Alcohol-based products with sedatives
- Vitamin K foods with Warfarin
- New allergens that compound previous exposure
Include cross-scan warnings in personalized_recommendations."""

    # Family members section
    family_section = ""
    if family_members:
        family_lines = []
        for m in family_members:
            family_lines.append(
                f"  • {m.get('name', 'Member')}, Age {m.get('age', '?')}: "
                f"Allergies={', '.join(m.get('allergies', [])) or 'None'}, "
                f"Conditions={', '.join(m.get('conditions', [])) or 'None'}"
            )
        family_section = f"""

## FAMILY MEMBERS (include family_safety in response)
{chr(10).join(family_lines)}"""

    return f"""You are LensAssist's AI vision engine built by Team InnovAIT.
You analyze images of physical world objects and return structured, actionable, personalized information.

## USER PROFILE
- Name: {user_profile.get('name', 'User')}
- Age: {user_profile.get('age', 'Unknown')}
- Preferred Language: {user_profile.get('preferred_lang', 'en')}
- Allergies: {', '.join(user_profile.get('allergies', [])) or 'None'}
- Allergy Severities: {json.dumps(user_profile.get('allergy_severities', {}))}
- Medical Conditions: {', '.join(user_profile.get('conditions', [])) or 'None'}
- Current Medications: {', '.join(user_profile.get('medications', [])) or 'None'}
- Diet Type: {user_profile.get('diet_type', 'none')}
- Nutritional Goals: {', '.join(user_profile.get('nutritional_goals', [])) or 'None'}
- Visual Impairment: {user_profile.get('visual_impairment', 'none')}
- Skin Type: {user_profile.get('skin_type', 'unknown')}{pet_section}{vehicle_section}{memory_section}{family_section}

## SCAN MODE: {scan_mode}

## RESPONSE FORMAT
Return ONLY valid JSON (no markdown, no code fences, no explanation outside JSON).
The JSON must follow the structure defined in the user prompt below.

## CRITICAL RULES
1. ALWAYS check ingredients for ALL user allergens including alternate names:
   milk = dairy = lactose = casein = whey = butter = cream = ghee
   peanuts = groundnut = arachis oil = monkey nuts
   wheat = gluten = semolina = spelt = kamut = durum = maida
   eggs = albumin = lysozyme = meringue = mayonnaise
   soy = soya = soybean = edamame = tofu = tempeh
   tree_nuts = almond = cashew = walnut = pistachio = pecan = hazelnut
2. For medicines: ALWAYS check interactions with user's current medications
3. ALWAYS translate ALL detected text to user's preferred language
4. For chemicals: ALWAYS flag dangerous mixing combinations
5. For food: calculate nutrition per serving AND flag dietary non-compliance
6. For cosmetics/skincare: check ingredients against user's skin type
7. For plants/insects: ALWAYS indicate if poisonous or dangerous
8. Be PROACTIVE — flag risks the user didn't ask about
9. If image is unclear, set confidence < 0.5 and explain why
10. Cross-reference scan memory for interaction warnings
"""


def _build_user_prompt(scan_mode: str) -> str:
    return """Analyze this image and return a JSON object with the following structure:

{
  "detected_type": "medicine|food|document|chemical|plant|insect|currency|sign|clothing|electronics|receipt|skincare|pet_product|vehicle_part|exercise|handwriting|parking_sign|unknown",
  "confidence": 0.0,
  "product_name": "string",
  "brand": "string or null",
  "category": "string",

  "ingredients": [],
  "allergens_detected": [],
  "allergen_warnings": [
    {
      "allergen": "string",
      "severity": "mild|moderate|severe|anaphylactic",
      "found_in": "string",
      "alternate_names_checked": []
    }
  ],

  "drug_info": {
    "generic_name": null,
    "drug_class": null,
    "uses": [],
    "dosage": null,
    "side_effects": [],
    "contraindications": [],
    "interactions_with_user_meds": [],
    "pregnancy_safety": "unknown",
    "storage": null
  },

  "nutrition": {
    "serving_size": "string",
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "sugar_g": 0,
    "fiber_g": 0,
    "fat_g": 0,
    "saturated_fat_g": 0,
    "sodium_mg": 0,
    "cholesterol_mg": 0,
    "glycemic_index_estimate": "unknown",
    "health_score": 0,
    "flags_for_user": []
  },

  "dietary_compliance": {
    "vegetarian": null,
    "vegan": null,
    "halal": null,
    "kosher": null,
    "gluten_free": null,
    "jain": null,
    "keto_friendly": null,
    "non_compliant_ingredients": []
  },

  "text_content": {
    "original_language": null,
    "original_text": null,
    "translated_text": null,
    "target_language": null
  },

  "safety_info": {
    "is_expired": null,
    "expiry_date": null,
    "hazard_warnings": [],
    "mixing_dangers": [],
    "first_aid": null
  },

  "color_info": {
    "dominant_colors": [],
    "color_coding_meaning": null
  },

  "skincare_analysis": null,
  "receipt_info": null,
  "clothing_info": null,
  "vehicle_info": null,
  "exercise_form": null,
  "plant_info": null,
  "parking_sign": null,

  "family_safety": [],

  "cross_scan_warnings": [],

  "personalized_recommendations": [],
  "additional_notes": null
}

Only include sections relevant to the detected type. Set irrelevant sections to null.
If family members were listed, populate family_safety as:
[{"name": "string", "is_safe": true/false, "concern": "string or null"}]
"""
