import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import { org, donate } from '../site.config.js'

// /e/:code — the public page a QR poster or a news link leads to. One page for
// both kinds of event: a cruise shows times, route and suggested donation; a
// work day shows what we're trying to get done and what to bring.

const prettyDate = (d, end) => {
  if (!d) return ''
  const one = (x) => new Date(String(x).slice(0, 10) + 'T12:00:00Z')
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return end && String(end).slice(0, 10) !== String(d).slice(0, 10) ? `${one(d)} – ${one(end)}` : one(d)
}
const prettyTime = (t) => {
  if (!t) return ''
  const [h, m] = String(t).split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h >= 12 ? 'p.m.' : 'a.m.'}`
}

export default function Event() {
  const { code } = useParams()
  const [d, setD] = useState(undefined)
  useEffect(() => {
    fetch(`/api/event/${encodeURIComponent(code)}`)
      .then(r => r.json().then(j => (r.ok ? j : Promise.reject(new Error(j.error)))))
      .then(setD).catch(() => setD(null))
  }, [code])

  if (d === undefined) return <section className="section"><div className="container"><p className="small">Loading&hellip;</p></div></section>
  if (d === null) return (
    <section className="section"><div className="container" style={{ maxWidth: 560 }}>
      <Seo title="Event not found" noindex />
      <h1>Not open for sign-ups</h1>
      <p className="lead">This event isn&rsquo;t taking sign-ups — it may have sailed, or the link may be wrong.</p>
      <p>See what&rsquo;s coming up on the <Link to="/news">news page</Link>, or <Link to="/contact">send us a note</Link>.</p>
    </div></section>
  )

  const e = d.event
  const cruise = e.kind === 'cruise'
  const times = [
    ['Boarding', prettyTime(e.boarding_at)], ['Departing', prettyTime(e.depart_at)],
    ['Back alongside', prettyTime(e.return_at)], ['Ashore by', prettyTime(e.disembark_at)]
  ].filter(([, v]) => v)

  return (
    <section className="section"><div className="container" style={{ maxWidth: 820 }}>
      <Seo title={e.title || (cruise ? 'Cruise aboard Comanche' : 'Work day aboard Comanche')}
        description={(e.description || '').slice(0, 160) || `Sign up to join us on ${prettyDate(e.sail_date)}.`} />
      <span className="eyebrow">{cruise ? 'Cruise' : 'Work day'}</span>
      <h1>{e.title || (cruise ? 'Cruise aboard Comanche' : 'Work day aboard Comanche')}</h1>
      <p className="lead" style={{ marginBottom: 6 }}>{prettyDate(e.sail_date, e.end_date)}{e.location && ` · ${e.location}`}</p>
      {e.sponsor && <p className="small">With {e.sponsor}</p>}

      {d.full && <div className="form-msg err"><strong>This one is full.</strong> Sign up anyway and we&rsquo;ll put you on the waiting list if a place opens.</div>}

      {e.description && <div className="prose" style={{ marginTop: 14 }}>{e.description.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', marginTop: 18 }}>
        <div>
          {cruise ? (
            <>
              {times.length > 0 && <>
                <h2 style={{ fontSize: '1.2rem' }}>The day</h2>
                <table className="spec"><tbody>
                  {times.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
                </tbody></table>
              </>}
              {e.route && <><h2 style={{ fontSize: '1.2rem' }}>Proposed route</h2><p>{e.route}</p></>}
              {e.donation && <>
                <h2 style={{ fontSize: '1.2rem' }}>Suggested donation</h2>
                <p style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 4 }}>{e.donation}</p>
                <p className="small">
                  Comanche is not a charter vessel and carries no passengers for hire. Donations are
                  voluntary, are never a condition of coming aboard, and go straight into fuel,
                  moorage and upkeep &mdash; it costs about $100 a mile to move her.
                </p>
              </>}
            </>
          ) : (
            <>
              {e.goals && <><h2 style={{ fontSize: '1.2rem' }}>What we&rsquo;re trying to get done</h2>
                {e.goals.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</>}
              {e.bring && <><h2 style={{ fontSize: '1.2rem' }}>What to bring</h2>
                {e.bring.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</>}
              <p className="small">No experience needed &mdash; we teach. Wear clothes you don&rsquo;t mind ruining.</p>
            </>
          )}
          {e.sponsor_info && <><h2 style={{ fontSize: '1.2rem' }}>From {e.sponsor || 'our partner'}</h2>
            {e.sponsor_info.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</>}
        </div>

        <div>
          <SignupForm code={code} event={e} />
        </div>
      </div>
    </div></section>
  )
}

const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })

// Where to send someone once they are registered: nowhere if they declined or
// there is nothing to ask for, the waiver (carrying the amount onward) if one
// is outstanding, otherwise straight to the donation page.
function giveUrl(out, pledge, total, event) {
  if (!pledge || !(total > 0) || !donate.onlineUrl) return null
  const amount = Math.round(total)
  return out?.needsWaiver
    ? `/waiver?sailing=${event.id}&donate=${amount}`
    : `${donate.onlineUrl}?amount=${amount}`
}

function SignupForm({ code, event }) {
  const cruise = event.kind === 'cruise'
  const per = Number(event.donation_amount) || 0
  const [f, setF] = useState({ name: '', email: '', phone: '', adults: 1, minor_count: 0, bringing: '', skills: '', optin: true, pledge: true, website: '' })
  const [state, setState] = useState({ status: 'idle', message: '', out: null })
  const [amount, setAmount] = useState('')      // what they will actually give
  const [edited, setEdited] = useState(false)   // true once they type their own figure
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))

  // What we are asking this party for, given how many are coming.
  const adults = Math.max(1, Number(f.adults) || 1)
  const suggested = per > 0 ? (event.donation_per === 'party' ? per : per * adults) : 0
  // Follow the party size until they override it; after that the figure is
  // theirs and we leave it alone.
  useEffect(() => { if (!edited) setAmount(suggested > 0 ? String(suggested) : '') }, [suggested, edited])
  const typed = Number(amount)
  const total = Number.isFinite(typed) && typed > 0 ? typed : 0

  const submit = async (e) => {
    e.preventDefault()
    setState({ status: 'sending', message: '', out: null })
    try {
      const res = await fetch(`/api/event/${encodeURIComponent(code)}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, pledge_amount: f.pledge ? total : null })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Something went wrong')
      setState({ status: 'ok', message: d.message, out: d })
      // They are on the list and the confirmation is sent. Now push the
      // donation — but never at the cost of the waiver: if one is still
      // needed, the waiver comes first and hands them on to the donation
      // afterwards. Somebody who leaves for Givebutter unsigned turns up at
      // the brow needing the tablet, which is the queue we are avoiding.
      const next = giveUrl(d, f.pledge, total, event)
      if (next) setTimeout(() => { window.location.href = next }, 1400)
    } catch (err) { setState({ status: 'err', message: err.message, out: null }) }
  }

  if (state.status === 'ok') {
    const next = giveUrl(state.out, f.pledge, total, event)
    const giving = !!next
    const viaWaiver = giving && state.out?.needsWaiver
    return (
    <div className="notice" style={{ marginTop: 0 }}>
      <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>You&rsquo;re on the list</h2>
      {giving && (
        <div className="form-msg ok" style={{ marginTop: 0 }}>
          {viaWaiver
            ? <>Taking you to the boarding waiver &mdash; it takes a minute, then straight on to your <strong>{money(total)}</strong> donation.{' '}</>
            : <>Taking you to the donation page for <strong>{money(total)}</strong>&hellip;{' '}</>}
          <a href={next}>go there now</a>
        </div>
      )}
      <p>{state.message}</p>
      {state.out?.needsWaiver && (
        <p><a className="btn btn-primary" href={`/waiver?sailing=${event.id}`}>Sign the waiver &amp; get your pass</a></p>
      )}
      {state.out?.pass_code && (
        <p style={{ textAlign: 'center' }}>
          <img src={`/api/pass/${state.out.pass_code}.png`} alt="Your boarding pass QR code"
            style={{ width: 'min(60vw, 200px)', border: '8px solid #fff', outline: '1px solid var(--line)' }} />
          <br /><code style={{ fontSize: '1.4rem', letterSpacing: '.12em' }}>{state.out.pass_code}</code>
        </p>
      )}
      {!giving && suggested > 0 && donate.onlineUrl && (
        <p><a className="btn btn-primary" href={`${donate.onlineUrl}?amount=${Math.round(suggested)}`}>Chip in {money(suggested)} after all</a></p>
      )}
    </div>
  )
  }

  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: 'none', border: '1px solid var(--line)', borderRadius: 6, padding: 18, background: '#fff' }}>
      <h2 style={{ fontSize: '1.2rem', marginTop: 0 }}>{cruise ? 'Sign up for this cruise' : 'Sign up for this work day'}</h2>
      <div><label htmlFor="ev-name">Your name *</label><input id="ev-name" required value={f.name} onChange={set('name')} autoComplete="name" /></div>
      <div><label htmlFor="ev-email">Email *</label><input id="ev-email" type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
        <span className="small">{cruise ? 'Your boarding pass goes here.' : 'We’ll send the details and tell you if anything changes.'}</span></div>
      <div><label htmlFor="ev-phone">Phone</label><input id="ev-phone" value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
      <div className="row">
        <div><label htmlFor="ev-ad">Adults</label><input id="ev-ad" type="number" min={1} max={20} value={f.adults} onChange={set('adults')} /></div>
        <div><label htmlFor="ev-ch">Children under 18</label><input id="ev-ch" type="number" min={0} max={20} value={f.minor_count} onChange={set('minor_count')} />
          <span className="small">{cruise ? 'You’ll name each of them on the waiver.' : ''}</span></div>
      </div>
      {!cruise && <>
        <div><label htmlFor="ev-bring">Anything you can bring?</label><input id="ev-bring" value={f.bringing} onChange={set('bringing')} placeholder="Grinder, extension cord, a truck…" /></div>
        <div><label htmlFor="ev-skills">Anything you&rsquo;re handy at?</label><input id="ev-skills" value={f.skills} onChange={set('skills')} placeholder="Welding, diesel, painting, cooking…" /></div>
      </>}
      {suggested > 0 && (
        <div style={{ background: '#fff6f3', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px' }}>
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" checked={f.pledge} onChange={e => setF(x => ({ ...x, pledge: e.target.checked }))} />
            <span><strong>Yes, I&rsquo;ll chip in for the fuel</strong></span>
          </label>
          {f.pledge && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 600 }}>$</span>
              <input type="number" min="1" step="1" inputMode="decimal" aria-label="Donation amount"
                value={amount} onChange={e => { setEdited(true); setAmount(e.target.value) }}
                style={{ width: 130, fontSize: '1.15rem', fontWeight: 600 }} />
              {edited && Number(amount) !== suggested && (
                <button type="button" className="linkbtn" onClick={() => { setEdited(false); setAmount(String(suggested)) }}>
                  use {money(suggested)}
                </button>
              )}
            </div>
          )}
          <span className="small">
            {f.pledge
              ? <>Suggested: <strong>{money(suggested)}</strong>{' '}
                  {event.donation_per === 'party' ? '(for your whole party)' : `(${money(per)} each for ${adults} adult${adults === 1 ? '' : 's'})`}.
                  Give more or less &mdash; anything helps. We&rsquo;ll take you to the donation page as soon as you sign up.</>
              : <>Suggested donation is {money(suggested)}. Donations are voluntary and never a condition of coming aboard.</>}
            {' '}It costs about $100 a mile to move her, and donations are what keep her moving.
          </span>
        </div>
      )}
      <label className="check"><input type="checkbox" checked={f.optin} onChange={e => setF(x => ({ ...x, optin: e.target.checked }))} />
        <span>Keep me posted about the ship &mdash; news, work days and cruises</span></label>
      <div className="hp" aria-hidden="true"><label htmlFor="ev-web">Website</label><input id="ev-web" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></div>
      {state.status === 'err' && <div className="form-msg err">{state.message}</div>}
      <div><button className="btn btn-primary" type="submit" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Signing up…' : (f.pledge && total > 0 ? `Sign up & give ${money(total)}` : 'Sign me up')}</button></div>
      <p className="small">
        {cruise
          ? 'Everyone aboard signs a liability waiver once a season. If yours is already on file we’ll just send your pass.'
          : 'Questions? '}
        {!cruise && <a href={`mailto:${org.email}`}>{org.email}</a>}
      </p>
    </form>
  )
}
