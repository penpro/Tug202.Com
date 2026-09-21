import { useEffect, useState } from 'react'
import { api } from './api.js'

// News editor. Body is plain text; blank lines make paragraphs on the site.
// `image` is a basename from /public/images (e.g. narrows-fog), optional.
const blank = () => ({ title: '', date: new Date().toISOString().slice(0, 10), body: '', image: '', is_published: true })

export default function News() {
  const [posts, setPosts] = useState(null); const [err, setErr] = useState('')
  const [edit, setEdit] = useState(null) // null | {id?, ...fields}
  const load = () => api('/admin/news').then(d => setPosts(d.posts)).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      if (edit.id) await api(`/admin/news/${edit.id}`, { method: 'PATCH', body: edit })
      else await api('/admin/news', { method: 'POST', body: edit })
      setEdit(null); load()
    } catch (er) { setErr(er.message) }
  }
  const remove = async (p) => { if (confirm(`Delete "${p.title}"?`)) { await api(`/admin/news/${p.id}`, { method: 'DELETE' }); load() } }
  const togglePub = async (p) => { await api(`/admin/news/${p.id}`, { method: 'PATCH', body: { is_published: !p.is_published } }); load() }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.6rem' }}>News</h2>
        {!edit && <button className="btn btn-primary" onClick={() => setEdit(blank())}>+ New post</button>}
      </div>
      {err && <div className="form-msg err">{err}</div>}

      {edit && (
        <form className="form admin-new" onSubmit={save} style={{ maxWidth: 'none' }}>
          <div className="row">
            <div><label>Title *</label><input required value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
            <div><label>Date</label><input type="date" value={edit.date} onChange={e => setEdit({ ...edit, date: e.target.value })} /></div>
          </div>
          <div><label>Body * <span className="small">(blank line between paragraphs)</span></label><textarea required style={{ minHeight: 220 }} value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} /></div>
          <div className="row">
            <div><label>Hero image <span className="small">(basename in /images, e.g. narrows-fog — optional)</span></label><input value={edit.image || ''} onChange={e => setEdit({ ...edit, image: e.target.value })} /></div>
            <div style={{ alignSelf: 'end' }}><label className="check"><input type="checkbox" checked={!!edit.is_published} onChange={e => setEdit({ ...edit, is_published: e.target.checked })} /> published</label></div>
          </div>
          <div className="btn-row" style={{ marginTop: 4 }}>
            <button className="btn btn-primary" type="submit">{edit.id ? 'Save changes' : 'Publish post'}</button>
            <button className="btn btn-outline" type="button" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!posts && !err && <p className="small">Loading&hellip;</p>}
      <div className="admin-list">
        {(posts || []).map(p => (
          <div className="admin-person" key={p.id}>
            <div className="admin-row" style={{ cursor: 'default', gridTemplateColumns: '1fr auto' }}>
              <div className="admin-name">
                <strong>{p.title}</strong>{!p.is_published && <span className="pill" style={{ background: '#7a8190' }}>draft</span>}
                <div className="small">{p.date} · /news#{p.slug}{p.image && ` · image: ${p.image}`}</div>
              </div>
              <div className="btn-row" style={{ marginTop: 0 }}>
                <button className="linkbtn" onClick={() => setEdit({ id: p.id, title: p.title, date: p.date, body: p.body, image: p.image || '', is_published: p.is_published })}>edit</button>
                <button className="linkbtn" onClick={() => togglePub(p)}>{p.is_published ? 'unpublish' : 'publish'}</button>
                <button className="linkbtn danger" onClick={() => remove(p)}>delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
