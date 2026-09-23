import { useEffect, useRef, useState } from 'react'
import { api, fmtDate } from './api.js'

// Mail blasts: compose -> preview -> test-to-me -> pick audience -> send.
// Recipients and outcomes are tracked per address; bounces flow back from
// SES automatically once the SNS webhook is wired (ops/email-setup.md).

const STATUS_COLOR = { draft: '#7a8190', scheduled: '#5b6b8a', sending: '#1d4278', paused: '#a2823a', done: '#1f6b2a', failed: '#b8321f' }
const fmtWhen = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const blankBlast = () => ({
  subject: '', preheader: '', image: 'auto', cta_label: 'Donate', cta_url: 'https://tug202.org/support', rate_per_minute: 30, daily_cap: 0,
  body: 'Hi {{first_name|there}},\n\nA few years ago you signed up for updates about the historic tug Comanche — maybe at Olympia Harbor Days, in Bremerton, or aboard the ship. A lot has happened since, and we wanted to reconnect.\n\nThe ship is now cared for by a new nonprofit, the Tug Comanche Historical Rescue Foundation, and she is still underway under her own power. We have a new website with the full story: https://tug202.org\n\nIf you would rather not hear from us, there is an unsubscribe link at the bottom and we will take you off the list right away.\n\nThank you for being part of Comanche\'s story.\n\n— The Comanche crew',
  audience: { source: 'crm', statuses: ['unverified'], kinds: ['primary'], confidence: [], tag: '' }
})

