import { useEffect, useMemo, useState } from 'react'

const ORDER = { Excellent: 0, Good: 1, Moderate: 2, Poor: 3, Avoid: 4 }
const FODMAP_RATINGS = ['Excellent', 'Good', 'Moderate', 'Poor', 'Avoid']
const TYPES = ['dry', 'wet']

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

export default function Finder({ foods }) {
  const [query, setQuery] = useState('')
  const [fodmapOn, setFodmapOn] = useState([])
  const [typeOn, setTypeOn] = useState([])
  const [minAnimal, setMinAnimal] = useState(0)
  const [maxKcal, setMaxKcal] = useState(600)
  const [minProtein, setMinProtein] = useState(0)
  const [fishFree, setFishFree] = useState(false)
  const [noProbiotic, setNoProbiotic] = useState(false)
  const [sortKey, setSortKey] = useState('fodmap')
  const [selected, setSelected] = useState(null)

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
    setTypeOn([])
    setMinAnimal(0)
    setMaxKcal(600)
    setMinProtein(0)
    setFishFree(false)
    setNoProbiotic(false)
  }

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    const out = foods.filter(f => {
      if (q) {
        const hay = ((f.brand || '') + ' ' + (f.full_product_name || '') + ' ' + (f.ingredients || '')).toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (fodmapOn.length && !fodmapOn.includes(f.fodmap_rating)) return false
      if (typeOn.length && !typeOn.includes(f.form)) return false
      if (minAnimal > 0 && (f.animal_idx == null || f.animal_idx < minAnimal)) return false
      if (maxKcal < 600 && (f.kcal == null || f.kcal > maxKcal)) return false
      if (minProtein > 0 && (f.protein == null || f.protein < minProtein)) return false
      if (fishFree && !f.fish_free) return false
      if (noProbiotic && f.has_probiotic) return false
      return true
    })
    out.sort((a, b) => {
      switch (sortKey) {
        case 'fodmap': return (ORDER[a.fodmap_rating] - ORDER[b.fodmap_rating]) || ((b.animal_idx || 0) - (a.animal_idx || 0))
        case 'animal': return (b.animal_idx || 0) - (a.animal_idx || 0)
        case 'protein': return (b.protein || 0) - (a.protein || 0)
        case 'kcal_lo': return (a.kcal || 9999) - (b.kcal || 9999)
        case 'kcal_hi': return (b.kcal || 0) - (a.kcal || 0)
        case 'brand': return (a.brand || '').localeCompare(b.brand || '')
        default: return 0
      }
    })
    return out
  }, [foods, query, fodmapOn, typeOn, minAnimal, maxKcal, minProtein, fishFree, noProbiotic, sortKey])

  return (
    <section className="wrap">
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
            <label>Form</label>
            <div className="chips">
              {TYPES.map(t => (
                <span
                  key={t}
                  className={`chip${typeOn.includes(t) ? ' on' : ''}`}
                  onClick={() => setTypeOn(toggleValue(typeOn, t))}
                >{t}</span>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <label>Min animal-protein index <span className="rangeval">{minAnimal}</span></label>
            <div className="rangerow">
              <input type="range" min="0" max="100" step="5" value={minAnimal} onChange={e => setMinAnimal(+e.target.value)} />
            </div>
          </div>
          <div className="fgroup">
            <label>Max calories / cup <span className="rangeval">{maxKcal >= 600 ? 'any' : maxKcal}</span></label>
            <div className="rangerow">
              <input type="range" min="200" max="600" step="10" value={maxKcal} onChange={e => setMaxKcal(+e.target.value)} />
            </div>
          </div>
          <div className="fgroup">
            <label>Min protein % <span className="rangeval">{minProtein}</span></label>
            <div className="rangerow">
              <input type="range" min="0" max="60" step="1" value={minProtein} onChange={e => setMinProtein(+e.target.value)} />
            </div>
          </div>
          <div className="fgroup">
            <label>Requirements</label>
            <label className="toggle">
              <input type="checkbox" checked={fishFree} onChange={e => setFishFree(e.target.checked)} /> Fish-free only
            </label>
            <label className="toggle">
              <input type="checkbox" checked={noProbiotic} onChange={e => setNoProbiotic(e.target.checked)} /> No added probiotics
            </label>
          </div>
          <button className="reset" onClick={resetFilters}>Reset all filters</button>
        </aside>

        <div className="results">
          <div className="results-head">
            <div className="count"><b>{results.length}</b> foods match</div>
            <select className="sortsel" value={sortKey} onChange={e => setSortKey(e.target.value)}>
              <option value="fodmap">Sort: FODMAP (best first)</option>
              <option value="animal">Sort: Animal index (high first)</option>
              <option value="protein">Sort: Protein (high first)</option>
              <option value="kcal_lo">Sort: Calories (low first)</option>
              <option value="kcal_hi">Sort: Calories (high first)</option>
              <option value="brand">Sort: Brand (A&ndash;Z)</option>
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th onClick={() => setSortKey('brand')}>Food</th>
                <th onClick={() => setSortKey('fodmap')}>FODMAP</th>
                <th onClick={() => setSortKey('animal')}>Animal</th>
                <th onClick={() => setSortKey('protein')}>Prot%</th>
                <th onClick={() => setSortKey('kcal_lo')}>Kcal</th>
                <th>Form</th>
              </tr>
            </thead>
            <tbody>
              {results.map((f, i) => (
                <tr key={i} onClick={() => setSelected(f)}>
                  <td><div className="food-brand">{f.brand}</div><div className="food-name">{f.full_product_name}</div></td>
                  <td><span className={`pill p-${f.fodmap_rating}`}>{f.fodmap_rating}</span></td>
                  <td><span className={`band band-${f.animal_band}`}>{f.animal_idx ?? '–'} {f.animal_band ? `· ${f.animal_band}` : ''}</span></td>
                  <td className="num">{f.protein ?? '–'}</td>
                  <td className="num">{f.kcal ?? '–'}</td>
                  <td className="band">{f.form}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <div className="empty">No foods match these filters. Try loosening a constraint &mdash; the combination of low calories, high animal protein, and clean FODMAP is genuinely rare.</div>
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
                <div className="metric"><span>Animal idx</span><b>{selected.animal_idx ?? '–'}</b></div>
                <div className="metric"><span>Protein</span><b>{selected.protein ?? '–'}%</b></div>
                <div className="metric"><span>Kcal/cup</span><b>{selected.kcal ?? '–'}</b></div>
              </div>
              <div className="flags">
                <span className={`flag ${selected.fish_free ? 'yes' : 'no'}`}>{selected.fish_free ? '✓' : '✗'} fish-free</span>
                <span className={`flag ${selected.has_probiotic ? 'no' : 'yes'}`}>{selected.has_probiotic ? 'contains' : 'no'} probiotic</span>
              </div>
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
