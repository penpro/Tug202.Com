import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Seo from '../components/Seo.jsx'
import { org } from '../site.config.js'
import { mission, board, programs } from '../content/index.js'

export default function Foundation() {
  return (
    <>
      <Seo title="The Foundation" description="Tug Comanche Historical Rescue Foundation is a Washington 501(c)(3) nonprofit keeping the historic vessel Comanche operational and open to the public as a living maritime classroom." />
      <Hero
        small
        image="crew-foredeck"
        eyebrow="Who we are"
        title="The Foundation"
        lead="A volunteer-run Washington nonprofit, organized to keep Comanche afloat, documented and open to the public."
        position="center 30%"
      />

      <section className="section">
        <div className="container">
          <div className="feature">
            <div className="prose">
              <span className="eyebrow">Mission</span>
              <h2>Why Comanche matters</h2>
              <p className="lead">{mission}</p>
              <p>
                Historic working vessels are disappearing from Puget Sound. Once a ship like
                Comanche is lost, the tangible link to the region&rsquo;s wartime shipbuilding,
                towing and rescue heritage is gone for good. At the same time, young people in our
                communities have few hands-on settings that combine responsibility, skilled-trades
                exposure, history and mentorship in one place.
              </p>
              <p>
                Comanche can meet both needs at once: a real historic vessel that serves as a living
                classroom. Our job is to stabilize and document the ship, establish safe public
                access, and build the programs that let her serve the community for decades to come.
              </p>
            </div>
            <Photo name="at-the-pier" alt="Comanche moored at a city pier" />
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <span className="eyebrow">Program lanes</span>
          <h2>What the Foundation does</h2>
          <div className="grid grid-2" style={{ marginTop: 24 }}>
            {programs.map(p => (
              <div className="card" key={p.title}>
                <div className="card-body">
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Governance</span>
          <h2>Board of Directors</h2>
          <p className="lead" style={{ maxWidth: 720 }}>
            The Foundation is governed by a volunteer board and delivers its programs through
            volunteers, maritime-trades mentors and community partners.
          </p>
          <div className="board" style={{ marginTop: 24 }}>
            {board.map(b => (
              <div className="board-member" key={b.role}>
                <div className="role">{b.role}</div>
                <div className="name">{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="prose">
              <span className="eyebrow">Organization</span>
              <h2>Facts &amp; documents</h2>
              <table className="spec">
                <tbody>
                  <tr><th>Legal name</th><td>{org.name}</td></tr>
                  <tr><th>Status</th><td>Washington nonprofit corporation; IRS-recognized {org.taxStatus}</td></tr>
                  <tr><th>EIN</th><td>{org.ein}</td></tr>
                  <tr><th>Location</th><td>{org.city}</td></tr>
                  <tr><th>Vessel</th><td>Comanche, U.S. Coast Guard Official Number 647250</td></tr>
                  <tr><th>Affiliations</th><td>Historic Naval Ships Association (member vessel)</td></tr>
                </tbody>
              </table>
              <h3 style={{ marginTop: 24 }}>Public documents</h3>
              <ul className="checklist">
                <li><a href="/documents/TCHRF-Bylaws-2025-10-23.pdf">Bylaws</a> &mdash; adopted October 23, 2025 (PDF)</li>
                <li><a href="/documents/tug-comanche-donation-receipt.pdf">Donation receipt form</a> &mdash; printable, black &amp; white (PDF)</li>
                <li><Link to="/grants">Funding proposals</Link> &mdash; grant-ready project asks with budgets</li>
                <li><Link to="/support#print">Donation print kit</Link> &mdash; flyer, table card and QR code</li>
              </ul>
              <p className="small" style={{ marginTop: 10 }}>
                Donations are tax-deductible to the extent allowed by law. IRS determination letter
                and annual financials are available on request &mdash;{' '}
                <Link to="/contact">contact the Secretary</Link>.
              </p>
            </div>
            <div className="prose">
              <span className="eyebrow">How we operate</span>
              <h2>Underway, not for hire</h2>
              <p>
                Comanche is one of the last operational WWII museum ships in the world &mdash; she
                still gets underway under her own power, crewed by volunteers. <Link to="/partner">Cruises happen in
                partnership</Link> with other nonprofits, museums and community organizations, and visitors
                come aboard as guests of the Foundation and its partners.
              </p>
              <p>
                She is not a charter vessel. Comanche does not hold a Coast Guard Certificate of
                Inspection for commercial passenger service, so we do not sell rides, charters,
                towing or any other vessel service, and no donation is ever a condition of coming
                aboard. That line keeps the project honest, insurable and fundable.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
