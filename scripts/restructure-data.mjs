// One-time migration: src/data/foods.json (flat brand/flavor/type) -->
// four-level identity schema (owner/brand/sub_brand/full_product_name/form).
// Run: node scripts/restructure-data.mjs
// Output: scripts/out/restructured.json (gitignored) + a summary printed to stdout.
//
// Existing scores (fodmap_*, animal_idx, animal_band, fish_free, has_probiotic,
// plant_protein_ct) are carried forward unchanged -- this script does not
// recompute them, it only re-keys identity fields.
//
// KNOWN STALE / NOT YET RESEEDED (2026-08-04): this script now emits a
// numeric `fodmap_rank` (0-4, via the legacy string->rank map in
// src/lib/fodmapScale.js) instead of the old `fodmap_rating` string, so
// display wording lives in one place going forward. The LIVE Firestore
// `foods` collection has NOT been reseeded with this yet -- it still has
// the old string field only. The app has a compatibility shim
// (src/lib/fodmapScale.js) that derives rank from the legacy string, so
// the site works fine either way. Don't bother reseeding just for this --
// wait until the scraper/collection pass produces new raw data and the
// real scorer module (still not built, see project memory) recomputes
// everything, then this whole dataset gets regenerated anyway.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const LEGACY_FODMAP_RANK = { Excellent: 0, Good: 1, Moderate: 2, Poor: 3, Avoid: 4 }

const foods = JSON.parse(readFileSync(new URL('../src/data/foods.json', import.meta.url)))

const NBSP = / /g
const clean = s => (s == null ? s : String(s).replace(NBSP, ' ').replace(/\s+/g, ' ').trim())

// ---------------------------------------------------------------------------
// Owners: researched via web search 2026-08-04, current as of that date.
// Corporate ownership changes -- re-verify before trusting this for long.
// ---------------------------------------------------------------------------
const OWNERS = {
  'Royal Canin': 'Mars, Incorporated',
  'Iams': 'Mars, Incorporated',
  'Sheba': 'Mars, Incorporated',
  'ACANA': 'Mars, Incorporated', // via Champion Petfoods, acquired 2018
  'ORIJEN': 'Mars, Incorporated', // via Champion Petfoods, acquired 2018
  "Hill's": 'Colgate-Palmolive Company',
  'Purina': 'Nestlé', // Nestlé Purina PetCare
  'Fancy Feast': 'Nestlé', // Nestlé Purina PetCare
  'Merrick': 'Nestlé', // acquired by Nestlé Purina PetCare, 2015
  'Blue Buffalo': 'General Mills',
  'Tiki Cat': 'General Mills', // acquired via Whitebridge Pet Brands, Nov 2024
  'American Journey': 'Chewy, Inc.',
  'Tiny Tiger': 'Chewy, Inc.',
  'Instinct': 'Agrolimen', // Nature's Variety, maker of Instinct
  'CANIDAE': 'Ethos Pet Brands', // L Catterton / Nexus Capital JV
  'Natural Balance': 'Ethos Pet Brands',
  'Solid Gold': 'Health & Happiness (H&H) Group',
  'Nulo': 'Apax Partners',
  'Vital Essentials': 'Greater Sum Ventures', // parent of Carnivore Meat Company
  'Fussie Cat': 'Pets Global, Inc.', // independent, also owns Zignature/Inception/Essence
  'AvoDerm': 'Breeder’s Choice Pet Foods, LLC', // independent ownership group since 2020
  'Go! Solutions': 'Petcurean', // independent, family-owned (BC, Canada)
  'Wellness': 'Clearlake Capital Group', // acquired WellPet from Berwind, 2020
  'RAWZ': 'Independent', // Scott family
  // Lower-confidence: small/family brands not independently re-verified this
  // pass -- flagged for a follow-up research pass before this is load-bearing.
  'Rayne': 'Independent (unverified)',
  'Farmina': 'Independent (unverified)',
  'FirstMate': 'Independent (unverified)',
  'Fromm': 'Independent (unverified)',
  "Dr. Elsey's": 'Independent (unverified)',
  'Wysong': 'Independent (unverified)',
  'Young Again': 'Independent (unverified)',
  'ZIWI': 'Independent (unverified)',
  'Addiction': 'Independent (unverified)',
  'Feline Caviar': 'Independent (unverified)',
  'Catit': 'Independent (unverified)', // Hagen Group -- mostly an accessories brand, only 1 record
}

