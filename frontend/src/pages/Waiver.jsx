import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import SignaturePad from '../components/SignaturePad.jsx'
import { org } from '../site.config.js'

// /waiver — sign the boarding release before you come, and get a QR boarding
// pass by email. The same component runs the tablet at the brow (?kiosk=1),
// where it clears itself after each person instead of emailing.

export default function Waiver() {
  const [params] = useSearchParams()
  const kiosk = params.get('kiosk') === '1'
  const sailingId = params.get('sailing') || ''

  const [text, setText] = useState(null)
  const [f, setF] = useState(blank())
  const [sig, setSig] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '', pass: null })
  const [readAll, setReadAll] = useState(false)
  const terms = useRef(null)
  const top = useRef(null)

  useEffect(() => { fetch('/api/waiver-text').then(r => r.json()).then(setText).catch(() => {}) }, [])

  // The "I've read it" box only unlocks once the agreement has been scrolled
  // through — a reader who never saw the terms is a waiver that won't hold.
  const onScroll = () => {
    const el = terms.current
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setReadAll(true)
  }

  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    if (!f.agree) return setState({ status: 'err', message: 'Please tick the box to accept the agreement.' })
    if (!sig && !f.signed_name.trim()) return setState({ status: 'err', message: 'Please sign, or type your name under the signature.' })
    setState({ status: 'sending', message: '' })
    try {
      const res = await fetch('/api/waiver', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, signature: sig, kiosk, sailing_id: sailingId || undefined })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Something went wrong')
      if (kiosk) {
        setState({ status: 'ok', message: `${f.name} is signed in. Pass ${d.pass_code}.`, pass: d })
        setF(blank()); setSig(''); setReadAll(false)
        top.current?.scrollIntoView({ behavior: 'smooth' })
        setTimeout(() => setState(s => (s.status === 'ok' ? { status: 'idle', message: '', pass: null } : s)), 12000)
      } else {
        setState({ status: 'done', message: '', pass: d })
      }
    } catch (err) { setState({ status: 'err', message: err.message }) }
  }

  if (state.status === 'done' && state.pass) return <Done pass={state.pass} />

  return (
    <section className="section" ref={top}><div className="container" style={{ maxWidth: 820 }}>
      <Seo title={kiosk ? 'Sign in aboard' : 'Boarding waiver'} description="Sign the Tug Comanche boarding release and get a QR boarding pass." noindex />
      <span className="eyebrow">{kiosk ? 'Welcome aboard' : 'Before you come aboard'}</span>
      <h1>{kiosk ? 'Sign in' : 'Boarding waiver'}</h1>
      {kiosk
        ? <p className="lead">Please read the agreement, fill in your details and sign. A crew member will check you aboard.</p>
        : <p className="lead">
            Everyone who comes aboard Comanche signs this once a season. Do it now and you&rsquo;ll get a
            QR boarding pass by email &mdash; show it at the brow and you walk straight on instead of
            filling in paper at the dock.
          </p>}

      {state.status === 'ok' && <div className="form-msg ok" style={{ fontSize: '1.1rem' }}>{state.message}</div>}

      <h2 style={{ fontSize: '1.15rem', marginBottom: 6 }}>{text?.title || 'Loading the agreement…'}</h2>
      <div ref={terms} onScroll={onScroll}
        style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', padding: '14px 18px', fontSize: '0.95rem', lineHeight: 1.55 }}>
        {text ? text.sections.map(s => (
          <div key={s.h}>
            <h3 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--navy-800)', margin: '14px 0 4px' }}>{s.h}</h3>
            {s.p.map((p, i) => <p key={i} style={{ margin: '0 0 8px' }}>{p}</p>)}
          </div>
        )) : <p className="small">Loading&hellip;</p>}
        <p className="small" style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 14 }}>
          Version {text?.version} &middot; {org.name} &middot; EIN {org.ein}
        </p>
      </div>
      {!readAll && <p className="small" style={{ color: 'var(--stripe)' }}>Scroll to the end of the agreement to continue.</p>}

      <form className="form" onSubmit={submit} style={{ marginTop: 18, maxWidth: 'none' }}>
        <div className="row">
          <div><label htmlFor="w-name">Full name *</label><input id="w-name" required value={f.name} onChange={set('name')} autoComplete="name" /></div>
          <div><label htmlFor="w-email">Email {kiosk ? '' : '*'}</label>
            <input id="w-email" type="email" required={!kiosk} value={f.email} onChange={set('email')} autoComplete="email" />
            <span className="small">{kiosk ? 'Optional — we send a pass if you give one.' : 'Your boarding pass goes here.'}</span></div>
        </div>
        <div className="row">
          <div><label htmlFor="w-phone">Phone</label><input id="w-phone" value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
          <div><label htmlFor="w-city">Town or city</label><input id="w-city" value={f.city} onChange={set('city')} autoComplete="address-level2" /></div>
        </div>
        <div className="row">
          <div><label htmlFor="w-en">Emergency contact</label><input id="w-en" value={f.emergency_name} onChange={set('emergency_name')} placeholder="Name" /></div>
          <div><label htmlFor="w-ep">Their phone</label><input id="w-ep" value={f.emergency_phone} onChange={set('emergency_phone')} /></div>
        </div>

        <label className="check"><input type="checkbox" checked={f.guardian} onChange={e => setF(x => ({ ...x, guardian: e.target.checked }))} />
          <span><strong>I&rsquo;m bringing someone under 18</strong> and I am their parent or legal guardian</span></label>
        {f.guardian && (
          <div><label htmlFor="w-minors">Their names and ages</label>
            <input id="w-minors" value={f.minors} onChange={set('minors')} placeholder="e.g. Sam Weaver 12, Alex Weaver 9" />
            <span className="small">Each of them must stay with you the whole time aboard.</span></div>
        )}

        <label className="check"><input type="checkbox" checked={!f.photo_ok} onChange={e => setF(x => ({ ...x, photo_ok: !e.target.checked }))} />
          <span>Please <strong>don&rsquo;t</strong> use photographs or video of me</span></label>
        <label className="check"><input type="checkbox" checked={f.optin} onChange={e => setF(x => ({ ...x, optin: e.target.checked }))} />
          <span>Keep me informed about the ship &mdash; news, work parties and cruises</span></label>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4 }}>
          <label>Signature *</label>
          <SignaturePad onChange={setSig} height={kiosk ? 200 : 160} />
          <div className="row" style={{ marginTop: 8 }}>
            <div><label htmlFor="w-typed">Type your name as your signature</label>
              <input id="w-typed" value={f.signed_name} onChange={set('signed_name')} placeholder="Your full legal name" /></div>
            <div><label htmlFor="w-dob">Date of birth <span className="small">(optional)</span></label>
              <input id="w-dob" type="date" value={f.dob} onChange={set('dob')} /></div>
          </div>
        </div>

        <label className="check" style={{ background: '#fff6f3', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px' }}>
          <input type="checkbox" checked={f.agree} disabled={!readAll} onChange={e => setF(x => ({ ...x, agree: e.target.checked }))} />
          <span><strong>I have read the whole agreement above, I understand it, and I agree to it.</strong>{' '}
            I understand I am giving up legal rights, including the right to sue for ordinary negligence.</span>
        </label>

        <div className="hp" aria-hidden="true">
          <label htmlFor="w-web">Website</label><input id="w-web" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
        </div>

        {state.status === 'err' && <div className="form-msg err">{state.message}</div>}
        <div><button className="btn btn-primary" type="submit" disabled={state.status === 'sending' || !f.agree}>
          {state.status === 'sending' ? 'Signing…' : kiosk ? 'Sign and check me in' : 'Sign and send my pass'}
        </button></div>
        <p className="small">
          Dated and timestamped when you submit it, along with the exact version of the agreement
          you signed. Questions: <a href={`mailto:${org.email}`}>{org.email}</a>.
        </p>
      </form>
    </div></section>
  )
}

