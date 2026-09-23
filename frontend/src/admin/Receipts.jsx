import { useEffect, useState } from 'react'
import { api, fmtDate } from './api.js'

// Donation receipts: what donors asked for, what the board has issued.
// Issuing assigns a number, emails the donor the filled receipt, and leaves a
// printable copy behind.

const STATUS_COLOR = { new: '#a2823a', issued: '#1f6b2a', declined: '#7a8190' }
const money = (n) => (n === null || n === undefined || n === '' ? '' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }))
const day = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—')

export default function Receipts({ me }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [open, setOpen] = useState(null)
  const load = () => api('/admin/receipts').then(d => setRows(d.rows)).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  if (err) return <div className="form-msg err">{err}</div>
  if (!rows) return <p className="small">Loading&hellip;</p>
  const waiting = rows.filter(r => r.status === 'new').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.6rem' }}>Donation receipts</h2>
        <span className="small">{waiting ? `${waiting} waiting` : 'nothing waiting'} · {rows.length} total</span>
      </div>
      {!rows.length && <p className="small">No requests yet. Donors ask through <a href="/receipt">tug202.org/receipt</a>.</p>}
      <div className="admin-list">
        {rows.map(r => (
          <div className="admin-person" key={r.id}>
            <div className="admin-row" style={{ gridTemplateColumns: '1.5fr 1fr auto' }} onClick={() => setOpen(open === r.id ? null : r.id)}>
              <div className="admin-name">
                <strong>{r.donor_name}</strong>
                <span className="pill" style={{ background: STATUS_COLOR[r.status] }}>{r.status}</span>
                {r.receipt_no && <span className="pill">{r.receipt_no}</span>}
                <div className="small">{r.email} · asked {fmtDate(r.created_at)}</div>
              </div>
              <div className="small">
                {r.gift_kind === 'cash' ? money(r.amount) : 'goods'} · {day(r.received_on)}
                {r.restricted_for ? <><br />for {r.restricted_for}</> : null}
              </div>
              <div className="small">{open === r.id ? '▾' : '▸'}</div>
            </div>
            {open === r.id && <Detail row={r} me={me} onDone={load} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function Detail({ row, me, onDone }) {
  const [f, setF] = useState({ ...row, goods: !!row.goods })
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false)
  const [issuer, setIssuer] = useState({ issuer_name: row.issuer_name || me?.name || '', issuer_title: row.issuer_title || '' })
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const cash = f.gift_kind === 'cash'

  const save = async () => {
    setBusy(true); setMsg(null)
    try { await api(`/admin/receipts/${row.id}`, { method: 'PATCH', body: f }); setMsg({ ok: true, text: 'Saved.' }); onDone() }
    catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }
  const issue = async (sendEmail) => {
    if (!issuer.issuer_name) return setMsg({ ok: false, text: 'Who is issuing it?' })
    if (!confirm(sendEmail ? `Issue this receipt and email it to ${f.email}?` : 'Issue this receipt without emailing it?')) return
    setBusy(true); setMsg(null)
    try {
      await api(`/admin/receipts/${row.id}`, { method: 'PATCH', body: f })
      const d = await api(`/admin/receipts/${row.id}/issue`, { method: 'POST', body: { ...issuer, email: sendEmail } })
      setMsg({ ok: true, text: `Receipt ${d.row.receipt_no} issued${d.mailed ? ` and emailed to ${d.row.email}` : ' (not emailed)'}.` })
      onDone()
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }
  const decline = async () => {
    const why = prompt('Note for the record (why is this not being issued?)')
    if (why === null) return
    await api(`/admin/receipts/${row.id}/decline`, { method: 'POST', body: { admin_note: why } })
    onDone()
  }

  return (
    <div className="admin-msg-body">
      <p className="small" style={{ marginTop: 0 }}>
        Check it against the deposit or the Givebutter record, correct anything, then issue.
        {row.status === 'issued' && <> Issued {fmtDate(row.issued_at)} by {row.issuer_name}{row.issuer_title ? `, ${row.issuer_title}` : ''}.</>}
      </p>

      <div className="form" style={{ maxWidth: 'none' }}>
        <div className="row">
          <div><label>Donor name</label><input value={f.donor_name} onChange={set('donor_name')} /></div>
          <div><label>Email</label><input value={f.email} onChange={set('email')} /></div>
        </div>
        <div className="row">
          <div><label>Mailing address</label><input value={f.address || ''} onChange={set('address')} /></div>
          <div><label>Phone</label><input value={f.phone || ''} onChange={set('phone')} /></div>
        </div>
        <div className="row">
          <div><label>Date received</label><input type="date" value={(f.received_on || '').slice(0, 10)} onChange={set('received_on')} /></div>
          {cash
            ? <div><label>Amount</label><input value={f.amount || ''} onChange={set('amount')} /></div>
            : <div><label>Kind</label><input value="non-cash" disabled /></div>}
        </div>
        {cash ? (
          <div className="row">
            <div><label>Method</label><input value={f.method || ''} onChange={set('method')} /></div>
            <div><label>Check no.</label><input value={f.check_no || ''} onChange={set('check_no')} /></div>
          </div>
        ) : (
          <div><label>Description of the property</label><textarea style={{ minHeight: 70 }} value={f.description || ''} onChange={set('description')} /></div>
        )}
        <div><label>Restricted for <span className="small">(blank = unrestricted)</span></label><input value={f.restricted_for || ''} onChange={set('restricted_for')} /></div>

        <label className="check"><input type="checkbox" checked={f.goods} onChange={e => setF(x => ({ ...x, goods: e.target.checked }))} />
          <span>Goods or services were provided in return</span></label>
        {f.goods && (
          <div className="row">
            <div><label>Described as</label><input value={f.goods_desc || ''} onChange={set('goods_desc')} /></div>
            <div><label>Good-faith value</label><input value={f.goods_value || ''} onChange={set('goods_value')} /></div>
          </div>
        )}
        {f.note && <div><label>Donor&rsquo;s note</label><input value={f.note} disabled /></div>}
        <div><label>Board note <span className="small">(not shown to the donor)</span></label><input value={f.admin_note || ''} onChange={set('admin_note')} /></div>

        <div className="row">
          <div><label>Issued by</label><input value={issuer.issuer_name} onChange={e => setIssuer(x => ({ ...x, issuer_name: e.target.value }))} /></div>
          <div><label>Title</label><input value={issuer.issuer_title} onChange={e => setIssuer(x => ({ ...x, issuer_title: e.target.value }))} placeholder="Secretary" /></div>
        </div>

        {msg && <div className={`form-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
        <div className="btn-row">
          <button className="btn btn-outline" onClick={save} disabled={busy}>Save changes</button>
          <a className="btn btn-outline" href={`/api/admin/receipts/${row.id}/print`} target="_blank" rel="noreferrer">Open PDF</a>
          <button className="btn btn-primary" onClick={() => issue(true)} disabled={busy}>
            {row.status === 'issued' ? 'Re-send by email' : 'Issue & email to donor'}
          </button>
          {row.status !== 'issued' && <button className="btn btn-outline" onClick={() => issue(false)} disabled={busy}>Issue without emailing</button>}
          {row.status === 'new' && <button className="btn btn-outline" style={{ borderColor: 'var(--stripe)', color: 'var(--stripe)' }} onClick={decline}>Not a donation</button>}
        </div>
      </div>
    </div>
  )
}
