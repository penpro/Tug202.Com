import { Link } from 'react-router-dom'
import { org, nav, vessel } from '../site.config.js'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img src="/images/crest.png" alt="" className="footer-crest" />
            <h4>{org.name}</h4>
            <p>
              A Washington {org.taxStatus} preserving the historic 1944 ocean tug and Coast Guard
              cutter <em>Comanche</em> — one of the last WWII museum ships still underway under her own
              power — as a living platform for maritime heritage, education and community service.
            </p>
            <p className="small">EIN {org.ein} &middot; {org.city}</p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              {nav.map(n => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4>Get involved</h4>
            <ul>
              <li><Link to="/volunteer">Volunteer</Link></li>
              <li><Link to="/support">Donate</Link></li>
              <li><Link to="/visit">Plan a visit</Link></li>
              <li><Link to="/partner">Partner for a cruise</Link></li>
              <li><Link to="/contact">Contact the board</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={`mailto:${org.email}`}>{org.email}</a></li>
              {org.phone && <li><a href={`tel:${org.phone}`}>{org.phone}</a></li>}
              <li><a href={org.facebook} target="_blank" rel="noreferrer">Facebook</a></li>
            </ul>
            <p className="small" style={{ marginTop: 14 }}>
              Comanche cruises in partnership with other nonprofits and community organizations.
              She is not a charter vessel and does not offer paid rides or commercial passenger service.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} {org.name}. All rights reserved.</span>
          <span>Official No. {vessel.officialNumber} &middot; Hailing port {vessel.hailingPort}</span>
        </div>
      </div>
    </footer>
  )
}
