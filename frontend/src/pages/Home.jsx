import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Seo from '../components/Seo.jsx'
import { vessel } from '../site.config.js'
import { mission, programs, seedNews } from '../content/index.js'

export default function Home() {
  const latest = seedNews.slice(0, 3)
  return (
    <>
      <Seo />
      <Hero
        image="hero-port-dazzle"
        eyebrow="Est. 1944 &middot; Puget Sound, Washington"
        title={<>Tug <em style={{ fontStyle: 'normal', color: 'var(--brass)' }}>Comanche</em></>}
        lead="A World War II Navy ocean tug turned Coast Guard cutter, still underway under her own power — kept alive by volunteers as a living classroom for maritime history, hands-on skills and the next generation of mariners."
      >
        <div className="btn-row">
          <Link to="/visit" className="btn btn-primary">Plan a visit</Link>
          <Link to="/volunteer" className="btn btn-light">Join the crew</Link>
          <Link to="/support" className="btn btn-light">Support the rescue</Link>
        </div>
      </Hero>

      <section className="section">
        <div className="container">
          <div className="stats">
            <div className="stat"><div className="stat-n">{vessel.yearBuilt}</div><div className="stat-l">Commissioned</div></div>
            <div className="stat"><div className="stat-n">{vessel.registeredLengthFt}&prime;</div><div className="stat-l">Registered length</div></div>
            <div className="stat"><div className="stat-n">{vessel.grossTonsITC}</div><div className="stat-l">Gross tons</div></div>
            <div className="stat"><div className="stat-n">Underway</div><div className="stat-l">Under her own power</div></div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="feature">
            <div>
              <span className="eyebrow">Our mission</span>
              <h2>Preserve the ship. Put her to work for the community.</h2>
              <p className="lead">{mission}</p>
              <p>
                Comanche is one of the last operational WWII museum ships in the world &mdash; not a
                static exhibit, but a working vessel that still gets underway under her own power,
                and the last ship anywhere still steered by deck-tube chain rudder control. She wears
                her WWII Navy camouflage on one side and her Coast Guard racing stripe on the other:
                two chapters of American maritime history on one steel hull.
              </p>
              <div className="btn-row">
                <Link to="/ship" className="btn btn-outline">The ship&rsquo;s story</Link>
                <Link to="/foundation" className="btn btn-outline">About the Foundation</Link>
              </div>
            </div>
            <Photo name="starboard-cg-stripe" alt="Comanche's starboard side showing the Coast Guard racing stripe and hull number 202" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <span className="eyebrow">What we do</span>
          <h2>A living ship for public benefit</h2>
          <p className="lead" style={{ maxWidth: 720 }}>
            From open-ship days at the pier to <Link to="/partner">partner cruises</Link> on the Sound,
            Comanche works for the community. We are a preservation and education nonprofit, not a
            charter service.
          </p>
          <div className="grid grid-4" style={{ marginTop: 32 }}>
            {programs.map(p => (
              <div className="card" key={p.title}>
                <Photo name={p.image} alt="" />
                <div className="card-body">
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-navy">
        <div className="container">
          <div className="feature reverse">
            <div>
              <span className="eyebrow">Get involved</span>
              <h2>No experience required. Just show up.</h2>
              <p className="lead">
                Comanche runs on volunteers &mdash; deckhands, engineers, historians, cooks,
                photographers, grant writers. Work days are hands-on and the coffee is hot.
              </p>
              <div className="btn-row">
                <Link to="/volunteer" className="btn btn-primary">Volunteer</Link>
                <Link to="/support" className="btn btn-light">Donate</Link>
              </div>
            </div>
            <Photo name="deck-crew" alt="Volunteers and visitors gathered on Comanche's deck" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="eyebrow">Ship&rsquo;s log</span>
              <h2>Latest news</h2>
            </div>
            <Link to="/news">All news &rarr;</Link>
          </div>
          <div className="grid grid-3">
            {latest.map(n => (
              <Link to="/news" className="card card-link" key={n.id}>
                <div className="card-body">
                  <div className="news-date">{formatDate(n.date)}</div>
                  <h3>{n.title}</h3>
                  <p>{n.body.length > 160 ? n.body.slice(0, 157) + '…' : n.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
