import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Col, Input, InputNumber, Modal, Row, Select, Steps, Table, Tag, Upload, message } from 'antd'
import {
  CheckCircleOutlined, ExclamationCircleOutlined, FilterOutlined, InfoCircleOutlined,
  LockOutlined, PlusOutlined, PlusSquareOutlined, SaveOutlined,
  SkinOutlined, TableOutlined, UploadOutlined, CarOutlined, EnvironmentOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import inboundApi from '../../api/inboundApi'
import PageHeader from '../../components/common/PageHeader'
import Loading from '../../components/common/Loading'
import SegmentedBar from '../../components/common/SegmentedBar'
import ConfirmModal from '../../components/common/ConfirmModal'
import { APPEARANCE_OPTIONS } from '../../constants/statuses'
import { formatNumber } from '../../utils/formatCurrency'
import { formatDateTime } from '../../utils/formatDate'

const isCounted = (l) => l.actual !== null && l.actual !== undefined
const diffOf = (l) => (isCounted(l) ? l.actual - l.expected : 0)
const isAbnormal = (l) => diffOf(l) !== 0 || l.damaged > 0
const needsReport = (l) => isAbnormal(l) && !l.note?.trim()
const pad = (n) => String(n).padStart(2, '0')

function DiffTag({ line }) {
  if (!isCounted(line)) return <Tag style={{ margin: 0 }}>Chưa đếm</Tag>
  const d = diffOf(line)
  if (d === 0) return <Tag color="cyan" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>Khớp 100%</Tag>
  if (d < 0) return <Tag color="error" style={{ margin: 0 }}>{d} {line.unit.toLowerCase()} (Thiếu/Lỗi)</Tag>
  return <Tag color="warning" style={{ margin: 0 }}>+{d} {line.unit.toLowerCase()} (Dư)</Tag>
}

export default function InboundDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scanRef = useRef(null)

  const [receipt, setReceipt] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [scan, setScan] = useState('')
  const [activeSku, setActiveSku] = useState(null)
  const [onlyAbnormal, setOnlyAbnormal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [, setSubmitting] = useState(false) 

  const load = useCallback(async () => {
    try {
      const r = await inboundApi.getReceiptById(id)
      setReceipt(r)
      setLines(r.lines)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const patchLine = useCallback((sku, patch) => {
    setLines((ls) => ls.map((l) => (l.sku === sku ? { ...l, ...patch } : l)))
  }, [])

  const addQty = (sku, n) => {
    setLines((ls) => ls.map((l) => (l.sku === sku ? { ...l, actual: (l.actual ?? 0) + n } : l)))
  }

  // ===== Tổng hợp =====
  const stats = useMemo(() => {
    const expected = lines.reduce((s, l) => s + l.expected, 0)
    const counted = lines.reduce((s, l) => s + (l.actual ?? 0), 0)
    const damaged = lines.reduce((s, l) => s + (l.damaged ?? 0), 0)
    const shortage = Math.min(counted - expected, 0)
    const countedLines = lines.filter(isCounted).length
    const pct = expected ? Math.min((counted / expected) * 100, 100) : 0
    return { expected, counted, damaged, shortage, countedLines, pct, abnormal: lines.filter(isAbnormal).length }
  }, [lines])

  const allCounted = lines.length > 0 && stats.countedLines === lines.length

  const handleScan = () => {
    const code = scan.trim().toLowerCase()
    if (!code) return
    const hit = lines.find((l) => l.barcode === code || l.sku.toLowerCase() === code)
    if (!hit) {
      message.error(`Không tìm thấy SKU / barcode "${scan}" trong phiếu này`)
    } else {
      addQty(hit.sku, 1)
      setActiveSku(hit.sku)
    }
    setScan('')
    scanRef.current?.focus()
  }

  const quickAdd = (n) => {
    if (!activeSku) return message.warning('Hãy quét SKU hoặc bấm chọn một dòng trước')
    addQty(activeSku, n)
  }
  const activeLine = lines.find((l) => l.sku === activeSku)
  const boxQty = activeLine?.packSize ?? 10

  // ===== Lưu tạm & xác nhận =====
  const buildPayload = () => ({
    lines: lines.map((l) => ({
      sku: l.sku, actualQuantity: l.actual, damagedQuantity: l.damaged, appearance: l.appearance, note: l.note,
    })),
  })

  const saveDraft = async () => {
    await inboundApi.saveDraft(id, buildPayload())
    message.success('Đã lưu tạm phiếu kiểm đếm')
  }

  const requestConfirm = useCallback(() => {
    if (!allCounted) {
      return message.error('409 RECEIPT_NOT_FULLY_COUNTED: còn dòng SKU chưa được kiểm đếm')
    }
    const missing = lines.find(needsReport)
    if (missing) {
      setEditing(missing)
      return message.error(`Dòng ${missing.sku} bị lệch/hư hỏng: cần ghi chú biên bản trước khi xác nhận`)
    }
    setConfirmOpen(true)
  }, [allCounted, lines])

  const doConfirm = async () => {
    setSubmitting(true)
    try {
      await inboundApi.confirmReceipt(id, buildPayload())
      message.success(`Đã xác nhận nhập kho ${id}: +${formatNumber(stats.counted - stats.damaged)} vào tồn kho khả dụng`)
      navigate('/staff/inbound')
    } catch (e) {
      const msg = e?.response?.data?.code ?? 'INVALID_RECEIPT_STATUS'
      message.error(`409 ${msg}: phiếu đã được xác nhận hoặc không còn ở trạng thái RECEIVING`)
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && e.target === document.body && !editing && !confirmOpen) requestConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestConfirm, editing, confirmOpen])

  if (loading) return <Loading />

  const visibleLines = onlyAbnormal ? lines.filter(isAbnormal) : lines

  const columns = [
    {
      title: 'MẶT HÀNG / SKU', width: 320,
      render: (_, l) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="thumb" style={{ background: l.thumb }}><SkinOutlined /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }} title={l.name}>{l.name}</div>
            <div className="mono text-muted">{l.sku}</div>
          </div>
        </div>
      ),
    },
    { title: 'QUY CÁCH & ĐVT', width: 170, render: (_, l) => <div><b>{l.unit}</b><div className="text-muted">{l.packLabel}</div></div> },
    { title: 'DỰ KIẾN', dataIndex: 'expected', align: 'right', width: 90, render: (v) => <b className="mono">{formatNumber(v)}</b> },
    {
      title: 'THỰC TẾ ĐẾM', width: 150,
      render: (_, l) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <InputNumber
            min={0} precision={0} value={l.actual} style={{ width: 96 }}
            status={diffOf(l) !== 0 ? 'error' : undefined}
            onFocus={() => setActiveSku(l.sku)}
            onChange={(v) => patchLine(l.sku, { actual: v })}
            aria-label={`Số lượng thực đếm ${l.sku}`}
          />
          <span className="text-muted">{l.unit}</span>
        </span>
      ),
    },
    { title: 'CHÊNH LỆCH', width: 170, align: 'center', render: (_, l) => <DiffTag line={l} /> },
    { title: 'VỊ TRÍ BIN/RACK', width: 160, render: (_, l) => <span className="code-chip"><TableOutlined /> {l.bin}</span> },
    {
      title: 'THAO TÁC', width: 110, align: 'center',
      render: (_, l) => (
        <Button size="small" type={isAbnormal(l) ? 'primary' : 'default'} danger={isAbnormal(l)}
          icon={isAbnormal(l) ? <ExclamationCircleOutlined /> : <InfoCircleOutlined />} onClick={() => setEditing(l)}>
          Chi tiết
        </Button>
      ),
    },
  ]

  return (
    <div className="page">
      <PageHeader
        eyebrow="TIẾP NHẬN HÀNG / PHIẾU KIỂM ĐẾM"
        title={`Phiếu Kiểm Đếm Thực Tế & Nhập Kho: ${receipt.id}`}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<SaveOutlined />} onClick={saveDraft}>Lưu tạm</Button>
            <Button type="primary" icon={<LockOutlined />} onClick={requestConfirm}>
              Xác nhận nhập kho & Cập nhật tồn kho (Idempotent)
            </Button>
          </div>
        }
      />

      {/* Thông tin phiếu */}
      <div className="card-flat">
        <Row gutter={[24, 12]}>
          <Col xs={24} md={7}>
            <div className="text-muted">Khách hàng chủ hàng</div>
            <b style={{ fontSize: 15 }}>{receipt.customer}</b>
            <div className="mono text-muted">Mã KH: {receipt.customerCode}</div>
          </Col>
          <Col xs={24} md={6}>
            <div className="text-muted">Phương tiện & Đơn vị vận tải</div>
            <b><CarOutlined /> {receipt.vehicle}</b>
          </Col>
          <Col xs={24} md={7}>
            <div className="text-muted">Khu vực kiểm tra & Hạ hàng</div>
            <b style={{ color: '#006767' }}><EnvironmentOutlined /> {receipt.zone}</b>
            <div className="text-muted">{receipt.dock} • Nhiệt độ: {receipt.temperature}</div>
          </Col>
          <Col xs={24} md={4}>
            <div className="text-muted">Thời gian tạo phiếu</div>
            <b className="mono">{formatDateTime(receipt.createdAt)}</b>
          </Col>
        </Row>
        <Steps
          size="small" style={{ marginTop: 16 }} current={2}
          items={[
            { title: 'Chờ tiếp nhận (Đã duyệt PO)' },
            { title: 'Đang tiếp nhận tại Dock' },
            { title: 'Đang kiểm đếm thực tế' },
            { title: 'Chốt @Transactional Commit' },
          ]}
        />
      </div>

      {/* Quét barcode + tiến độ */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <div className="card-flat" style={{ height: '100%' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                ref={scanRef} autoFocus size="large" value={scan}
                onChange={(e) => setScan(e.target.value)} onPressEnter={handleScan}
                placeholder="Gõ barcode SKU, VD: 8935002148102 và Enter..." className="mono"
              />
              <Button size="large" type="primary" onClick={handleScan}>Xác nhận</Button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
              <Button icon={<PlusOutlined />} onClick={() => quickAdd(1)}>+1 Kiểm đếm nhanh</Button>
              <Button icon={<PlusSquareOutlined />} onClick={() => quickAdd(boxQty)}>+{boxQty} (Nguyên thùng)</Button>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <div className="card-flat" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="eyebrow">Tiến độ kiểm đếm thực địa</span>
              <b style={{ color: '#0057c2' }}>{(Math.floor(stats.pct * 10) / 10).toFixed(1)}%</b>
            </div>
            <SegmentedBar parts={[
              { value: stats.pct, color: '#0057c2' },
              { value: Math.min((Math.abs(stats.shortage) / (stats.expected || 1)) * 100, 100 - stats.pct), color: '#ba1a1a' },
            ]} />
            <div className="text-muted mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 }}>
              <span>0 cái</span><span>MỤC TIÊU: {formatNumber(stats.expected)} CÁI</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
              {[
                ['Dự kiến', formatNumber(stats.expected), '#eff4ff', undefined],
                ['Thực đếm', formatNumber(stats.counted), '#dce9ff', '#0057c2'],
                ['Thiếu', stats.shortage === 0 ? '0' : formatNumber(stats.shortage), '#ffdad6', '#ba1a1a'],
                ['Hư hỏng', pad(stats.damaged), '#eff4ff', '#ba1a1a'],
              ].map(([label, value, bg, color]) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: '8px 4px' }}>
                  <div className="text-muted">{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>

      {/* Bảng đối chiếu */}
      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Danh mục mặt hàng đối chiếu ({lines.length} SKUs)</b>
          <Button icon={<FilterOutlined />} type={onlyAbnormal ? 'primary' : 'default'} onClick={() => setOnlyAbnormal((v) => !v)}>
            Lọc bất thường ({stats.abnormal})
          </Button>
        </div>
        <Table
          rowKey="sku" columns={columns} dataSource={visibleLines} pagination={false} scroll={{ x: 1000 }}
          rowClassName={(l) => (isAbnormal(l) ? 'row-danger' : l.sku === activeSku ? 'row-active' : '')}
          onRow={(l) => ({ onClick: () => setActiveSku(l.sku) })}
        />
      </div>

      {/* key={editing?.sku} → đổi SKU là remount, không cần useEffect để sync form */}
      <LineDetailModal
        key={editing?.sku ?? 'none'}
        line={editing}
        onClose={() => setEditing(null)}
        onSave={(sku, patch) => { patchLine(sku, patch); setEditing(null) }}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận nhập kho?"
        content={
          <div>
            <p>Hệ thống sẽ cập nhật tồn kho cho <b>{receipt.customer}</b> trong một transaction duy nhất.</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Cộng vào tồn kho khả dụng: <b>{formatNumber(stats.counted - stats.damaged)} cái</b></li>
              <li>Hàng hư hỏng chuyển khu cách ly QA: <b>{stats.damaged} cái</b></li>
              <li>Thiếu so với ASN: <b>{Math.abs(stats.shortage)} cái</b></li>
            </ul>
            <p style={{ marginTop: 8, color: '#ba1a1a' }}>Không thể hoàn tác số lượng sau khi chốt giao dịch.</p>
          </div>
        }
        onOk={doConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

// Modal chi tiết dòng: tình trạng ngoại quan, hàng hỏng, ghi chú & biên bản
function LineDetailModal({ line, onClose, onSave }) {
  // ✅ init trực tiếp từ prop — component được key bởi sku nên tự remount khi đổi dòng
  const [form, setForm] = useState(() =>
    line ? { appearance: line.appearance, damaged: line.damaged, note: line.note } : null,
  )
  const [files, setFiles] = useState([])

  if (!line || !form) return null
  const diff = diffOf(line)
  const mustReport = diff !== 0 || form.damaged > 0

  return (
    <Modal
      open
      title={`Chi tiết dòng ${line.sku}`}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Hủy"
      onOk={() => {
        if (mustReport && !form.note.trim()) return message.error('Dòng lệch/hư hỏng cần ghi chú biên bản')
        onSave(line.sku, form)
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <b>{line.name}</b>
        <div className="text-muted">Dự kiến {formatNumber(line.expected)} • Thực đếm {line.actual ?? '—'} {line.unit.toLowerCase()}</div>
      </div>
      <div className="text-muted" style={{ marginBottom: 4 }}>Tình trạng ngoại quan</div>
      <Select style={{ width: '100%', marginBottom: 12 }} value={form.appearance} options={APPEARANCE_OPTIONS}
        onChange={(appearance) => setForm((f) => ({ ...f, appearance }))} />
      <div className="text-muted" style={{ marginBottom: 4 }}>Số lượng hư hỏng / móp méo</div>
      <InputNumber min={0} max={line.actual ?? undefined} precision={0} style={{ width: '100%', marginBottom: 12 }} value={form.damaged}
        onChange={(damaged) => setForm((f) => ({ ...f, damaged: damaged ?? 0 }))} />
      <div className="text-muted" style={{ marginBottom: 4 }}>Ghi chú & biên bản {mustReport && <span style={{ color: '#ba1a1a' }}>(bắt buộc)</span>}</div>
      <Input.TextArea rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        placeholder="VD: Móp 02 thùng, thiếu 15 cái so với ASN. Đã lập biên bản." style={{ marginBottom: 12 }} />
      {mustReport && (
        <Upload listType="picture" multiple fileList={files} beforeUpload={() => false} onChange={({ fileList }) => setFiles(fileList)}>
          <Button icon={<UploadOutlined />}>Đính kèm ảnh hiện trường</Button>
        </Upload>
      )}
    </Modal>
  )
}