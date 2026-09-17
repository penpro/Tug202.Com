import { useEffect, useMemo, useState } from 'react'
import Seo from '../components/Seo.jsx'

// ---------------------------------------------------------------------------
// /admin — board-only contact CMS. Not linked from the nav; robots disallowed.
// Auth is the ADMIN_TOKEN bearer secret kept in sessionStorage. Until the
// site has HTTPS that token crosses the wire in the clear, exactly like the
// curl usage does; real logins replace this once the certificate is in.
// ---------------------------------------------------------------------------

const STATUSES = ['unverified', 'sent', 'bounced', 'confirmed', 'unsubscribed']
const STATUS_COLOR = { unverified: '#7a8190', sent: '#1d4278', bounced: '#b8321f', confirmed: '#1f6b2a', unsubscribed: '#555' }
const KIND_LABEL = { primary: 'primary', alternate: 'alt', permutation: 'guess' }

function useToken() {
  const [token, setTokenState] = useState(() => { try { return sessionStorage.getItem('tug202_admin') || '' } catch { return '' } })
  const setToken = (t) => { setTokenState(t); try { t ? sessionStorage.setItem('tug202_admin', t) : sessionStorage.removeItem('tug202_admin') } catch {} }
  return [token, setToken]
}

async function api(token, path, opts = {}) {
  const res = await fetch('/api/admin' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export default function Admin() {
  const [token, setToken] = useToken()
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [data, setData] = useState(null)
  const [filters, setFilters] = useState({ q: '', tag: '', status: '', optin: false })
  const [open, setOpen] = useState(null)      // expanded person id
  const [busy, setBusy] = useState(false)
  const [bulk, setBulk] = useState('')        // pasted bounce list
  const [adding, setAdding] = useState(false)

  const load = async () => {
    if (!token) return
    setBusy(true); setErr('')
    try {
      const qs = new URLSearchParams()
      if (filters.q) qs.set('q', filters.q)
      if (filters.tag) qs.set('tag', filters.tag)
      if (filters.status) qs.set('status', filters.status)
      if (filters.optin) qs.set('optin', '1')
      setData(await api(token, '/people?' + qs.toString()))
    } catch (e) {
      setErr(e.message); if (/401|Unauthorized/.test(e.message)) setToken('')
    } finally { setBusy(false) }
  }
  useEffect(() => { load() }, [token, filters.tag, filters.status, filters.optin]) // eslint-disable-line

  // Replace one person in the list after an edit without a full reload.
  const patchPerson = (p) => setData(d => ({ ...d, people: d.people.map(x => x.id === p.id ? p : x) }))

  const act = async (fn) => { setBusy(true); setErr(''); try { await fn() } catch (e) { setErr(e.message) } finally { setBusy(false) } }

  const markBulk = (status) => act(async () => {
    const emails = bulk.split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(s => s.includes('@'))
    if (!emails.length) return
    const path = status === 'bounced' ? '/contacts-list/bounces' : '/contacts-list/mark-sent'
    const r = await api(token, path, { method: 'POST', body: { emails } })
    setBulk(''); await load()
    setErr(`${r.updated} address${r.updated === 1 ? '' : 'es'} marked ${status}`)
  })

  if (!token) {
    return (
      <section className="section"><div className="container" style={{ maxWidth: 480 }}>
        <Seo title="Admin" />
        <span className="eyebrow">Board only</span>
        <h1 style={{ fontSize: '2rem' }}>Contact CMS</h1>
        <p className="small">Paste the admin token from <code>backend/.env</code> on the server. It stays in this browser tab only.</p>
        <form className="form" onSubmit={e => { e.preventDefault(); setToken(draft.trim()) }}>
          <div><label htmlFor="tok">Admin token</label><input id="tok" type="password" value={draft} onChange={e => setDraft(e.target.value)} autoComplete="off" /></div>
          {err && <div className="form-msg err">{err}</div>}
          <div><button className="btn btn-primary" type="submit">Open</button></div>
        </form>
      </div></section>
    )
  }

  const t = data?.totals
  const exportUrl = (extra) => `/api/admin/contacts-list/export.csv?token=${encodeURIComponent(token)}${extra}`

  return (
    <section className="section" style={{ paddingTop: 36 }}><div className="container">
      <Seo title="Contact CMS" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <div><span className="eyebrow">Board only</span><h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Contacts</h1></div>
        <div className="small">
          {t && <>{t.people} people · {t.emails} addresses · {STATUSES.map(s => t.byStatus[s] ? <span key={s} style={{ marginLeft: 10, color: STATUS_COLOR[s] }}>{t.byStatus[s]} {s}</span> : null)}</>}
          <button className="btn btn-outline" style={{ marginLeft: 16, padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setToken('')}>Lock</button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-bar">
        <input placeholder="Search name, city, event, email…" value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} onKeyDown={e => e.key === 'Enter' && load()} />
        <select value={filters.tag} onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))}>
          <option value="">All tags</option>{(data?.tags || []).map(x => <option key={x}>{x}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Any email status</option>{STATUSES.map(s => <option key={s} value={s}>has {s}</option>)}
        </select>
        <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={filters.optin} onChange={e => setFilters(f => ({ ...f, optin: e.target.checked }))} /> opt-in only</label>
        <button className="btn btn-outline" onClick={load} disabled={busy}>Search</button>
        <button className="btn btn-primary" onClick={() => setAdding(a => !a)}>+ Person</button>
      </div>

      {adding && <NewPerson token={token} onDone={(p) => { setAdding(false); setData(d => ({ ...d, people: [p, ...d.people] })); setOpen(p.id) }} onErr={setErr} />}

      {/* Bulk bounce / sent */}
      <details className="admin-bulk">
        <summary>Bulk: paste addresses from bounce reports or the sent list</summary>
        <textarea rows={4} placeholder="one per line, or comma/space separated" value={bulk} onChange={e => setBulk(e.target.value)} />
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => markBulk('bounced')} disabled={busy || !bulk.trim()}>Mark bounced</button>
          <button className="btn btn-outline" onClick={() => markBulk('sent')} disabled={busy || !bulk.trim()}>Mark sent</button>
          <a className="btn btn-outline" href={exportUrl('&status=unverified')}>Export unverified CSV</a>
          <a className="btn btn-outline" href={exportUrl('&status=unverified&kind=primary')}>Export primaries only</a>
        </div>
      </details>

      {err && <div className={`form-msg ${/marked/.test(err) ? 'ok' : 'err'}`} style={{ marginTop: 12 }}>{err}</div>}

      {/* People */}
      <div className="admin-list">
        {(data?.people || []).map(p => (
          <Person key={p.id} p={p} token={token} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onChange={patchPerson}
                  onDelete={() => setData(d => ({ ...d, people: d.people.filter(x => x.id !== p.id) }))} act={act} />
        ))}
        {data && !data.people.length && <p className="small">No matches.</p>}
      </div>
    </div></section>
  )
}

