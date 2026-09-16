import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Seo from '../components/Seo.jsx'
import { vessel } from '../site.config.js'
import { timeline } from '../content/index.js'

export default function Ship() {
  return (
    <>
      <Seo title="The Ship" description="History and specifications of Comanche: built 1944 as U.S. Navy ATA-202, named USS Wampanoag in 1948, later Coast Guard cutter WMEC-202." />
      <Hero
        small
        image="historic-coast-guard"
        eyebrow="ATA-202 &middot; USS Wampanoag &middot; USCGC Comanche"
        title="The Ship"
        lead="Three names, two services, one stout steel hull built in the last year of the war."
        position="center 40%"
      />

      <section className="section">
        <div className="container">
          <div className="feature">
            <div className="prose">
              <span className="eyebrow">Built for the Pacific</span>
              <h2>An ocean tug that outlived her war</h2>
              <p>
                By 1944 the U.S. Navy needed every hull it could launch. Auxiliary ocean tugs like
                ATA-202 were designed to tow damaged ships, barges and floating dry docks across
                open ocean &mdash; unglamorous, essential work. Commissioned three years and a day
                after Pearl Harbor, she reached the fleet just as the Pacific war was ending.
              </p>
              <p>
                In 1948 the Navy gave her the name <strong>Wampanoag</strong>. A decade later she
                was transferred to the U.S. Coast Guard, recommissioned as the medium-endurance
                cutter <strong>Comanche (WMEC-202)</strong>, and spent roughly twenty years on the
                West Coast in search and rescue, towing and fisheries enforcement.
              </p>
              <p>
                She survives today as one of the last operational WWII museum ships in the world,
                still getting underway on her original twin diesel engines with a volunteer crew.
                She holds a world record as the last ship still steered by deck-tube chain rudder
                control &mdash; the helm turns the rudder through chain and tubing run along the
                deck, the way it was built in 1944. With her Coast Guard racing stripe on the
                starboard side and her WWII dazzle camouflage on the port side, she is a floating
                record of both careers.
              </p>
            </div>
            <Photo name="bow-flag" alt="Comanche's bow with the American flag flying, seen from above" />
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div>
              <span className="eyebrow">Timeline</span>
              <h2>Service history</h2>
              <ul className="timeline">
                {timeline.map(t => (
                  <li key={t.year + t.title}>
                    <div className="t-year">{t.year}</div>
                    <div className="t-title">{t.title}</div>
                    <p>{t.text}</p>
                  </li>
                ))}
              </ul>
              <p className="small">
                Service dates are drawn from published vessel histories and the Foundation&rsquo;s
                records; we are actively reconciling them against official Navy and Coast Guard
                sources. Have documents, photos or stories from Comanche&rsquo;s service years?{' '}
                <Link to="/contact">We would love to hear from you.</Link>
              </p>
            </div>
            <div>
              <span className="eyebrow">Particulars</span>
              <h2>Specifications</h2>
              <table className="spec">
                <tbody>
                  <tr><th>Type</th><td>Sotoyomo-class auxiliary ocean tug (ATA); later USCG medium-endurance cutter (WMEC)</td></tr>
                  <tr><th>Built</th><td>{vessel.yearBuilt}, Texas Gulf Coast</td></tr>
                  <tr><th>Commissioned</th><td>{vessel.commissioned} as ATA-202</td></tr>
                  <tr><th>Named</th><td>USS Wampanoag, {vessel.renamedWampanoag}</td></tr>
                  <tr><th>Hull</th><td>{vessel.hull}</td></tr>
                  <tr><th>Registered length</th><td>{vessel.registeredLengthFt} ft</td></tr>
                  <tr><th>Breadth</th><td>{vessel.breadthFt} ft</td></tr>
                  <tr><th>Depth</th><td>{vessel.depthFt} ft</td></tr>
                  <tr><th>Gross tonnage</th><td>{vessel.grossTonsITC} GT (ITC)</td></tr>
                  <tr><th>Net tonnage</th><td>{vessel.netTonsITC} NT (ITC)</td></tr>
                  <tr><th>Propulsion</th><td>Diesel-electric, twin original engines</td></tr>
                  <tr><th>Steering</th><td>Deck-tube chain rudder control (world record: last ship so equipped)</td></tr>
                  <tr><th>Status</th><td>Operational museum ship; gets underway under her own power</td></tr>
                  <tr><th>Official number</th><td>{vessel.officialNumber}</td></tr>
                  <tr><th>IMO</th><td>{vessel.imo}</td></tr>
                  <tr><th>Hailing port</th><td>{vessel.hailingPort}</td></tr>
                </tbody>
              </table>
              <p className="small" style={{ marginTop: 10 }}>
                Dimensions and tonnage as recorded on the current U.S. Coast Guard Certificate of
                Documentation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">Gallery</span>
          <h2>Comanche today</h2>
          <div className="photo-grid">
            <figure><Photo name="hero-port-dazzle" alt="Port side of Comanche in WWII camouflage" /><figcaption>Port side: WWII Navy camouflage</figcaption></figure>
            <figure><Photo name="starboard-cg-stripe" alt="Starboard side of Comanche with Coast Guard stripe" /><figcaption>Starboard side: Coast Guard livery</figcaption></figure>
            <figure><Photo name="overhead-raft" alt="Overhead drone view of Comanche rafted with another vessel" /><figcaption>Labor Day concert, September 2025</figcaption></figure>
            <figure><Photo name="underway-quarter" alt="Comanche underway seen from her quarter" /><figcaption>Underway on Puget Sound</figcaption></figure>
            <figure><Photo name="crew-foredeck" alt="Crew on Comanche's foredeck" /><figcaption>Volunteer crew on the foredeck</figcaption></figure>
            <figure><Photo name="dockside-visitors" alt="Visitors on the pier beside Comanche" /><figcaption>Open ship at the pier</figcaption></figure>
            <figure><Photo name="narrows-fog" alt="Comanche's bow light and ensign with the Tacoma Narrows Bridge in fog" /><figcaption>Tacoma Narrows in fog, September 2, 2026</figcaption></figure>
          </div>
        </div>
      </section>
    </>
  )
}
