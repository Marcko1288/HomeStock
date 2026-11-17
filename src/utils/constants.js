export const UNITS = ["pz", "kg", "g", "L", "ml"];
export const DEFAULT_LOCATIONS = ["Casa", "Cantina"];
export const DEFAULT_CATEGORIES = ["Alimentari", "Bevande", "Casa", "Detersivi", "Bagno", "Altro"];
export const FALLBACK_CATEGORY = "Altro";

export const DEFAULT_SETTINGS = {
  locations: DEFAULT_LOCATIONS,
  categories: DEFAULT_CATEGORIES,
  defaultMinQuantity: 0,
  expiringDays: 7,
};

export const UNDO_MS = 5000;
