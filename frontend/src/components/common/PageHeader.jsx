export default function PageHeader({ eyebrow, title, tag, subtitle, extra }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16 }}>
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: '32px' }}>{title}</h1>
          {tag && <span className="chip">{tag}</span>}
        </div>
        {subtitle && <div className="text-muted" style={{ marginTop: 4, fontSize: 13 }}>{subtitle}</div>}
      </div>
      {extra}
    </div>
  )
}
