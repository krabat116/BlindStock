
/**
 * Normalize item names so matching is more reliable across
 * abbreviation variants, plural forms, and unit suffixes.
 *
 * Rules applied (in order):
 *  1. Uppercase + trim
 *  2. Stainless steel abbreviations → "STAINLESS STEEL"
 *       S.S. / S.S / SS  → STAINLESS STEEL
 *       STAINLESS (without following STEEL) → STAINLESS STEEL
 *  3. Plural → singular
 *       CHAINS → CHAIN, BRACKETS → BRACKET, MOTORS → MOTOR
 *  4. Strip MM unit suffix from numeric sizes
 *       1250MM → 1250, 750 MM → 750
 *  5. Collapse multiple spaces
 *
 * Examples:
 *   "SS Chain 1250MM"          → "STAINLESS STEEL CHAIN 1250"
 *   "Stainless Chain 750mm"    → "STAINLESS STEEL CHAIN 750"
 *   "S.S. Chains 1000"         → "STAINLESS STEEL CHAIN 1000"
 *   "White Brackets"           → "WHITE BRACKET"
 *   " metal   chain "          → "METAL CHAIN"
 */
export function normalizeItemName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    // Stainless steel variants → full name
    .replace(/\bS\.S\.\b/g, "STAINLESS STEEL")
    .replace(/\bS\.S\b/g, "STAINLESS STEEL")
    .replace(/\bSS\b/g, "STAINLESS STEEL")
    .replace(/\bSTAINLESS\b(?!\s+STEEL)/g, "STAINLESS STEEL")
    // Plural → singular
    .replace(/\bCHAINS\b/g, "CHAIN")
    .replace(/\bBRACKETS\b/g, "BRACKET")
    .replace(/\bMOTORS\b/g, "MOTOR")
    // Strip MM unit from numeric sizes: "1250MM" → "1250", "750 MM" → "750"
    .replace(/(\d+)\s*MM\b/g, "$1")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Normalize category names so singular/plural variations
 * can still match the same inventory category.
 *
 * Two-step approach:
 * 1. Special map  — only for categories whose stored name differs significantly
 *    from how they appear in order data (e.g. "Tube" → "Aluminium Tubes").
 * 2. General rule — strip trailing -ES or -S so any other category works
 *    automatically without needing to be listed here.
 *
 * Examples:
 *   "Motor"          → "MOTOR"
 *   "Motors"         → "MOTOR"     (S stripped)
 *   "Bracket"        → "BRACKET"
 *   "Brackets"       → "BRACKET"   (S stripped)
 *   "Finish"         → "FINISH"    (no S to strip)
 *   "Finishes"       → "FINISH"    (ES stripped)
 *   "Tube"           → "ALUMINIUM TUBES"  (special map)
 *   "Aluminium Tubes"→ "ALUMINIUM TUBES"  (special map)
 *   "Fabric"         → "FABRIC"    (no S to strip — matches hardcoded "FABRIC")
 */
export function normalizeCategoryName(value: string) {
  const normalized = value.trim().toUpperCase()

  // Special remappings only where the short name differs from the DB category name.
  // "ALUMINIUM TUBES" must stay as canonical — itemService compares against it directly.
  const specialMap: Record<string, string> = {
    "TUBE": "ALUMINIUM TUBES",
    "TUBES": "ALUMINIUM TUBES",
    "ALUMINIUM TUBE": "ALUMINIUM TUBES",
    "ALUMINIUM TUBES": "ALUMINIUM TUBES",
  }

  if (Object.prototype.hasOwnProperty.call(specialMap, normalized)) {
    return specialMap[normalized]
  }

  // General plural → singular: strip trailing -ES (FINISHES → FINISH)
  // then -S (BRACKETS → BRACKET, MOTORS → MOTOR).
  // Minimum-length guards prevent over-stripping short words.
  if (normalized.endsWith("ES") && normalized.length > 4) {
    return normalized.slice(0, -2)
  }
  if (normalized.endsWith("S") && normalized.length > 2) {
    return normalized.slice(0, -1)
  }

  return normalized
}