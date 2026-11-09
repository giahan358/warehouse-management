// Header + style dùng chung cho Modal / Drawer (khớp popup trong Stitch)
export const modalStyles = {
  content: { padding: 0, overflow: 'hidden' },
  header: { background: '#eff4ff', padding: '14px 20px', margin: 0, borderBottom: '1px solid #e5eeff' },
  body: { padding: 20 },
  footer: { background: '#eff4ff', padding: '12px 20px', margin: 0, borderTop: '1px solid #e5eeff' },
}

export const drawerStyles = {
  header: { background: '#eff4ff', padding: '14px 20px' },
  body: { padding: 20 },
  footer: { background: '#eff4ff', padding: '12px 20px' },
}

// Dùng làm prop `title` của Modal / Drawer
export default function PopupHeader({ icon, title, tag, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon && (
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dce9ff', color: '#0057c2', display: 'grid', placeItems: 'center', fontSize: 18, flex: 'none' }}>
          {icon}
        </div>
      )}
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {title} {tag && <span className="chip" style={{ marginLeft: 4 }}>{tag}</span>}
        </div>
        {subtitle && <div className="text-muted" style={{ fontWeight: 400 }}>{subtitle}</div>}
      </div>
    </div>
  )
}
