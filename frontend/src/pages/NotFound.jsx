import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'

export default function NotFound() {
  return (
    <div className="container not-found">
      <Seo title="Page not found" />
      <span className="eyebrow">404</span>
      <h1>Off the chart</h1>
      <p className="lead">That page isn&rsquo;t aboard. Try the helm.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  )
}
