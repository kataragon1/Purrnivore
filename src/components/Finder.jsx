import { useEffect, useMemo, useState } from 'react'
import AdvancedSearch from './AdvancedSearch'
import { evaluateRules, compareBy, compareWithTiebreak, FIELD_BY_KEY } from '../lib/query'
import { buildIngredientVocabulary } from '../lib/ingredientVocab'

const ORDER = { Excellent: 0, Good: 1, Moderate: 2, Poor: 3, Avoid: 4 }
const FODMAP_RATINGS = ['Excellent', 'Good', 'Moderate', 'Poor', 'Avoid']
const VIEWS = [
  { key: 'dry', label: 'Dry food' },
  { key: 'wet', label: 'Wet food' },
  { key: 'treats', label: 'Treats' },
]

// Treats/toppers are flagged separately from form (dry/wet) since they're
// not complete-and-balanced foods and shouldn't be compared alongside them.
function categoryOf(f) {
  return f.likely_treat ? 'treats' : f.form
}

// Wet food is diluted by moisture, so its as-fed protein % isn't comparable
// to dry food's -- show the moisture-normalized (DMB) figure when available.
function proteinValue(f, view) {
  return view === 'wet' ? (f.protein_DMB ?? f.protein) : f.protein
}
function proteinLabel(view) {
  return view === 'wet' ? 'Prot% (DMB)' : 'Prot%'
}

function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

function highlightIngredients(text) {
  let html = esc(text || 'No ingredient data.')
  html = html.replace(/(fructooligosaccharides?|\binulin\b|chicory root|chicory|\bFOS\b)/gi, '<mark>$1</mark>')
  html = html.replace(/(\bpeas?\b|lentils?|chickpeas?|pea protein|potato protein|corn gluten meal|soy protein isolate|hydrolyzed soy)/gi, '<mark class="leg">$1</mark>')
  return html
}

function toggleValue(list, val) {
  return list.includes(val) ? list.filter(v => v !== val) : [...list, val]
}

function AnimalMeter({ value, band }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value))
  return (
    <span className="meter">
      <span className="meter-track"><span className={`meter-fill band-${band}`} style={{ width: `${pct}%` }} /></span>
      <span className="meter-num">{value ?? '–'}</span>
    </span>
  )
}

