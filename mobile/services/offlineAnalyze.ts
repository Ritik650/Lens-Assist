/**
 * Offline analysis service — runs when the backend is unreachable.
 * Uses the bundled allergen DB to do basic ingredient/product matching.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
const allergenDb = {
  allergen_keywords: {
    peanuts: ['peanut', 'groundnut', 'arachis oil', 'monkey nuts', 'beer nuts', 'mixed nuts'],
    milk: ['milk', 'dairy', 'lactose', 'whey', 'casein', 'butter', 'cream', 'cheese', 'yogurt', 'ghee', 'paneer', 'curd'],
    wheat: ['wheat', 'gluten', 'flour', 'bread', 'semolina', 'durum', 'spelt', 'kamut', 'farro', 'bulgur', 'maida', 'atta'],
    eggs: ['egg', 'albumin', 'globulin', 'lecithin', 'lysozyme', 'mayonnaise', 'meringue', 'ovalbumin'],
    soy: ['soy', 'soya', 'tofu', 'tempeh', 'miso', 'edamame', 'soybean', 'textured vegetable protein', 'tvp'],
    tree_nuts: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'brazil nut', 'pine nut', 'chestnut', 'coconut'],
    shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'barnacle', 'krill', 'squid', 'octopus'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'bass', 'anchovy', 'sardine', 'mackerel', 'herring', 'halibut'],
  } as Record<string, string[]>,
  common_products: {
    'oreo': ['wheat', 'soy'],
    'kitkat': ['milk', 'wheat', 'soy'],
    'snickers': ['peanuts', 'milk', 'tree_nuts'],
    'lay\'s': [],
    'maggi': ['wheat'],
    'parle-g': ['wheat', 'milk'],
    'cadbury dairy milk': ['milk', 'soy'],
    'amul butter': ['milk'],
    'britannia': ['wheat', 'milk'],
    'horlicks': ['wheat', 'milk'],
    'bournvita': ['milk', 'wheat'],
    'bread': ['wheat'],
    'butter': ['milk'],
    'cheese': ['milk'],
    'yogurt': ['milk'],
    'curd': ['milk'],
    'paneer': ['milk'],
    'ghee': ['milk'],
    'pasta': ['wheat'],
    'noodles': ['wheat'],
    'biscuit': ['wheat', 'milk'],
    'cookie': ['wheat', 'milk', 'eggs'],
    'cake': ['wheat', 'eggs', 'milk'],
    'ice cream': ['milk', 'eggs'],
    'chocolate': ['milk', 'soy'],
    'peanut butter': ['peanuts'],
    'tofu': ['soy'],
    'tempeh': ['soy'],
    'almond milk': ['tree_nuts'],
    'soy milk': ['soy'],
  } as Record<string, string[]>,
  safe_ingredients: [
    'water', 'salt', 'sugar', 'pepper', 'turmeric', 'cumin', 'coriander',
    'cardamom', 'cinnamon', 'cloves', 'bay leaf', 'mustard seeds',
    'rice', 'lentils', 'dal', 'chickpeas', 'vegetables', 'fruits',
    'olive oil', 'sunflower oil', 'canola oil', 'vinegar', 'lemon juice',
  ],
};

const CACHE_KEY = 'offline_scan_cache';
const CACHE_MAX = 30;

export interface OfflineScanResult {
  id: string;
  scan_mode: string;
  detected_type: string;
  confidence: number;
  product_name: string;
  result: {
    detected_type: string;
    confidence: number;
    product_name: string;
    allergen_warnings: Array<{
      allergen: string;
      severity: string;
      found_in: string;
      alternate_names_checked: string[];
    }>;
    personalized_recommendations: string[];
    additional_notes: string;
    _offline: true;
  };
  created_at: string;
  _offline: true;
}

/**
 * Match text against allergen keyword DB.
 * Returns list of detected allergens.
 */
export function detectAllergens(
  text: string,
  userAllergens: string[],
): Array<{ allergen: string; severity: string; found_in: string; alternate_names_checked: string[] }> {
  const lower = text.toLowerCase();
  const warnings: Array<{ allergen: string; severity: string; found_in: string; alternate_names_checked: string[] }> = [];

  const db = allergenDb.allergen_keywords;

  for (const userAllergen of userAllergens) {
    const keywords = db[userAllergen] || [];
    const found = keywords.filter(kw => lower.includes(kw.toLowerCase()));
    if (found.length > 0) {
      warnings.push({
        allergen: userAllergen,
        severity: 'moderate',
        found_in: found.slice(0, 3).join(', '),
        alternate_names_checked: keywords,
      });
    }
  }

  return warnings;
}

/**
 * Simple product name lookup against known product allergen map.
 */
export function lookupProduct(productName: string): string[] {
  const lower = productName.toLowerCase();
  const products = allergenDb.common_products;
  for (const [product, allergens] of Object.entries(products)) {
    if (lower.includes(product) || product.includes(lower)) {
      return allergens;
    }
  }
  return [];
}

/**
 * Run offline analysis — used as fallback when backend unreachable.
 */
export async function offlineAnalyze(params: {
  imageUri: string;
  scanMode: string;
  userAllergens?: string[];
  productHint?: string;
}): Promise<OfflineScanResult> {
  const userAllergens = params.userAllergens || [];
  const scanText = params.productHint || params.scanMode;

  // Try product lookup
  const productAllergens = lookupProduct(scanText);
  const warnings = productAllergens
    .filter(a => userAllergens.includes(a))
    .map(a => ({
      allergen: a,
      severity: 'moderate' as string,
      found_in: scanText,
      alternate_names_checked: allergenDb.allergen_keywords[a] || [],
    }));

  const recommendations: string[] = [];
  if (warnings.length > 0) {
    recommendations.push('⚠️ Offline mode: allergen detection based on product name only. Scan again when online for full AI analysis.');
  } else {
    recommendations.push('Offline mode: basic analysis only. Connect to internet for full Claude AI analysis with vision.');
  }

  const id = `offline_${Date.now()}`;
  const result: OfflineScanResult = {
    id,
    scan_mode: params.scanMode,
    detected_type: params.scanMode,
    confidence: 0.3,
    product_name: scanText || 'Unknown (offline)',
    result: {
      detected_type: params.scanMode,
      confidence: 0.3,
      product_name: scanText || 'Unknown (offline)',
      allergen_warnings: warnings,
      personalized_recommendations: recommendations,
      additional_notes: 'This analysis was performed offline using the bundled allergen database. Results are limited. For accurate analysis, please connect to the internet.',
      _offline: true,
    },
    created_at: new Date().toISOString(),
    _offline: true,
  };

  // Cache to AsyncStorage for history viewing
  await cacheResult(result);

  return result;
}

async function cacheResult(result: OfflineScanResult) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cache: OfflineScanResult[] = raw ? JSON.parse(raw) : [];
    cache.unshift(result);
    if (cache.length > CACHE_MAX) cache.splice(CACHE_MAX);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export async function getOfflineCache(): Promise<OfflineScanResult[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isNetworkError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('could not connect')
  );
}
