import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { outboundMock } from '../mocks/data'
import { fulfillmentMock } from '../mocks/staffData'

export const getAll = (params) =>
  USE_MOCK ? mockResolve(outboundMock) : axiosClient.get('/outbound-orders', { params })

// ===== Nhân viên kho: chuẩn bị hàng & cập nhật giao hàng =====
export const getFulfillment = (params) =>
  USE_MOCK ? mockResolve(structuredClone(fulfillmentMock)) : axiosClient.get('/outbound-orders/fulfillment', { params })

// Chỉ đổi trạng thái đơn, không đổi tồn kho tùy ý hay thanh toán
export const updateStatus = (id, status) =>
  USE_MOCK ? mockResolve({ id, status }) : axiosClient.patch(`/outbound-orders/${id}/status`, { status })

// payload: { sku, reason, note }
export const reportShortage = (id, payload) =>
  USE_MOCK ? mockResolve({ id, reported: true }) : axiosClient.post(`/outbound-orders/${id}/shortage`, payload)

export default { getAll, getFulfillment, updateStatus, reportShortage }