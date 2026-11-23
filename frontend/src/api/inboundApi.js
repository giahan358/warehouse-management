import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { inboundMock } from '../mocks/data'
import { asnDetailMock, countingReceiptMock, inboundScheduleMock } from '../mocks/staffData'
import { unwrapApi, unwrapPage, toNumber } from './apiResponse'

const fmtQty = (value) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(toNumber(value))
const phaseFor = (status) => status === 'SCHEDULED' ? 'WAITING' : status === 'RECEIVING' ? 'AT_DOCK' : 'DONE'

export const normalizeReceipt = (receipt) => {
  const receiptId = receipt.id
  const code = receipt.receiptCode ?? String(receipt.id ?? '')
  const expected = toNumber(receipt.declaredTotal)
  return {
    ...receipt,
    id: code,
    receiptId,
    customer: receipt.customerName ?? '—',
    customerCode: receipt.customerCode ?? '—',
    time: receipt.expectedAt ? new Date(receipt.expectedAt).toLocaleString('vi-VN') : '—',
    timeLabel: receipt.expectedAt ? `Hẹn: ${new Date(receipt.expectedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '—',
    truck: receipt.vehiclePlate ?? '—',
    vehicle: receipt.vehiclePlate ?? '—',
    dock: receipt.dockCode ?? null,
    dockNote: '',
    dockTone: 'gray',
    qty: expected,
    qtyLabel: `${fmtQty(expected)} kiện`,
    declared: expected,
    actual: receipt.actualTotal == null ? null : toNumber(receipt.actualTotal),
    unloaded: receipt.actualTotal == null ? 0 : toNumber(receipt.actualTotal),
    skuCount: receipt.itemCount ?? '—',
    plan: receipt.servicePackage ?? '',
    phase: phaseFor(receipt.status),
    progress: expected > 0 && receipt.actualTotal != null ? Math.min(100, Math.round(toNumber(receipt.actualTotal) / expected * 100)) : null,
    status: receipt.status,
  }
}

export const normalizeReceiptDetail = (receipt) => ({
  ...normalizeReceipt(receipt),
  id: receipt.receiptCode ?? String(receipt.id ?? ''),
  lines: (receipt.items ?? []).map((item) => ({
    ...item,
    sku: item.sku,
    productId: item.productId,
    itemId: item.itemId,
    name: item.productName ?? item.sku,
    unit: item.unit ?? '—',
    expected: toNumber(item.expectedQuantity),
    actual: item.actualQuantity == null ? null : toNumber(item.actualQuantity),
    damaged: toNumber(item.damagedQuantity),
    bin: item.locationCode ?? '—',
    barcode: item.barcode,
    note: item.note ?? '',
    appearance: 'OK',
    thumb: '#e5eeff',
    packLabel: '',
  })),
  dock: receipt.dockCode ?? '—',
  dockLabel: receipt.status === 'RECEIVING' ? `Đang tiếp nhận tại ${receipt.dockCode ?? 'Dock'}` : receipt.status,
  window: receipt.expectedAt ? `${new Date(receipt.expectedAt).toLocaleString('vi-VN')} • ${receipt.dockCode ?? 'Chưa gán Dock'}` : '—',
  palletCount: '—',
  totalPackages: toNumber(receipt.declaredTotal),
  weightNote: receipt.note ?? '',
  zone: receipt.dockCode ?? '—',
  temperature: '—',
  createdAt: receipt.receivedAt ?? receipt.expectedAt,
})

async function listReceipts(params) {
  const { items, ...page } = unwrapPage(await axiosClient.get('/inbound-receipts', { params }))
  return { items: items.map(normalizeReceipt), ...page }
}

export const getAll = async (params) => USE_MOCK
  ? mockResolve(inboundMock)
  : (await listReceipts(params)).items

export const getSchedule = async (params) => USE_MOCK
  ? mockResolve(structuredClone(inboundScheduleMock))
  : (await listReceipts(params)).items

export const getStatusCounts = async (params) => USE_MOCK
  ? mockResolve(null)
  : unwrapApi(await axiosClient.get('/inbound-receipts/status-counts', { params }))

export const createReceipt = async (payload) => USE_MOCK
  ? mockResolve({ id: `ASN-${Date.now()}`, receiptCode: `ASN-${Date.now()}`, status: 'SCHEDULED', ...payload })
  : unwrapApi(await axiosClient.post('/inbound-receipts', payload))

export const getReceiptById = async (id) => {
  if (USE_MOCK) return mockResolve({ ...structuredClone(countingReceiptMock), id })
  return normalizeReceiptDetail(unwrapApi(await axiosClient.get(`/inbound-receipts/${id}`)))
}

export const getAsnDetail = async (id) => {
  if (USE_MOCK) return mockResolve({ ...structuredClone(asnDetailMock), id })
  return normalizeReceiptDetail(unwrapApi(await axiosClient.get(`/inbound-receipts/${id}`)))
}

export const startReceipt = async (id, dockCode) => USE_MOCK
  ? mockResolve({ id, status: 'RECEIVING' })
  : unwrapApi(await axiosClient.patch(`/inbound-receipts/${id}/start`, dockCode ? { dockCode } : {}))

export const updateActualQuantity = async (id, itemId, payload) => USE_MOCK
  ? mockResolve({ id, itemId, ...payload })
  : unwrapApi(await axiosClient.patch(`/inbound-receipts/${id}/items/${itemId}/actual-quantity`, payload))

export const saveCounting = async (id, payload) => USE_MOCK
  ? mockResolve({ id, saved: true })
  : unwrapApi(await axiosClient.put(`/inbound-receipts/${id}/counting`, payload))

export const scanReceipt = async (id, barcode, quantity = 1) => USE_MOCK
  ? mockResolve({ barcode, quantity })
  : unwrapApi(await axiosClient.post(`/inbound-receipts/${id}/scan`, { barcode, quantity }))

export const confirmReceipt = async (id) => USE_MOCK
  ? mockResolve({ id, status: 'CONFIRMED' })
  : unwrapApi(await axiosClient.patch(`/inbound-receipts/${id}/confirm`))

export const cancelReceipt = async (id, payload = {}) => USE_MOCK
  ? mockResolve({ id, status: 'CANCELLED' })
  : unwrapApi(await axiosClient.patch(`/inbound-receipts/${id}/cancel`, payload))

export const getDiscrepancyReport = async (id) => USE_MOCK
  ? mockResolve(null)
  : unwrapApi(await axiosClient.get(`/inbound-receipts/${id}/discrepancy-report`))

// Compatibility names for existing page imports. Counting uses the BE's itemId contract.
export const saveDraft = async (id, payload) => {
  if (USE_MOCK) return mockResolve({ id, saved: true })
  const counted = (payload.items ?? []).filter((item) => item.actualQuantity != null)
  if (counted.length > 0 && counted.length === (payload.items ?? []).length) return saveCounting(id, payload)
  return Promise.all(counted.map((item) => updateActualQuantity(id, item.itemId, item)))
}

export default {
  getAll, getSchedule, getStatusCounts, createReceipt, getReceiptById, getAsnDetail,
  startReceipt, updateActualQuantity, saveCounting, scanReceipt, confirmReceipt,
  cancelReceipt, getDiscrepancyReport, saveDraft,
}
