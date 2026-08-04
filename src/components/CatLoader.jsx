export default function CatLoader({ label = 'Loading foods…' }) {
  return (
    <div className="cat-loader">
      <svg viewBox="0 0 120 90" width="72" height="54" aria-hidden="true">
        <g className="cat-body">
          <ellipse cx="55" cy="58" rx="34" ry="20" />
          <circle cx="86" cy="38" r="16" />
          <path d="M76 26 L80 12 L88 24 Z" />
          <path d="M96 24 L102 10 L104 26 Z" />
          <circle cx="80" cy="38" r="2.2" className="cat-eye" />
          <circle cx="92" cy="36" r="2.2" className="cat-eye" />
        </g>
        <path className="cat-tail" d="M24 62 C 4 62, 2 30, 20 22" fill="none" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <div className="cat-loader-label">{label}</div>
    </div>
  )
}
