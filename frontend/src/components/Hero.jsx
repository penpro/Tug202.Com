// Full-bleed photo hero. `image` is the basename under /images (no extension);
// both .webp and .jpg variants exist for every photo in that folder.
export default function Hero({ image, eyebrow, title, lead, children, small = false, position }) {
  return (
    <section className={`hero${small ? ' hero-sub' : ''}`}>
      <picture>
        <source srcSet={`/images/${image}.webp`} type="image/webp" />
        <img
          src={`/images/${image}.jpg`}
          alt=""
          fetchpriority="high"
          style={position ? { objectPosition: position } : undefined}
        />
      </picture>
      <div className="container">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </section>
  )
}
