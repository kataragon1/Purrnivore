// Scrapes cat food products from purina.com into the raw-layer schema.
//
// Discovery: purina.com/cats/cat-food is client-side paginated (a "More"
// button reveals more of an already-loaded list, no new network call per
// click) so we drive a real browser (Playwright) to click through and
// collect every /cats/shop/{slug} URL + its display name from the link text.
//
// Per-product data: purina.com is a Gatsby site -- each product page has a
// prebuilt page-data.json with NO bot protection and NO JS rendering
// required (plain fetch). It contains the complete, correctly-ordered
// ingredient deck (as an array of taxonomy-term references) and calorie
// content. Guaranteed Analysis (protein/fat/fiber/moisture %) is NOT in
// that JSON -- it only exists in a per-product label-deck PDF, linked from
// the same JSON, with a clean consistent "Crude Protein (Min) 36.0%" style
// template we can regex.
//
// Usage:
//   node scripts/scrape-purina.mjs --dry-run [--limit N]   (default: writes
//     to scripts/out/scraped-purina.json for review, does NOT touch Firestore)
//   node scripts/scrape-purina.mjs --write [--limit N]     (writes into the
//     `foods_staging` Firestore collection via the Admin SDK, NOT the live
//     `foods` collection the app reads from)

import { chromium } from 'playwright'
import { extractText, getDocumentProxy } from 'unpdf'
import { mkdirSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const DRY_RUN = !args.includes('--write')
const limitArg = args.find(a => a.startsWith('--limit'))
const LIMIT = limitArg ? Number(limitArg.split('=')[1] ?? args[args.indexOf(limitArg) + 1]) : Infinity

const CATEGORY_URL = 'https://www.purina.com/cats/cat-food'

// Purina brand/sub-brand prefixes -> canonical (brand, sub_brand), matching
// the owner/brand/sub_brand model already used for the seed dataset.
const SUB_BRAND_PREFIXES = [
  [/^Pro Plan Veterinary/i, 'Pro Plan Veterinary Diets'],
  [/^Pro Plan/i, 'Pro Plan'],
  [/^ProPlan/i, 'Pro Plan'],
  [/^Purina ONE/i, 'ONE'],
  [/^ONE\b/i, 'ONE'],
  [/^Beyond/i, 'Beyond'],
  [/^Tender Selects/i, 'Tender Selects Blend'],
  [/^Friskies/i, 'Friskies'],
  [/^Fancy Feast/i, 'Fancy Feast'],
  [/^Cat Chow/i, 'Cat Chow'],
]

function classify(name) {
  for (const [re, subBrand] of SUB_BRAND_PREFIXES) {
    if (re.test(name)) {
      // Fancy Feast is its own brand per the existing model, not a Purina sub_brand.
      if (subBrand === 'Fancy Feast') return { brand: 'Fancy Feast', subBrand: null }
      return { brand: 'Purina', subBrand }
    }
  }
  return { brand: 'Purina', subBrand: null }
}

function formOf(name) {
  if (/\bDry Cat Food\b/i.test(name)) return 'dry'
  if (/\bWet Cat Food\b/i.test(name) || /\bCanned Cat Food\b/i.test(name)) return 'wet'
  return null
}

async function discoverProducts(page) {
  await page.goto(CATEGORY_URL, { waitUntil: 'networkidle' })
  let lastCount = 0
  for (let i = 0; i < 60; i++) {
    const links = await page.$$eval('a[href^="/cats/shop/"]', as =>
      as.map(a => ({ href: a.getAttribute('href'), name: a.textContent.trim() })).filter(l => l.name)
    )
    const unique = new Map(links.map(l => [l.href, l]))
    if (unique.size === lastCount) break
    lastCount = unique.size
    const moreBtn = await page.$('button:has-text("More")')
    if (!moreBtn) break
    await moreBtn.click().catch(() => {})
    await page.waitForTimeout(400)
  }
  const links = await page.$$eval('a[href^="/cats/shop/"]', as =>
    as.map(a => ({ href: a.getAttribute('href'), name: a.textContent.trim() })).filter(l => l.name)
  )
  return [...new Map(links.map(l => [l.href, l])).values()]
}

function slugify(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function scrapeProduct({ href, name }) {
  const slug = href.replace(/^\/cats\/shop\//, '')
  const dataUrl = `https://www.purina.com/page-data/cats/shop/${slug}/page-data.json`
  const res = await fetch(dataUrl)
  if (!res.ok) return { error: `page-data ${res.status}`, href, name }
  const json = await res.json()
  const s = JSON.stringify(json)

  const ingredientMatches = [...s.matchAll(/"name":"([^"]+)","drupal_internal__tid":\d+,"is_primary":(true|false)/g)]
  const ingredients = ingredientMatches.map(m => m[1]).join(', ') || null

  const kcalMatch = /(\d+(?:\.\d+)?)\s*kcal\/cup/i.exec(s)
  const kcal = kcalMatch ? Number(kcalMatch[1]) : null

  const pdfMatch = /https?:\/\/[^"]+\.pdf/i.exec(s)
  let protein = null, fat = null, fiber = null, moisture = null
  if (pdfMatch) {
    try {
      const pdfRes = await fetch(pdfMatch[0])
      const buf = new Uint8Array(await pdfRes.arrayBuffer())
      const doc = await getDocumentProxy(buf)
      const { text } = await extractText(doc, { mergePages: true })
      protein = numFromGA(text, /Crude Protein[^%\n]*?(\d+(?:\.\d+)?)\s*%/i)
      fat = numFromGA(text, /Crude Fat[^%\n]*?(\d+(?:\.\d+)?)\s*%/i)
      fiber = numFromGA(text, /Crude Fiber[^%\n]*?(\d+(?:\.\d+)?)\s*%/i)
      moisture = numFromGA(text, /Moisture[^%\n]*?(\d+(?:\.\d+)?)\s*%/i)
    } catch (e) {
      // GA PDF parse failed -- leave GA fields null, still keep ingredients/kcal.
    }
  }

  const { brand, subBrand } = classify(name)
  const form = formOf(name)
  const fullProductName = name.replace(/\s*(Dry|Wet|Canned) Cat Food\s*$/i, '').trim()

  return {
    food_id: slugify(brand, subBrand, fullProductName, form),
    owner: 'Nestlé',
    brand,
    sub_brand: subBrand,
    full_product_name: fullProductName,
    form,
    protein,
    protein_DMB: null,
    kcal,
    moisture,
    ingredients,
    notes: null,
    fat,
    fiber,
    source_url: `https://www.purina.com${href}`,
    source_pdf: pdfMatch ? pdfMatch[0] : null,
    scraped_at: new Date().toISOString(),
  }
}

function numFromGA(text, re) {
  const m = re.exec(text)
  return m ? Number(m[1]) : null
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  console.log('Discovering products on', CATEGORY_URL, '...')
  const products = await discoverProducts(page)
  await browser.close()
  console.log(`Found ${products.length} product links.`)

  const toScrape = products.slice(0, LIMIT)
  const results = []
  for (const [i, p] of toScrape.entries()) {
    process.stdout.write(`[${i + 1}/${toScrape.length}] ${p.name}... `)
    try {
      const record = await scrapeProduct(p)
      results.push(record)
      console.log(record.error ? `ERROR: ${record.error}` : 'ok')
    } catch (e) {
      console.log('ERROR:', e.message)
      results.push({ error: e.message, ...p })
    }
  }

  const ok = results.filter(r => !r.error)
  console.log(`\nScraped ${ok.length}/${results.length} successfully.`)
  console.log(`With ingredients: ${ok.filter(r => r.ingredients).length}, with kcal: ${ok.filter(r => r.kcal != null).length}, with GA protein: ${ok.filter(r => r.protein != null).length}`)

  if (DRY_RUN) {
    mkdirSync(new URL('out/', import.meta.url), { recursive: true })
    writeFileSync(new URL('out/scraped-purina.json', import.meta.url), JSON.stringify(results, null, 2))
    console.log('Dry run: wrote scripts/out/scraped-purina.json (not seeded to Firestore). Re-run with --write to seed the foods_staging collection.')
  } else {
    const { initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    const { readFileSync } = await import('node:fs')
    const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)))
    initializeApp({ credential: cert(serviceAccount) })
    const db = getFirestore()
    let batch = db.batch()
    let n = 0
    for (const record of ok) {
      batch.set(db.collection('foods_staging').doc(record.food_id), record)
      n++
      if (n % 400 === 0) { await batch.commit(); batch = db.batch() }
    }
    await batch.commit()
    console.log(`Wrote ${ok.length} records to Firestore collection 'foods_staging'.`)
  }
}

main()
