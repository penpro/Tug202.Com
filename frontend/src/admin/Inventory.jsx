import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

// Ship's inventory. Written for a volunteer standing in a locker with a phone:
// photograph first, type later. A name is the only required field.
//
// Photos are downscaled in the browser before upload — a modern phone camera
// makes 4 MB files and the server has 900 MB of RAM and no image library.

const KINDS = [
  { key: 'location', label: 'Location', hint: 'The area it lives in — the shelf, the corner of the locker' },
  { key: 'container', label: 'Container', hint: 'The bin, crate or box it is in, with its label if it has one' },
  { key: 'packaging', label: 'Packaging', hint: 'The bag or box the part came in — part numbers often live here' },
  { key: 'part', label: 'Part', hint: 'The thing itself' },
  { key: 'label', label: 'Label / plate', hint: 'Data plate, stamped numbers, tag' },
  { key: 'other', label: 'Other', hint: '' }
]
const CONDS = ['new', 'used-good', 'serviceable', 'needs-repair', 'scrap', 'unknown']
const STATUS_COLOR = { active: '#1f6b2a', low: '#a2823a', 'used-up': '#7a8190', disposed: '#7a8190' }
const photoUrl = (file) => `/api/admin/inventory/photo/${file}`

// Draw the picture into a canvas at a sane size and re-encode as JPEG. 1600px
// keeps a part number readable and lands around 300 KB.
async function shrink(file, max = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file                       // HEIC or anything exotic: send as-is
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality))
  bitmap.close?.()
  return blob && blob.size < file.size ? blob : file
}

