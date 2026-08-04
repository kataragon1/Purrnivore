// Curated allergen/protein-source categories for the "select all variants at
// once" ingredient exclusion case (e.g. a fish allergy should also catch
// "Pollock" and "Menhaden" even though neither contains the word "fish").
// Not exhaustive -- extend a category's `terms` array as gaps turn up.

export const ALLERGEN_CATEGORIES = [
  {
    label: 'Fish (any species)',
    terms: [
      'fish', 'salmon', 'tuna', 'pollock', 'whitefish', 'catfish', 'menhaden',
      'herring', 'redfish', 'cod', 'trout', 'mackerel', 'sardine', 'anchovy',
      'flounder', 'haddock', 'tilapia', 'walleye', 'perch', 'halibut',
    ],
  },
  {
    label: 'Poultry',
    terms: ['chicken', 'turkey', 'duck', 'quail', 'pheasant', 'egg'],
  },
  {
    label: 'Red meat',
    terms: ['beef', 'lamb', 'venison', 'bison', 'pork', 'rabbit', 'goat', 'boar'],
  },
  {
    label: 'Grain',
    terms: [
      'wheat', 'corn', 'rice', 'barley', 'oat', 'oatmeal', 'rye', 'sorghum',
      'wheat gluten', 'corn gluten', 'brewers rice',
    ],
  },
  {
    label: 'Legume / pulse',
    terms: ['pea', 'peas', 'lentil', 'lentils', 'chickpea', 'chickpeas', 'bean', 'beans'],
  },
  {
    label: 'Dairy',
    terms: ['milk', 'cheese', 'whey', 'casein', 'lactose', 'yogurt'],
  },
]

export const CATEGORY_BY_LABEL = Object.fromEntries(ALLERGEN_CATEGORIES.map(c => [c.label, c]))