export default function Mail() {
  const [list, setList] = useState(null); const [err, setErr] = useState('')
  const [view, setView] = useState({ mode: 'list' }) // list | edit | detail
  const [pool, setPool] = useState([])
  const load = () => api('/admin/blasts').then(d => { setList(d.blasts); setPool(d.heroPool || []) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  if (view.mode === 'edit') return <Composer initial={view.blast} pool={pool} onDone={(id) => { load(); setView(id ? { mode: 'detail', id } : { mode: 'list' }) }} />
  if (view.mode === 'detail') return <Detail id={view.id} openPreview={view.preview} onBack={() => { load(); setView({ mode: 'list' }) }} onEdit={(b) => setView({ mode: 'edit', blast: b })} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.6rem' }}>Mail</h2>
        <button className="btn btn-primary" onClick={() => setView({ mode: 'edit', blast: blankBlast() })}>+ New blast</button>
      </div>
      {err && <div className="form-msg err">{err}</div>}
      {!list && !err && <p className="small">Loading&hellip;</p>}
      {list && !list.length && <p className="small">No blasts yet.</p>}
      <div className="admin-list">
        {(list || []).map(b => (
          <div className="admin-person" key={b.id}>
            <div className="admin-row" style={{ gridTemplateColumns: '1.6fr 1fr auto' }} onClick={() => setView({ mode: 'detail', id: b.id })}>
              <div className="admin-name"><strong>{b.subject}</strong><span className="pill" style={{ background: STATUS_COLOR[b.status] }}>{b.status}</span><div className="small">{fmtDate(b.created_at)}</div></div>
              <div className="small">{b.status === 'draft' ? 'not sent' : b.status === 'scheduled' ? `sends ${fmtWhen(b.scheduled_at)}` : `${b.sent} sent · ${b.failed} failed · ${b.total} total`}</div>
              <div className="small" style={{ whiteSpace: 'nowrap' }}><span className="linkbtn" role="button" tabIndex={0} onClick={e => { e.stopPropagation(); setView({ mode: 'detail', id: b.id, preview: true }) }} onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setView({ mode: 'detail', id: b.id, preview: true }) } }}>Preview</span> &rarr;</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AudiencePicker({ a, onChange }) {
  const [info, setInfo] = useState(null)
  const set = (patch) => onChange({ ...a, ...patch })
  const tog = (k, v) => set({ [k]: a[k].includes(v) ? a[k].filter(x => x !== v) : [...a[k], v] })
  useEffect(() => { const t = setTimeout(() => api('/admin/blasts/audience', { method: 'POST', body: { audience: a } }).then(setInfo).catch(() => setInfo(null)), 300); return () => clearTimeout(t) }, [JSON.stringify(a)]) // eslint-disable-line
  const crm = a.source !== 'subscribers'
  return (
    <div className="admin-new" style={{ marginBottom: 0 }}>
      <div style={{ fontWeight: 600, color: 'var(--navy-800)', marginBottom: 8 }}>Audience {info && <span className="pill" style={{ background: 'var(--stripe)' }}>{info.count} addresses</span>}</div>
      <div className="row" style={{ gridTemplateColumns: 'auto auto auto 1fr', alignItems: 'start', gap: 20 }}>
        <div>
          <label style={{ fontSize: '0.85rem' }}>Source</label>
          {[['crm', 'CRM (scanned lists)'], ['subscribers', 'Website subscribers'], ['both', 'Both']].map(([v, l]) => <label className="check" key={v}><input type="radio" checked={a.source === v} onChange={() => set({ source: v })} /> {l}</label>)}
        </div>
        {crm && <div>
          <label style={{ fontSize: '0.85rem' }}>Address status</label>
          {['unverified', 'sent', 'confirmed'].map(s => <label className="check" key={s}><input type="checkbox" checked={a.statuses.includes(s)} onChange={() => tog('statuses', s)} /> {s}</label>)}
        </div>}
        {crm && <div>
          <label style={{ fontSize: '0.85rem' }}>Address kind</label>
          {[['primary', 'primary (best read)'], ['alternate', 'alternates'], ['permutation', 'guesses']].map(([k, l]) => <label className="check" key={k}><input type="checkbox" checked={a.kinds.includes(k)} onChange={() => tog('kinds', k)} /> {l}</label>)}
        </div>}
        {crm && <div>
          <label style={{ fontSize: '0.85rem' }}>Tag (optional)</label>
          <input value={a.tag || ''} onChange={e => set({ tag: e.target.value })} placeholder="e.g. pt-local, hnsa" style={{ width: '100%', font: 'inherit', padding: 8, border: '1px solid #b9b3a6', borderRadius: 4 }} />
          <div className="small" style={{ marginTop: 6 }}>Bounced and unsubscribed addresses are always excluded.</div>
        </div>}
      </div>
      {info?.sample?.length > 0 && <div className="small" style={{ marginTop: 8 }}>First few: {info.sample.map(s => s.email).join(', ')}{info.count > info.sample.length ? ', …' : ''}</div>}
    </div>
  )
}

// Formatting toolbar over the body box: wraps or prefixes the selection so
// nobody has to remember the markup. The plain text stays the source of truth —
// the email is rendered from it server-side, which is what the live pane shows.
function Toolbar({ area, value, onChange }) {
  const apply = (fn) => {
    const el = area.current; if (!el) return
    const start = el.selectionStart, end = el.selectionEnd
    const sel = value.slice(start, end)
    const { text, cursor } = fn(sel, value, start, end)
    onChange(text)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor[0], cursor[1]) })
  }
  const wrap = (before, after, placeholder) => () => apply((sel, v, s, e) => {
    const inner = sel || placeholder
    return { text: v.slice(0, s) + before + inner + after + v.slice(e), cursor: [s + before.length, s + before.length + inner.length] }
  })
  const lines = (prefix) => () => apply((sel, v, s, e) => {
    const from = v.lastIndexOf('\n', s - 1) + 1
    const block = v.slice(from, e) || 'List item'
    const out = block.split('\n').map(l => (l.startsWith(prefix) ? l : prefix + l)).join('\n')
    return { text: v.slice(0, from) + out + v.slice(e), cursor: [from, from + out.length] }
  })
  const link = () => apply((sel, v, s, e) => {
    const url = window.prompt('Link to where?', 'https://tug202.org/')
    if (!url) return { text: v, cursor: [s, e] }
    const label = sel || 'this page'
    const out = `[${label}](${url})`
    return { text: v.slice(0, s) + out + v.slice(e), cursor: [s + 1, s + 1 + label.length] }
  })
  const B = ({ onClick, title, children, mono }) => (
    <button type="button" onClick={onClick} title={title}
      style={{ padding: '4px 9px', border: '1px solid var(--line)', background: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: '0.82rem', fontFamily: mono ? 'ui-monospace, Menlo, Consolas, monospace' : undefined }}>{children}</button>
  )
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 6px' }}>
      <B onClick={wrap('**', '**', 'bold text')} title="Bold"><strong>B</strong></B>
      <B onClick={link()} title="Insert a link">&#128279; Link</B>
      <B onClick={lines('- ')} title="Bullet list">&bull; List</B>
      <B onClick={wrap('\n\n', '\n\n', '')} title="New paragraph">&para;</B>
      <span style={{ width: 10 }} />
      <B mono onClick={wrap('{{first_name|there}}', '', '')} title="Recipient's first name, with a fallback">first name</B>
      <B mono onClick={wrap('{{name}}', '', '')} title="Recipient's full name">name</B>
      <B mono onClick={wrap('{{confirm_url}}', '', '')} title="Place the confirm link in the body yourself">confirm link</B>
    </div>
  )
}