// ---------------------------------------------------------------------------
// Raw `brand` string -> canonical brand (case/misspelling/sub-line dedup).
// Sub-brand assignment for these happens in subBrandFor() below.
// ---------------------------------------------------------------------------
const BRAND_ALIASES = {
  '7+ hills science diet': "Hill's",
  '7+ purina one': 'Purina',
  '7+ purina pro plan': 'Purina',
  '7+ royal canin': 'Royal Canin',
  'acana': 'ACANA',
  'addiction': 'Addiction',
  'american journey': 'American Journey',
  'avoderm': 'AvoDerm',
  'beyond': 'Purina',
  'blue buffalo': 'Blue Buffalo',
  'canidae': 'CANIDAE',
  'catit': 'Catit',
  "dr. elsey's": "Dr. Elsey's",
  'fancy feast': 'Fancy Feast',
  'fancy feast gems': 'Fancy Feast',
  'fancy feast petites pate': 'Fancy Feast',
  'farmina': 'Farmina',
  'feline caviar': 'Feline Caviar',
  'firstmate': 'FirstMate',
  'fromm': 'Fromm',
  'go! solutions': 'Go! Solutions',
  "hill's": "Hill's",
  'hills': "Hill's",
  'iams': 'Iams',
  'iams indoor': 'Iams',
  'instinct': 'Instinct',
  'merrick': 'Merrick',
  'n&d': 'Farmina',
  'n&d farmina': 'Farmina',
  'natural balance': 'Natural Balance',
  'nulo': 'Nulo',
  'orijen': 'ORIJEN',
  'pro plan': 'Purina',
  'proplan 11+': 'Purina',
  'purina': 'Purina',
  'purina beyond': 'Purina',
  'purina one': 'Purina',
  'purina pro plan': 'Purina',
  'purina pro plan vet': 'Purina',
  'purine pro plan': 'Purina', // misspelling
  'rawz': 'RAWZ',
  'rayne': 'Rayne',
  'royal canin': 'Royal Canin',
  'sheba': 'Sheba',
  'solid gold': 'Solid Gold',
  'tiki cat': 'Tiki Cat',
  'tiny tiger': 'Tiny Tiger',
  'vital essentials': 'Vital Essentials',
  'wellness core': 'Wellness',
  'wellness core+': 'Wellness',
  'wysong': 'Wysong',
  'young again': 'Young Again',
  'ziwi': 'ZIWI',
}

