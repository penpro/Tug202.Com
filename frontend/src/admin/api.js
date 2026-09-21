// Session-cookie API helper for the portal. Same-origin fetch sends the
// cookie automatically; a 401 means "not signed in".
export async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.status = res.status; throw e }
  return data
}

export const fmtDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
