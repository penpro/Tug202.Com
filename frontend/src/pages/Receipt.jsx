import { useState } from 'react'
import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'
import useApiForm from '../components/useApiForm.js'
import { org } from '../site.config.js'

// /receipt — ask for a written donation receipt. The fields mirror the paper
// form the board fills out by hand (documents/tug-comanche-donation-receipt.pdf)
// so a request can be issued without re-keying anything.

export default function Receipt() {
  const { status, message, submit } = useApiForm('/api/receipt-request')
  const [f, setF] = useState({
    donor_name: '', address: '', email: '', phone: '',
    gift_kind: 'cash', received_on: '', amount: '', method: 'Givebutter (online)', check_no: '',
    description: '', restricted_for: '', goods: false, goods_desc: '', goods_value: '', note: '', website: ''
  })
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }))
  const cash = f.gift_kind === 'cash'

  async function onSubmit(e) {
    e.preventDefault()
    const ok = await submit(f)
    if (ok) setF(x => ({ ...x, amount: '', check_no: '', description: '', note: '' }))
  }

  return (
    <section className="section"><div className="container" style={{ maxWidth: 780 }}>
      <Seo title="Request a donation receipt" description="Request a written acknowledgment of your gift to the Tug Comanche Historical Rescue Foundation for your tax records." />
      <span className="eyebrow">Donors</span>
      <h1>Request a donation receipt</h1>
      <p className="lead">
        Already given? Tell us about the gift and we&rsquo;ll send a written receipt for your tax
        records &mdash; the contemporaneous written acknowledgment the IRS asks you to keep.
      </p>
      <p className="small">
        {org.name} is a Washington 501(c)(3), EIN {org.ein}. A board member checks each request
        against our records before issuing a numbered receipt, so it usually takes a few days.
        Haven&rsquo;t given yet? <Link to="/support">Support the ship</Link> first &mdash; this
        form is only for gifts already made.
      </p>

      <form className="form" onSubmit={onSubmit} style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 0 }}>You</h2>
        <div className="row">
          <div><label htmlFor="r-name">Name *</label>
            <input id="r-name" required value={f.donor_name} onChange={set('donor_name')} autoComplete="name" />
            <span className="small">As it should appear on the receipt &mdash; a person or a business.</span></div>
          <div><label htmlFor="r-email">Email *</label>
            <input id="r-email" type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
            <span className="small">We send the receipt here.</span></div>
        </div>
        <div className="row">
          <div><label htmlFor="r-addr">Mailing address</label>
            <input id="r-addr" value={f.address} onChange={set('address')} autoComplete="street-address" placeholder="Street, city, state, ZIP" /></div>
          <div><label htmlFor="r-phone">Phone</label>
            <input id="r-phone" value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
        </div>

        <h2 style={{ fontSize: '1.2rem', marginBottom: 0 }}>The gift</h2>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 6, color: 'var(--navy-800)' }}>What did you give?</legend>
          <label className="check"><input type="radio" name="kind" checked={cash} onChange={() => setF(x => ({ ...x, gift_kind: 'cash' }))} />
            <span><strong>Money</strong> &mdash; card, online, check or cash</span></label>
          <label className="check"><input type="radio" name="kind" checked={!cash} onChange={() => setF(x => ({ ...x, gift_kind: 'noncash' }))} />
            <span><strong>Goods or materials</strong> &mdash; tools, parts, paint, equipment</span></label>
        </fieldset>

        <div className="row">
          <div><label htmlFor="r-date">Date of the donation *</label>
            <input id="r-date" type="date" required value={f.received_on} onChange={set('received_on')} />
            <span className="small">Close enough is fine &mdash; we&rsquo;ll match it to our records.</span></div>
          {cash
            ? <div><label htmlFor="r-amt">Amount *</label>
                <input id="r-amt" required inputMode="decimal" value={f.amount} onChange={set('amount')} placeholder="50.00" /></div>
            : <div><label htmlFor="r-val">Roughly what was it worth?</label>
                <input id="r-val" value={f.note} onChange={set('note')} placeholder="Optional — you decide the value, not us" /></div>}
        </div>

        {cash ? (
          <div className="row">
            <div><label htmlFor="r-method">How did you give?</label>
              <select id="r-method" value={f.method} onChange={set('method')}>
                <option>Givebutter (online)</option><option>Check</option><option>Cash</option>
                <option>Card in person</option><option>Bank transfer</option><option>Other</option>
              </select></div>
            <div><label htmlFor="r-check">Check number</label>
              <input id="r-check" value={f.check_no} onChange={set('check_no')} placeholder="if you paid by check" /></div>
          </div>
        ) : (
          <div><label htmlFor="r-desc">What did you donate? *</label>
            <textarea id="r-desc" required style={{ minHeight: 90 }} value={f.description} onChange={set('description')}
              placeholder="e.g. 5 gallons of marine primer and two wire wheels" />
            <span className="small">
              We describe the property on the receipt but cannot assign it a value &mdash; the IRS
              leaves fair market value to you. Donated <em>services</em> and the use of property are
              generally not deductible.
            </span></div>
        )}

        <div><label htmlFor="r-restrict">Was the gift for something specific?</label>
          <input id="r-restrict" value={f.restricted_for} onChange={set('restricted_for')} placeholder="e.g. haul-out fund — leave blank for wherever it's needed most" /></div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 6, color: 'var(--navy-800)' }}>Did you receive anything in return?</legend>
          <label className="check"><input type="checkbox" checked={f.goods} onChange={e => setF(x => ({ ...x, goods: e.target.checked }))} />
            <span>Yes &mdash; a meal, merchandise, a ticketed event or similar</span></label>
          <span className="small">
            Most gifts get a plain thank-you and nothing else, so leave this unticked. If you did
            receive something, only the amount above its value may be deductible &mdash; we have to
            say so on the receipt.
          </span>
          {f.goods && (
            <div className="row" style={{ marginTop: 10 }}>
              <div><label htmlFor="r-gd">What did you receive?</label>
                <input id="r-gd" value={f.goods_desc} onChange={set('goods_desc')} /></div>
              <div><label htmlFor="r-gv">Roughly what was it worth?</label>
                <input id="r-gv" inputMode="decimal" value={f.goods_value} onChange={set('goods_value')} placeholder="25.00" /></div>
            </div>
          )}
        </fieldset>

        {cash && <div><label htmlFor="r-note">Anything else we should know?</label>
          <input id="r-note" value={f.note} onChange={set('note')} placeholder="Optional — in memory of someone, a company match, a correction…" /></div>}

        <div className="hp" aria-hidden="true">
          <label htmlFor="r-web">Website</label>
          <input id="r-web" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
        </div>

        {message && <div className={`form-msg ${status === 'ok' ? 'ok' : 'err'}`}>{message}</div>}
        <div><button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Request my receipt'}</button></div>
        <p className="small">
          We keep this to issue your receipt and our own records. Asking for a receipt does not add
          you to any mailing list. Questions: <a href={`mailto:${org.email}`}>{org.email}</a>.
        </p>
      </form>
    </div></section>
  )
}
