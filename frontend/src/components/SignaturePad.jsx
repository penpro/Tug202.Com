import { useEffect, useRef, useState } from 'react'

// Draw-with-your-finger signature box. Pointer events cover mouse, pen and
// touch with one code path; touch-action:none stops the tablet scrolling the
// page out from under someone signing.
export default function SignaturePad({ onChange, height = 160 }) {
  const wrap = useRef(null), canvas = useRef(null), drawing = useRef(false), last = useRef(null)
  const [empty, setEmpty] = useState(true)

  // Size the bitmap to the box at device resolution, so the line isn't furry.
  useEffect(() => {
    const c = canvas.current, box = wrap.current
    const fit = () => {
      const w = box.clientWidth, dpr = Math.min(window.devicePixelRatio || 1, 3)
      const data = !empty && c.width ? c.toDataURL() : null
      c.width = w * dpr; c.height = height * dpr
      c.style.width = w + 'px'; c.style.height = height + 'px'
      const ctx = c.getContext('2d')
      ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1f3a'
      if (data) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, w, height); img.src = data }
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, []) // eslint-disable-line

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const down = (e) => {
    e.preventDefault()
    canvas.current.setPointerCapture(e.pointerId)
    drawing.current = true; last.current = pos(e)
  }
  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvas.current.getContext('2d'), p = pos(e)
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    last.current = p
    if (empty) setEmpty(false)
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(canvas.current.toDataURL('image/png'))
  }
  const clear = () => {
    const c = canvas.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setEmpty(true); onChange('')
  }

  return (
    <div ref={wrap}>
      <div style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }}>
        <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ display: 'block', touchAction: 'none', cursor: 'crosshair', borderRadius: 6 }} />
        {empty && <span style={{ position: 'absolute', left: 14, bottom: 14, color: '#b9b2a4', pointerEvents: 'none', fontSize: '0.9rem' }}>
          Sign here with your finger or mouse
        </span>}
        <span style={{ position: 'absolute', left: 14, right: 90, bottom: 38, borderBottom: '1px solid #e6e0d3', pointerEvents: 'none' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="linkbtn" onClick={clear}>Clear signature</button>
      </div>
    </div>
  )
}
