import { useEffect } from 'react'

// Minimal per-page <title> / description without pulling in react-helmet.
export default function Seo({ title, description }) {
  useEffect(() => {
    const base = 'Tug Comanche — ATA-202 / WMEC-202'
    document.title = title ? `${title} | ${base}` : base
    if (description) {
      let m = document.querySelector('meta[name="description"]')
      if (!m) {
        m = document.createElement('meta')
        m.name = 'description'
        document.head.appendChild(m)
      }
      m.content = description
    }
  }, [title, description])
  return null
}
