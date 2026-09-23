import { useEffect, useState } from 'react'
import { api } from './api.js'
import { Sailing } from './Sailings.jsx'

// Calendar: cruises and work days. A cruise carries boarding and departure
// times, a route and a suggested donation, and gets check-in at the brow
// because the Coast Guard asks who is aboard. A work day carries what to bring
// and what we're trying to get done, and needs no headcount.

const KIND = { cruise: 'Cruise', workday: 'Work day' }
const STATUS_COLOR = { planned: '#7a8190', boarding: '#a2823a', underway: '#1d4278', closed: '#1f6b2a' }
const day = (d) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '')
const hhmm = (t) => (t ? String(t).slice(0, 5) : '')

export default function Calendar() {
  const [rows, setRows] = useState(null); const [err, setErr] = useState('')
  const [view, setView] = useState({ mode: 'list' })
  const load = () => api('/admin/events').then(d => setRows(d.rows)).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  if (view.mode === 'checkin') return <div><button className="linkbtn" onClick={() => { setView({ mode: 'list' }); load() }}>&larr; Calendar</button><Sailing id={view.id} onBack={() => { setView({ mode: 'list' }); load() }} /></div>
  if (view.mode === 'edit') return <EventForm row={view.row} onDone={() => { setView({ mode: 'list' }); load() }} />
  if (err) return <div className="form-msg err">{err}</div>
  if (!rows) return <p className="small">Loading&hellip;</p>

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = rows.filter(r => String(r.sail_date).slice(0, 10) >= today)
  const past = rows.filter(r => String(r.sail_date).slice(0, 10) < today)

  const Row = ({ r }) => (
    <div className="admin-person" key={r.id}>
      <div className="admin-row" style={{ gridTemplateColumns: '1.7fr 1fr auto' }} onClick={() => setView({ mode: 'edit', row: r })}>
        <div className="admin-name">
          <strong>{r.title || KIND[r.kind]}</strong>
          <span className="pill" style={{ background: r.kind === 'cruise' ? '#1d4278' : '#5b6b3a' }}>{KIND[r.kind]}</span>
          {r.published ? <span className="pill" style={{ background: '#1f6b2a' }}>live</span> : <span className="pill">draft</span>}
          {r.news_slug && <span className="pill">news</span>}
          <div className="small">{day(r.sail_date)}{r.location && ` · ${r.location}`}
            {r.kind === 'cruise' && r.boarding_at && ` · board ${hhmm(r.boarding_at)}`}</div>
        </div>
        <div className="small">
          <strong style={{ fontSize: '1.15rem' }}>{r.registered}</strong> signed up
          {r.capacity > 0 && <> / {r.capacity}</>}
          {r.kind === 'cruise' && r.aboard > 0 && <><br />{r.aboard} aboard now</>}
        </div>
        <div className="small" style={{ whiteSpace: 'nowrap' }}>
          {r.kind === 'cruise' && <span className="linkbtn" role="button" tabIndex={0}
            onClick={e => { e.stopPropagation(); setView({ mode: 'checkin', id: r.id }) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setView({ mode: 'checkin', id: r.id }) } }}>Check-in</span>}
          {' '}&rarr;
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.6rem' }}>Calendar</h2>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button className="btn btn-primary" onClick={() => setView({ mode: 'edit', row: blank('cruise') })}>+ Cruise</button>
          <button className="btn btn-outline" onClick={() => setView({ mode: 'edit', row: blank('workday') })}>+ Work day</button>
        </div>
      </div>
      {!rows.length && <p className="small">Nothing on the calendar yet. Make a cruise or a work day, publish it, and share the QR code or turn it into a news post.</p>}
      {upcoming.length > 0 && <><h3>Coming up ({upcoming.length})</h3><div className="admin-list">{upcoming.map(r => <Row key={r.id} r={r} />)}</div></>}
      {past.length > 0 && <><h3 style={{ marginTop: 22 }}>Past ({past.length})</h3><div className="admin-list">{past.map(r => <Row key={r.id} r={r} />)}</div></>}
    </div>
  )
}

const blank = (kind) => ({
  kind, sail_date: new Date().toISOString().slice(0, 10), end_date: '', title: '', location: '', capacity: '',
  boarding_at: kind === 'cruise' ? '09:00' : '', depart_at: kind === 'cruise' ? '10:00' : '',
  return_at: kind === 'cruise' ? '15:00' : '', disembark_at: kind === 'cruise' ? '15:30' : '',
  description: '', route: '', donation: '', sponsor: '', sponsor_info: '', bring: '', goals: '', notes: '', status: 'planned'
})

