import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { outboundMock } from '../mocks/data'
import { unwrapApi, unwrapPage, toNumber } from './apiResponse'

const normalizeCodOrder = (row) => ({
  ...row,
  id: row.orderCode ?? String(row.orderId ?? ''),
  orderId: row.orderId,
  customer: row.customerName ?? '—',
  receiver: row.recipientName ?? '—',
  address: row.deliveryAddress ?? '—',
  carrier: row.carrier === 'VIETTEL_POST' ? 'Viettel Post' : ['GHN', 'SELF_PICKUP'].includes(row.carrier) ? row.carrier : '—',
  waybill: row.trackingCode ?? '—',
  status: row.shippingStatus,
  cod: toNumber(row.codAmount),
  originalCod: toNumber(row.codAmount),
  offsetTotal: toNumber(row.offsetTotal),
  remainingAmount: toNumber(row.remainingAmount),
  codConfirmed: row.codStatus === 'CONFIRMED',
})

export const getPayments = async (params) => USE_MOCK
  ? mockResolve({ items: [], totalElements: 0, totalPages: 0 })
  : unwrapPage(await axiosClient.get('/payments', { params }))
export const getPayment = async (id) => unwrapApi(await axiosClient.get('/payments/' + id))

export const getCodOrders = async (params) => {
  if (USE_MOCK) return mockResolve(outboundMock.map((row) => ({
    ...row,
    orderId: row.orderId ?? row.id,
    codStatus: row.codStatus ?? (row.status === 'RETURNED' ? 'RETURNED' : row.codConfirmed ? 'CONFIRMED' : row.status === 'DELIVERED' && row.cod > 0 ? 'COLLECTED' : row.cod > 0 ? 'PENDING_RECONCILE' : 'NONE'),
    codConfirmed: Boolean(row.codConfirmed),
  })))
  return (await unwrapPage(await axiosClient.get('/cod/orders', { params }))).items.map(normalizeCodOrder)
}

export const getCodSummary = async () => USE_MOCK
  ? mockResolve({ pendingCount: 0, pendingAmount: 0, collectedAmount: 0, confirmedAmount: 0, returnedAmount: 0 })
  : unwrapApi(await axiosClient.get('/cod/orders/summary'))

export const confirmCod = async (orderId, offsetInvoiceIds = []) => USE_MOCK
  ? mockResolve({ orderId, codStatus: 'CONFIRMED' })
  : unwrapApi(await axiosClient.post('/outbound-orders/' + orderId + '/cod/confirm', { offsetInvoiceIds }))

export const updateCodStatus = async (orderId, codStatus) => USE_MOCK
  ? mockResolve({ orderId, codStatus })
  : unwrapApi(await axiosClient.patch('/outbound-orders/' + orderId + '/cod/status', { codStatus }))

export const createVnpayUrl = async (invoiceId) => unwrapApi(await axiosClient.post('/invoices/' + invoiceId + '/payments/vnpay'))

export const simulateIpn = async (txnRef, responseCode, amount) => {
  if (USE_MOCK) return mockResolve({ txnRef, responseCode, amount })
  return unwrapApi(await axiosClient.post('/payments/vnpay/ipn/mock', { txnRef, responseCode, amount }))
}

export default { getPayments, getPayment, getCodOrders, getCodSummary, confirmCod, updateCodStatus, createVnpayUrl, simulateIpn }
