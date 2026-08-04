export default function Method() {
  return (
    <section className="wrap">
      <div className="method">
        <h2>How the scoring works</h2>
        <p>Two numbers on a cat-food bag mislead people managing a sensitive gut: the <em>crude protein percentage</em> (which counts plant protein equally with meat) and the <em>&ldquo;gastrointestinal&rdquo; or &ldquo;grain-free&rdquo; positioning</em> (which often means added fermentable fiber). This index re-scores every food on what actually matters for a carnivore with bacterial overgrowth.</p>

        <h3>Axis 1 &mdash; FODMAP risk (prebiotic-gated)</h3>
        <p>The rating hinges on one distinction: <b>purified prebiotics</b> (fructooligosaccharides/FOS, inulin, chicory root) versus <b>whole legumes</b> (peas, lentils, chickpeas). Purified prebiotics are added specifically to ferment &mdash; they are potent substrate for a small-intestinal overgrowth even in tiny amounts. Whole legumes are a milder, slower-fermenting concern. So the scale gates on the former. This describes the fermentable-load level in the food, not a verdict on the food itself &mdash; what counts as risky depends entirely on the individual cat:</p>
        <div className="scale">
          <div className="scale-row"><div className="scale-tag" style={{ background: 'var(--excellent)' }}>Minimal</div><div className="scale-desc">Nothing fermentable. No prebiotics, no legumes.</div></div>
          <div className="scale-row"><div className="scale-tag" style={{ background: 'var(--good)' }}>Low</div><div className="scale-desc">Only trace fermentable content (e.g. pea starch, a yeast-derived MOS).</div></div>
          <div className="scale-row"><div className="scale-tag" style={{ background: 'var(--moderate)' }}>Moderate</div><div className="scale-desc">Whole legumes present, but <em>no</em> purified prebiotic. Considerable &mdash; watch stool.</div></div>
          <div className="scale-row"><div className="scale-tag" style={{ background: 'var(--poor)' }}>Elevated</div><div className="scale-desc">Contains a purified prebiotic (FOS/inulin/chicory), or a heavy legume load.</div></div>
          <div className="scale-row"><div className="scale-tag" style={{ background: 'var(--avoid)' }}>High</div><div className="scale-desc">Purified prebiotic plus a heavy fermentable load.</div></div>
        </div>
        <div className="callout">The guiding principle: <b>if a food is even a candidate for a sensitive gut, it isn&rsquo;t a true &ldquo;Elevated&rdquo; risk.</b> Whole legumes alone never push past Moderate; it takes an added purified prebiotic to sink a food.</div>

        <h3>Axis 2 &mdash; Animal-protein index (0&ndash;100)</h3>
        <p>An estimate of what fraction of a food&rsquo;s protein comes from animal sources rather than plant concentrates (pea protein, corn gluten meal, soy protein isolate, potato protein). It is a <em>position-weighted ingredient heuristic</em>, not a lab assay &mdash; ingredients earlier in the deck count more. It exists because crude protein % hides the difference between a 50%-protein food built on soy isolate and one built on chicken.</p>
        <table className="mini">
          <tbody>
            <tr><th>Band</th><th>Index</th><th>Meaning</th></tr>
            <tr><td>High</td><td>&ge; 85</td><td>Predominantly animal protein</td></tr>
            <tr><td>Mod</td><td>65&ndash;84</td><td>Mixed animal/plant</td></tr>
            <tr><td>Low</td><td>&lt; 65</td><td>Substantially plant/by-product protein</td></tr>
          </tbody>
        </table>
        <div className="callout"><b>Known limitation:</b> the index credits any animal-derived ingredient, so <b>hydrolyzed or feather/by-product proteins score as &ldquo;animal&rdquo; despite poor biological quality.</b> A hydrolyzed-liver or feather-meal elimination diet can read High on this axis while being a poor muscle food. Read the ingredient deck, not just the band.</div>

        <h3>Why these two axes together</h3>
        <p>A food has to clear <em>both</em> to suit a carnivore with overgrowth: clean FODMAP (won&rsquo;t feed the bacteria) <em>and</em> high animal protein (rebuilds muscle, is absorbed high in the gut rather than fermenting lower down). Most of the market fails one or the other. The premium grain-free shelf tends to fail FODMAP (legumes + chicory/inulin). The prescription shelf tends to fail animal protein (corn gluten, soy isolate) and often FODMAP too (added FOS).</p>
      </div>
    </section>
  )
}
