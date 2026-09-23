import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { api, fmtDate } from './api.js'

// Sailings: who is expected, who is aboard right now, and the head count a
// master can point at. Built for a phone held in one hand at the brow.

const STATUS_COLOR = { planned: '#7a8190', boarding: '#a2823a', underway: '#1d4278', closed: '#1f6b2a' }
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '')
const clock = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')

export default function Sailings() {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [open, setOpen] = useState(null); const [adding, setAdding] = useState(false)
  const load = () => api('/admin/sailings').then(d => setRows(d.rows)).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  if (open) return <Sailing id={open} onBack={() => { setOpen(null); load() }} />
  if (err) return <div className="form-msg err">{err}</div>
  if (!rows) return <p className="small">Loading&hellip;</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.6rem' }}>Sailings</h2>
        <button className="btn btn-primary" onClick={() => setAdding(a => !a)}>+ New sailing</button>
      </div>
      {adding && <NewSailing onDone={() => { setAdding(false); load() }} />}
      {!rows.length && !adding && <p className="small">No sailings yet. Make one for a cruise, an open-ship day or a work party, then scan people aboard.</p>}
      <div className="admin-list">
        {rows.map(s => (
          <div className="admin-person" key={s.id}>
            <div className="admin-row" style={{ gridTemplateColumns: '1.6fr 1fr auto' }} onClick={() => setOpen(s.id)}>
              <div className="admin-name">
                <strong>{s.title || 'Sailing'}</strong>
                <span className="pill" style={{ background: STATUS_COLOR[s.status] }}>{s.status}</span>
                <div className="small">{day(s.sail_date)}{s.location && ` · ${s.location}`}</div>
              </div>
              <div className="small">
                <strong style={{ fontSize: '1.3rem', color: s.aboard > 0 ? 'var(--navy-800)' : undefined }}>{s.aboard}</strong> souls
                {s.capacity > 0 && <> / {s.capacity}</>}
                {s.children > 0 && <> · {s.children} children</>}
                <br />{s.registered} on the list
              </div>
              <div className="small">&rarr;</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NewSailing({ onDone }) {
  const [f, setF] = useState({ sail_date: new Date().toISOString().slice(0, 10), title: '', location: '', capacity: '', notes: '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const save = async () => {
    try { await api('/admin/sailings', { method: 'POST', body: f }); onDone() } catch (e) { setErr(e.message) }
  }
  return (
    <div className="form" style={{ maxWidth: 'none', border: '1px solid var(--line)', borderRadius: 6, padding: 16, margin: '12px 0' }}>
      <div className="row">
        <div><label>Date *</label><input type="date" value={f.sail_date} onChange={set('sail_date')} /></div>
        <div><label>What is it?</label><input value={f.title} onChange={set('title')} placeholder="Fall cruise on Budd Inlet" /></div>
      </div>
      <div className="row">
        <div><label>Where from</label><input value={f.location} onChange={set('location')} placeholder="Percival Landing" /></div>
        <div><label>Capacity <span className="small">(0 = no limit)</span></label><input type="number" min={0} value={f.capacity} onChange={set('capacity')} /></div>
      </div>
      <div><label>Notes</label><input value={f.notes} onChange={set('notes')} /></div>
      {err && <div className="form-msg err">{err}</div>}
      <div className="btn-row"><button className="btn btn-primary" onClick={save}>Create</button><button className="btn btn-outline" onClick={onDone}>Cancel</button></div>
    </div>
  )
}

export function Sailing({ id, onBack }) {
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [scanning, setScanning] = useState(false)
  const [flash, setFlash] = useState(null); const [manual, setManual] = useState('')
  const [walkup, setWalkup] = useState({ role: 'guest', adults: 1, minor_count: 0 })
  const [showManifest, setShowManifest] = useState(false)
  const timer = useRef(null)

  const load = async () => { try { setD(await api(`/admin/sailings/${id}`)) } catch (e) { setErr(e.message) } }
  useEffect(() => { load(); timer.current = setInterval(load, 15000); return () => clearInterval(timer.current) }, [id]) // eslint-disable-line

  const checkIn = async (body) => {
    try {
      const r = await api(`/admin/sailings/${id}/checkin`, { method: 'POST', body })
      setFlash({ ok: true, ...r })
      load()
      return true
    } catch (e) { setFlash({ ok: false, error: e.message }); return false }
  }
  const out = async (cid) => { await api(`/admin/checkins/${cid}/out`, { method: 'POST' }); load() }
  const setParty = async (cid, patch) => { await api(`/admin/checkins/${cid}/party`, { method: 'POST', body: patch }); load() }
  const allAshore = async () => {
    if (!confirm('Mark everyone ashore and close this sailing?')) return
    await api(`/admin/sailings/${id}/all-ashore`, { method: 'POST' }); load()
  }
  const setStatus = async (status) => { await api(`/admin/sailings/${id}`, { method: 'PATCH', body: { status } }); load() }

  if (err) return <div className="form-msg err">{err}</div>
  if (!d) return <p className="small">Loading&hellip;</p>
  const { sailing: s, roster, counts } = d
  const aboard = roster.filter(r => r.checked_in_at && !r.checked_out_at)
  const expected = roster.filter(r => !r.checked_in_at || r.checked_out_at)

  return (
    <div>
      <button className="linkbtn" onClick={onBack}>&larr; All sailings</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: 0 }}>
          {s.title || 'Sailing'} <span className="pill" style={{ background: STATUS_COLOR[s.status] }}>{s.status}</span>
        </h2>
        <div className="btn-row" style={{ marginTop: 0 }}>
          {s.status !== 'boarding' && <button className="btn btn-outline" onClick={() => setStatus('boarding')}>Boarding</button>}
          {s.status !== 'underway' && <button className="btn btn-outline" onClick={() => setStatus('underway')}>Under way</button>}
          <button className="btn btn-outline" onClick={allAshore}>All ashore</button>
        </div>
      </div>
      <p className="small">{day(s.sail_date)}{s.location && ` · ${s.location}`}{s.notes && ` · ${s.notes}`}</p>

      {/* The manifest answer, in the order a boarding officer asks for it. */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat"><div className="stat-n">{counts.passengers}</div><div className="stat-l">passengers</div><div className="small">adults, 18+</div></div>
        <div className="stat"><div className="stat-n">{counts.crew}</div><div className="stat-l">crew</div><div className="small">incl. volunteers</div></div>
        <div className="stat"><div className="stat-n">{counts.children}</div><div className="stat-l">children</div><div className="small">under 18</div></div>
        <div className="stat" style={{ background: '#fff6f3', borderColor: 'var(--stripe)' }}>
          <div className="stat-n" style={{ color: s.capacity > 0 && counts.aboard > s.capacity ? 'var(--stripe)' : 'var(--navy-800)', fontSize: '2.6rem' }}>{counts.aboard}</div>
          <div className="stat-l">souls on board</div><div className="small">{s.capacity > 0 ? `capacity ${s.capacity}` : 'no stated limit'}</div></div>
      </div>
      <p className="small">{counts.expected} on the list · {counts.ashore} not aboard (expected or gone ashore)</p>
      {s.capacity > 0 && counts.aboard > s.capacity && <div className="form-msg err"><strong>Over capacity.</strong> {counts.aboard} aboard against a limit of {s.capacity}.</div>}

      <div className="btn-row">
        <button className={scanning ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => { setScanning(v => !v); setFlash(null) }}>
          {scanning ? 'Close scanner' : '📷 Scan boarding passes'}
        </button>
        <a className="btn btn-outline" href={`/waiver?kiosk=1&sailing=${id}`} target="_blank" rel="noreferrer">Open tablet sign-in</a>
        <button className={showManifest ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setShowManifest(v => !v)}>
          {showManifest ? 'Hide manifest' : '📋 View manifest'}
        </button>
        <a className="btn btn-outline" href={`/api/admin/sailings/${id}/manifest`} target="_blank" rel="noreferrer">PDF</a>
      </div>

      {showManifest && <ManifestView sailing={s} roster={roster} counts={counts} id={id} />}

      {scanning && <Scanner onCode={(code) => checkIn({ code })} onError={(m) => m && setFlash({ ok: false, error: m })} />}
      {flash && <Flash flash={flash} onClose={() => setFlash(null)} />}

      <div className="form" style={{ maxWidth: 'none', marginTop: 10 }}>
        <label>Check someone in by code or by name <span className="small">— role, then adults and children for a walk-up</span></label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={manual} onChange={e => setManual(e.target.value)} placeholder="Pass code, or a name for a walk-up"
            style={{ flex: '1 1 180px' }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('ci-go')?.click() } }} />
          <select value={walkup.role} onChange={e => setWalkup(w => ({ ...w, role: e.target.value }))} style={{ width: 110 }} aria-label="Role">
            <option value="guest">passenger</option><option value="crew">crew</option><option value="volunteer">volunteer</option>
          </select>
          <input type="number" min={1} max={20} value={walkup.adults} onChange={e => setWalkup(w => ({ ...w, adults: e.target.value }))}
            style={{ width: 66 }} aria-label="Adults" title="Adults" />
          <input type="number" min={0} max={20} value={walkup.minor_count} onChange={e => setWalkup(w => ({ ...w, minor_count: e.target.value }))}
            style={{ width: 66 }} aria-label="Children" title="Children under 18" />
          <button id="ci-go" className="btn btn-primary" onClick={async () => {
            const v = manual.trim(); if (!v) return
            const isCode = /^[A-Za-z0-9]{8}$/.test(v)
            const body = isCode ? { code: v, role: walkup.role } : { name: v, ...walkup }
            if (await checkIn(body)) { setManual(''); setWalkup({ role: 'guest', adults: 1, minor_count: 0 }) }
          }}>Check in</button>
        </div>
      </div>

      <h3 style={{ marginTop: 22 }}>Aboard now ({aboard.length})</h3>
      {!aboard.length && <p className="small">Nobody checked in yet.</p>}
      <table className="spec" style={{ fontSize: '0.92rem' }}><tbody>
        {aboard.map(r => (
          <tr key={r.id}>
            <th style={{ fontWeight: 400, width: '34%' }}>
              {r.name}
              <select value={r.role} onChange={e => setParty(r.id, { role: e.target.value })}
                style={{ marginLeft: 8, padding: '1px 4px', fontSize: '0.78rem' }} aria-label={`Role for ${r.name}`}>
                <option value="guest">passenger</option><option value="crew">crew</option><option value="volunteer">volunteer</option>
              </select>
              {r.minor_names?.length > 0 && <div className="small">with {r.minor_names.map(m => `${m.name}${m.age != null ? ` (${m.age})` : ''}`).join(', ')}</div>}
            </th>
            <td className="small">
              in {clock(r.checked_in_at)} · {r.pass_code ? <code>{r.pass_code}</code> : <span style={{ color: 'var(--stripe)' }}>no waiver</span>}
              {r.emergency_phone && <div>ICE: {r.emergency_name} {r.emergency_phone}</div>}
            </td>
            <td className="small" style={{ whiteSpace: 'nowrap' }}>
              <span title="Adults">
                <button className="linkbtn" onClick={() => setParty(r.id, { adults: Math.max(0, r.adults - 1) })}>−</button>
                <strong style={{ margin: '0 5px' }}>{r.adults}</strong>
                <button className="linkbtn" onClick={() => setParty(r.id, { adults: r.adults + 1 })}>+</button>
                <span style={{ color: 'var(--ink-3)' }}> ad</span>
              </span>
              <span title="Children under 18" style={{ marginLeft: 10 }}>
                <button className="linkbtn" onClick={() => setParty(r.id, { minor_count: Math.max(0, r.minor_count - 1) })}>−</button>
                <strong style={{ margin: '0 5px' }}>{r.minor_count}</strong>
                <button className="linkbtn" onClick={() => setParty(r.id, { minor_count: r.minor_count + 1 })}>+</button>
                <span style={{ color: 'var(--ink-3)' }}> ch</span>
              </span>
              <button className="linkbtn" style={{ marginLeft: 12 }} onClick={() => out(r.id)}>Ashore</button>
            </td>
          </tr>
        ))}
      </tbody></table>

      {expected.length > 0 && <>
        <h3 style={{ marginTop: 22 }}>Expected ({expected.length})</h3>
        <table className="spec" style={{ fontSize: '0.92rem' }}><tbody>
          {expected.map(r => (
            <tr key={r.id}>
              <th style={{ fontWeight: 400, width: '40%' }}>{r.name}</th>
              <td className="small">{r.checked_out_at ? `went ashore ${clock(r.checked_out_at)}` : 'pre-registered'} {r.pass_code && <code>{r.pass_code}</code>}</td>
              <td className="small"><button className="linkbtn" onClick={() => checkIn({ checkin_id: r.id })}>Check in</button></td>
            </tr>
          ))}
        </tbody></table>
      </>}
    </div>
  )
}

// The manifest on screen: the same thing the PDF says, live, for when a
// boarding officer is standing in front of you and a phone is what you have.
function ManifestView({ sailing, roster, counts, id }) {
  const aboard = roster.filter(r => r.checked_in_at && !r.checked_out_at)
  const ashore = roster.filter(r => r.checked_out_at)
  const isCrew = (r) => r.role === 'crew' || r.role === 'volunteer'
  const kids = (r) => (r.minor_names || []).map(m => `${m.name}${m.age != null ? ` (${m.age})` : ''}`).join(', ')

  const Rows = ({ list, out }) => (
    <table className="spec" style={{ fontSize: '0.9rem', marginBottom: 10 }}>
      <tbody>
        <tr style={{ background: 'var(--paper)' }}>
          <th style={{ width: '32%' }}>Name</th><th>Role</th><th>Ad</th><th>Ch</th><th>{out ? 'Ashore' : 'Aboard'}</th>
        </tr>
        {list.map(r => (
          <tr key={r.id}>
            <th style={{ fontWeight: 400 }}>
              {r.name}
              {kids(r) && <div className="small">with {kids(r)}</div>}
              {r.emergency_name && <div className="small">ICE: {r.emergency_name} {r.emergency_phone}</div>}
            </th>
            <td className="small">{isCrew(r) ? (r.role === 'volunteer' ? 'volunteer' : 'crew') : 'passenger'}</td>
            <td><strong>{r.adults}</strong></td>
            <td><strong>{r.minor_count || 0}</strong></td>
            <td className="small">{clock(out ? r.checked_out_at : r.checked_in_at)}{!out && !r.pass_code && <div style={{ color: 'var(--stripe)' }}>no waiver</div>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div style={{ border: '1px solid var(--line)', borderTop: '4px solid var(--stripe)', borderRadius: 6, background: '#fff', padding: '16px 18px', margin: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Passenger and crew manifest</h3>
          <div className="small">M/V COMANCHE (ex-USCGC COMANCHE, WMEC-202) &middot; {day(sailing.sail_date)}{sailing.location && ` · ${sailing.location}`}</div>
        </div>
        <div className="small">as of {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} &middot;{' '}
          <a href={`/api/admin/sailings/${id}/manifest`} target="_blank" rel="noreferrer">signed PDF</a></div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', margin: '12px 0' }}>
        <div className="stat"><div className="stat-n">{counts.passengers}</div><div className="stat-l">passengers</div></div>
        <div className="stat"><div className="stat-n">{counts.crew}</div><div className="stat-l">crew</div></div>
        <div className="stat"><div className="stat-n">{counts.children}</div><div className="stat-l">children</div></div>
        <div className="stat" style={{ background: '#fff6f3', borderColor: 'var(--stripe)' }}>
          <div className="stat-n" style={{ color: 'var(--stripe)' }}>{counts.aboard}</div><div className="stat-l">souls on board</div></div>
      </div>

      <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--navy-800)' }}>On board ({aboard.length})</h4>
      {aboard.length ? <Rows list={aboard} /> : <p className="small">Nobody checked in.</p>}

      {ashore.length > 0 && <>
        <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--navy-800)' }}>Went ashore ({ashore.length})</h4>
        <Rows list={ashore} out />
      </>}

      <p className="small" style={{ marginBottom: 0 }}>
        Children are persons under 18, aboard in the care of the named adult. Comanche carries no
        passengers for hire; those aboard are guests and volunteers. This view updates itself every
        few seconds &mdash; the PDF is the copy to hand over and sign.
      </p>
    </div>
  )
}

function Flash({ flash, onClose }) {
  const bad = !flash.ok
  return (
    <div className={`form-msg ${bad ? 'err' : 'ok'}`} style={{ fontSize: '1.05rem', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span>
        {bad ? flash.error : <>
          <strong>{flash.name}</strong>{flash.already ? ' is already aboard' : ' checked in'}
          {(flash.adults > 1 || flash.minor_count > 0) && ` — ${flash.adults} adult${flash.adults === 1 ? '' : 's'}${flash.minor_count ? `, ${flash.minor_count} child${flash.minor_count === 1 ? '' : 'ren'}` : ''}`}
          {flash.minors && <> (with {flash.minors})</>}
          {flash.expired && <div style={{ color: '#b8321f' }}><strong>Waiver expired — get a new one signed.</strong></div>}
          {flash.warning && <div style={{ color: '#a2823a' }}>{flash.warning}</div>}
        </>}
      </span>
      <button className="linkbtn" onClick={onClose}>dismiss</button>
    </div>
  )
}

// Camera scanner. Uses the browser's own barcode reader where it exists
// (Android Chrome), and falls back to decoding frames with jsQR everywhere
// else (iPhone Safari has no BarcodeDetector).
//
// Asking for the camera has to be a deliberate tap, not a side effect of the
// component mounting: browsers only show the permission prompt in response to
// a gesture, and once someone has denied it they are never asked again — so
// every failure here names what went wrong and how to undo it.
function Scanner({ onCode, onError }) {
  const video = useRef(null), canvas = useRef(null), stop = useRef(false), lastCode = useRef({ v: '', t: 0 })
  const streamRef = useRef(null)
  const [phase, setPhase] = useState('idle')   // idle | starting | live | blocked | unavailable
  const [detail, setDetail] = useState('')

  // If the browser will tell us the permission is already denied, say so
  // before the person taps and nothing happens.
  useEffect(() => {
    let alive = true
    navigator.permissions?.query({ name: 'camera' })
      .then(st => { if (alive && st.state === 'denied') { setPhase('blocked'); setDetail('Camera access is blocked for this site.') } })
      .catch(() => {})   // Firefox and older Safari don't support querying it
    return () => { alive = false }
  }, [])

  useEffect(() => () => { stop.current = true; streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  const start = async () => {
    setPhase('starting'); setDetail('')
    stop.current = false
    let detector
    const hit = (value) => {
      const now = Date.now()
      if (value === lastCode.current.v && now - lastCode.current.t < 3000) return   // don't re-read the same pass
      lastCode.current = { v: value, t: now }
      if (navigator.vibrate) navigator.vibrate(60)
      onCode(value)
    }
    const tick = async () => {
      if (stop.current) return
      const v = video.current
      if (v && v.readyState === v.HAVE_ENOUGH_DATA) {
        try {
          if (detector) {
            const found = await detector.detect(v)
            if (found.length) hit(found[0].rawValue)
          } else {
            const c = canvas.current
            c.width = v.videoWidth; c.height = v.videoHeight
            const ctx = c.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(v, 0, 0, c.width, c.height)
            const img = ctx.getImageData(0, 0, c.width, c.height)
            const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
            if (found?.data) hit(found.data)
          }
        } catch { /* a dropped frame is not worth reporting */ }
      }
      setTimeout(tick, 220)
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase('unavailable')
        setDetail(window.isSecureContext === false
          ? 'The camera only works over https. Open this page at https://tug202.org/admin.'
          : 'This browser will not hand over the camera. On an iPhone open the portal in Safari itself, not inside the Facebook or Messenger browser.')
        return
      }
      if ('BarcodeDetector' in window) {
        const formats = await window.BarcodeDetector.getSupportedFormats()
        if (formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      streamRef.current = stream
      if (!video.current) { stream.getTracks().forEach(t => t.stop()); throw new Error('The video element went away before the camera started.') }
      video.current.srcObject = stream
      await video.current.play()
      setPhase('live'); tick()
    } catch (e) {
      const name = e.name || ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPhase('blocked')
        setDetail('You (or this browser) said no to the camera.')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setPhase('unavailable'); setDetail('No camera found on this device.')
      } else if (name === 'NotReadableError') {
        setPhase('unavailable'); setDetail('Another app is using the camera. Close it and try again.')
      } else {
        setPhase('unavailable'); setDetail(e.message || 'The camera would not start.')
      }
      onError?.('')
    }
  }

  const halt = () => {
    stop.current = true
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setPhase('idle')
  }

  // The <video> stays mounted from the first render, whatever the phase.
  // Rendering it only once the camera was live meant video.current was still
  // null when getUserMedia resolved — "Cannot set properties of null".
  return (
    <>
      <div style={{
        display: phase === 'live' ? 'block' : 'none',
        margin: '10px 0', position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', maxWidth: 420
      }}>
        <video ref={video} playsInline muted style={{ width: '100%', display: 'block' }} />
        <canvas ref={canvas} style={{ display: 'none' }} />
        <div style={{ position: 'absolute', inset: '18% 12%', border: '3px solid rgba(255,255,255,.85)', borderRadius: 10, pointerEvents: 'none' }} />
        <button className="btn btn-outline" onClick={halt}
          style={{ position: 'absolute', right: 8, top: 8, padding: '4px 10px', fontSize: '0.78rem', background: 'rgba(0,0,0,.55)', color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>
          Stop
        </button>
      </div>

      {(phase === 'idle' || phase === 'starting') && (
        <div className="notice" style={{ textAlign: 'center' }}>
          <p style={{ marginTop: 0 }}>Hold each boarding pass up to the camera &mdash; it checks people in as it reads them.</p>
          <button className="btn btn-primary" onClick={start} disabled={phase === 'starting'}>
            {phase === 'starting' ? 'Starting camera…' : '📷 Allow camera & start scanning'}
          </button>
          <p className="small" style={{ marginBottom: 0 }}>Your browser will ask permission the first time. You can always type the code instead.</p>
        </div>
      )}

      {(phase === 'blocked' || phase === 'unavailable') && (
        <div className="form-msg err">
          <p style={{ marginTop: 0 }}><strong>Camera unavailable.</strong> {detail}</p>
          {phase === 'blocked' && (
            <>
              <p style={{ marginBottom: 4 }}>To let it back in:</p>
              <ul style={{ margin: '0 0 8px', paddingLeft: 20 }}>
                <li><strong>iPhone/iPad (Safari):</strong> tap the <strong>ᴀA</strong> icon in the address bar &rarr; Website Settings &rarr; Camera &rarr; Allow. Then reload.</li>
                <li><strong>Android (Chrome):</strong> tap the lock icon beside the address &rarr; Permissions &rarr; Camera &rarr; Allow. Then reload.</li>
                <li><strong>Desktop:</strong> click the camera or lock icon in the address bar and allow tug202.org.</li>
              </ul>
            </>
          )}
          <p style={{ marginBottom: 0 }}>
            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={start}>Try again</button>
            <span className="small" style={{ marginLeft: 10 }}>Or type the 8-character code from the pass below &mdash; it works just as well.</span>
          </p>
        </div>
      )}
    </>
  )
}
