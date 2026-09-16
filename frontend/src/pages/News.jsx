import { useEffect, useState } from 'react'
import Hero from '../components/Hero.jsx'
import Seo from '../components/Seo.jsx'
import Photo from '../components/Photo.jsx'
import { seedNews } from '../content/index.js'
import { formatDate } from './Home.jsx'

// Loads posts from the backend; falls back to the bundled seed list if the
// API is unreachable so the page is never empty.
export default function News() {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    let alive = true
    fetch('/api/news')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => {
        if (!alive || !Array.isArray(data.posts) || !data.posts.length) return
        const extras = Object.fromEntries(seedNews.map(s => [s.id, s]))
        setPosts(data.posts.map(p => ({ ...p, image: p.image || extras[p.id]?.image, imageCaption: extras[p.id]?.imageCaption, images: extras[p.id]?.images })))
      })
      .catch(() => { if (alive) setPosts(seedNews) })
    return () => { alive = false }
  }, [])

  const list = posts || seedNews

  return (
    <>
      <Seo title="News" description="Ship's log and news from the Tug Comanche Historical Rescue Foundation: work days, open-ship dates and restoration progress." />
      <Hero
        small
        image="overhead-raft"
        eyebrow="Ship&rsquo;s log"
        title="News"
        lead="Work days, open-ship dates, cruises and restoration milestones."
        position="center 40%"
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          {list.map(n => (
            <article className="news-item" key={n.id} id={n.id}>
              <div className="news-date">{formatDate(n.date)}</div>
              <h3><a href={`#${n.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{n.title}</a></h3>
              {n.image && <figure style={{ margin: 0 }}><Photo name={n.image} alt={n.imageCaption || ''} className="news-hero" />{n.imageCaption && <figcaption className="small" style={{ marginTop: -8, marginBottom: 14 }}>{n.imageCaption}</figcaption>}</figure>}
              {n.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
              {n.images?.length > 0 && (
                <div className="photo-grid" style={{ marginTop: 12 }}>
                  {n.images.map(im => <figure key={im.name}><Photo name={im.name} alt={im.caption} /><figcaption>{im.caption}</figcaption></figure>)}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