function Person({ p, token, open, onToggle, onChange, onDelete, act }) {
  const primary = p.emails.find(e => e.kind === 'primary') || p.emails[0]
  const live = p.emails.filter(e => e.status !== 'bounced' && e.status !== 'unsubscribed').length
  const [edit, setEdit] = useState(null)
  const [newEmail, setNewEmail] = useState('')

  const save = () => act(async () => { onChange(await api(token, `/people/${p.id}`, { method: 'PATCH', body: edit })); setEdit(null) })
  const setEmail = (id, body) => act(async () => onChange(await api(token, `/emails/${id}`, { method: 'PATCH', body })))
  const delEmail = (id) => act(async () => onChange(await api(token, `/emails/${id}`, { method: 'DELETE' })))
  const addEmail = () => act(async () => { onChange(await api(token, `/people/${p.id}/emails`, { method: 'POST', body: { email: newEmail, kind: 'alternate' } })); setNewEmail('') })
  const remove = () => { if (confirm(`Delete ${p.name} and all ${p.emails.length} addresses?`)) act(async () => { await api(token, `/people/${p.id}`, { method: 'DELETE' }); onDelete() }) }

  return (
    <div className={`admin-person${open ? ' open' : ''}`}>
      <div className="admin-row" onClick={onToggle}>
        <div className="admin-name">
          <strong>{p.name || <em>unnamed</em>}</strong>
          {p.optin && <span className="pill" style={{ background: '#1f6b2a' }}>opt-in</span>}
          {p.tags && p.tags.split(',').map(tg => <span className="pill" key={tg}>{tg}</span>)}
          <div className="small">{[p.city, p.event, p.event_date].filter(Boolean).join(' · ')}</div>
        </div>
        <div className="admin-email small">
          {primary ? <><span style={{ color: STATUS_COLOR[primary.status] }}>●</span> {primary.email}</> : <em>no email</em>}
          {p.emails.length > 1 && <span className="small" style={{ marginLeft: 8, color: 'var(--ink-3)' }}>+{p.emails.length - 1} more ({live} live)</span>}
        </div>
        <div className="small" style={{ whiteSpace: 'nowrap' }}>{open ? '▲' : '▼'}</div>
      </div>

      {open && (
        <div className="admin-detail">
          <div className="admin-emails">
            {p.emails.map(e => (
              <div className="admin-emailrow" key={e.id}>
                <code>{e.email}</code>
                <span className="pill" title="kind">{KIND_LABEL[e.kind]}</span>
                <span className="small" title="confidence read from the scan">{e.confidence}</span>
                <select value={e.status} onChange={ev => setEmail(e.id, { status: ev.target.value })} style={{ color: STATUS_COLOR[e.status] }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {e.kind !== 'primary' && <button className="linkbtn" onClick={() => setEmail(e.id, { kind: 'primary' })}>make primary</button>}
                <button className="linkbtn danger" onClick={() => delEmail(e.id)}>remove</button>
                {e.status_at && <span className="small">{new Date(e.status_at).toLocaleDateString()}</span>}
              </div>
            ))}
            <div className="admin-emailrow">
              <input placeholder="add another address" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && newEmail && addEmail()} />
              <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={addEmail} disabled={!newEmail}>Add</button>
            </div>
          </div>

          {edit ? (
            <div className="form" style={{ maxWidth: 'none', gap: 8 }}>
              <div className="row">
                <div><label>Name</label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
                <div><label>City</label><input value={edit.city} onChange={e => setEdit({ ...edit, city: e.target.value })} /></div>
              </div>
              <div className="row">
                <div><label>Phone</label><input value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></div>
                <div><label>Tags (comma)</label><input value={edit.tags} onChange={e => setEdit({ ...edit, tags: e.target.value })} /></div>
              </div>
              <div><label>Address</label><input value={edit.address} onChange={e => setEdit({ ...edit, address: e.target.value })} /></div>
              <div><label>Notes</label><textarea style={{ minHeight: 70 }} value={edit.notes || ''} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></div>
              <label className="check"><input type="checkbox" checked={!!edit.optin} onChange={e => setEdit({ ...edit, optin: e.target.checked })} /> explicit opt-in</label>
              <div className="btn-row" style={{ marginTop: 4 }}>
                <button className="btn btn-primary" onClick={save}>Save</button>
                <button className="btn btn-outline" onClick={() => setEdit(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="small" style={{ lineHeight: 1.7 }}>
              {p.address && <div><strong>Address:</strong> {p.address}</div>}
              {p.phone && <div><strong>Phone:</strong> {p.phone}</div>}
              <div><strong>Source:</strong> {p.source}{p.source_ref && ` · ${p.source_ref}`}{p.legacy_id && ` · ${p.legacy_id}`}</div>
              {p.notes && <div><strong>Notes:</strong> {p.notes}</div>}
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setEdit({ name: p.name, city: p.city, phone: p.phone, address: p.address, tags: p.tags, notes: p.notes, optin: p.optin })}>Edit</button>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'var(--stripe)', color: 'var(--stripe)' }} onClick={remove}>Delete person</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NewPerson({ token, onDone, onErr }) {
  const [f, setF] = useState({ name: '', email: '', city: '', event: '', tags: '', notes: '', optin: true })
  const set = k => e => setF(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => { e.preventDefault(); try { onDone(await api(token, '/people', { method: 'POST', body: { ...f, source: 'manual' } })) } catch (er) { onErr(er.message) } }
  return (
    <form className="form admin-new" onSubmit={submit} style={{ maxWidth: 'none' }}>
      <div className="row">
        <div><label>Name *</label><input required value={f.name} onChange={set('name')} /></div>
        <div><label>Email</label><input type="email" value={f.email} onChange={set('email')} /></div>
      </div>
      <div className="row">
        <div><label>City</label><input value={f.city} onChange={set('city')} /></div>
        <div><label>Where you met them</label><input value={f.event} onChange={set('event')} placeholder="e.g. Olympia open ship 2026" /></div>
      </div>
      <div className="row">
        <div><label>Tags</label><input value={f.tags} onChange={set('tags')} placeholder="volunteer, donor, pt-local" /></div>
        <div><label>Notes</label><input value={f.notes} onChange={set('notes')} /></div>
      </div>
      <label className="check"><input type="checkbox" checked={f.optin} onChange={set('optin')} /> they asked to be kept informed</label>
      <div className="btn-row" style={{ marginTop: 4 }}><button className="btn btn-primary" type="submit">Add person</button></div>
    </form>
  )
}
