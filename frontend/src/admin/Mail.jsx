import { useEffect, useRef, useState } from 'react'
import { api, fmtDate } from './api.js'

// Mail blasts: compose -> preview -> test-to-me -> pick audience -> send.
// Recipients and outcomes are tracked per address; bounces flow back from
// SES automatically once the SNS webhook is wired (ops/email-setup.md).

const STATUS_COLOR = { draft: '#7a8190', scheduled: '#5b6b8a', sending: '#1d4278', paused: '#a2823a', done: '#1f6b2a', failed: '#b8321f' }
const fmtWhen = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
const blankBlast = () => ({
  subject: '', preheader: '', image: 'auto', rate_per_minute: 30, daily_cap: 0,
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
  if (view.mode === 'detail') return <Detail id={view.id} onBack={() => { load(); setView({ mode: 'list' }) }} onEdit={(b) => setView({ mode: 'edit', blast: b })} />

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
              <div className="small">&rarr;</div>
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

function Composer({ initial, pool, onDone }) {
  const [b, setB] = useState(initial)
  const [preview, setPreview] = useState(null); const [tab, setTab] = useState('html')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = k => e => setB({ ...b, [k]: e.target.value })

  const doPreview = async () => { setErr(''); try { setPreview(await api('/admin/blasts/preview', { method: 'POST', body: b })) } catch (e) { setErr(e.message) } }
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
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="form" style={{ maxWidth: 'none' }}>
          <div><label>Subject *</label><input value={b.subject} onChange={set('subject')} placeholder="Reconnecting with the crew of Comanche" /></div>
          <div><label>Preheader <span className="small">(preview text in the inbox list, optional)</span></label><input value={b.preheader} onChange={set('preheader')} /></div>
          <div><label>Body *</label><textarea style={{ minHeight: 320, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '0.9rem' }} value={b.body} onChange={set('body')} /></div>
          <div className="small">Blank line = new paragraph · <code>**bold**</code> · <code>[label](https://…)</code> · lines starting <code>- </code> make a list · merge fields <code>{'{{first_name|there}}'}</code> <code>{'{{name}}'}</code> <code>{'{{email}}'}</code>. The unsubscribe link and "why you're receiving this" footer are added automatically.</div>
          <ImagePicker value={b.image} pool={pool} onChange={image => setB({ ...b, image })} />
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label>Pace <span className="small">(messages per minute)</span></label><input type="number" min={1} max={600} value={b.rate_per_minute ?? 30} onChange={e => setB({ ...b, rate_per_minute: Number(e.target.value) })} /></div>
            <div><label>Daily cap <span className="small">(0 = none)</span></label><input type="number" min={0} value={b.daily_cap ?? 0} onChange={e => setB({ ...b, daily_cap: Number(e.target.value) })} /></div>
          </div>
          <div className="small">Trickle defaults keep us under SES limits: 30/min is one every 2 s. While SES is still in the sandbox the account limit is 200/day and 1/s; after production access it&rsquo;s 50,000/day. When the cap is hit the blast waits and picks up after midnight on its own.</div>
          <AudiencePicker a={b.audience} onChange={audience => setB({ ...b, audience })} />
          {err && <div className={`form-msg ${/Test sent/.test(err) ? 'ok' : 'err'}`}>{err}</div>}
          <div className="btn-row">
            <button className="btn btn-outline" onClick={doPreview} disabled={busy}>Preview</button>
            <button className="btn btn-outline" onClick={test} disabled={busy || !b.subject || !b.body}>Send test to me</button>
            <button className="btn btn-primary" onClick={saveAndReview} disabled={busy || !b.subject || !b.body}>Save &amp; review</button>
          </div>
        </div>
        <div>
          {preview ? (
            <>
              <div className="admin-subtabs" style={{ marginTop: 0 }}>
                <button className={tab === 'html' ? 'on' : ''} onClick={() => setTab('html')}>HTML</button>
                <button className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Plain text</button>
                <span className="small" style={{ marginLeft: 'auto' }}>Subject: <strong>{preview.subject}</strong></span>
              </div>
              {tab === 'html'
                ? <iframe title="preview" sandbox="" srcDoc={preview.html} style={{ width: '100%', height: 720, border: '1px solid var(--line)', borderRadius: 6, background: '#ece5d6' }} />
                : <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: 16, fontSize: '0.9rem' }}>{preview.text}</pre>}
            </>
          ) : <div className="notice" style={{ marginTop: 0 }}><p>Click <strong>Preview</strong> to see the branded email as recipients will.</p></div>}
        </div>
      </div>
    </div>
  )
}

