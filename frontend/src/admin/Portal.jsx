import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import { api } from './api.js'
import Dashboard from './Dashboard.jsx'
import Contacts from './Contacts.jsx'
import Inbox from './Inbox.jsx'
import News from './News.jsx'
import Users from './Users.jsx'
import Mail from './Mail.jsx'
import Receipts from './Receipts.jsx'
import Sailings from './Sailings.jsx'
import Waivers from './Waivers.jsx'

// ---------------------------------------------------------------------------
// /admin — board portal. Session-cookie auth (see backend/auth.js).
// Not linked from the public nav; robots disallowed.
// ---------------------------------------------------------------------------

export default function Portal() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out
  const refresh = () => api('/auth/me').then(d => setUser(d.user)).catch(() => setUser(null))
  useEffect(() => { refresh() }, [])

  const { pathname } = useLocation()
  if (pathname === '/admin/setup') return <Setup onDone={u => setUser(u)} />
  if (user === undefined) return <div className="container section"><p className="small">Loading&hellip;</p></div>
  if (!user) return <Login onDone={u => setUser(u)} />
  return <Shell user={user} onSignOut={() => setUser(null)} />
}

function Shell({ user, onSignOut }) {
  const nav = useNavigate()
  const signOut = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); onSignOut(); nav('/admin') }
  const tabs = [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/inbox', label: 'Inbox' },
    { to: '/admin/contacts', label: 'Contacts' },
    { to: '/admin/sailings', label: 'Sailings' },
    { to: '/admin/waivers', label: 'Waivers' },
    { to: '/admin/receipts', label: 'Receipts' },
    { to: '/admin/news', label: 'News' },
    { to: '/admin/mail', label: 'Mail' },
    ...(user.role === 'admin' ? [{ to: '/admin/users', label: 'Users' }] : []),
    { to: '/admin/account', label: 'Account' }
  ]
  return (
    <section className="section" style={{ paddingTop: 28 }}><div className="container">
      <Seo title="Portal" />
      <div className="admin-head">
        <div><span className="eyebrow">Board portal</span><div className="small">Signed in as <strong>{user.name || user.email}</strong> · {user.role}</div></div>
        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={signOut}>Sign out</button>
      </div>
      <nav className="admin-tabs">
        {tabs.map(t => <NavLink key={t.to} to={t.to} end={t.end}>{t.label}</NavLink>)}
      </nav>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="sailings" element={<Sailings />} />
        <Route path="waivers" element={<Waivers />} />
        <Route path="receipts" element={<Receipts me={user} />} />
        <Route path="news" element={<News />} />
        <Route path="mail" element={<Mail />} />
        <Route path="users" element={user.role === 'admin' ? <Users me={user} /> : <Navigate to="/admin" replace />} />
        <Route path="account" element={<Account user={user} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div></section>
  )
}

function Login({ onDone }) {
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const d = await api('/auth/login', { method: 'POST', body: f }); onDone(d.user) }
    catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  return (
    <section className="section"><div className="container" style={{ maxWidth: 440 }}>
      <Seo title="Sign in" />
      <span className="eyebrow">Board portal</span>
      <h1 style={{ fontSize: '2rem' }}>Sign in</h1>
      <form className="form" onSubmit={submit}>
        <div><label htmlFor="li-e">Email</label><input id="li-e" type="email" required autoComplete="username" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        <div><label htmlFor="li-p">Password</label><input id="li-p" type="password" required autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
        {err && <div className="form-msg err">{err}</div>}
        <div><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
        <p className="small">Forgot your password? Ask another admin to send you a reset link.</p>
      </form>
    </div></section>
  )
}

// /admin/setup?token=… — finish an invite or a password reset.
function Setup({ onDone }) {
  const [params] = useSearchParams(); const token = params.get('token') || ''
  const nav = useNavigate()
  const [info, setInfo] = useState(undefined)
  const [f, setF] = useState({ name: '', password: '', confirm: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => {
    api('/auth/token?token=' + encodeURIComponent(token)).then(d => { setInfo(d); setF(x => ({ ...x, name: d.name || '' })) }).catch(e => { setInfo(null); setErr(e.message) })
  }, [token])
  const submit = async (e) => {
    e.preventDefault()
    if (f.password !== f.confirm) return setErr('Passwords do not match')
    setBusy(true); setErr('')
    try { const d = await api('/auth/setup', { method: 'POST', body: { token, name: f.name, password: f.password } }); onDone(d.user); nav('/admin', { replace: true }) }
    catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  return (
    <section className="section"><div className="container" style={{ maxWidth: 460 }}>
      <Seo title="Set password" />
      <span className="eyebrow">Board portal</span>
      <h1 style={{ fontSize: '2rem' }}>{info?.purpose === 'reset' ? 'Reset your password' : 'Set up your account'}</h1>
      {info === undefined && <p className="small">Checking link&hellip;</p>}
      {info === null && <div className="form-msg err">{err}</div>}
      {info && (
        <form className="form" onSubmit={submit}>
          <div><label>Email</label><input value={info.email} disabled /></div>
          <div><label htmlFor="su-n">Your name</label><input id="su-n" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></div>
          <div><label htmlFor="su-p">New password (10+ characters)</label><input id="su-p" type="password" required minLength={10} autoComplete="new-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
          <div><label htmlFor="su-c">Confirm password</label><input id="su-c" type="password" required autoComplete="new-password" value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value })} /></div>
          {err && <div className="form-msg err">{err}</div>}
          <div><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save and sign in'}</button></div>
        </form>
      )}
    </div></section>
  )
}

function Account({ user }) {
  const [f, setF] = useState({ current: '', password: '', confirm: '' })
  const [msg, setMsg] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    if (f.password !== f.confirm) return setMsg({ ok: false, text: 'Passwords do not match' })
    try { await api('/auth/password', { method: 'POST', body: { current: f.current, password: f.password } }); setMsg({ ok: true, text: 'Password changed.' }); setF({ current: '', password: '', confirm: '' }) }
    catch (er) { setMsg({ ok: false, text: er.message }) }
  }
  return (
    <div style={{ maxWidth: 460 }}>
      <h2 style={{ fontSize: '1.6rem' }}>Your account</h2>
      <p className="small">{user.email} · role: {user.role}</p>
      <form className="form" onSubmit={submit}>
        <div><label htmlFor="ac-c">Current password</label><input id="ac-c" type="password" required autoComplete="current-password" value={f.current} onChange={e => setF({ ...f, current: e.target.value })} /></div>
        <div><label htmlFor="ac-p">New password (10+ characters)</label><input id="ac-p" type="password" required minLength={10} autoComplete="new-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
        <div><label htmlFor="ac-x">Confirm</label><input id="ac-x" type="password" required autoComplete="new-password" value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value })} /></div>
        {msg && <div className={`form-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
        <div><button className="btn btn-primary" type="submit">Change password</button></div>
      </form>
    </div>
  )
}
