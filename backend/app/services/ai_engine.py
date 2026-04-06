import asyncio
import json
from typing import Optional
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
) -> dict:
    system_prompt = _build_system_prompt(user_profile, scan_mode, pet_info, vehicle_info)
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
- Skin Type: {user_profile.get('skin_type', 'unknown')}{pet_section}{vehicle_section}

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

  "personalized_recommendations": [],
  "additional_notes": null
}

Only include sections relevant to the detected type. Set irrelevant sections to null.
"""
