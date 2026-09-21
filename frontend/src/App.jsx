import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Ship from './pages/Ship.jsx'
import Foundation from './pages/Foundation.jsx'
import Visit from './pages/Visit.jsx'
import Volunteer from './pages/Volunteer.jsx'
import Partner from './pages/Partner.jsx'
import News from './pages/News.jsx'
import { GrantsIndex, GrantDetail } from './pages/Grants.jsx'
import Support from './pages/Support.jsx'
import Contact from './pages/Contact.jsx'
import NotFound from './pages/NotFound.jsx'
import Portal from './admin/Portal.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="ship" element={<Ship />} />
        <Route path="foundation" element={<Foundation />} />
        <Route path="visit" element={<Visit />} />
        <Route path="volunteer" element={<Volunteer />} />
        <Route path="partner" element={<Partner />} />
        <Route path="news" element={<News />} />
        <Route path="grants" element={<GrantsIndex />} />
        <Route path="grants/:slug" element={<GrantDetail />} />
        <Route path="support" element={<Support />} />
        <Route path="donate" element={<Support />} />
        <Route path="contact" element={<Contact />} />
        <Route path="admin/*" element={<Portal />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
