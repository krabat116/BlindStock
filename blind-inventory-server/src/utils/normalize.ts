
/**
 * Normalize item names so matching is more reliable.
 * Example:
 * " metal   chain " -> "METAL CHAIN"
 */
export function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

/**
 * Normalize category names so singular/plural variations
 * can still match the same inventory category.
 */
export function normalizeCategoryName(value: string) {
  const normalized = value.trim().toUpperCase()

  const categoryMap: Record<string, string> = {
    WINDER: "WINDER",
    WINDERS: "WINDER",
    PIN: "PIN",
    PINS: "PIN",
    CHAIN: "CHAIN",
    CHAINS: "CHAIN",
    FINISH: "FINISH",
    FINISHES: "FINISH",
    TUBE: "ALUMINIUM TUBES"
    
  }

  return categoryMap[normalized] ?? normalized
}