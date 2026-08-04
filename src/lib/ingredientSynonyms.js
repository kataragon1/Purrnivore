// Curated synonym groups for ingredient-deck terms that get spelled multiple
// ways across manufacturers (the same families already highlighted in the
// Finder detail modal). Not exhaustive -- extend as new variants turn up.

export const SYNONYM_GROUPS = [
  { label: 'FOS / Fructooligosaccharide', terms: ['fos', 'fructooligosaccharide', 'fructooligosaccharides'] },
  { label: 'Inulin', terms: ['inulin'] },
  { label: 'Chicory root', terms: ['chicory root', 'chicory'] },
  { label: 'MOS / Mannan-oligosaccharide', terms: ['mos', 'mannan-oligosaccharide', 'mannan oligosaccharide', 'mannanoligosaccharide'] },
  { label: 'Beet pulp', terms: ['beet pulp', 'dried beet pulp', 'dried plain beet pulp'] },
  { label: 'Pea protein', terms: ['pea protein', 'pea protein concentrate', 'pea protein isolate'] },
  { label: 'Potato protein', terms: ['potato protein'] },
  { label: 'Corn gluten meal', terms: ['corn gluten meal'] },
  { label: 'Soy protein isolate', terms: ['soy protein isolate', 'hydrolyzed soy protein', 'hydrolyzed soy'] },
]

const TERM_TO_GROUP = new Map()
for (const group of SYNONYM_GROUPS) {
  for (const term of group.terms) TERM_TO_GROUP.set(term, group)
}

// Given whatever the user typed, return every spelling it should match
// against (itself, plus siblings if it belongs to a known synonym group).
export function expandTerm(raw) {
  const needle = (raw ?? '').toLowerCase().trim()
  if (!needle) return []
  const group = TERM_TO_GROUP.get(needle)
  return group ? group.terms : [needle]
}

// For UI hints: "also matches: X, Y" when the typed value is part of a group.
export function synonymGroupFor(raw) {
  const needle = (raw ?? '').toLowerCase().trim()
  return TERM_TO_GROUP.get(needle) || null
}
