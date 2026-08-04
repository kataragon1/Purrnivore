import { useEffect, useState } from 'react'
import Finder from './components/Finder'
import Method from './components/Method'
import About from './components/About'
import { fetchFoods } from './lib/firebase'

function App() {
  const [tab, setTab] = useState('finder')
  const [foods, setFoods] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFoods().then(setFoods).catch(e => setError(e.message))
  }, [])

  return (
    <>
      <header>
        <div className="wrap">
          <div className="masthead">
            <div>
              <div className="logo">Purrnivore <span className="idx">v0.1</span></div>
            </div>
            <div className="tagline">Feline food scoring for sensitive guts</div>
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
          <h1>Find cat foods that won&rsquo;t feed a bacterial overgrowth.</h1>
          <p>A scored database of commercial cat foods, built for cats with SIBO, IBD, or chronic dysbiosis &mdash; where the usual &ldquo;high-protein&rdquo; and &ldquo;gastrointestinal&rdquo; labels can be actively misleading. Every food is rated on two axes the bag never shows you: how much of its protein is genuinely <em>animal</em>, and whether it contains the <em>purified prebiotics</em> that ferment in an overgrown gut.</p>
          {foods && (
            <div className="stat-row">
              <div className="stat"><b>{foods.length}</b><span>foods scored</span></div>
              <div className="stat"><b>{new Set(foods.map(f => f.brand)).size}</b><span>brands</span></div>
              <div className="stat"><b>{foods.filter(f => f.fodmap_rating === 'Excellent').length}</b><span>FODMAP excellent</span></div>
              <div className="stat"><b>{foods.filter(f => f.animal_band === 'High').length}</b><span>high animal-protein</span></div>
            </div>
          )}
        </div>
      </div>

      {tab === 'finder' && error && <div className="wrap"><p>Couldn&rsquo;t load foods from Firestore: {error}</p></div>}
      {tab === 'finder' && !foods && !error && <div className="wrap"><p>Loading&hellip;</p></div>}
      {tab === 'finder' && foods && <Finder foods={foods} />}
      {tab === 'method' && <Method />}
      {tab === 'about' && <About />}

      <footer>
        <div className="wrap">
          PURRNIVORE &mdash; scores computed from published ingredient decks &middot; not veterinary advice<br />
          FODMAP rating is prebiotic-gated &middot; animal-protein index is a position-weighted heuristic, not a lab assay &middot; verify current labels before purchase
        </div>
      </footer>
    </>
  )
}

export default App
