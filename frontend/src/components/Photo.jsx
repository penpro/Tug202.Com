// <picture> wrapper for the dual-format images in /public/images.
export default function Photo({ name, alt = '', className, style, loading = 'lazy' }) {
  return (
    <picture>
      <source srcSet={`/images/${name}.webp`} type="image/webp" />
      <img src={`/images/${name}.jpg`} alt={alt} className={className} style={style} loading={loading} />
    </picture>
  )
}
