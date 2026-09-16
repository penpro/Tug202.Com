import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Seo from '../components/Seo.jsx'
import SignupForm from '../components/SignupForm.jsx'
import { org, donate, costs, givebutter, donateAssets } from '../site.config.js'
import { GivebutterWidget, GivebutterForm, givebutterConfigured } from '../components/Givebutter.jsx'
import { wishlist } from '../content/index.js'

export default function Support() {
  return (
    <>
      <Seo title="Support" description="Donate to the Tug Comanche Historical Rescue Foundation, a 501(c)(3), and help preserve a WWII ocean tug and Coast Guard cutter on Puget Sound." />
      <Hero
        small
        image="underway-quarter"
        eyebrow="Support the rescue"
        title="Keep Comanche Afloat"
        lead="Every dollar goes to moorage, insurance, documentation, materials and the programs that put this ship to work for the community."
        position="center 55%"
      />

      <section className="section">
        <div className="container">
          <div className="grid grid-3 support-cards" style={{ alignItems: 'start' }}>
            <div className="card" id="give">
              <div className="card-body">
                <span className="eyebrow">Give online</span>
                <h3>One-time or monthly</h3>
                {givebutterConfigured() ? (
                  <>
                    {givebutter.widgets?.givingForm
                      ? <div className="gb-embed"><GivebutterWidget id={givebutter.widgets.givingForm} /></div>
                      : <GivebutterForm />}
                    <p className="small" style={{ marginTop: 12 }}>
                      Form not loading? <a href={donate.onlineUrl} target="_blank" rel="noreferrer">Give on our Givebutter page</a> instead.
                    </p>
                  </>
                ) : donate.onlineUrl ? (
                  <>
                    <p>
                      Secure online giving through Givebutter &mdash; card, bank, Apple&nbsp;Pay,
                      Google&nbsp;Pay, Venmo or PayPal. One-time or monthly.
                    </p>
                    <a className="btn btn-primary" href={donate.onlineUrl} target="_blank" rel="noreferrer">Donate now</a>
                    <p className="small" style={{ marginTop: 12 }}>Opens givebutter.com in a new tab.</p>
                  </>
                ) : (
                  <>
                    <p>
                      Online giving is being set up. In the meantime, please{' '}
                      <Link to="/contact">contact us</Link> and we will send you the current way to
                      give electronically.
                    </p>
                    <Link className="btn btn-outline" to="/contact">Ask about giving</Link>
                  </>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <span className="eyebrow">By mail</span>
                <h3>Send a check</h3>
                <p>Make checks payable to:</p>
                <p><strong>{donate.checkPayableTo}</strong></p>
                {org.mailingAddress ? (
                  <p style={{ whiteSpace: 'pre-line' }}>{org.mailingAddress}</p>
                ) : (
                  <p><Link to="/contact">Contact us</Link> for the current mailing address.</p>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <span className="eyebrow">In kind</span>
                <h3>Materials, tools &amp; services</h3>
                <p>A working ship consumes a lot of paint and know-how. Current needs:</p>
                <ul className="checklist small" style={{ color: 'var(--ink)' }}>
                  {wishlist.map(w => <li key={w}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>
          <div className="notice notice-brass" style={{ marginTop: 36 }}>
            <p>
              <strong>{org.name}</strong> is a {org.taxStatus} (EIN {org.ein}). Contributions are
              tax-deductible to the extent allowed by law; you will receive a written receipt. Donations
              are always voluntary and are never a condition of coming aboard or of any vessel service.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="feature">
            <div className="prose">
              <span className="eyebrow">Where the money goes</span>
              <h2>What it takes to keep an 80-year-old ship alive</h2>
              <p>
                Two rules of thumb: Comanche costs about <strong>${costs.perMile} per mile</strong> to
                move and about <strong>${costs.perPierDay} per day</strong> to sit at a pier. A
                single 100-mile round trip to bring history to a community event is a
                ${(100 * costs.perMile).toLocaleString()} mission before anyone steps aboard. And
                those are bare operating numbers &mdash; fuel, moorage, consumables. They include
                nothing for the maintenance, haul-out and insurance an 80-year-old ship needs, and
                nothing to sustain the Foundation. That is what donations and grants have to cover.
              </p>
              <ul className="checklist">
                <li><strong>Moorage &amp; insurance</strong> &mdash; the fixed costs that never stop</li>
                <li><strong>Condition assessment &amp; haul-out planning</strong> &mdash; a professional survey sets preservation priorities and unlocks larger grants</li>
                <li><strong>Materials</strong> &mdash; steel, paint, wiring, lighting, safety gear</li>
                <li><strong>Programs</strong> &mdash; interpretive panels, youth mentorship, open-ship days</li>
                <li><strong>Documentation</strong> &mdash; archives, oral histories and historic-register nomination</li>
              </ul>
              <p>
                Business sponsors, foundations and service clubs: we would welcome a conversation.{' '}
                <Link to="/contact">Reach the board</Link> for a sponsorship packet.
              </p>
            </div>
            <Photo name="overhead-raft" alt="Overhead view of Comanche's decks and superstructure" />
          </div>
        </div>
      </section>

      <section className="section" id="print">
        <div className="container">
          <span className="eyebrow">Print &amp; share</span>
          <h2>Donation kit</h2>
          <p className="lead" style={{ maxWidth: 760 }}>
            Ready-to-print pieces with the giving QR code, so nobody has to rebuild them for
            every event. Download, print, done.
          </p>
          <div className="grid grid-3" style={{ marginTop: 24 }}>
            {donateAssets.map(a => (
              <div className="card" key={a.file}>
                <a href={`/donate/${a.preview}`} target="_blank" rel="noreferrer" style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
                  <img src={`/donate/${a.preview}`} alt={`Preview of ${a.title}`} loading="lazy" style={{ aspectRatio: '4 / 3', objectFit: 'contain', padding: 12 }} />
                </a>
                <div className="card-body">
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                  <a className="btn btn-outline" href={`/donate/${a.file}`} download style={{ marginTop: 8 }}>Download</a>
                </div>
              </div>
            ))}
          </div>
          <p className="small" style={{ marginTop: 18 }}>
            Also: <a href="/donate/tug-comanche-donate-qr.svg" download>QR code as SVG</a> (scales to any size) &middot;
            the code links to <a href={donate.onlineUrl} target="_blank" rel="noreferrer">{donate.onlineUrl?.replace('https://', '')}</a>.
            Also for the board: the <a href="/documents/tug-comanche-donation-receipt.pdf">donation receipt form</a> (B&amp;W printable). Foundations and sponsors: see our <Link to="/grants">funding proposals</Link>.
          </p>
        </div>
      </section>

      <section className="section section-navy">
        <div className="container" style={{ maxWidth: 720 }}>
          <span className="eyebrow">Stay in the loop</span>
          <h2>Ship&rsquo;s newsletter</h2>
          <p className="lead">Work days, open-ship dates and restoration progress. Pick what you want to hear about.</p>
          <SignupForm dark />
        </div>
      </section>
    </>
  )
}
