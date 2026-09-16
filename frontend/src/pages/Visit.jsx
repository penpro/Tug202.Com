import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Seo from '../components/Seo.jsx'
import { formatDate } from './Home.jsx'
import { org, location } from '../site.config.js'

export default function Visit() {
  return (
    <>
      <Seo title="Visit" description="Plan a visit to the historic tug Comanche on Puget Sound. Open-ship days, group tours and what to expect aboard." />
      <Hero
        small
        image="dockside-visitors"
        eyebrow="Come aboard"
        title="Visit Comanche"
        lead="Walk the decks of a working WWII ship. Open-ship days and group tours are free and led by the volunteers who keep her running."
        position="center 60%"
      />

      <section className="section">
        <div className="container">
          <div className="feature">
            <div className="prose">
              <span className="eyebrow">Where &amp; when</span>
              <h2>Current location and hours</h2>
              <div className="notice">
                <p style={{ marginBottom: 6 }}>
                  <span className="eyebrow" style={{ marginBottom: 2 }}>Right now</span>
                  <strong style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{location.status}</strong>
                  <span className="small" style={{ display: 'block' }}>as of {formatDate(location.updated)}</span>
                </p>
                {location.note && <p>{location.note}</p>}
                <p style={{ marginBottom: 0 }}>
                  Comanche&rsquo;s berth changes with the season and with moorage availability. Before
                  you travel, check the <Link to="/news">news page</Link> or our{' '}
                  <a href={org.facebook} target="_blank" rel="noreferrer">Facebook page</a> for the next
                  open-ship date, or <Link to="/contact">send us a note</Link>.
                </p>
              </div>
              <p>
                Open-ship days are announced a few weeks ahead. Groups &mdash; schools, scouts,
                veterans&rsquo; organizations, maritime clubs &mdash; can request a dedicated tour
                through the contact form. Please give us two weeks&rsquo; notice for groups.
              </p>
            </div>
            <Photo name="comanche-moored" alt="Comanche moored alongside a pier" />
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-3">
            <div>
              <h3>What to expect</h3>
              <ul className="checklist">
                <li>Guided walk of the main deck, bridge and, conditions permitting, the engine room</li>
                <li>Stories from Comanche&rsquo;s Navy and Coast Guard years</li>
                <li>A look at active restoration projects</li>
                <li>Tours last about 45 minutes</li>
              </ul>
            </div>
            <div>
              <h3>Good to know</h3>
              <ul className="checklist">
                <li>Tours are free; donations gratefully accepted but never required</li>
                <li>Closed-toe shoes required &mdash; this is a working ship</li>
                <li>Steep ladders and raised thresholds; not all spaces are wheelchair accessible</li>
                <li>Children welcome with an adult</li>
              </ul>
            </div>
            <div>
              <h3>Please note</h3>
              <ul className="checklist">
                <li>Public visits are alongside the pier; cruises happen through <Link to="/partner">partner organizations</Link>, not as a charter</li>
                <li>Weather and crew availability can change plans on short notice</li>
                <li>Photography for personal use is welcome</li>
                <li>No smoking or open flame aboard</li>
              </ul>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 32 }}>
            <Link to="/contact" className="btn btn-primary">Request a group tour</Link>
            <Link to="/volunteer" className="btn btn-outline">Or come back as crew</Link>
          </div>
        </div>
      </section>
    </>
  )
}
