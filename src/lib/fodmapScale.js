// Single source of truth for FODMAP tier wording. Rank is numeric (0 = best,
// 4 = worst) and is what should be stored/compared everywhere -- change the
// labels here only, nothing else should hardcode this wording.
export const FODMAP_LEVELS = ['Minimal', 'Low', 'Moderate', 'Elevated', 'High']

// KNOWN STALE DATA: every doc currently in Firestore predates this numeric
// schema and only has the old string field `fodmap_rating`
// (Excellent/Good/Moderate/Poor/Avoid). That data is scheduled to be fully
// regenerated once the scraper/collection pass reruns the scorer -- until
// then this legacy map lets the app derive a rank from the old strings so
// the UI can show the new wording without an interim reseed. Once real
// `fodmap_rank` values are seeded, this map (and the `food.fodmap_rating`
// fallback below) can be deleted.
const LEGACY_LABEL_TO_RANK = { Excellent: 0, Good: 1, Moderate: 2, Poor: 3, Avoid: 4 }

export function fodmapRank(food) {
  if (typeof food.fodmap_rank === 'number') return food.fodmap_rank
  if (food.fodmap_rating in LEGACY_LABEL_TO_RANK) return LEGACY_LABEL_TO_RANK[food.fodmap_rating]
  return null
}

export function fodmapLabel(food) {
  const rank = fodmapRank(food)
  return rank == null ? '–' : FODMAP_LEVELS[rank]
}
