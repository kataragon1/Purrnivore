// Shared field metadata + evaluators for the Advanced Search builder:
// custom requirement rules (filter) and custom sort both read from this.

import { expandTerm } from './ingredientSynonyms'
import { FODMAP_LEVELS, fodmapLabel } from './fodmapScale'

export const FIELD_DEFS = [
  { key: 'brand', label: 'Brand', type: 'text' },
  { key: 'owner', label: 'Owner', type: 'text' },
  { key: 'sub_brand', label: 'Sub-brand', type: 'text' },
  { key: 'full_product_name', label: 'Product name', type: 'text' },
  { key: 'ingredients', label: 'Ingredients', type: 'text' },
  { key: 'form', label: 'Form', type: 'enum', options: ['dry', 'wet'] },
  { key: 'fodmap_rating', label: 'FODMAP risk', type: 'ordinal', options: FODMAP_LEVELS },
  { key: 'animal_idx', label: 'Animal index', type: 'number' },
  { key: 'protein', label: 'Protein %', type: 'number' },
  { key: 'kcal', label: 'Kcal / cup', type: 'number' },
  { key: 'plant_protein_ct', label: 'Plant-protein ingredient count', type: 'number' },
  { key: 'fish_free', label: 'Fish-free', type: 'boolean' },
  { key: 'has_probiotic', label: 'Has added probiotic', type: 'boolean' },
]

export const FIELD_BY_KEY = Object.fromEntries(FIELD_DEFS.map(f => [f.key, f]))

export const OPERATORS_BY_TYPE = {
  text: [
    { key: 'contains', label: 'contains' },
    { key: 'not_contains', label: 'does not contain' },
  ],
  number: [
    { key: 'eq', label: '=' },
    { key: 'neq', label: '≠' },
    { key: 'gt', label: '>' },
    { key: 'gte', label: '≥' },
    { key: 'lt', label: '<' },
    { key: 'lte', label: '≤' },
  ],
  enum: [
    { key: 'is', label: 'is' },
    { key: 'is_not', label: 'is not' },
  ],
  ordinal: [
    { key: 'is', label: 'is exactly' },
    { key: 'is_not', label: 'is not' },
    { key: 'better_or_eq', label: 'is (this or better)' },
    { key: 'worse_or_eq', label: 'is (this or worse)' },
  ],
  boolean: [
    { key: 'is', label: 'is' },
  ],
}

export function defaultOperator(fieldKey) {
  const field = FIELD_BY_KEY[fieldKey]
  return OPERATORS_BY_TYPE[field.type][0].key
}

export function evaluateRule(food, rule) {
  const field = FIELD_BY_KEY[rule.field]
  if (!field) return true
  // fodmap_rating is stored as legacy strings on old data / numeric rank on
  // new data -- always resolve through the shared label helper so both work.
  const value = rule.field === 'fodmap_rating' ? fodmapLabel(food) : food[rule.field]

  if (field.type === 'text') {
    const hay = (value ?? '').toString().toLowerCase()
    const rawNeedle = (rule.value ?? '').toString().trim()
    if (!rawNeedle) return true
    // Ingredient terms get synonym-expanded (e.g. "FOS" also matches
    // "fructooligosaccharide") so decks that spell it differently still match.
    const needles = rule.field === 'ingredients' ? expandTerm(rawNeedle) : [rawNeedle.toLowerCase()]
    const has = needles.some(n => hay.includes(n))
    return rule.operator === 'not_contains' ? !has : has
  }

  if (field.type === 'number') {
    if (rule.value === '' || rule.value == null) return true
    const target = Number(rule.value)
    const actual = Number(value)
    if (Number.isNaN(actual)) return false
    switch (rule.operator) {
      case 'eq': return actual === target
      case 'neq': return actual !== target
      case 'gt': return actual > target
      case 'gte': return actual >= target
      case 'lt': return actual < target
      case 'lte': return actual <= target
      default: return true
    }
  }

  if (field.type === 'enum') {
    if (!rule.value) return true
    const is = value === rule.value
    return rule.operator === 'is_not' ? !is : is
  }

  if (field.type === 'ordinal') {
    if (!rule.value) return true
    // Rank 0 = best (options are listed best-to-worst).
    const actualRank = field.options.indexOf(value)
    const targetRank = field.options.indexOf(rule.value)
    if (actualRank === -1) return false
    switch (rule.operator) {
      case 'is_not': return actualRank !== targetRank
      case 'better_or_eq': return actualRank <= targetRank
      case 'worse_or_eq': return actualRank >= targetRank
      default: return actualRank === targetRank
    }
  }

  if (field.type === 'boolean') {
    if (rule.value === '' || rule.value == null) return true
    const target = rule.value === 'true'
    return Boolean(value) === target
  }

  return true
}

export function evaluateRules(food, rules) {
  return rules.every(rule => evaluateRule(food, rule))
}

// Comparator factory shared by the preset sort dropdown and custom sort.
export function compareBy(fieldKey, direction = 'desc') {
  const field = FIELD_BY_KEY[fieldKey]
  const dir = direction === 'asc' ? 1 : -1
  return (a, b) => {
    const av = fieldKey === 'fodmap_rating' ? fodmapLabel(a) : a[fieldKey]
    const bv = fieldKey === 'fodmap_rating' ? fodmapLabel(b) : b[fieldKey]
    if (field?.type === 'ordinal') {
      const ar = field.options.indexOf(av)
      const br = field.options.indexOf(bv)
      return dir * ((ar === -1 ? field.options.length : ar) - (br === -1 ? field.options.length : br))
    }
    if (field?.type === 'text' || field?.type === 'enum') {
      return dir * (av ?? '').toString().localeCompare((bv ?? '').toString())
    }
    const an = av == null ? -Infinity : Number(av)
    const bn = bv == null ? -Infinity : Number(bv)
    return dir * (an - bn)
  }
}

export function compareWithTiebreak(primary, tiebreak) {
  return (a, b) => primary(a, b) || (tiebreak ? tiebreak(a, b) : 0)
}
