import { useEffect, useState } from 'react'
import Hero from '../components/Hero.jsx'
import Seo from '../components/Seo.jsx'
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
      .then(data => { if (alive && Array.isArray(data.posts) && data.posts.length) setPosts(data.posts) })
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
            <article className="news-item" key={n.id}>
              <div className="news-date">{formatDate(n.date)}</div>
              <h3>{n.title}</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{n.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
