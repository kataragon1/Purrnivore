# Purrnivore

A searchable database of commercial cat foods, scored on two axes that matter for cats with SIBO, IBD, or other sensitive-gut conditions: **FODMAP rating** (does it contain fermentable prebiotics/legumes) and **animal-protein index** (how much of the protein is genuinely animal vs. plant concentrate). Built with React + Vite.

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

- **FODMAP rating** (Excellent/Good/Moderate/Poor/Avoid): gated on purified prebiotics (FOS, inulin, chicory root) vs. whole legumes (peas, lentils, chickpeas). Purified prebiotics are much worse for a sensitive gut than whole legumes — see the in-app **Method** tab for the full rubric.
- **Animal-protein index** (0–100): a position-weighted ingredient-list heuristic estimating what fraction of protein is animal-derived vs. plant concentrate (pea protein, corn gluten meal, soy isolate). Not a lab assay — see **Method** tab for known limitations (e.g. hydrolyzed/feather-meal proteins score as "animal" despite low quality).

## TODO

- **Build a scraper** to expand and keep the dataset current. The 384-food seed was hand/LLM-assembled and is already stale in places — some records have data quality issues (e.g. a few entries have the full product name jammed into `brand` with `flavor: null`).
- Re-run the FODMAP/animal-protein scoring rubric against any newly scraped foods (currently done by hand/LLM, not code).
- Consider a real backend/DB once the dataset outgrows a static JSON file bundled with the app.

Not veterinary advice — scores are a heuristic starting point for narrowing a shelf, not a substitute for a vet's guidance on a diagnosed condition.
