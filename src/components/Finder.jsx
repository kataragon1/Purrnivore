import { useEffect, useMemo, useState } from 'react'
import AdvancedSearch from './AdvancedSearch'
import { evaluateRules, compareBy, compareWithTiebreak, FIELD_BY_KEY } from '../lib/query'
import { buildIngredientVocabulary } from '../lib/ingredientVocab'
import { FODMAP_LEVELS, fodmapRank, fodmapLabel } from '../lib/fodmapScale'

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

// Sortable table columns. Click a header: if it's already the primary sort
// column, flip its direction; otherwise it becomes primary (moved to front)
// and everything else falls back to tiebreaker order. Drag a header to
// reorder sort priority directly.
const DEFAULT_COLUMN_ORDER = ['fodmap', 'brand', 'animal', 'protein', 'kcal']
const DEFAULT_COLUMN_DIR = { fodmap: 'asc', brand: 'asc', animal: 'desc', protein: 'desc', kcal: 'asc' }
const COLUMN_LABELS = { brand: 'Food', fodmap: 'FODMAP risk', animal: 'Animal', kcal: 'Kcal' }

function columnValue(key, f, view) {
  switch (key) {
    case 'brand': return f.brand || ''
    case 'fodmap': return fodmapRank(f) ?? 99
    case 'animal': return f.animal_idx ?? -1
    case 'protein': return proteinValue(f, view) ?? -1
    case 'kcal': return f.kcal ?? Infinity
    default: return 0
  }
}

function compareColumn(key, dir, a, b, view) {
  const av = columnValue(key, a, view)
  const bv = columnValue(key, b, view)
  const mul = dir === 'asc' ? 1 : -1
  if (typeof av === 'string') return mul * av.localeCompare(bv)
  return mul * (av - bv)
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
  const [searchScope, setSearchScope] = useState('all')
  const [fodmapOn, setFodmapOn] = useState([])
  const [minAnimal, setMinAnimal] = useState(0)
  const [maxKcal, setMaxKcal] = useState(600)
  const [minProtein, setMinProtein] = useState(0)
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER)
  const [columnDir, setColumnDir] = useState(DEFAULT_COLUMN_DIR)
  const [dragKey, setDragKey] = useState(null)
  const [selected, setSelected] = useState(null)

  function clickColumn(key) {
    if (columnOrder[0] === key) {
      setColumnDir(d => ({ ...d, [key]: d[key] === 'asc' ? 'desc' : 'asc' }))
    } else {
      setColumnOrder(order => [key, ...order.filter(k => k !== key)])
    }
  }

  function dropColumn(targetKey) {
    if (!dragKey || dragKey === targetKey) return
    setColumnOrder(order => {
      const without = order.filter(k => k !== dragKey)
      const idx = without.indexOf(targetKey)
      return [...without.slice(0, idx), dragKey, ...without.slice(idx)]
    })
    setDragKey(null)
  }
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
    setSearchScope('all')
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
        const hay = searchScope === 'names'
          ? ((f.brand || '') + ' ' + (f.full_product_name || '')).toLowerCase()
          : ((f.brand || '') + ' ' + (f.full_product_name || '') + ' ' + (f.ingredients || '')).toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (fodmapOn.length && !fodmapOn.includes(fodmapRank(f))) return false
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
      const visible = columnOrder.filter(k => view === 'dry' || k !== 'kcal')
      out.sort((a, b) => {
        for (const key of visible) {
          const c = compareColumn(key, columnDir[key], a, b, view)
          if (c) return c
        }
        return 0
      })
    }
    return out
  }, [foods, view, query, searchScope, fodmapOn, minAnimal, maxKcal, minProtein, columnOrder, columnDir, customRules, customSort, customTiebreak])

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
            <div className="chips">
              <span className={`chip${searchScope === 'names' ? ' on' : ''}`} onClick={() => setSearchScope('names')}>Names only</span>
              <span className={`chip${searchScope === 'all' ? ' on' : ''}`} onClick={() => setSearchScope('all')}>Names + ingredients</span>
            </div>
          </div>
          <div className="fgroup">
            <label>FODMAP risk</label>
            <div className="chips">
              {FODMAP_LEVELS.map((label, rank) => (
                <span
                  key={rank}
                  className={`chip r-rank-${rank}${fodmapOn.includes(rank) ? ' on' : ''}`}
                  onClick={() => setFodmapOn(toggleValue(fodmapOn, rank))}
                >{label}</span>
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
            <div className="sort-hint">Click a column to sort, click again to flip, drag to reorder priority</div>
          </div>
          <table>
            <thead>
              <tr>
                {columnOrder.filter(k => view === 'dry' || k !== 'kcal').map((key, i) => (
                  <th
                    key={key}
                    draggable
                    onDragStart={() => setDragKey(key)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => dropColumn(key)}
                    onClick={() => clickColumn(key)}
                    className={i === 0 ? 'sort-primary' : ''}
                  >
                    {key === 'protein' ? proteinLabel(view) : COLUMN_LABELS[key]}
                    {i === 0 && <span className="sort-arrow">{columnDir[key] === 'asc' ? ' ↑' : ' ↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((f, i) => (
                <tr key={i} onClick={() => setSelected(f)}>
                  {columnOrder.filter(k => view === 'dry' || k !== 'kcal').map(key => {
                    if (key === 'brand') return <td key={key}><div className="food-brand">{f.brand}</div><div className="food-name">{f.full_product_name}</div></td>
                    if (key === 'fodmap') return <td key={key}><span className={`pill p-rank-${fodmapRank(f)}`}>{fodmapLabel(f)}</span></td>
                    if (key === 'animal') return <td key={key}><AnimalMeter value={f.animal_idx} band={f.animal_band} /></td>
                    if (key === 'protein') return <td key={key} className="num">{proteinValue(f, view) ?? '–'}</td>
                    if (key === 'kcal') return <td key={key} className="num">{f.kcal ?? '–'}</td>
                    return null
                  })}
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
                <div className="metric"><span>FODMAP risk</span><b>{fodmapLabel(selected)}</b></div>
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
