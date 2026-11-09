import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { customersMock } from '../mocks/data'
import { buildCustomerDetail } from '../mocks/popupData'

export const getAll = (params) =>
  USE_MOCK ? mockResolve([...customersMock]) : axiosClient.get('/customers', { params })

// Hợp đồng, dung lượng, lịch sử phí, vị trí kệ của một khách hàng
export const getDetail = (id) =>
  USE_MOCK
    ? mockResolve(buildCustomerDetail(customersMock.find((c) => c.id === id)))
    : axiosClient.get(`/customers/${id}`)

// payload: { taxCode, name, representative, phone, email, plan, capacity, hub }
export const create = (payload) => {
  if (!USE_MOCK) return axiosClient.post('/customers', payload)
  const row = {
    id: `CUST-VN${String(customersMock.length + 1).padStart(2, '0')}`,
    name: payload.name, plan: payload.plan, tax: payload.taxCode, location: payload.hub,
    rep: payload.representative, phone: payload.phone, capacity: payload.capacity,
    sku: 0, units: 0, fee: 'PAID', account: 'ACTIVE',
  }
  customersMock.push(row)
  return mockResolve(row)
}

export const renewContract = (id, months) =>
  USE_MOCK ? mockResolve({ id, months }) : axiosClient.post(`/customers/${id}/contract/renew`, { months })

export default { getAll, getDetail, create, renewContract }
