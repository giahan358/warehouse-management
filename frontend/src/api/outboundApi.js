import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { outboundMock } from '../mocks/data'
import { fulfillmentMock } from '../mocks/staffData'
import { unwrapApi, unwrapPage, toNumber } from './apiResponse'

const normalizeStatus = (status) => status === 'PREPARING' ? 'PICKING' : status
const displayCarrier = (carrier) => carrier === 'VIETTEL_POST' ? 'Viettel Post'
  : ['GHN', 'SELF_PICKUP'].includes(carrier) ? carrier : '—'
const normalizeOrder = (order) => ({
  ...order,
  id: order.orderCode ?? String(order.id ?? ''),
  orderId: order.id,
  customer: order.customerName ?? '—',
  receiver: order.recipientName ?? '—',
  phone: order.recipientPhone ?? '',
  address: order.deliveryAddress ?? '—',
  carrier: displayCarrier(order.carrier),
  carrierCode: ['GHN', 'VIETTEL_POST', 'SELF_PICKUP'].includes(order.carrier) ? order.carrier : null,
  tracking: order.trackingCode ?? '—',
  waybill: order.trackingCode ?? '—',
  status: normalizeStatus(order.status),
  cod: toNumber(order.codAmount),
  originalCod: toNumber(order.codAmount),
  codConfirmed: order.codStatus === 'CONFIRMED',
  createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—',
  itemsLabel: `${order.itemCount ?? 0} mặt hàng (${toNumber(order.totalQuantity)} món)`,
  speed: 'STANDARD',
  carrierTone: order.carrier === 'SELF_PICKUP' ? 'gray' : 'primary',
})

const normalizeDetail = async (order) => {
  const items = await Promise.all((order.items ?? []).map(async (item) => {
    let inventory = null
    try { inventory = unwrapApi(await axiosClient.get(`/inventory/${item.productId}`)) } catch { /* optional inventory details */ }
    return {
      ...item,
      sku: item.sku,
      name: item.productName ?? item.sku,
      qty: toNumber(item.quantityRequested),
      actual: item.quantityActual == null ? null : toNumber(item.quantityActual),
      unit: item.unit ?? '—',
      bin: inventory?.locationCode ?? '—',
      avail: toNumber(inventory?.available),
    }
  }))
  return { ...normalizeOrder(order), contract: '', dock: '—', items }
}

export const getAll = async (params) => USE_MOCK
  ? mockResolve(outboundMock)
  : (await unwrapPage(await axiosClient.get('/outbound-orders', { params }))).items.map(normalizeOrder)

export const getFulfillment = async (params) => {
  if (USE_MOCK) return mockResolve(structuredClone(fulfillmentMock))
  const [ordersRes, countsRes] = await Promise.all([
    axiosClient.get('/outbound-orders', { params: { page: 0, size: 100, ...params } }),
    axiosClient.get('/outbound-orders/status-counts'),
  ])
  const { items } = unwrapPage(ordersRes)
  const counts = unwrapApi(countsRes) ?? {}
  return { orders: items.map(normalizeOrder), summary: {
    pending: counts.pending ?? 0, preparing: counts.preparing ?? 0,
    ready: counts.packed ?? 0, delivering: counts.inDelivery ?? 0,
  } }
}

export const getById = async (id) => {
  if (USE_MOCK) return mockResolve(outboundMock.find((row) => row.id === id) ?? null)
  return normalizeDetail(unwrapApi(await axiosClient.get(`/outbound-orders/${id}`)))
}

export const getStatusCounts = async (params) => USE_MOCK
  ? mockResolve(null)
  : unwrapApi(await axiosClient.get('/outbound-orders/status-counts', { params }))

export const updateStatus = async (id, status) => {
  if (USE_MOCK) return mockResolve({ id, status })
  const endpoints = {
    PICKING: 'start-preparing', PREPARING: 'start-preparing',
    PACKED: 'mark-packed', HANDED_OVER: 'mark-in-delivery', IN_DELIVERY: 'mark-in-delivery',
    DELIVERED: 'mark-delivered', RETURNED: 'mark-returned',
  }
  const endpoint = endpoints[status]
  if (!endpoint) throw new Error('Backend không hỗ trợ chuyển trạng thái sang ' + status + '.')
  return normalizeOrder(unwrapApi(await axiosClient.patch('/outbound-orders/' + id + '/' + endpoint)))
}

export const updateActualQuantity = async (orderId, itemId, quantityActual, note) => USE_MOCK
  ? mockResolve({ orderId, itemId, quantityActual, note })
  : unwrapApi(await axiosClient.patch('/outbound-orders/' + orderId + '/items/' + itemId + '/actual-quantity', { quantityActual, note }))

export const updateTracking = async (id, carrier, trackingCode) => USE_MOCK
  ? mockResolve({ id, carrier, trackingCode })
  : normalizeOrder(unwrapApi(await axiosClient.patch('/outbound-orders/' + id + '/tracking', { carrier, trackingCode })))

export const getHandoverReport = async (id) => {
  if (USE_MOCK) return mockResolve(null)
  return normalizeDetail(unwrapApi(await axiosClient.get('/outbound-orders/' + id + '/handover-report')))
}

export const reportShortage = (id, payload) => USE_MOCK
  ? mockResolve({ id, reported: true })
  : Promise.reject(new Error('Backend chưa có API báo cáo thiếu riêng; cần cập nhật số lượng thực tế từng mặt hàng.'))

export default { getAll, getFulfillment, getById, getStatusCounts, updateStatus, updateActualQuantity, updateTracking, getHandoverReport, reportShortage }
