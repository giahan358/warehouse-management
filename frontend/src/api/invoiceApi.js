import dayjs from 'dayjs'
import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { invoicesMock } from '../mocks/data'
import { invoiceDetailMock, VAT_RATE } from '../mocks/popupData'
import { unwrapApi, unwrapPage, toNumber } from './apiResponse'

const normalizeInvoice = (invoice) => ({
  ...invoice,
  id: invoice.invoiceCode ?? String(invoice.id ?? ''),
  invoiceId: invoice.id,
  customer: invoice.customerName ?? '—',
  tax: invoice.taxCode ?? '—',
  total: toNumber(invoice.totalAmount ?? invoice.total),
  status: invoice.status === 'UNPAID' ? 'PENDING' : invoice.status,
})

export const getAll = async (params) => USE_MOCK
  ? mockResolve([...invoicesMock])
  : (await unwrapPage(await axiosClient.get('/invoices', { params }))).items.map(normalizeInvoice)

export const getSummary = async (params) => USE_MOCK
  ? mockResolve(null)
  : unwrapApi(await axiosClient.get('/invoices/summary', { params }))

export const getDetail = async (id) => {
  if (USE_MOCK) return mockResolve(invoiceDetailMock[id] ?? null)
  const invoice = unwrapApi(await axiosClient.get('/invoices/' + id))
  const items = (invoice.items ?? []).map((item) => ({
    ...item,
    name: item.description,
    spec: invoice.periodStart && invoice.periodEnd ? `Kỳ ${dayjs(invoice.periodStart).format('DD/MM')} - ${dayjs(invoice.periodEnd).format('DD/MM')}` : invoice.description,
    qty: `${item.quantity} ${item.unit}`,
    price: toNumber(item.unitPrice),
    priceUnit: '/' + item.unit,
    amount: toNumber(item.lineAmount),
  }))
  const payment = invoice.payments?.find((entry) => entry.paymentMethod === 'VNPAY')
  return {
    ...invoice,
    customer: invoice.customerName,
    tax: invoice.taxCode,
    address: '—',
    location: '—',
    items,
    subtotal: toNumber(invoice.amount),
    vat: toNumber(invoice.vatAmount),
    total: toNumber(invoice.totalAmount),
    vnpay: payment ? {
      paymentId: payment.id,
      txnRef: payment.vnpTxnRef,
      transactionNo: payment.vnpTransactionNo,
      bankCode: payment.vnpBankCode,
      payDate: payment.paidAt,
      amount: toNumber(payment.amount),
      status: payment.status,
    } : null,
  }
}

export const create = async (payload) => {
  if (USE_MOCK) {
    const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const vat = Math.round(subtotal * VAT_RATE)
    const id = `INV-${dayjs().format('YYYYMM')}-NW${String(invoicesMock.length + 1).padStart(2, '0')}`
    const row = { id, customer: payload.customerName, tax: payload.tax, total: subtotal + vat, status: 'PENDING' }
    invoicesMock.unshift(row)
    invoiceDetailMock[id] = { id, customer: payload.customerName, tax: payload.tax, address: '—', location: '—', items: [], subtotal, vat, total: subtotal + vat, vnpay: null }
    return mockResolve(row)
  }
  const response = unwrapApi(await axiosClient.post('/invoices', {
    customerId: Number(payload.customerId),
    description: payload.items.map((item) => item.description ?? item.name).join('; '),
    periodStart: payload.fromDate,
    periodEnd: payload.toDate,
    dueDate: payload.dueDate ?? dayjs(payload.toDate).add(15, 'day').format('YYYY-MM-DD'),
    vatRate: Number(payload.vatRate ?? 8),
    items: payload.items.map((item) => ({
      description: item.description ?? item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
    })),
  }))
  return normalizeInvoice(response)
}

export const cancel = async (id, reason) => USE_MOCK
  ? mockResolve({ id, status: 'CANCELLED' })
  : unwrapApi(await axiosClient.patch('/invoices/' + id + '/cancel', { reason }))

export const sendEmail = async (id) => USE_MOCK
  ? mockResolve({ id, sent: true })
  : unwrapApi(await axiosClient.post('/invoices/' + id + '/send-email'))

export default { getAll, getSummary, getDetail, create, cancel, sendEmail }
