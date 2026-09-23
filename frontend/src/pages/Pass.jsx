import { useParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'

// /pass/:code — the boarding pass, as a phone screen held up at the brow.
// The QR encodes this same URL, so a crew member's scanner reads the code
// straight off it.
export default function Pass() {
  const { code } = useParams()
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return (
    <section className="section"><div className="container" style={{ maxWidth: 480, textAlign: 'center' }}>
      <Seo title="Boarding pass" noindex />
      <span className="eyebrow">Tug Comanche</span>
      <h1 style={{ marginBottom: 6 }}>Boarding pass</h1>
      <p className="small">Show this to a crew member, or read the code out.</p>
      <img src={`/api/pass/${clean}.png`} alt="Boarding pass QR code"
        style={{ width: 'min(72vw, 280px)', height: 'auto', border: '10px solid #fff', outline: '1px solid var(--line)' }} />
      <p style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '2.2rem', letterSpacing: '.16em', margin: '10px 0 0' }}>{clean}</p>
      <p className="small">Lost it? Sign again at <a href="/waiver">tug202.org/waiver</a>.</p>
    </div></section>
  )
}
