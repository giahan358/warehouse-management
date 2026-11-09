// parts: [{ value: 60, color: '#0057c2' }, ...] (tổng ≤ 100)
export default function SegmentedBar({ parts, height = 8 }) {
  return (
    <div className="seg" style={{ height }}>
      {parts.map((p, i) => (
        <span key={i} style={{ width: `${p.value}%`, background: p.color }} />
      ))}
    </div>
  )
}
