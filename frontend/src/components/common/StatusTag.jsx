import { Tag } from 'antd'

// map: một trong các object trong constants/statuses.js
export default function StatusTag({ map, status }) {
  const s = map[status]
  if (!s) return <Tag>{status}</Tag>
  return (
    <Tag style={{ color: s.color, background: s.bg, borderColor: s.border, margin: 0, fontWeight: 500 }}>
      {s.label}
    </Tag>
  )
}