function EventForm({ row, onDone }) {
  const [f, setF] = useState({ ...row, sail_date: String(row.sail_date || '').slice(0, 10), end_date: String(row.end_date || '').slice(0, 10),
    boarding_at: hhmm(row.boarding_at), depart_at: hhmm(row.depart_at), return_at: hhmm(row.return_at), disembark_at: hhmm(row.disembark_at) })
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false)
  const [regs, setRegs] = useState(null); const [news, setNews] = useState(null)
  const cruise = f.kind === 'cruise'
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))

  useEffect(() => { if (f.id) api(`/admin/events/${f.id}/registrations`).then(d => setRegs(d.rows)).catch(() => {}) }, [f.id])

  const save = async () => {
    setBusy(true); setMsg(null)
    try {
      const d = f.id
        ? await api(`/admin/events/${f.id}`, { method: 'PATCH', body: f })
        : await api('/admin/events', { method: 'POST', body: f })
      setF(x => ({ ...x, ...d.row, sail_date: String(d.row.sail_date).slice(0, 10), end_date: String(d.row.end_date || '').slice(0, 10),
        boarding_at: hhmm(d.row.boarding_at), depart_at: hhmm(d.row.depart_at), return_at: hhmm(d.row.return_at), disembark_at: hhmm(d.row.disembark_at) }))
      setMsg({ ok: true, text: 'Saved.' })
      return d.row
    } catch (e) { setMsg({ ok: false, text: e.message }); return null } finally { setBusy(false) }
  }
  const publish = async (on) => {
    const row = f.id ? f : await save(); if (!row) return
    await api(`/admin/events/${row.id}/publish`, { method: 'POST', body: { published: on } })
    setF(x => ({ ...x, published: on ? 1 : 0 }))
    setMsg({ ok: true, text: on ? 'Live — the sign-up page and QR code work now.' : 'Unpublished. The public page is closed.' })
  }
  const draftNews = async () => {
    const row = f.id ? f : await save(); if (!row) return
    try { setNews(await api(`/admin/events/${row.id}/news-draft`)) } catch (e) { setMsg({ ok: false, text: e.message }) }
  }
  const createNews = async () => {
    setBusy(true)
    try {
      const d = await api(`/admin/events/${f.id}/news`, { method: 'POST', body: { title: news.title, body: news.body } })
      setMsg({ ok: true, text: `${d.updated ? 'Updated' : 'Created'} the news post “${d.post.title}”. It is live on the news page.` })
      setNews(null); setF(x => ({ ...x, published: 1 }))
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!confirm('Delete this event?')) return
    try { await api(`/admin/events/${f.id}`, { method: 'DELETE' }); onDone() } catch (e) { setMsg({ ok: false, text: e.message }) }
  }

  const signupUrl = f.signup_code ? `${window.location.origin}/e/${f.signup_code}` : null

  return (
    <div>
      <button className="linkbtn" onClick={onDone}>&larr; Calendar</button>
      <h2 style={{ fontSize: '1.6rem', marginTop: 8 }}>
        {f.id ? `Edit ${KIND[f.kind].toLowerCase()}` : `New ${KIND[f.kind].toLowerCase()}`}
        {f.id ? (f.published ? <span className="pill" style={{ background: '#1f6b2a' }}>live</span> : <span className="pill">draft</span>) : null}
      </h2>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="form" style={{ maxWidth: 'none' }}>
          <div className="row">
            <div><label>Kind</label>
              <select value={f.kind} onChange={e => setF(x => ({ ...x, kind: e.target.value }))} disabled={!!f.id}>
                <option value="cruise">Cruise</option><option value="workday">Work day</option>
              </select></div>
            <div><label>Title</label><input value={f.title} onChange={set('title')} placeholder={cruise ? 'Fall cruise on Budd Inlet' : 'Deck work party'} /></div>
          </div>
          <div className="row">
            <div><label>Date *</label><input type="date" value={f.sail_date} onChange={set('sail_date')} /></div>
            <div><label>End date <span className="small">(multi-day only)</span></label><input type="date" value={f.end_date} onChange={set('end_date')} /></div>
          </div>
          <div className="row">
            <div><label>Where from</label><input value={f.location} onChange={set('location')} placeholder="Percival Landing, Olympia" /></div>
            <div><label>Capacity <span className="small">(0 = no limit)</span></label><input type="number" min={0} value={f.capacity} onChange={set('capacity')} /></div>
          </div>

          {cruise && (
            <>
              <div className="row">
                <div><label>Boarding</label><input type="time" value={f.boarding_at} onChange={set('boarding_at')} /></div>
                <div><label>Departure</label><input type="time" value={f.depart_at} onChange={set('depart_at')} /></div>
              </div>
              <div className="row">
                <div><label>Return alongside</label><input type="time" value={f.return_at} onChange={set('return_at')} /></div>
                <div><label>Disembark by</label><input type="time" value={f.disembark_at} onChange={set('disembark_at')} /></div>
              </div>
              <div><label>Proposed route</label><textarea style={{ minHeight: 60 }} value={f.route} onChange={set('route')} placeholder="Out of Budd Inlet, north past Boston Harbor, around Hope Island and back." /></div>
              <div className="row">
                <div><label>Recommended donation</label><input value={f.donation} onChange={set('donation')} placeholder="$75 per person" /></div>
                <div><label>Sponsor</label><input value={f.sponsor} onChange={set('sponsor')} placeholder="Partner organization" /></div>
              </div>
              <div><label>From the sponsor <span className="small">(their words, shown on the page)</span></label>
                <textarea style={{ minHeight: 90 }} value={f.sponsor_info} onChange={set('sponsor_info')} /></div>
            </>
          )}

          {!cruise && (
            <>
              <div><label>What we&rsquo;re trying to get done</label>
                <textarea style={{ minHeight: 110 }} value={f.goals} onChange={set('goals')} placeholder="Chip and prime the starboard bulwark. Re-reeve the towing winch. Clear the lazarette." /></div>
              <div><label>What to bring</label>
                <textarea style={{ minHeight: 90 }} value={f.bring} onChange={set('bring')} placeholder="Closed-toe boots, work clothes you don't mind ruining, gloves, a lunch. We have tools, but bring your own if you like them." /></div>
            </>
          )}

          <div><label>Description <span className="small">(the opening paragraphs on the public page)</span></label>
            <textarea style={{ minHeight: 110 }} value={f.description} onChange={set('description')} /></div>
          <div><label>Internal notes <span className="small">(not shown publicly)</span></label><input value={f.notes} onChange={set('notes')} /></div>

          {msg && <div className={`form-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
          <div className="btn-row">
            <button className="btn btn-primary" onClick={save} disabled={busy}>Save</button>
            {f.id && !f.published && <button className="btn btn-outline" onClick={() => publish(true)} disabled={busy}>Publish sign-up page</button>}
            {f.id && !!f.published && <button className="btn btn-outline" onClick={() => publish(false)} disabled={busy}>Unpublish</button>}
            {f.id && <button className="btn btn-outline" onClick={draftNews} disabled={busy}>Create news post</button>}
            {f.id && f.kind === 'cruise' && <a className="btn btn-outline" href={`/api/admin/sailings/${f.id}/manifest`} target="_blank" rel="noreferrer">Manifest PDF</a>}
            {f.id && <button className="btn btn-outline" style={{ borderColor: 'var(--stripe)', color: 'var(--stripe)' }} onClick={remove}>Delete</button>}
          </div>
        </div>

        <div>
          {signupUrl && (
            <div className="notice" style={{ marginTop: 0, textAlign: 'center' }}>
              <div className="small" style={{ textAlign: 'left' }}><strong>Sign-up page &amp; QR</strong></div>
              <img src={`/api/admin/events/${f.id}/qr.png`} alt="QR code for the sign-up page"
                style={{ width: 'min(52vw, 190px)', height: 'auto', background: '#fff', padding: 8, border: '1px solid var(--line)' }} />
              <p className="small" style={{ wordBreak: 'break-all', marginBottom: 6 }}><a href={signupUrl} target="_blank" rel="noreferrer">{signupUrl}</a></p>
              <div className="btn-row" style={{ justifyContent: 'center', marginTop: 0 }}>
                <a className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} href={`/api/admin/events/${f.id}/qr.png`} target="_blank" rel="noreferrer">Download for print</a>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => navigator.clipboard?.writeText(signupUrl).then(() => setMsg({ ok: true, text: 'Link copied.' }))}>Copy link</button>
              </div>
              {!f.published && <p className="small" style={{ color: 'var(--stripe)', marginBottom: 0 }}>Publish it before you hand this out — the page is closed until you do.</p>}
            </div>
          )}

          {news && (
            <div className="form" style={{ maxWidth: 'none', marginTop: 14, border: '1px solid var(--line)', borderRadius: 6, padding: 14 }}>
              <h3 style={{ marginTop: 0, fontSize: '1.05rem' }}>{news.existing ? 'Update the news post' : 'New news post'}</h3>
              <div><label>Headline</label><input value={news.title} onChange={e => setNews(n => ({ ...n, title: e.target.value }))} /></div>
              <div><label>Body <span className="small">(written from the event — edit freely)</span></label>
                <textarea style={{ minHeight: 260, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '0.85rem' }}
                  value={news.body} onChange={e => setNews(n => ({ ...n, body: e.target.value }))} /></div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={createNews} disabled={busy}>{news.existing ? 'Update post' : 'Publish post'}</button>
                <button className="btn btn-outline" onClick={() => setNews(null)}>Cancel</button>
              </div>
            </div>
          )}

          {regs && (
            <div style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: '1.05rem' }}>Signed up ({regs.length})</h3>
              {!regs.length && <p className="small">Nobody yet.</p>}
              <table className="spec" style={{ fontSize: '0.86rem' }}><tbody>
                {regs.map(r => (
                  <tr key={r.id}>
                    <th style={{ fontWeight: 400, width: '45%' }}>{r.name}<div className="small">{r.email}</div></th>
                    <td className="small">
                      {r.adults} ad{r.minor_count ? `, ${r.minor_count} ch` : ''}
                      {cruise && <><br />{r.pass_code ? <code>{r.pass_code}</code> : <span style={{ color: 'var(--stripe)' }}>no waiver</span>}</>}
                      {r.bringing && <div>brings: {r.bringing}</div>}
                      {r.skills && <div>skills: {r.skills}</div>}
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
