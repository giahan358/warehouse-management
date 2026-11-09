import dayjs from 'dayjs'
import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { invoicesMock } from '../mocks/data'
import { invoiceDetailMock, VAT_RATE } from '../mocks/popupData'

export const getAll = (params) =>
  USE_MOCK ? mockResolve([...invoicesMock]) : axiosClient.get('/invoices', { params })

// Chi tiết hóa đơn + nhật ký giao dịch VNPay
export const getDetail = (id) =>
  USE_MOCK ? mockResolve(invoiceDetailMock[id] ?? null) : axiosClient.get(`/invoices/${id}`)

// payload: { customerId, customerName, tax, fromDate, toDate, items[], paymentMethod }
export const create = (payload) => {
  if (!USE_MOCK) return axiosClient.post('/invoices', payload)

  const subtotal = payload.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  const id = `INV-${dayjs().format('YYYYMM')}-NW${String(invoicesMock.length + 1).padStart(2, '0')}`
  const row = { id, customer: payload.customerName, tax: payload.tax, total: subtotal + vat, status: 'PENDING' }

  invoicesMock.unshift(row) // giữ lại khi chuyển trang (chỉ mock)
  invoiceDetailMock[id] = {
    id, customer: payload.customerName, tax: payload.tax, address: '—', location: '—',
    items: payload.items.map((i) => ({
      name: i.name, spec: `Kỳ ${dayjs(payload.fromDate).format('DD/MM')} - ${dayjs(payload.toDate).format('DD/MM')}`,
      qty: `${i.quantity} ${i.unit}`, price: i.unitPrice, priceUnit: `/${i.unit}`, amount: i.quantity * i.unitPrice,
    })),
    subtotal, vat, total: subtotal + vat, vnpay: null,
  }
  return mockResolve(row)
}

export default { getAll, getDetail, create }
