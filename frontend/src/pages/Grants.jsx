import { Link, useParams } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Seo from '../components/Seo.jsx'
import { org } from '../site.config.js'
import { grants, grantBySlug, boilerplate, money } from '../content/grants.js'
import NotFound from './NotFound.jsx'

const pdfPath = (g) => `/grants/${g.slug}.pdf`

// ---------------------------------------------------------------------------
// /grants — index of funding proposals
// ---------------------------------------------------------------------------
export function GrantsIndex() {
  const total = grants.reduce((s, g) => s + g.budget.ask, 0)
  return (
    <>
      <Seo title="Funding Proposals" description="Grant-ready funding proposals for the historic tug Comanche: condition assessment, year-round mooring, home-port pier, drydocking, main engine restoration, and solar house power." />
      <Hero
        small
        image="overhead-raft"
        eyebrow="For funders & partners"
        title="Funding Proposals"
        lead="Six grant-ready asks that, together, take Comanche from surviving to secured. Each is a complete proposal you can read here, download, or forward to your organization."
        position="center 40%"
      />

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <div className="prose">
              <span className="eyebrow">How to use these</span>
              <h2>Pick a project. Fund it whole or in part.</h2>
              <p>
                Every proposal below is written in standard grant format — need, scope, objectives,
                timeline, budget, evaluation, sustainability — with a downloadable PDF that a program
                officer, board member or sponsor can circulate as-is. The Foundation will tailor any of
                them to a specific funder’s application on request.
              </p>
              <p>
                Budgets are deliberately conservative: every project carries explicit contingency and
                project-management lines so that a funded project gets delivered in full, with margin.
                Line items are order-of-magnitude planning figures for a 133.4-foot, 295-gross-ton steel vessel on Puget
                Sound and are replaced with vendor quotes at application time. Partial funding is welcome
                and combinable across funders; the budget tables show exactly what each dollar buys.
              </p>
              <p className="small">
                Questions, site visits and application materials: <a href={`mailto:${org.email}`}>{org.email}</a>.
              </p>
            </div>
            <div className="notice notice-brass" style={{ marginTop: 0 }}>
              <p><strong>Sequenced, not random.</strong></p>
              <p>
                The condition assessment comes first — it sets the priorities and unlocks the capital
                grants. Moorage (either the engineered mooring or a home-port pier) stabilizes operations.
                Drydocking preserves the hull. The main engine and house-power projects keep her
                operational and self-sufficient. Combined asks: <strong>{money(total)}</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-2">
            {grants.map(g => (
              <div className="card" key={g.slug} id={g.slug}>
                <div className="card-body">
                  <span className="eyebrow">{g.category}</span>
                  <h3><Link to={`/grants/${g.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>{g.title}</Link></h3>
                  <p>{g.tagline}</p>
                  <div className="stat-n" style={{ fontSize: '1.8rem', margin: '6px 0 12px' }}>{money(g.budget.ask)}</div>
                  <div className="btn-row" style={{ marginTop: 0 }}>
                    <Link className="btn btn-primary" to={`/grants/${g.slug}`}>Read proposal</Link>
                    <a className="btn btn-outline" href={pdfPath(g)}>Download PDF</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// /grants/:slug — one proposal in full
// ---------------------------------------------------------------------------
export function GrantDetail() {
  const { slug } = useParams()
  const g = grantBySlug(slug)
  if (!g) return <NotFound />
  const b = g.budget
  const shareUrl = `https://${org.domain}/grants/${g.slug}`

  return (
    <>
      <Seo title={g.title} description={g.summary.slice(0, 155)} />
      <section className="section section-navy" style={{ paddingBottom: 40 }}>
        <div className="container">
          <Link to="/grants" style={{ color: 'var(--brass)' }}>&larr; All proposals</Link>
          <span className="eyebrow" style={{ marginTop: 18 }}>{g.category} &middot; Funding proposal</span>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{g.title}</h1>
          <p className="lead" style={{ maxWidth: 760 }}>{g.tagline}</p>
          <div className="btn-row">
            <a className="btn btn-primary" href={pdfPath(g)}>Download PDF</a>
            <a className="btn btn-light" href={`mailto:${org.email}?subject=${encodeURIComponent('Funding proposal: ' + g.title)}`}>Ask a question</a>
          </div>
          <p className="small" style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)' }}>
            Share this proposal: <code style={{ color: '#fff' }}>{shareUrl}</code>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grant-layout">
            <div className="prose">
              <h2 style={{ fontSize: '1.6rem' }}>Executive summary</h2>
              <p>{g.summary}</p>

              <h2 style={{ fontSize: '1.6rem' }}>Statement of need</h2>
              <p>{g.need}</p>

              <h2 style={{ fontSize: '1.6rem' }}>Project description</h2>
              <p>{g.description}</p>

              <h2 style={{ fontSize: '1.6rem' }}>Goals &amp; measurable objectives</h2>
              <ul className="checklist">{g.objectives.map(o => <li key={o}>{o}</li>)}</ul>

              <h2 style={{ fontSize: '1.6rem' }}>Timeline</h2>
              <table className="spec">
                <tbody>{g.timeline.map(t => <tr key={t.when}><th style={{ width: '28%' }}>{t.when}</th><td>{t.what}</td></tr>)}</tbody>
              </table>

              <h2 style={{ fontSize: '1.6rem', marginTop: 28 }}>Evaluation</h2>
              <ul className="checklist">{g.evaluation.map(e => <li key={e}>{e}</li>)}</ul>

              <h2 style={{ fontSize: '1.6rem' }}>Sustainability</h2>
              <p>{g.sustainability}</p>

              <h2 style={{ fontSize: '1.6rem' }}>In-kind &amp; match</h2>
              <p>{g.inKind}</p>

              <h2 style={{ fontSize: '1.6rem' }}>Organization</h2>
              <p>{boilerplate.organization}</p>
              <h2 style={{ fontSize: '1.6rem' }}>Vessel significance</h2>
              <p>{boilerplate.vessel}</p>
              <div className="notice">
                <p><strong>Legal &amp; operating boundary.</strong> {boilerplate.boundary}</p>
              </div>
            </div>

            <aside>
              <div className="card">
                <div className="card-body">
                  <span className="eyebrow">Budget</span>
                  <h3>Total request: {money(b.ask)}</h3>
                  <table className="spec" style={{ fontSize: '0.92rem' }}>
                    <tbody>
                      {b.lines.map(l => (
                        <tr key={l.item}><th style={{ width: '70%', fontWeight: 400 }}>{l.item}</th><td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{money(l.amount)}</td></tr>
                      ))}
                      <tr><th>Direct costs</th><td style={{ textAlign: 'right' }}>{money(b.direct)}</td></tr>
                      {b.pm > 0 && <tr><th style={{ fontWeight: 400 }}>Project management &amp; admin ({b.pmPct}%)</th><td style={{ textAlign: 'right' }}>{money(b.pm)}</td></tr>}
                      <tr><th style={{ fontWeight: 400 }}>Contingency ({b.contingencyPct}%)</th><td style={{ textAlign: 'right' }}>{money(b.contingency)}</td></tr>
                      <tr><th>Total project cost</th><td style={{ textAlign: 'right' }}>{money(b.total)}</td></tr>
                      <tr><th style={{ color: 'var(--stripe)' }}>Requested (rounded)</th><td style={{ textAlign: 'right', color: 'var(--stripe)', fontWeight: 700 }}>{money(b.ask)}</td></tr>
                    </tbody>
                  </table>
                  <p className="small" style={{ marginTop: 10 }}>
                    Planning figures; replaced with vendor quotes at application. Contingency is
                    returned or reallocated with funder approval if unused.
                  </p>
                </div>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div className="card-body">
                  <span className="eyebrow">Funder fit</span>
                  <ul className="checklist small" style={{ color: 'var(--ink)' }}>{g.fit.map(f => <li key={f}>{f}</li>)}</ul>
                </div>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div className="card-body">
                  <span className="eyebrow">Contact</span>
                  <p style={{ marginBottom: 0 }}>{boilerplate.contact}<br />EIN {org.ein} &middot; {org.city}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
