import { useState } from 'react'

// Shared submit logic for the contact / volunteer / newsletter forms.
// Posts JSON to `endpoint`, tracks status, and surfaces the server's message.
export default function useApiForm(endpoint) {
  const [status, setStatus] = useState('idle') // idle | sending | ok | err
  const [message, setMessage] = useState('')

  async function submit(payload) {
    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'We could not send that right now. Please try again in a few minutes or email us directly.')
      }
      setStatus('ok')
      setMessage(data.message || 'Thank you — we received your message.')
      return true
    } catch (e) {
      setStatus('err')
      setMessage(e.message || 'Something went wrong. Please try again or email us directly.')
      return false
    }
  }
  return { status, message, submit }
}
