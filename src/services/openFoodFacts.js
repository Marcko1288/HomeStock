// Lookup barcode → nome, foto, categoria su Open Food Facts.

const FIELDS = "product_name,product_name_it,generic_name_it,brands,image_front_url,image_url,categories_tags";
const cache = new Map();

function guessCategory(tags = []) {
  const t = tags.join(" ");
  if (/beverages|drinks|waters|wines|beers|juices|bevande/.test(t)) return "Bevande";
  if (/cleaning|detergent|laundry|dishwashing/.test(t)) return "Detersivi";
  if (/hygiene|cosmetics|toothpaste|shampoo|soap/.test(t)) return "Bagno";
  return "Alimentari";
}

function buildName(p) {
  const name = (p.product_name_it || p.product_name || p.generic_name_it || "").trim();
  const brand = (p.brands || "").split(",")[0].trim();
  if (!name) return brand;
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) return `${name} ${brand}`;
  return name;
}

/**
 * @returns {Promise<{name: string, imageUrl: string, category: string} | null>}
 *   null se il prodotto non esiste. Lancia un errore se la rete non risponde.
 */
export async function lookupBarcode(barcode) {
  const code = String(barcode || "").replace(/\D/g, "");
  if (code.length < 6) return null;
  if (cache.has(code)) return cache.get(code);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`,
      { signal: controller.signal },
    );
    if (res.status === 404) {
      cache.set(code, null);
      return null;
    }
    if (!res.ok) throw new Error(`OFF ${res.status}`);
    const json = await res.json();
    const p = json.status === 1 ? json.product || {} : null;
    const result = p
      ? { name: buildName(p), imageUrl: p.image_front_url || p.image_url || "", category: guessCategory(p.categories_tags) }
      : null;
    cache.set(code, result);
    return result;
  } finally {
    clearTimeout(timer);
  }
}
