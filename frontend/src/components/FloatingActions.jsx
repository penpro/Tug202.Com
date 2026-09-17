import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SignupForm from './SignupForm.jsx'
import { donate } from '../site.config.js'

// Persistent "Sign up" / "Donate" buttons pinned to the bottom-right (a
// bottom bar on phones). Sign up opens a modal with the email-list form;
// Donate goes to the online giving URL when configured, otherwise /support.
export default function FloatingActions() {
  const [open, setOpen] = useState(false)
  const closeBtn = useRef(null)
  const { pathname } = useLocation()
  const hidden = pathname.startsWith('/admin')

  // Close on route change and on Escape; lock body scroll while open.
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  if (hidden) return null
  return (
    <>
      <div className="fab-cluster" aria-label="Quick actions">
        <button type="button" className="fab fab-signup" onClick={() => setOpen(true)}>
          <span aria-hidden="true">&#9993;</span> Sign up
        </button>
        <Link className="fab fab-donate" to={donate.onlineUrl ? '/support#give' : '/support'}>
          <span aria-hidden="true">&#9829;</span> Donate
        </Link>
      </div>

      {open && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="signup-title">
            <button ref={closeBtn} type="button" className="modal-close" aria-label="Close" onClick={() => setOpen(false)}>&#10005;</button>
            <span className="eyebrow">Stay in the loop</span>
            <h2 id="signup-title" style={{ fontSize: '1.7rem' }}>Sign up for ship&rsquo;s mail</h2>
            <p className="small">Choose what you want to hear about. Change your mind any time.</p>
            <SignupForm />
          </div>
        </div>
      )}
    </>
  )
}
