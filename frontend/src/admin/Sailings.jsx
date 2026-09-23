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
          {scanning ? 'Stop scanning' : '📷 Scan boarding passes'}
        </button>
        <a className="btn btn-outline" href={`/waiver?kiosk=1&sailing=${id}`} target="_blank" rel="noreferrer">Open tablet sign-in</a>
        <a className="btn btn-outline" href={`/api/admin/sailings/${id}/manifest`} target="_blank" rel="noreferrer">📋 Manifest PDF</a>
      </div>

      {scanning && <Scanner onCode={(code) => checkIn({ code })} onError={(m) => setFlash({ ok: false, error: m })} />}
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
function Scanner({ onCode, onError }) {
  const video = useRef(null), canvas = useRef(null), stop = useRef(false), lastCode = useRef({ v: '', t: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    stop.current = false
    let stream, detector
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
    ;(async () => {
      try {
        if ('BarcodeDetector' in window) {
          const formats = await window.BarcodeDetector.getSupportedFormats()
          if (formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        video.current.srcObject = stream
        await video.current.play()
        setReady(true); tick()
      } catch (e) {
        onError(e.name === 'NotAllowedError'
          ? 'Camera blocked. Allow camera access for tug202.org, or type the code instead.'
          : `Camera unavailable (${e.message}). Type the code instead.`)
      }
    })()
    return () => { stop.current = true; stream?.getTracks().forEach(t => t.stop()) }
  }, []) // eslint-disable-line

  return (
    <div style={{ margin: '10px 0', position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', maxWidth: 420 }}>
      <video ref={video} playsInline muted style={{ width: '100%', display: 'block' }} />
      <canvas ref={canvas} style={{ display: 'none' }} />
      <div style={{ position: 'absolute', inset: '18% 12%', border: '3px solid rgba(255,255,255,.85)', borderRadius: 10, pointerEvents: 'none' }} />
      {!ready && <p className="small" style={{ position: 'absolute', bottom: 8, left: 12, color: '#fff' }}>Starting camera&hellip;</p>}
    </div>
  )
}