function Detail({ id, onBack, onEdit }) {
  const [b, setB] = useState(null); const [err, setErr] = useState(''); const [rows, setRows] = useState(null); const [filter, setFilter] = useState('failed')
  const timer = useRef(null)
  const load = async () => { try { const d = await api(`/admin/blasts/${id}`); setB(d); if (d.status === 'sending') timer.current = setTimeout(load, 2000) } catch (e) { setErr(e.message) } }
  useEffect(() => { load(); return () => clearTimeout(timer.current) }, [id]) // eslint-disable-line
  const loadRows = async (st) => { setFilter(st); setRows((await api(`/admin/blasts/${id}/recipients?status=${st}`)).rows) }
  const act = async (path, confirmMsg, body) => { if (confirmMsg && !confirm(confirmMsg)) return; setErr(''); try { await api(`/admin/blasts/${id}/${path}`, { method: 'POST', body }); load() } catch (e) { setErr(e.message) } }
  const [when, setWhen] = useState('')
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
          {['draft', 'scheduled'].includes(b.status) && <button className="btn btn-outline" onClick={() => onEdit({ id: b.id, subject: b.subject, preheader: b.preheader, body: b.body, image: b.image || '', rate_per_minute: b.rate_per_minute, daily_cap: b.daily_cap, audience: b.audience })}>Edit</button>}
          {b.status === 'draft' && <button className="btn btn-primary" onClick={() => act('send', 'Send this blast to the selected audience now? This cannot be undone.')}>Send now</button>}
          {b.status === 'scheduled' && <button className="btn btn-outline" onClick={() => act('unschedule')}>Cancel schedule</button>}
          {b.status === 'sending' && <button className="btn btn-outline" onClick={() => act('pause')}>Pause</button>}
          {b.status === 'paused' && <button className="btn btn-primary" onClick={() => act('resume')}>Resume</button>}
          {b.status !== 'sending' && <button className="btn btn-outline" style={{ borderColor: 'var(--stripe)', color: 'var(--stripe)' }} onClick={remove}>Delete</button>}
        </div>
      </div>
      {err && <div className="form-msg err">{err}</div>}
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
          <div className="stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[['total', b.total, ''], ['sent', b.sent, '#1f6b2a'], ['failed', b.failed, '#b8321f'], ['bounced', b.byStatus.bounced || 0, '#b8321f'], ['queued', b.byStatus.queued || 0, '']].map(([l, n, c]) => (
              <div className="stat" key={l} style={{ cursor: 'pointer' }} onClick={() => loadRows(l === 'total' ? '' : l)}><div className="stat-n" style={{ color: c || undefined }}>{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
          {b.status === 'sending' && <div style={{ background: 'var(--line)', borderRadius: 4, height: 8, margin: '12px 0' }}><div style={{ width: `${pct}%`, background: 'var(--navy-800)', height: 8, borderRadius: 4, transition: 'width .5s' }} /></div>}
          {sandbox && <div className="notice"><p><strong>SES is still in the sandbox.</strong> Addresses that aren&rsquo;t verified in SES are rejected with "not verified" — that is AWS, not a bad address. Request production access (ops/email-setup.md step 5), then these can be re-queued.</p></div>}
          {rows && (
            <>
              <h3 style={{ marginTop: 16 }}>{filter || 'all'} ({rows.length})</h3>
              <table className="spec" style={{ fontSize: '0.88rem' }}><tbody>
                {rows.map(r => <tr key={r.id}><th style={{ width: '38%', fontWeight: 400 }}><code>{r.email}</code></th><td>{r.name}</td><td className="small" style={{ color: STATUS_COLOR[r.status === 'sent' ? 'done' : 'failed'] }}>{r.status}{r.error && ` — ${r.error}`}</td></tr>)}
              </tbody></table>
            </>
          )}
        </>
      )}
      {['draft', 'scheduled'].includes(b.status) && <AudienceSummary a={b.audience} />}
      <details style={{ marginTop: 20 }}><summary className="small" style={{ cursor: 'pointer' }}>Show body</summary><pre style={{ whiteSpace: 'pre-wrap', background: '#fff', border: '1px solid var(--line)', padding: 14, borderRadius: 6, fontSize: '0.9rem' }}>{b.body}</pre></details>
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
