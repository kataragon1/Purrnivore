import { useEffect, useState } from 'react'
import Finder from './components/Finder'
import Method from './components/Method'
import About from './components/About'
import CatLoader from './components/CatLoader'
import { fetchFoods } from './lib/firebase'
import { fodmapRank } from './lib/fodmapScale'

function App() {
  const [tab, setTab] = useState('finder')
  const [foods, setFoods] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(null)

  useEffect(() => {
    fetchFoods().then(setFoods).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}version.json`).then(r => r.json()).then(v => setVersion(v.version)).catch(() => {})
  }, [])

  return (
    <>
      <header>
        <div className="wrap">
          <div className="masthead">
            <div>
              <div className="logo"><span className="paw">🐾</span><span className="lc-the">the</span>WhiskerDish {version && <span className="idx">v{version}</span>}</div>
            </div>
            <div className="tagline">The real dish on what&rsquo;s in the bowl</div>
          </div>
          <nav className="tabs">
            <button className={tab === 'finder' ? 'active' : ''} onClick={() => setTab('finder')}>Finder</button>
            <button className={tab === 'method' ? 'active' : ''} onClick={() => setTab('method')}>Method</button>
            <button className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>About</button>
          </nav>
        </div>
      </header>

      <div className="wrap">
        <div className="intro">
          <h1>Find the food that actually fits your cat.</h1>
          <p>A scored, searchable database of commercial cat foods &mdash; built so you can search on whatever <em>your</em> cat&rsquo;s diet actually requires, not just the handful of filters a pet store gives you. Diabetic, kidney, urinary, weight management, IBD, food-sensitive, or just curious what&rsquo;s really in the bag: how much of a food&rsquo;s protein is genuinely <em>animal</em> vs. plant concentrate, whether it contains <em>purified prebiotics</em> that ferment in a sensitive gut, who actually makes it, or whatever else you need to rule in or out.</p>
          {foods && (
            <div className="stat-row">
              <div className="stat"><b>{foods.length}</b><span>foods scored</span></div>
              <div className="stat"><b>{new Set(foods.map(f => f.brand)).size}</b><span>brands</span></div>
              <div className="stat"><b>{foods.filter(f => fodmapRank(f) === 0).length}</b><span>minimal FODMAP risk</span></div>
              <div className="stat"><b>{foods.filter(f => f.animal_band === 'High').length}</b><span>high animal-protein index</span></div>
            </div>
          )}
        </div>
      </div>

      {tab === 'finder' && error && <div className="wrap"><p>Couldn&rsquo;t load foods from Firestore: {error}</p></div>}
      {tab === 'finder' && !foods && !error && <div className="wrap"><CatLoader /></div>}
      {tab === 'finder' && foods && <Finder foods={foods} />}
      {tab === 'method' && <Method />}
      {tab === 'about' && <About />}

      <footer>
        <div className="wrap">
          theWhiskerDish &mdash; scores computed from published ingredient decks &middot; not veterinary advice<br />
          FODMAP risk is prebiotic-gated &middot; animal-protein index is a position-weighted heuristic, not a lab assay &middot; verify current labels before purchase
        </div>
      </footer>
    </>
  )
}

export default App
