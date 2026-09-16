import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { nav } from '../site.config.js'

export default function Header() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand" onClick={close}>
          <img src="/images/crest.png" alt="" width="44" height="44" />
          <span className="brand-text">
            <span className="brand-name">Tug Comanche</span><br />
            <span className="brand-sub">ATA-202 &middot; WMEC-202</span>
          </span>
        </Link>
        <button
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          {open ? '✕' : '☰'}
        </button>
        <nav className={`nav${open ? ' open' : ''}`} aria-label="Primary">
          {nav.filter(n => n.to !== '/support').map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={close}>
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/support" className="nav-cta" onClick={close}>Donate</NavLink>
        </nav>
      </div>
    </header>
  )
}
