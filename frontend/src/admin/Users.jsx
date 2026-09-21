import { useEffect, useState } from 'react'
import { api, fmtDate } from './api.js'

// User management (admins only). Invites produce a one-time setup link;
// until SMTP is configured the admin copies it to the new person themselves.
export default function Users({ me }) {
  const [users, setUsers] = useState(null); const [err, setErr] = useState('')
  const [f, setF] = useState({ email: '', name: '', role: 'editor' })
  const [link, setLink] = useState(null) // { email, link, mailed, purpose }
  const load = () => api('/admin/users').then(d => setUsers(d.users)).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const invite = async (e) => {
    e.preventDefault(); setErr('')
    try { const d = await api('/admin/users', { method: 'POST', body: f }); setLink({ email: d.user.email, ...d, purpose: 'setup' }); setF({ email: '', name: '', role: 'editor' }); load() }
    catch (er) { setErr(er.message) }
  }
  const patch = async (u, body) => { setErr(''); try { await api(`/admin/users/${u.id}`, { method: 'PATCH', body }); load() } catch (er) { setErr(er.message) } }
  const resetLink = async (u) => { setErr(''); try { const d = await api(`/admin/users/${u.id}/reset-link`, { method: 'POST' }); setLink({ email: u.email, ...d }) } catch (er) { setErr(er.message) } }
  const remove = async (u) => { if (confirm(`Delete ${u.email}? They will lose access immediately.`)) { setErr(''); try { await api(`/admin/users/${u.id}`, { method: 'DELETE' }); load() } catch (er) { setErr(er.message) } } }
  const copy = () => navigator.clipboard?.writeText(link.link).then(() => setLink({ ...link, copied: true }))

  return (
    <div>
      <h2 style={{ fontSize: '1.6rem' }}>Users</h2>
      <p className="small" style={{ maxWidth: 720 }}>
        <strong>Admins</strong> can do everything including managing users. <strong>Editors</strong> can use the inbox, contacts and news but not this page.
        Access is granted by invite link; the link is valid for 7 days and works once.
      </p>

      <form className="form admin-new" onSubmit={invite} style={{ maxWidth: 'none' }}>
        <div className="row" style={{ gridTemplateColumns: '1.4fr 1fr 0.7fr auto', alignItems: 'end' }}>
          <div><label>Email *</label><input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div><label>Name</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div><label>Role</label><select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option value="editor">editor</option><option value="admin">admin</option></select></div>
          <div><button className="btn btn-primary" type="submit">Invite</button></div>
        </div>
      </form>

      {link && (
        <div className="notice notice-brass">
          <p><strong>{link.purpose === 'reset' ? 'Reset link' : 'Invite link'} for {link.email}</strong>{link.mailed ? ' — emailed to them.' : ' — email is not set up yet, so send this to them yourself (text, email, whatever):'}</p>
          <p><code style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>{link.link}</code></p>
          <div className="btn-row" style={{ marginTop: 6 }}>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={copy}>{link.copied ? 'Copied' : 'Copy link'}</button>
            <button className="linkbtn" onClick={() => setLink(null)}>dismiss</button>
          </div>
        </div>
      )}
      {err && <div className="form-msg err">{err}</div>}

      {!users && !err && <p className="small">Loading&hellip;</p>}
      <div className="admin-list">
        {(users || []).map(u => (
          <div className="admin-person" key={u.id}>
            <div className="admin-row" style={{ cursor: 'default', gridTemplateColumns: '1.4fr 1fr auto' }}>
              <div className="admin-name">
                <strong>{u.name || <em>no name yet</em>}</strong>
                <span className="pill" style={{ background: u.role === 'admin' ? 'var(--stripe)' : 'var(--navy-700)' }}>{u.role}</span>
                {!u.is_active && <span className="pill" style={{ background: '#555' }}>disabled</span>}
                {!u.has_password && u.is_active && <span className="pill" style={{ background: '#a2823a' }}>invite pending</span>}
                <div className="small">{u.email}{u.id === me.id && ' (you)'}</div>
              </div>
              <div className="small">{u.last_login_at ? `last sign-in ${fmtDate(u.last_login_at)}` : 'never signed in'}</div>
              <div className="btn-row" style={{ marginTop: 0 }}>
                {u.id !== me.id && <>
                  <button className="linkbtn" onClick={() => patch(u, { role: u.role === 'admin' ? 'editor' : 'admin' })}>{u.role === 'admin' ? 'make editor' : 'make admin'}</button>
                  <button className="linkbtn" onClick={() => patch(u, { is_active: !u.is_active })}>{u.is_active ? 'disable' : 'enable'}</button>
                </>}
                <button className="linkbtn" onClick={() => resetLink(u)}>{u.has_password ? 'reset link' : 'new invite link'}</button>
                {u.id !== me.id && <button className="linkbtn danger" onClick={() => remove(u)}>delete</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