const blank = () => ({
  name: '', email: '', phone: '', city: '', address: '', dob: '',
  emergency_name: '', emergency_phone: '', minors: '', signed_name: '',
  guardian: false, photo_ok: true, optin: false, agree: false, website: ''
})

function Done({ pass }) {
  return (
    <section className="section"><div className="container" style={{ maxWidth: 560, textAlign: 'center' }}>
      <Seo title="Your boarding pass" noindex />
      <span className="eyebrow">Signed</span>
      <h1>You&rsquo;re on the list</h1>
      <p className="lead">
        {pass.emailed ? 'Your boarding pass is on its way by email. ' : ''}
        Show this code at the brow and a crew member will check you aboard.
      </p>
      <img src={`/api/pass/${pass.pass_code}.png`} alt="Your boarding pass QR code"
        style={{ width: 'min(70vw, 260px)', height: 'auto', border: '10px solid #fff', outline: '1px solid var(--line)', margin: '6px 0 10px' }} />
      <p style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '2rem', letterSpacing: '.14em', margin: 0 }}>{pass.pass_code}</p>
      <p className="small">Save this page: <a href={pass.pass_url}>{pass.pass_url}</a></p>
      <div className="notice" style={{ textAlign: 'left', marginTop: 18 }}>
        <p style={{ marginTop: 0 }}><strong>Before you come:</strong></p>
        <ul>
          <li>Flat, closed-toe shoes with a grip &mdash; no sandals or heels.</li>
          <li>Dress for the water, not the parking lot. It&rsquo;s colder and wetter aboard.</li>
          <li>Comanche is a 1943 working vessel: steep ladders, high sills, no accessibility.</li>
        </ul>
      </div>
    </div></section>
  )
}
