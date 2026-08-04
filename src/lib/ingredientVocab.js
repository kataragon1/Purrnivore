// Builds an autocomplete vocabulary of real ingredient-deck phrases from the
// loaded foods, so "does it exist in the database" is answered by the data
// itself rather than guessed.

const MAX_WORDS = 6 // drop long run-on fragments (e.g. leaked vitamin-panel text)
const MAX_TERMS = 400 // keep the datalist snappy

export function buildIngredientVocabulary(foods) {
  const counts = new Map() // lowercase term -> { display, count }

  for (const food of foods) {
    const raw = food.ingredients
    if (!raw) continue
    const parts = raw.split(',').map(s => s.replace(/[.[\]]/g, '').trim()).filter(Boolean)
    for (const part of parts) {
      if (part.split(/\s+/).length > MAX_WORDS) continue
      const key = part.toLowerCase()
      const entry = counts.get(key)
      if (entry) entry.count++
      else counts.set(key, { display: part, count: 1 })
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TERMS)
    .map(e => e.display)
}
