# theWhiskerDish

A searchable database of commercial cat foods — search on whatever your cat's diet actually requires (diabetic, kidney, urinary, weight, IBD, food-sensitive, or just curious what's really in the bag), not just the handful of filters a pet store gives you. Two built-in scoring axes: **FODMAP risk** (does it contain fermentable prebiotics/legumes) and **animal-protein index** (how much of the protein is genuinely animal vs. plant concentrate), plus a generic Advanced Search builder for anything else. Built with React + Vite + Firestore.

(Formerly "Purrnivore" — renamed to avoid the phonetic association.)

## Getting started

```bash
npm install
npm run dev
```

## Data

`src/data/foods.json` holds the current dataset (384 scored foods as of the initial seed). It was extracted from a prior working prototype (`reference/prototype.html`) built in an earlier session.

Reference files kept for provenance, not used at runtime:

- `reference/prototype.html` — the original single-file HTML/JS prototype the scoring logic and UI were ported from
- `reference/carnivore_raw.json` — earlier, unscored pull of foods (371 records, `_needs_scoring: true`)
- `reference/Carnivore_Index_DB.xlsx` — spreadsheet version of the scored dataset
- `reference/Cat_Foods_filtered_8.xlsx` — an earlier iteration of the dataset from a different session, kept for comparison

### Scoring model

- **FODMAP risk** (Minimal/Low/Moderate/Elevated/High, stored as numeric rank 0–4): gated on purified prebiotics (FOS, inulin, chicory root) vs. whole legumes (peas, lentils, chickpeas). Purified prebiotics are much worse for a sensitive gut than whole legumes — see the in-app **Method** tab for the full rubric. Labels live in one place (`src/lib/fodmapScale.js`) so wording can change without touching data.
- **Animal-protein index** (0–100): a position-weighted ingredient-list heuristic estimating what fraction of protein is animal-derived vs. plant concentrate (pea protein, corn gluten meal, soy isolate). Not a lab assay — see **Method** tab for known limitations (e.g. hydrolyzed/feather-meal proteins score as "animal" despite low quality).

## TODO

- Finish the manufacturer-site scraper (`scripts/scrape-purina.mjs`) — per-product scraping (ingredients, kcal, GA panel via PDF) is validated and working; full-catalog discovery (all products, not just the initial page batch) is still unsolved.
- Re-run the FODMAP/animal-protein scoring rubric through a real scorer module (currently done by hand/LLM, not code) once scraped data lands.
- Backfill fat/fiber/ash % (schema v2 fields, currently empty for the hand-scored seed) from scraped GA data.
- Build the provenance/reformulation-tracking pipeline (source logging, change detection, verified-date badges) once collection is real.

Not veterinary advice — scores are a heuristic starting point for narrowing a shelf, not a substitute for a vet's guidance on a diagnosed condition.
