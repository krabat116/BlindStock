/**
 * Strip packing algorithm for fabric cutting optimisation.
 *
 * Models the factory cutting process:
 *   - Roll width:        rollWidthMm (default ROLL_WIDTH_MM = 3,000 mm = 3 m)
 *   - Table max length:  TABLE_MAX_LENGTH_MM (15,000 mm = 15 m)
 *
 * Algorithm: First Fit Decreasing Height (FFDH)
 *   1. Sort blinds by DROP descending.
 *   2. For each blind, place it in the first strip that has enough
 *      remaining width.  If none exists, open a new strip.
 *   3. Total roll length = sum of all strip heights.
 *   4. Fabric area consumed = total roll length × rollWidthMm.
 */

export const ROLL_WIDTH_MM = 3_000
export const TABLE_MAX_LENGTH_MM = 15_000

type Blind = {
  widthMm: number
  dropMm: number
}

/**
 * Compute total fabric area (mm²) consumed when cutting the given blinds,
 * assuming optimal strip-packing within the roll width.
 *
 * @param rollWidthMm - The actual width of the fabric roll (mm). Defaults to ROLL_WIDTH_MM.
 */
export function computeFabricAreaMm2(blinds: Blind[], rollWidthMm: number = ROLL_WIDTH_MM): number {
  if (blinds.length === 0) return 0

  // Sort by DROP descending so tallest blinds open new strips first
  const sorted = [...blinds].sort((a, b) => b.dropMm - a.dropMm)

  // Each strip tracks its height (DROP of the first blind placed) and
  // the remaining width available for more blinds.
  const strips: Array<{ height: number; remainingWidth: number }> = []

  for (const blind of sorted) {
    if (blind.widthMm <= 0 || blind.dropMm <= 0) continue

    const effectiveWidth = Math.min(blind.widthMm, rollWidthMm)

    // Find the first existing strip that fits this blind's width
    let placed = false
    for (const strip of strips) {
      if (effectiveWidth <= strip.remainingWidth) {
        strip.remainingWidth -= effectiveWidth
        placed = true
        break
      }
    }

    // No existing strip fits → open a new strip
    if (!placed) {
      strips.push({
        height: blind.dropMm,
        remainingWidth: rollWidthMm - effectiveWidth,
      })
    }
  }

  const totalRollLengthMm = strips.reduce((sum, s) => sum + s.height, 0)
  return totalRollLengthMm * rollWidthMm
}

/**
 * Return the number of cutting sessions required,
 * given the computed strips and the table maximum length.
 *
 * @param rollWidthMm - The actual width of the fabric roll (mm). Defaults to ROLL_WIDTH_MM.
 */
export function computeSessionCount(blinds: Blind[], rollWidthMm: number = ROLL_WIDTH_MM): number {
  if (blinds.length === 0) return 0

  const sorted = [...blinds].sort((a, b) => b.dropMm - a.dropMm)
  const strips: Array<{ height: number; remainingWidth: number }> = []

  for (const blind of sorted) {
    if (blind.widthMm <= 0 || blind.dropMm <= 0) continue
    const effectiveWidth = Math.min(blind.widthMm, rollWidthMm)

    let placed = false
    for (const strip of strips) {
      if (effectiveWidth <= strip.remainingWidth) {
        strip.remainingWidth -= effectiveWidth
        placed = true
        break
      }
    }

    if (!placed) {
      strips.push({ height: blind.dropMm, remainingWidth: rollWidthMm - effectiveWidth })
    }
  }

  // Group strips into sessions (each session ≤ TABLE_MAX_LENGTH_MM)
  let sessions = 0
  let currentSessionLength = 0

  for (const strip of strips) {
    if (currentSessionLength + strip.height > TABLE_MAX_LENGTH_MM) {
      sessions++
      currentSessionLength = strip.height
    } else {
      currentSessionLength += strip.height
    }
  }

  if (currentSessionLength > 0) sessions++

  return sessions
}