export default function Inventory({ me }) {
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  const [q, setQ] = useState(''); const [filters, setFilters] = useState({ system: '', location: '', status: '' })
  const [open, setOpen] = useState(null)      // item id, or 'new'

  const load = async (query = q, f = filters) => {
    const p = new URLSearchParams()
    if (query) p.set('q', query)
    for (const [k, v] of Object.entries(f)) if (v) p.set(k, v)
    try { setD(await api('/admin/inventory' + (p.toString() ? `?${p}` : ''))) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [filters]) // eslint-disable-line

  if (open) return <Item id={open} facets={d?.facets} onBack={() => { setOpen(null); load() }} />
  if (err) return <div className="form-msg err">{err}</div>
  if (!d) return <p className="small">Loading&hellip;</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.6rem' }}>Inventory</h2>
        <button className="btn btn-primary" onClick={() => setOpen('new')}>+ Add an item</button>
      </div>
      <p className="small">
        {d.totals.items} items · {d.totals.pieces} pieces on hand
        {d.totals.low > 0 && <> · <button className="linkbtn" onClick={() => setFilters(f => ({ ...f, status: 'low' }))}>{d.totals.low} running low</button></>}
      </p>

      <div className="admin-bar">
        <input placeholder="Name, part number, system, bin…" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load(q)} style={{ flex: '1 1 220px' }} />
        <button className="btn btn-outline" onClick={() => load(q)}>Search</button>
        <select value={filters.system} onChange={e => setFilters(f => ({ ...f, system: e.target.value }))}>
          <option value="">Any system</option>
          {(d.facets.systems || []).map(s => <option key={s.v} value={s.v}>{s.v} ({s.n})</option>)}
        </select>
        <select value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}>
          <option value="">Anywhere</option>
          {(d.facets.locations || []).map(s => <option key={s.v} value={s.v}>{s.v} ({s.n})</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Any status</option>
          {['active', 'low', 'used-up', 'disposed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!d.rows.length && <p className="small">Nothing here yet. Tap <strong>Add an item</strong>, photograph it and give it a name — the rest can wait.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
        {d.rows.map(r => (
          <button key={r.id} onClick={() => setOpen(r.id)}
            style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', padding: 0, cursor: 'pointer', overflow: 'hidden', font: 'inherit' }}>
            <div style={{ aspectRatio: '4 / 3', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.thumb
                ? <img src={photoUrl(r.thumb)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span className="small" style={{ color: '#b9b2a4' }}>no photo</span>}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <strong style={{ display: 'block', lineHeight: 1.25 }}>{r.name}</strong>
              <div className="small">
                {r.part_number && <>#{r.part_number} · </>}
                <strong style={{ color: STATUS_COLOR[r.status] }}>{r.qty} {r.unit}</strong>
                {r.status === 'low' && <span className="pill" style={{ background: '#a2823a' }}>low</span>}
              </div>
              <div className="small" style={{ color: 'var(--ink-3)' }}>
                {[r.ship_system, r.location, r.container_id].filter(Boolean).join(' · ') || 'no location yet'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Item({ id, facets, onBack }) {
  const isNew = id === 'new'
  const [f, setF] = useState(blank())
  const [photos, setPhotos] = useState([]); const [moves, setMoves] = useState([])
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState([])          // queued before the item exists

  useEffect(() => {
    if (isNew) return
    api(`/admin/inventory/${id}`).then(d => { setF({ ...blank(), ...d.row }); setPhotos(d.photos); setMoves(d.moves) })
      .catch(e => setMsg({ ok: false, text: e.message }))
  }, [id, isNew])

  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))

  const save = async () => {
    if (!f.name.trim()) { setMsg({ ok: false, text: 'Give it a name — everything else can come later.' }); return null }
    setBusy(true); setMsg(null)
    try {
      const d = isNew ? await api('/admin/inventory', { method: 'POST', body: f })
        : await api(`/admin/inventory/${id}`, { method: 'PATCH', body: f })
      setMsg({ ok: true, text: 'Saved.' })
      // Photos taken before the item existed get attached now.
      if (isNew && pending.length) {
        for (const p of pending) await upload(d.row.id, p.blob, p.kind)
        setPending([])
      }
      if (isNew) { onBack(); return d.row }
      setF(x => ({ ...x, ...d.row }))
      return d.row
    } catch (e) { setMsg({ ok: false, text: e.message }); return null } finally { setBusy(false) }
  }

  const upload = async (itemId, blob, kind) => {
    const res = await fetch(`/api/admin/inventory/${itemId}/photo?kind=${kind}`, {
      method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(d.error || 'Upload failed')
    return d.photo
  }

  const addPhotos = async (kind, files) => {
    if (!files?.length) return
    setBusy(true); setMsg({ ok: true, text: `Preparing ${files.length} photo${files.length === 1 ? '' : 's'}…` })
    try {
      for (const file of files) {
        const blob = await shrink(file)
        if (isNew) setPending(p => [...p, { kind, blob, preview: URL.createObjectURL(blob) }])
        else { const photo = await upload(id, blob, kind); setPhotos(p => [...p, photo]) }
      }
      setMsg({ ok: true, text: isNew ? 'Photos ready — they upload when you save.' : 'Photos added.' })
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }

  const dropPhoto = async (pid) => {
    if (!confirm('Delete this photo?')) return
    await api(`/admin/inventory/photo/${pid}`, { method: 'DELETE' })
    setPhotos(p => p.filter(x => x.id !== pid))
  }
  const bump = async (delta) => {
    const reason = delta < 0 ? (prompt('What is it for? (optional)') ?? '') : ''
    const d = await api(`/admin/inventory/${id}/qty`, { method: 'POST', body: { delta, reason } })
    setF(x => ({ ...x, qty: d.qty, status: d.status }))
  }
  const remove = async () => {
    if (!confirm('Delete this item and its photos?')) return
    await api(`/admin/inventory/${id}`, { method: 'DELETE' }); onBack()
  }

  const list = (kind) => (isNew ? pending.filter(p => p.kind === kind) : photos.filter(p => p.kind === kind))

  return (
    <div>
      <button className="linkbtn" onClick={onBack}>&larr; All items</button>
      <h2 style={{ fontSize: '1.5rem', marginTop: 8 }}>
        {isNew ? 'New item' : f.name}
        {!isNew && f.status === 'low' && <span className="pill" style={{ background: '#a2823a' }}>running low</span>}
      </h2>

      {/* Photographs first: it is what the phone is already in your hand for. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, margin: '10px 0 18px' }}>
        {KINDS.map(k => (
          <div key={k.key} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <strong style={{ fontSize: '0.9rem' }}>{k.label}</strong>
              <span className="small">{list(k.key).length || ''}</span>
            </div>
            {k.hint && <div className="small" style={{ color: 'var(--ink-3)', marginBottom: 6 }}>{k.hint}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {list(k.key).map((p, i) => (
                <div key={p.id || i} style={{ position: 'relative' }}>
                  <img src={p.preview || photoUrl(p.file)} alt={k.label} loading="lazy"
                    style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--line)' }} />
                  {p.id && <button onClick={() => dropPhoto(p.id)} title="Delete"
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>}
                </div>
              ))}
            </div>
            <PhotoButtons onPick={(files) => addPhotos(k.key, files)} disabled={busy} />
          </div>
        ))}
      </div>

      <div className="form" style={{ maxWidth: 'none' }}>
        <div className="row">
          <div><label>What is it? *</label><input value={f.name} onChange={set('name')} placeholder="Racor fuel filter element" autoFocus={isNew} /></div>
          <div><label>Part number</label><input value={f.part_number} onChange={set('part_number')} placeholder="2010TM-OR" /></div>
        </div>
        <div className="row">
          <div><label>Manufacturer</label><input value={f.manufacturer} onChange={set('manufacturer')} /></div>
          <div><label>For which system</label>
            <input list="inv-systems" value={f.ship_system} onChange={set('ship_system')} placeholder="Port main 278 / 671 gen set / deck" />
            <datalist id="inv-systems">{(facets?.systems || []).map(s => <option key={s.v} value={s.v} />)}</datalist></div>
        </div>

        <div className="row">
          <div><label>How many</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!isNew && <button type="button" className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => bump(-1)}>&minus;</button>}
              <input type="number" min={0} value={f.qty} onChange={set('qty')} style={{ width: 90 }} />
              {!isNew && <button type="button" className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => bump(1)}>+</button>}
              <input list="inv-units" value={f.unit} onChange={set('unit')} style={{ width: 90 }} />
              <datalist id="inv-units">{(facets?.units || []).map(s => <option key={s.v} value={s.v} />)}<option value="each" /><option value="ft" /><option value="gal" /><option value="box" /><option value="set" /></datalist>
            </div>
            <span className="small">Buttons log who took what; typing a number just corrects the count.</span></div>
          <div><label>Tell us when it drops to <span className="small">(0 = never)</span></label>
            <input type="number" min={0} value={f.min_qty} onChange={set('min_qty')} style={{ width: 110 }} /></div>
        </div>

        <div className="row">
          <div><label>Where is it</label>
            <input list="inv-locations" value={f.location} onChange={set('location')} placeholder="Lazarette, port shelf 3" />
            <datalist id="inv-locations">{(facets?.locations || []).map(s => <option key={s.v} value={s.v} />)}</datalist></div>
          <div><label>Container</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input list="inv-containers" value={f.container_type} onChange={set('container_type')} placeholder="bin / crate / locker" />
              <input value={f.container_id} onChange={set('container_id')} placeholder="Bin A-14" />
              <datalist id="inv-containers">{(facets?.containers || []).map(s => <option key={s.v} value={s.v} />)}<option value="bin" /><option value="crate" /><option value="tote" /><option value="locker" /><option value="shelf" /><option value="pallet" /></datalist>
            </div></div>
        </div>

        <div className="row">
          <div><label>Condition</label>
            <select value={f.cond} onChange={set('cond')}>{CONDS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label>Tags <span className="small">(comma separated)</span></label>
            <input value={f.tags} onChange={set('tags')} placeholder="consumable, spares, hazmat" /></div>
        </div>

        <details open={!!(f.order_url || f.vendor || f.price)}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, margin: '6px 0' }}>Getting another one</summary>
          <div className="row">
            <div><label>Vendor</label><input value={f.vendor} onChange={set('vendor')} placeholder="Fisheries Supply" /></div>
            <div><label>Price</label><input value={f.price ?? ''} onChange={set('price')} placeholder="38.50" /></div>
          </div>
          <div><label>Order link</label><input value={f.order_url} onChange={set('order_url')} placeholder="https://…" /></div>
          <div><label>Second source / substitute</label><input value={f.alt_order_url} onChange={set('alt_order_url')} placeholder="https://…" /></div>
          <div><label>Ordering notes</label><input value={f.order_notes} onChange={set('order_notes')} placeholder="Comes in a box of 12; the 10-micron is the one we want." /></div>
        </details>

        <details open={!!(f.procedure_ref || f.procedure_url)}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, margin: '6px 0' }}>Procedure</summary>
          <div className="small" style={{ marginBottom: 6 }}>
            The procedures library is not built yet. Note the job here and these will hook straight into it.
          </div>
          <div className="row">
            <div><label>See procedure</label><input value={f.procedure_ref} onChange={set('procedure_ref')} placeholder="Changing the port main fuel filters" /></div>
            <div><label>Link <span className="small">(document, video)</span></label><input value={f.procedure_url} onChange={set('procedure_url')} placeholder="https://…" /></div>
          </div>
        </details>

        <div><label>Notes</label><textarea style={{ minHeight: 90 }} value={f.notes || ''} onChange={set('notes')} placeholder="Anything the next person needs to know." /></div>

        {msg && <div className={`form-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>}
        <div className="btn-row">
          <button className="btn btn-primary" onClick={save} disabled={busy}>{isNew ? 'Save item' : 'Save changes'}</button>
          {f.order_url && <a className="btn btn-outline" href={f.order_url} target="_blank" rel="noreferrer">Order another</a>}
          {!isNew && <button className="btn btn-outline" style={{ borderColor: 'var(--stripe)', color: 'var(--stripe)' }} onClick={remove}>Delete</button>}
        </div>
      </div>

      {moves.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>Count history ({moves.length})</summary>
          <table className="spec" style={{ fontSize: '0.86rem' }}><tbody>
            {moves.map(m => (
              <tr key={m.id}>
                <th style={{ fontWeight: 400, width: '30%' }}>{new Date(m.created_at).toLocaleString()}</th>
                <td>{m.delta > 0 ? `+${m.delta}` : m.delta} &rarr; {m.qty_after}</td>
                <td className="small">{m.who || '—'} {m.reason && `· ${m.reason}`}</td>
              </tr>
            ))}
          </tbody></table>
        </details>
      )}
    </div>
  )
}

// Two ways in: the camera straight away, or the photo roll. Phones show their
// camera for capture="environment"; desktops just open a file picker.
function PhotoButtons({ onPick, disabled }) {
  const cam = useRef(null), lib = useRef(null)
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input ref={cam} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { onPick([...e.target.files]); e.target.value = '' }} />
      <input ref={lib} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { onPick([...e.target.files]); e.target.value = '' }} />
      <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem' }}
        disabled={disabled} onClick={() => cam.current.click()}>📷 Take</button>
      <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.82rem' }}
        disabled={disabled} onClick={() => lib.current.click()}>Choose</button>
    </div>
  )
}

const blank = () => ({
  name: '', part_number: '', manufacturer: '', qty: 1, unit: 'each', min_qty: 0,
  ship_system: '', location: '', container_type: '', container_id: '',
  cond: 'unknown', status: 'active', tags: '', vendor: '', order_url: '', alt_order_url: '',
  price: '', order_notes: '', procedure_ref: '', procedure_url: '', notes: ''
})