export default function Finder({ foods }) {
  const [view, setView] = useState('dry')
  const [query, setQuery] = useState('')
  const [fodmapOn, setFodmapOn] = useState([])
  const [minAnimal, setMinAnimal] = useState(0)
  const [maxKcal, setMaxKcal] = useState(600)
  const [minProtein, setMinProtein] = useState(0)
  const [sortKey, setSortKey] = useState('fodmap')
  const [selected, setSelected] = useState(null)
  const [customRules, setCustomRules] = useState([])
  const [customSort, setCustomSort] = useState(null)
  const [customTiebreak, setCustomTiebreak] = useState(null)
  const ingredientVocab = useMemo(() => buildIngredientVocabulary(foods), [foods])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function resetFilters() {
    setQuery('')
    setFodmapOn([])
    setMinAnimal(0)
    setMaxKcal(600)
    setMinProtein(0)
  }

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    const out = foods.filter(f => {
      if (categoryOf(f) !== view) return false
      if (q) {
        const hay = ((f.brand || '') + ' ' + (f.full_product_name || '') + ' ' + (f.ingredients || '')).toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (fodmapOn.length && !fodmapOn.includes(f.fodmap_rating)) return false
      if (minAnimal > 0 && (f.animal_idx == null || f.animal_idx < minAnimal)) return false
      if (view === 'dry' && maxKcal < 600 && (f.kcal == null || f.kcal > maxKcal)) return false
      const prot = proteinValue(f, view)
      if (minProtein > 0 && (prot == null || prot < minProtein)) return false
      if (customRules.length && !evaluateRules(f, customRules)) return false
      return true
    })
    if (customSort) {
      const primary = compareBy(customSort.field, customSort.dir)
      const secondary = customTiebreak ? compareBy(customTiebreak.field, customTiebreak.dir) : null
      out.sort(compareWithTiebreak(primary, secondary))
    } else {
      out.sort((a, b) => {
        switch (sortKey) {
          case 'fodmap': return (ORDER[a.fodmap_rating] - ORDER[b.fodmap_rating]) || ((b.animal_idx || 0) - (a.animal_idx || 0))
          case 'animal': return (b.animal_idx || 0) - (a.animal_idx || 0)
          case 'protein': return (proteinValue(b, view) || 0) - (proteinValue(a, view) || 0)
          case 'kcal_lo': return (a.kcal || 9999) - (b.kcal || 9999)
          case 'kcal_hi': return (b.kcal || 0) - (a.kcal || 0)
          case 'brand': return (a.brand || '').localeCompare(b.brand || '')
          default: return 0
        }
      })
    }
    return out
  }, [foods, view, query, fodmapOn, minAnimal, maxKcal, minProtein, sortKey, customRules, customSort, customTiebreak])

  return (
    <section className="wrap">
      <div className="view-tabs">
        {VIEWS.map(v => (
          <button key={v.key} className={view === v.key ? 'active' : ''} onClick={() => setView(v.key)}>{v.label}</button>
        ))}
      </div>
      <div className="finder">
        <aside className="filters">
          <h3>Filter</h3>
          <div className="fgroup">
            <label>Search brand or ingredient</label>
            <input
              className="searchbox"
              placeholder="e.g. chicory, rabbit, instinct"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="fgroup">
            <label>FODMAP rating</label>
            <div className="chips">
              {FODMAP_RATINGS.map(r => (
                <span
                  key={r}
                  className={`chip r-${r}${fodmapOn.includes(r) ? ' on' : ''}`}
                  onClick={() => setFodmapOn(toggleValue(fodmapOn, r))}
                >{r}</span>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <label>Min animal-protein index <span className="rangeval">{minAnimal}</span></label>
            <div className="rangerow">
              <input type="range" min="0" max="100" step="5" value={minAnimal} onChange={e => setMinAnimal(+e.target.value)} />
            </div>
          </div>
          {view === 'dry' && (
            <div className="fgroup">
              <label>Max calories / cup <span className="rangeval">{maxKcal >= 600 ? 'any' : maxKcal}</span></label>
              <div className="rangerow">
                <input type="range" min="200" max="600" step="10" value={maxKcal} onChange={e => setMaxKcal(+e.target.value)} />
              </div>
            </div>
          )}
          <div className="fgroup">
            <label>Min {proteinLabel(view)} <span className="rangeval">{minProtein}</span></label>
            <div className="rangerow">
              <input type="range" min="0" max="60" step="1" value={minProtein} onChange={e => setMinProtein(+e.target.value)} />
            </div>
          </div>
          <button className="reset" onClick={resetFilters}>Reset all filters</button>

          <AdvancedSearch
            rules={customRules}
            onRulesChange={setCustomRules}
            sort={customSort}
            onSortChange={setCustomSort}
            tiebreak={customTiebreak}
            onTiebreakChange={setCustomTiebreak}
            ingredientVocab={ingredientVocab}
          />
        </aside>

        <div className="results">
          <div className="results-head">
            <div className="count"><b>{results.length}</b> {view} foods match</div>
            <select className="sortsel" value={sortKey} onChange={e => setSortKey(e.target.value)}>
              <option value="fodmap">Sort: FODMAP (lowest fermentable-load first)</option>
              <option value="animal">Sort: Animal index (high first)</option>
              <option value="protein">Sort: {proteinLabel(view)} (high first)</option>
              {view === 'dry' && <option value="kcal_lo">Sort: Calories (low first)</option>}
              {view === 'dry' && <option value="kcal_hi">Sort: Calories (high first)</option>}
              <option value="brand">Sort: Brand (A&ndash;Z)</option>
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th onClick={() => setSortKey('brand')}>Food</th>
                <th onClick={() => setSortKey('fodmap')}>FODMAP</th>
                <th onClick={() => setSortKey('animal')}>Animal</th>
                <th onClick={() => setSortKey('protein')}>{proteinLabel(view)}</th>
                {view === 'dry' && <th onClick={() => setSortKey('kcal_lo')}>Kcal</th>}
              </tr>
            </thead>
            <tbody>
              {results.map((f, i) => (
                <tr key={i} onClick={() => setSelected(f)}>
                  <td><div className="food-brand">{f.brand}</div><div className="food-name">{f.full_product_name}</div></td>
                  <td><span className={`pill p-${f.fodmap_rating}`}>{f.fodmap_rating}</span></td>
                  <td><AnimalMeter value={f.animal_idx} band={f.animal_band} /></td>
                  <td className="num">{proteinValue(f, view) ?? '–'}</td>
                  {view === 'dry' && <td className="num">{f.kcal ?? '–'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <div className="empty">No {view} foods match these filters. Try loosening a constraint.</div>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-bg show" onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <div className="food-brand">{selected.brand}</div>
                <div className="food-name">{selected.full_product_name}</div>
              </div>
              <button className="mclose" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="metrics">
                <div className="metric"><span>FODMAP</span><b>{selected.fodmap_rating}</b></div>
                <div className="metric"><span>Animal idx</span><b><AnimalMeter value={selected.animal_idx} band={selected.animal_band} /></b></div>
                <div className="metric"><span>{proteinLabel(selected.form)}</span><b>{proteinValue(selected, selected.form) ?? '–'}%</b></div>
                <div className="metric"><span>Kcal/cup</span><b>{selected.form === 'dry' ? (selected.kcal ?? '–') : 'n/a'}</b></div>
              </div>
              {customRules.filter(r => FIELD_BY_KEY[r.field]?.type === 'boolean' && r.value !== '').length > 0 && (
                <div className="flags">
                  {customRules.filter(r => FIELD_BY_KEY[r.field]?.type === 'boolean' && r.value !== '').map(r => {
                    const on = Boolean(selected[r.field])
                    return (
                      <span key={r.id} className={`flag ${on ? 'yes' : 'no'}`}>{on ? '✓' : '✗'} {FIELD_BY_KEY[r.field].label.toLowerCase()}</span>
                    )
                  })}
                </div>
              )}
              <div className="detail-label">
                Ingredients <span style={{ color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>(fermentable additives highlighted)</span>
              </div>
              <div className="ingredients" dangerouslySetInnerHTML={{ __html: highlightIngredients(selected.ingredients) }} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
