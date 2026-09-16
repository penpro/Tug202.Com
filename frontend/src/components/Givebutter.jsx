import { useEffect, useState } from 'react'
import { givebutter } from '../site.config.js'

const SCRIPT_ID = 'givebutter-widgets'

// Loads the Givebutter widgets library once. Per their docs the install is
//   <script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=ACCOUNT_ID">
// We inject it on demand instead of in index.html so pages without a widget
// never pay for it, and report when it is loaded so callers can show a
// placeholder until then.
function useGivebutterScript() {
  const [ready, setReady] = useState(() => !!document.getElementById(SCRIPT_ID)?.dataset.loaded)
  useEffect(() => {
    if (!givebutter.accountId) return
    let s = document.getElementById(SCRIPT_ID)
    if (!s) {
      s = document.createElement('script')
      s.id = SCRIPT_ID
      s.async = true
      s.src = `https://widgets.givebutter.com/latest.umd.cjs?acct=${encodeURIComponent(givebutter.accountId)}`
      s.addEventListener('load', () => { s.dataset.loaded = '1'; setReady(true) })
      document.head.appendChild(s)
    } else if (s.dataset.loaded) {
      setReady(true)
    } else {
      s.addEventListener('load', () => setReady(true))
    }
  }, [])
  return ready
}

export const givebutterConfigured = () => !!(givebutter.accountId && givebutter.campaign)

// Full giving form, embedded inline. Renders nothing when not configured so
// the caller can show its own fallback.
export function GivebutterForm() {
  const ready = useGivebutterScript()
  if (!givebutterConfigured()) return null
  return (
    <div className="gb-embed" aria-busy={!ready}>
      {!ready && <p className="small">Loading secure giving form&hellip;</p>}
      <givebutter-giving-form campaign={givebutter.campaign}></givebutter-giving-form>
    </div>
  )
}

// Compact button that opens Givebutter checkout in a modal.
export function GivebutterButton() {
  const ready = useGivebutterScript()
  if (!givebutterConfigured() || !ready) return null
  return <givebutter-button campaign={givebutter.campaign}></givebutter-button>
}
