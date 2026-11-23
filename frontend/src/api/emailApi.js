import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { unwrapApi, unwrapPage } from './apiResponse'

export const getHistory = async (params = {}) => {
  if (USE_MOCK) return mockResolve({ items: [], page: 0, size: params.size ?? 10, totalElements: 0, totalPages: 0 })
  return unwrapPage(await axiosClient.get('/email-notifications', { params }))
}

export const getById = async (id) => {
  if (USE_MOCK) return mockResolve(null)
  return unwrapApi(await axiosClient.get(`/email-notifications/${id}`))
}

export const sendOutboundOrder = async (id) => {
  if (USE_MOCK) return mockResolve({ id, status: 'SENT' })
  return unwrapApi(await axiosClient.post(`/email-notifications/outbound-orders/${id}/send`))
}

export default { getHistory, getById, sendOutboundOrder }