function Composer({ initial, pool, onDone }) {
  const [b, setB] = useState(initial)
  const [preview, setPreview] = useState(null); const [tab, setTab] = useState('html')
  const [width, setWidth] = useState('desktop')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [rendering, setRendering] = useState(false)
  const area = useRef(null)
  const set = k => e => setB({ ...b, [k]: e.target.value })

  // Live preview: re-render half a second after typing stops. The server does
  // the rendering, so what's on screen is exactly what gets mailed.
  useEffect(() => {
    if (!b.subject && !b.body) return
    setRendering(true)
    const t = setTimeout(() => {
      api('/admin/blasts/preview', { method: 'POST', body: b })
        .then(p => { setPreview(p); setErr(e => (/^Preview/.test(e) ? '' : e)) })
        .catch(e => setErr('Preview failed: ' + e.message))
        .finally(() => setRendering(false))
    }, 500)
    return () => clearTimeout(t)
  }, [b.subject, b.preheader, b.body, b.image, b.cta_label, b.cta_url, b.id]) // eslint-disable-line

  const save = async () => {
    setBusy(true); setErr('')
    try {
      if (b.id) { await api(`/admin/blasts/${b.id}`, { method: 'PATCH', body: b }); return b.id }
      const d = await api('/admin/blasts', { method: 'POST', body: b }); setB({ ...b, id: d.id }); return d.id
    } catch (e) { setErr(e.message); return null } finally { setBusy(false) }
  }
  const test = async () => { const id = await save(); if (!id) return; setBusy(true); try { const d = await api(`/admin/blasts/${id}/test`, { method: 'POST' }); setErr(`Test sent to ${d.to} — check your inbox.`) } catch (e) { setErr(e.message) } finally { setBusy(false) } }
  const saveAndReview = async () => { const id = await save(); if (id) onDone(id) }

  return (
    <div>
      <button className="linkbtn" onClick={() => onDone(null)}>&larr; All blasts</button>
      <h2 style={{ fontSize: '1.6rem', marginTop: 8 }}>{b.id ? 'Edit draft' : 'New blast'}</h2>
      <div className="grid mail-composer" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="form" style={{ maxWidth: 'none' }}>
          <div><label>Subject *</label><input value={b.subject} onChange={set('subject')} placeholder="Reconnecting with the crew of Comanche" /></div>
          <div><label>Preheader <span className="small">(preview text in the inbox list, optional)</span></label><input value={b.preheader} onChange={set('preheader')} /></div>
          <div>
            <label>Body *</label>
            <Toolbar area={area} value={b.body} onChange={body => setB({ ...b, body })} />
            <textarea ref={area} style={{ minHeight: 340, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '0.9rem' }} value={b.body} onChange={set('body')} />
          </div>
          <div className="small">Select text and use the buttons, or type it: blank line = new paragraph · <code>**bold**</code> · <code>[label](https://…)</code> · lines starting <code>- </code> make a list. The unsubscribe link, the &ldquo;why you&rsquo;re receiving this&rdquo; footer and a &ldquo;keep me on the list&rdquo; button are added automatically.</div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
            <div><label>Button label <span className="small">(optional)</span></label><input value={b.cta_label || ''} onChange={set('cta_label')} placeholder="Donate" /></div>
            <div><label>Button link</label><input value={b.cta_url || ''} onChange={set('cta_url')} placeholder="https://tug202.org/support" /></div>
          </div>
          <ImagePicker value={b.image} pool={pool} onChange={image => setB({ ...b, image })} />
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label>Pace <span className="small">(messages per minute)</span></label><input type="number" min={1} max={600} value={b.rate_per_minute ?? 30} onChange={e => setB({ ...b, rate_per_minute: Number(e.target.value) })} /></div>
            <div><label>Daily cap <span className="small">(0 = none)</span></label><input type="number" min={0} value={b.daily_cap ?? 0} onChange={e => setB({ ...b, daily_cap: Number(e.target.value) })} /></div>
          </div>
          <div className="small">Trickle defaults keep us under SES limits: 30/min is one every 2 s, so 250 addresses take about 8 minutes. The account ceiling is 50,000 a day and 14 a second.</div>
          <AudiencePicker a={b.audience} onChange={audience => setB({ ...b, audience })} />
          {err && <div className={`form-msg ${/Test sent/.test(err) ? 'ok' : 'err'}`}>{err}</div>}
          <div className="btn-row">
            <button className="btn btn-outline" onClick={test} disabled={busy || !b.subject || !b.body}>Send test to me</button>
            <button className="btn btn-primary" onClick={saveAndReview} disabled={busy || !b.subject || !b.body}>Save &amp; review</button>
          </div>
        </div>

        <div className="mail-preview">
          <div className="admin-subtabs" style={{ marginTop: 0, alignItems: 'center' }}>
            <button className={tab === 'html' ? 'on' : ''} onClick={() => setTab('html')}>Email</button>
            <button className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Plain text</button>
            {tab === 'html' && <>
              <button className={width === 'desktop' ? 'on' : ''} onClick={() => setWidth('desktop')} title="Desktop width">&#128421;</button>
              <button className={width === 'mobile' ? 'on' : ''} onClick={() => setWidth('mobile')} title="Phone width">&#128241;</button>
            </>}
            <span className="small" style={{ marginLeft: 'auto', color: rendering ? '#a2823a' : undefined }}>{rendering ? 'updating…' : 'live'}</span>
          </div>
          {preview ? (
            <>
              <div style={{ background: '#fff', border: '1px solid var(--line)', borderBottom: 0, borderRadius: '6px 6px 0 0', padding: '10px 14px' }}>
                <div style={{ fontWeight: 600 }}>{preview.subject || <span className="small">(no subject)</span>}</div>
                <div className="small" style={{ color: '#7a8190' }}>Tug Comanche Foundation &lt;no-reply@tug202.org&gt;{b.preheader ? ` — ${b.preheader}` : ''}</div>
              </div>
              {tab === 'html'
                ? <div style={{ border: '1px solid var(--line)', borderRadius: '0 0 6px 6px', background: '#ece5d6', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                    <iframe title="preview" sandbox="" srcDoc={preview.html}
                      style={{ width: width === 'mobile' ? 380 : '100%', minWidth: width === 'mobile' ? 380 : undefined, height: 760, border: 0, background: '#ece5d6' }} />
                  </div>
                : <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid var(--line)', borderRadius: '0 0 6px 6px', padding: 16, fontSize: '0.9rem', margin: 0 }}>{preview.text}</pre>}
            </>
          ) : <div className="notice" style={{ marginTop: 0 }}><p>Start typing a subject and body — the real email appears here as you go.</p></div>}
        </div>
      </div>
    </div>
  )
}

// The rendered email, as recipients get it. Same server-side render as the
// composer's live pane and the real send.
function EmailPreview({ blast }) {
  const [p, setP] = useState(null); const [err, setErr] = useState(''); const [tab, setTab] = useState('html'); const [width, setWidth] = useState('desktop')
  useEffect(() => { api('/admin/blasts/preview', { method: 'POST', body: blast }).then(setP).catch(e => setErr(e.message)) }, [blast.id]) // eslint-disable-line
  if (err) return <div className="form-msg err">{err}</div>
  if (!p) return <p className="small">Rendering&hellip;</p>
  return (
    <div style={{ marginTop: 10 }}>
      <div className="admin-subtabs" style={{ marginTop: 0 }}>
        <button className={tab === 'html' ? 'on' : ''} onClick={() => setTab('html')}>Email</button>
        <button className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Plain text</button>
        {tab === 'html' && <>
          <button className={width === 'desktop' ? 'on' : ''} onClick={() => setWidth('desktop')} title="Desktop width">&#128421;</button>
          <button className={width === 'mobile' ? 'on' : ''} onClick={() => setWidth('mobile')} title="Phone width">&#128241;</button>
        </>}
        <span className="small" style={{ marginLeft: 'auto' }}>Subject: <strong>{p.subject}</strong></span>
      </div>
      {tab === 'html'
        ? <div style={{ border: '1px solid var(--line)', borderRadius: 6, background: '#ece5d6', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
            <iframe title="email" sandbox="" srcDoc={p.html} style={{ width: width === 'mobile' ? 380 : '100%', minWidth: width === 'mobile' ? 380 : undefined, height: 820, border: 0, background: '#ece5d6' }} />
          </div>
        : <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: 16, fontSize: '0.9rem' }}>{p.text}</pre>}
    </div>
  )
}

function Detail({ id, openPreview, onBack, onEdit }) {
  const [b, setB] = useState(null); const [err, setErr] = useState(''); const [rows, setRows] = useState(null); const [filter, setFilter] = useState('failed')
  const timer = useRef(null)
  const load = async () => { try { const d = await api(`/admin/blasts/${id}`); setB(d); if (d.status === 'sending') timer.current = setTimeout(load, 5000) } catch (e) { setErr(e.message) } }
  useEffect(() => { load(); return () => clearTimeout(timer.current) }, [id]) // eslint-disable-line
  const loadRows = async (st) => { setFilter(st); setRows((await api(`/admin/blasts/${id}/recipients?status=${st}`)).rows) }
  const act = async (path, confirmMsg, body) => { if (confirmMsg && !confirm(confirmMsg)) return; setErr(''); try { await api(`/admin/blasts/${id}/${path}`, { method: 'POST', body }); load() } catch (e) { setErr(e.message) } }
  const [when, setWhen] = useState(''); const [showPreview, setShowPreview] = useState(!!openPreview)
  const schedule = () => { if (!when) return setErr('Pick a date and time first'); act('send', `Schedule this blast for ${fmtWhen(when)}?`, { scheduled_at: new Date(when).toISOString() }) }
  const remove = async () => { if (confirm('Delete this blast and its send log?')) { await api(`/admin/blasts/${id}`, { method: 'DELETE' }); onBack() } }

  if (!b) return <p className="small">{err || 'Loading…'}</p>
  const pct = b.total ? Math.round(((b.sent + b.failed) / b.total) * 100) : 0
  const sandbox = (rows || []).some(r => /not verified/i.test(r.error))
  return (
    <div>
      <button className="linkbtn" onClick={onBack}>&larr; All blasts</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: 0 }}>{b.subject} <span className="pill" style={{ background: STATUS_COLOR[b.status] }}>{b.status}</span></h2>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button className={showPreview ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setShowPreview(v => !v)}>{showPreview ? 'Hide preview' : 'Preview'}</button>
          {['draft', 'scheduled'].includes(b.status) && <button className="btn btn-outline" onClick={() => onEdit({ id: b.id, subject: b.subject, preheader: b.preheader, body: b.body, image: b.image || '', cta_label: b.cta_label, cta_url: b.cta_url, rate_per_minute: b.rate_per_minute, daily_cap: b.daily_cap, audience: b.audience })}>Edit</button>}
          {b.status === 'draft' && <button className="btn btn-primary" onClick={() => act('send', 'Send this blast to the selected audience now? This cannot be undone.')}>Send now</button>}
          {b.status === 'scheduled' && <button className="btn btn-outline" onClick={() => act('unschedule')}>Cancel schedule</button>}
          {b.status === 'sending' && <button className="btn btn-outline" onClick={() => act('pause')}>Pause</button>}
          {b.status === 'paused' && <button className="btn btn-primary" onClick={() => act('resume')}>Resume</button>}
          {b.failed > 0 && b.status !== 'sending' && <button className="btn btn-outline" onClick={() => act('requeue', `Put the ${b.failed} failed addresses back in the queue?`)}>Retry failed</button>}
          {b.status !== 'sending' && <button className="btn btn-outline" style={{ borderColor: 'var(--stripe)', color: 'var(--stripe)' }} onClick={remove}>Delete</button>}
        </div>
      </div>
      {err && <div className="form-msg err">{err}</div>}
      {b.note && <div className="form-msg err">{b.note}</div>}
      <p className="small">Created {fmtDate(b.created_at)}{b.scheduled_at && b.status === 'scheduled' && ` · sends ${fmtWhen(b.scheduled_at)}`}{b.started_at && ` · started ${fmtDate(b.started_at)}`}{b.finished_at && ` · finished ${fmtDate(b.finished_at)}`} · {b.rate_per_minute}/min{b.daily_cap ? `, ${b.daily_cap}/day` : ''} · image: {b.image === 'auto' ? 'chosen for you' : b.image || 'none'} · backend: {b.backend}</p>
      {b.status === 'draft' && (
        <div className="notice" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Or schedule it:</strong>
          <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={{ maxWidth: 240 }} />
          <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={schedule}>Schedule</button>
          <span className="small">Starts on its own at that time (your local clock) and trickles at the pace set on the draft. From the server shell: <code>node scripts/blast.js send {b.id} --at "YYYY-MM-DD HH:MM"</code>.</span>
        </div>
      )}

      {b.status !== 'draft' && (
        <>
          <div className="stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {[['total', b.total, ''], ['sent', b.sent, '#1f6b2a'], ['confirmed', b.byStatus.confirmed || 0, '#1f6b2a'], ['failed', b.failed, '#b8321f'], ['bounced', b.byStatus.bounced || 0, '#b8321f'], ['queued', b.byStatus.queued || 0, '']].map(([l, n, c]) => (
              <div className="stat" key={l} style={{ cursor: 'pointer' }} onClick={() => loadRows(l === 'total' ? '' : l)}><div className="stat-n" style={{ color: c || undefined }}>{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
          {b.status === 'sending' && <div style={{ background: 'var(--line)', borderRadius: 4, height: 8, margin: '12px 0' }}><div style={{ width: `${pct}%`, background: 'var(--navy-800)', height: 8, borderRadius: 4, transition: 'width .5s' }} /></div>}
          {sandbox && <div className="notice"><p><strong>SES is still in the sandbox.</strong> Addresses that aren&rsquo;t verified in SES are rejected with "not verified" — that is AWS, not a bad address. Get production access (ops/email-setup.md §5 or the CloudShell script in §7), then click <strong>Retry failed</strong> and <strong>Resume</strong>.</p></div>}
          {rows && (
            <>
              <h3 style={{ marginTop: 16 }}>{filter || 'all'} ({rows.length})</h3>
              <table className="spec" style={{ fontSize: '0.88rem' }}><tbody>
                {rows.map(r => <tr key={r.id}><th style={{ width: '38%', fontWeight: 400 }}><code>{r.email}</code></th><td>{r.name}</td><td className="small" style={{ color: STATUS_COLOR[['sent', 'confirmed'].includes(r.status) ? 'done' : 'failed'] }}>{r.status}{r.error && ` — ${r.error}`}</td></tr>)}
              </tbody></table>
            </>
          )}
        </>
      )}
      {['draft', 'scheduled'].includes(b.status) && <AudienceSummary a={b.audience} />}
      {showPreview && <EmailPreview blast={b} />}
      <details style={{ marginTop: 20 }}><summary className="small" style={{ cursor: 'pointer' }}>Show the source text</summary><pre style={{ whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid var(--line)', padding: 14, borderRadius: 6, fontSize: '0.9rem' }}>{b.body}</pre></details>
    </div>
  )
}

// Hero image: "choose for me" (server picks from the curated pool per blast),
// a thumbnail from the pool, none, or a custom basename.
function ImagePicker({ value, pool, onChange }) {
  const auto = value === 'auto'
  const custom = value && !auto && !pool.includes(value)
  return (
    <div>
      <label>Hero image</label>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0, fontWeight: 600 }}><input type="checkbox" checked={auto} onChange={e => onChange(e.target.checked ? 'auto' : '')} /> Choose for me</label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}><input type="radio" checked={!value} onChange={() => onChange('')} /> No image</label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: 0 }}>Custom: <input placeholder="basename in /images" value={custom ? value : ''} onChange={e => onChange(e.target.value)} style={{ maxWidth: 200, padding: '4px 8px' }} /></label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6, opacity: auto ? 0.45 : 1 }}>
        {pool.map(n => (
          <button type="button" key={n} title={n} onClick={() => onChange(n)} disabled={auto}
            style={{ padding: 0, border: value === n ? '3px solid var(--stripe)' : '1px solid var(--line)', borderRadius: 6, overflow: 'hidden', background: '#fff', cursor: auto ? 'default' : 'pointer', aspectRatio: '3 / 2' }}>
            <img src={`/images/${n}.webp`} alt={n} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
      <div className="small" style={{ marginTop: 6 }}>{auto ? 'A different photo from the pool is picked for each blast; Preview shows the one this blast will use.' : value ? `Using ${value}` : 'Text-only email.'}</div>
    </div>
  )
}

function AudienceSummary({ a }) {
  const [info, setInfo] = useState(null)
  useEffect(() => { api('/admin/blasts/audience', { method: 'POST', body: { audience: a } }).then(setInfo).catch(() => {}) }, [JSON.stringify(a)]) // eslint-disable-line
  return (
    <div className="notice notice-brass"><p><strong>Will send to {info ? info.count : '…'} addresses.</strong> Source: {a.source}{a.source !== 'subscribers' && ` · status ${a.statuses.join('/')} · kinds ${a.kinds.join('/')}${a.tag ? ` · tag ${a.tag}` : ''}`}. Bounced/unsubscribed always excluded.</p></div>
  )
}
