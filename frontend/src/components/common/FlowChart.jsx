// Biểu đồ vùng Nhập/Xuất bằng SVG thuần (đường cong mượt)
const W = 800
const H = 240
const PAD = 12

function path(values, max) {
  const step = (W - PAD * 2) / (values.length - 1)
  const pts = values.map((v, i) => [PAD + i * step, H - PAD - (v / max) * (H - PAD * 2)])
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
  }
  return { line: d, area: `${d} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`, last: pts[pts.length - 1] }
}

export default function FlowChart({ inbound, outbound, labels }) {
  const max = Math.max(...inbound, ...outbound) * 1.1
  const a = path(inbound, max)
  const b = path(outbound, max)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Lưu lượng nhập xuất 30 ngày">
        <defs>
          <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0057c2" stopOpacity=".28" />
            <stop offset="100%" stopColor="#0057c2" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#006767" stopOpacity=".28" />
            <stop offset="100%" stopColor="#006767" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((r) => (
          <line key={r} x1="0" x2={W} y1={H * r} y2={H * r} stroke="#c1c6d7" strokeDasharray="4 4" opacity=".5" />
        ))}
        <path d={b.area} fill="url(#gOut)" />
        <path d={a.area} fill="url(#gIn)" />
        <path d={b.line} fill="none" stroke="#006767" strokeWidth="2.5" />
        <path d={a.line} fill="none" stroke="#0057c2" strokeWidth="2.5" />
        <circle cx={a.last[0]} cy={a.last[1]} r="5" fill="#0057c2" stroke="#fff" strokeWidth="2" />
        <circle cx={b.last[0]} cy={b.last[1]} r="5" fill="#006767" stroke="#fff" strokeWidth="2" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="mono text-muted">
        {labels.map((l, i) => (
          <span key={l} style={i === labels.length - 1 ? { color: '#0057c2', fontWeight: 700 } : undefined}>{l}</span>
        ))}
      </div>
    </div>
  )
}
