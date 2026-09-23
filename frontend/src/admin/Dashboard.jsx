import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiUpload, fmtDate } from './api.js'

const KIND = { contact: 'Contact message', volunteer: 'Volunteer signup', partner: 'Partner inquiry', subscriber: 'Newsletter signup' }

// --- Email authentication (DMARC) -------------------------------------------
// Mailbox providers send one aggregate report a day to the rua= address in our
// DNS. Drop the file here; the point is the "unrecognised senders" line — that
// is the only thing in a DMARC report that ever needs action.
function Dmarc() {
  const [d, setD] = useState(null); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const input = useRef(null)
  const load = () => api('/admin/dmarc/summary').then(setD).catch(() => setD(null))
  useEffect(() => { load() }, [])

  const upload = async (files) => {
    if (!files?.length) return
    setBusy(true); setMsg(null)
    const out = []
    for (const f of files) {
      try {
        const r = await apiUpload('/admin/dmarc/upload', f)
        out.push(r.duplicate ? `${f.name}: already had this one` : `${r.org}: ${r.messages} messages${r.foreign ? ` — ${r.foreign} from an unrecognised sender` : ''}`)
      } catch (e) { out.push(`${f.name}: ${e.message}`) }
    }
    setBusy(false); setMsg(out.join(' · ')); load()
  }

  const t = d?.totals
  const pct = t?.messages ? Math.round((t.passed / t.messages) * 100) : null
  const foreign = d?.foreign || []
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ marginBottom: 6 }}>Email authentication</h3>
      {t?.messages ? (
        <p className="small" style={{ marginTop: 0 }}>
          Last {d.days} days: <strong>{t.messages}</strong> messages seen by {d.reporters.length} provider{d.reporters.length === 1 ? '' : 's'},{' '}
          <strong style={{ color: pct === 100 ? '#1f6b2a' : '#b8321f' }}>{pct}% authenticated</strong>
          {t.rejected > 0 && <> · <span style={{ color: '#b8321f' }}>{t.rejected} rejected or quarantined</span></>}
          {d.policy && <> · policy <code>p={d.policy}</code></>}
        </p>
      ) : <p className="small" style={{ marginTop: 0 }}>No reports yet. Providers email one per day; drop the attachment below.</p>}

      {foreign.length > 0 && (
        <div className="form-msg err" style={{ marginBottom: 10 }}>
          <strong>Unrecognised sender{foreign.length === 1 ? '' : 's'} using tug202.org:</strong>{' '}
          {foreign.map(f => `${f.source_ip} (${f.messages} msg${f.messages === 1 ? '' : 's'}${f.passed ? ', authenticated' : ', failed'})`).join(' · ')}.
          {' '}Worth investigating — our own mail always authenticates as amazonses.com or tug202.org.
        </div>
      )}
      {t?.messages > 0 && !foreign.length && <p className="small" style={{ margin: '0 0 10px', color: '#1f6b2a' }}>&#10003; Every sender is ours (Amazon SES). No one else is sending as tug202.org.</p>}

      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); upload([...e.dataTransfer.files]) }}
        onClick={() => input.current?.click()}
        style={{ border: `2px dashed ${drag ? 'var(--stripe)' : 'var(--line)'}`, borderRadius: 6, padding: '16px 18px', textAlign: 'center', cursor: 'pointer', background: drag ? '#fff6f3' : 'transparent' }}>
        <input ref={input} type="file" multiple accept=".xml,.gz,.zip" style={{ display: 'none' }} onChange={e => { upload([...e.target.files]); e.target.value = '' }} />
        <span className="small">{busy ? 'Reading…' : 'Drop DMARC report files here (.zip, .xml.gz, .xml) or click to choose'}</span>
      </div>
      {msg && <div className="form-msg ok" style={{ marginTop: 8 }}>{msg}</div>}

      {d?.sources?.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>Senders seen ({d.sources.length})</summary>
          <table className="spec" style={{ fontSize: '0.88rem' }}><tbody>
            {d.sources.map(s => (
              <tr key={s.source_ip}>
                <th style={{ width: '30%', fontWeight: 400 }}><code>{s.source_ip}</code></th>
                <td className="small">{s.messages} msg · {s.passed === s.messages ? 'all authenticated' : `${s.passed}/${s.messages} authenticated`}</td>
                <td className="small">{s.ours ? 'ours (SES)' : <span style={{ color: '#b8321f' }}>unrecognised</span>} <span style={{ color: '#7a8190' }}>{[s.dkim_domains, s.spf_domains].filter(Boolean).join(' / ')}</span></td>
              </tr>
            ))}
          </tbody></table>
          <p className="small" style={{ marginTop: 6 }}>Reports so far: {d.reporters.map(r => `${r.org_name} (${r.reports})`).join(', ')}. These never name a recipient — bounces come from the Contacts tab, not from here.</p>
        </details>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api('/admin/summary').then(setD).catch(e => setErr(e.message)) }, [])
  if (err) return <div className="form-msg err">{err}</div>
  if (!d) return <p className="small">Loading&hellip;</p>
  const tiles = [
    { n: d.contacts.open ?? 0, l: 'unanswered messages', sub: `${d.contacts.n} total`, to: '/admin/inbox' },
    { n: d.volunteers.open ?? 0, l: 'volunteers to contact', sub: `${d.volunteers.n} total`, to: '/admin/inbox?tab=volunteers' },
    { n: d.partners.open ?? 0, l: 'partner inquiries open', sub: `${d.partners.n} total`, to: '/admin/inbox?tab=partners' },
    { n: d.subscribers.n, l: 'newsletter subscribers', sub: 'active', to: '/admin/inbox?tab=subscribers' },
    { n: d.crm.n, l: 'contacts in CRM', sub: 'people', to: '/admin/contacts' },
    { n: d.news.n, l: 'news posts live', sub: 'published', to: '/admin/news' }
  ]
  return (
    <div>
      <h2 style={{ fontSize: '1.6rem' }}>Dashboard</h2>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {tiles.map(t => (
          <Link key={t.l} to={t.to} className="stat" style={{ textDecoration: 'none' }}>
            <div className="stat-n" style={{ color: t.n && /unanswered|to contact|open/.test(t.l) ? 'var(--stripe)' : undefined }}>{t.n}</div>
            <div className="stat-l">{t.l}</div><div className="small">{t.sub}</div>
          </Link>
        ))}
      </div>
      <Dmarc />
      <h3 style={{ marginTop: 28 }}>Recent activity</h3>
      <table className="spec" style={{ fontSize: '0.92rem' }}>
        <tbody>
          {d.recent.map(r => (
            <tr key={r.kind + r.id}><th style={{ width: '22%', fontWeight: 400, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</th><td><span className="pill" style={{ marginLeft: 0, marginRight: 8 }}>{KIND[r.kind]}</span>{r.who}{r.what && <span className="small"> — {r.what}</span>}</td></tr>
          ))}
          {!d.recent.length && <tr><td className="small">Nothing yet.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