// Per-brand sub_brand derivation. Return null for "no real tier".
function subBrandFor(canonicalBrand, rawBrandLower, fullProductName) {
  const name = fullProductName || ''
  switch (canonicalBrand) {
    case "Hill's": {
      if (rawBrandLower.includes('7+ hills')) return 'Science Diet'
      // Prescription Diet products carry a therapeutic code (c/d, w/d, z/d...)
      // or explicit "Prescription"/therapeutic wording.
      if (/\b[a-z]\/d\b/i.test(name) || /prescription|metabolic|multicare|biome|derm complete/i.test(name)) {
        return 'Prescription Diet'
      }
      return 'Science Diet'
    }
    case 'Royal Canin': {
      if (/satiety|urinary|renal|hydrolyzed|gastrointestinal|hepatic|calm|recovery|multifunction|mobility|diabetic|weight care/i.test(name)) {
        return 'Veterinary Diet'
      }
      return null
    }
    case 'Purina': {
      if (rawBrandLower.includes('pro plan vet')) return 'Pro Plan Veterinary Diets'
      if (rawBrandLower.includes('pro plan') || rawBrandLower.includes('proplan')) return 'Pro Plan'
      if (rawBrandLower.includes('one')) return 'ONE'
      if (rawBrandLower.includes('beyond')) return 'Beyond'
      if (rawBrandLower.includes('tender selects')) return 'Tender Selects Blend'
      return null
    }
    case 'Fancy Feast': {
      if (rawBrandLower.includes('gems')) return 'Gems'
      if (rawBrandLower.includes('petites pate')) return 'Petites Pâté'
      return null
    }
    case 'Farmina':
      return 'N&D'
    case 'Wellness':
      if (/^complete health/i.test(name)) return 'Complete Health'
      return rawBrandLower.includes('core+') ? 'CORE+' : 'CORE'
    case 'Instinct': {
      if (/limited ingredient diet/i.test(name)) return 'Limited Ingredient Diet'
      if (/ultimate protein/i.test(name)) return 'Ultimate Protein'
      return null
    }
    case 'Merrick':
      return /purrfect bistro/i.test(name) ? 'Purrfect Bistro' : null
    case 'Fussie Cat':
      return 'Market Fresh'
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Explicit repairs for the 14 "full product name jammed into brand" records.
// Matched by exact (cleaned) brand string -- each is unique in the dataset.
// ---------------------------------------------------------------------------
const MALFORMED_BRAND_REPAIRS = {
  "Royal Canin Feline Health Nutrition Savor Selective Adult Dry Cat Food": {
    brand: 'Royal Canin', fullProductName: 'Feline Health Nutrition Savor Selective Adult',
  },
  'Purina Tender Selects Blend Chicken': {
    brand: 'Purina', fullProductName: 'Chicken',
  },
  'Purina One +Plus Indoor Advantag': {
    brand: 'Purina', fullProductName: '+Plus Indoor Advantage', // fixes an apparent truncation ("Advantag")
  },
  'Indoor Complete Health Grain Free Salmon & Herring': {
    // Confirmed by ingredient-deck match against Wellness Complete Health
    // Grain-Free Indoor: Salmon & Herring (salmon/peas/herring meal/chickpeas/
    // chicory root/probiotic fermentation blend all match).
    brand: 'Wellness', fullProductName: 'Complete Health Grain-Free Indoor: Salmon & Herring',
  },
  'American Journey Indoor Recipe with Chicken Grain-Free Dry Cat Food': {
    brand: 'American Journey', fullProductName: 'Indoor Recipe with Chicken Grain-Free',
  },
  'Merrick Purrfect Bistro Healthy Grains Real Chicken + Brown Rice Recipe Adult Dry Cat Food': {
    brand: 'Merrick', fullProductName: 'Healthy Grains Real Chicken + Brown Rice Recipe Adult',
  },
  'Fussie Cat Market Fresh Chicken & Turkey Recipe Grain-Free Dry Cat Food': {
    brand: 'Fussie Cat', fullProductName: 'Chicken & Turkey Recipe Grain-Free',
  },
  'Merrick Purrfect Bistro Grain-Free Real Chicken + Sweet Potato Recipe Adult Dry Cat Food': {
    brand: 'Merrick', fullProductName: 'Grain-Free Real Chicken + Sweet Potato Recipe Adult',
  },
  'Fussie Cat Market Fresh Quail & Duck Meal Recipe Grain-Free Dry Cat Food': {
    brand: 'Fussie Cat', fullProductName: 'Quail & Duck Meal Recipe Grain-Free',
  },
  'Fussie Cat Market Fresh Guinea Fowl & Turkey Meal Recipe Grain-Free Dry Cat Food': {
    brand: 'Fussie Cat', fullProductName: 'Guinea Fowl & Turkey Meal Recipe Grain-Free',
  },
  'Purina One Sensitive Skin and Stomach': {
    brand: 'Purina', fullProductName: 'Sensitive Skin and Stomach',
  },
  'Instinct Limited Ingredient Diet Grain-Free Recipe with Real Turkey Freeze-Dried Raw Coated Dry Cat Food': {
    brand: 'Instinct', fullProductName: 'Grain-Free Recipe with Real Turkey Freeze-Dried Raw Coated',
  },
  'Instinct Ultimate Protein Grain-Free Cage-Free Chicken Recipe Freeze-Dried Raw Coated Dry Cat Food': {
    brand: 'Instinct', fullProductName: 'Grain-Free Cage-Free Chicken Recipe Freeze-Dried Raw Coated',
  },
  'AvoDerm Grain-Free Duck with Turkey': {
    brand: 'AvoDerm', fullProductName: 'Grain-Free Duck with Turkey',
  },
}

// The 15th malformed record: flavor leaked into the front of `ingredients`
// instead of `brand`. Split on "Recipe in Gravy" / "Recipe in Sauce" / "Pate"
// style boundary that precedes the real ingredient deck.
function repairIngredientsSpillover(record) {
  const m = /^(.*?\b(?:Recipe in Gravy|Recipe in Sauce|Pat[eé]))\s+([A-Z][\s\S]*)$/.exec(record.ingredients || '')
  if (!m) return null
  return { fullProductName: clean(m[1]), ingredients: clean(m[2]) }
}

// Heuristic flag for treats/toppers that snuck into the "wet"/"dry" complete-
// food seed (e.g. Catit lickable purees, ORIJEN FD Treats). Not a hard
// exclude -- confidence isn't high enough for that -- just a review flag.
const TREAT_KEYWORDS = /\btreats?\b|\blickable\b|\btoppers?\b|\bpur[ée]e\b|\bsticks?\b/i
function isLikelyTreat(fullProductName) {
  return TREAT_KEYWORDS.test(fullProductName || '')
}

function slugify(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const unresolvedBrands = new Set()
const ownerCounts = {}
const subBrandCounts = {}
const seenIds = new Map()

const restructured = foods.map((f, i) => {
  const rawBrand = clean(f.brand)
  let brand, fullProductName, ingredients = f.ingredients, needsReview = false

  if (MALFORMED_BRAND_REPAIRS[rawBrand]) {
    const repair = MALFORMED_BRAND_REPAIRS[rawBrand]
    brand = repair.brand
    fullProductName = repair.fullProductName
    needsReview = !!repair.needsReview
  } else if (f.flavor == null && rawBrand.toLowerCase() === 'american journey' && f.type === 'wet') {
    const spillover = repairIngredientsSpillover(f)
    brand = 'American Journey'
    fullProductName = spillover ? spillover.fullProductName : null
    ingredients = spillover ? spillover.ingredients : f.ingredients
    needsReview = !spillover
  } else {
    brand = BRAND_ALIASES[rawBrand.toLowerCase()] ?? rawBrand
    fullProductName = clean(f.flavor)
    if (!BRAND_ALIASES[rawBrand.toLowerCase()]) unresolvedBrands.add(rawBrand)
  }

  const subBrand = subBrandFor(brand, rawBrand.toLowerCase(), fullProductName)
  const owner = OWNERS[brand] ?? 'Unknown'
  const form = f.type
  const likelyTreat = isLikelyTreat(fullProductName)

  ownerCounts[owner] = (ownerCounts[owner] || 0) + 1
  const sbKey = `${brand}${subBrand ? ' > ' + subBrand : ''}`
  subBrandCounts[sbKey] = (subBrandCounts[sbKey] || 0) + 1

  let foodId = slugify(brand, subBrand, fullProductName, form) || `record-${i}`
  if (seenIds.has(foodId)) {
    const n = seenIds.get(foodId) + 1
    seenIds.set(foodId, n)
    foodId = `${foodId}-${n}`
  } else {
    seenIds.set(foodId, 1)
  }

  return {
    food_id: foodId,
    owner,
    brand,
    sub_brand: subBrand,
    full_product_name: fullProductName,
    form,
    protein: f.protein,
    protein_DMB: f.protein_DMB,
    kcal: f.kcal,
    moisture: f.moisture,
    ingredients,
    notes: f.notes,
    fodmap_score: f.fodmap_score,
    fodmap_rank: LEGACY_FODMAP_RANK[f.fodmap_rating] ?? null,
    animal_idx: f.animal_idx,
    animal_band: f.animal_band,
    fish_free: f.fish_free,
    has_probiotic: f.has_probiotic,
    plant_protein_ct: f.plant_protein_ct,
    ...(needsReview ? { needs_review: true } : {}),
    ...(likelyTreat ? { likely_treat: true } : {}),
  }
})

mkdirSync(new URL('out/', import.meta.url), { recursive: true })
writeFileSync(new URL('out/restructured.json', import.meta.url), JSON.stringify(restructured, null, 2))

console.log(`Restructured ${restructured.length} records -> scripts/out/restructured.json\n`)

console.log('Owner counts:')
for (const [owner, count] of Object.entries(ownerCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${owner}`)
}

console.log('\nCanonical brand / sub_brand counts:')
for (const [key, count] of Object.entries(subBrandCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${key}`)
}

if (unresolvedBrands.size) {
  console.log('\nUnresolved raw brand strings (not in BRAND_ALIASES, used as-is):')
  for (const b of unresolvedBrands) console.log(`  - ${b}`)
}

const flagged = restructured.filter(r => r.needs_review)
if (flagged.length) {
  console.log(`\n${flagged.length} record(s) flagged needs_review:`)
  for (const r of flagged) console.log(`  - ${r.food_id}`)
}

const treats = restructured.filter(r => r.likely_treat)
if (treats.length) {
  console.log(`\n${treats.length} record(s) flagged likely_treat (keyword heuristic, review before trusting):`)
  for (const r of treats) console.log(`  - ${r.food_id}`)
}
