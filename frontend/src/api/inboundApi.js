import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { inboundMock } from '../mocks/data'
import { asnDetailMock, countingReceiptMock, inboundScheduleMock } from '../mocks/staffData'

export const getAll = (params) =>
  USE_MOCK ? mockResolve(inboundMock) : axiosClient.get('/inbound-orders', { params })

// ===== Nhân viên kho: tiếp nhận & kiểm đếm (inbound-receipts) =====
export const getSchedule = (params) =>
  USE_MOCK ? mockResolve(structuredClone(inboundScheduleMock)) : axiosClient.get('/inbound-receipts', { params })

export const getReceiptById = (id) =>
  USE_MOCK
    ? mockResolve({ ...structuredClone(countingReceiptMock), id })
    : axiosClient.get(`/inbound-receipts/${id}`)

// Chi tiết ASN khai báo (popup ở Dashboard nhân viên kho).
// Khi nối BE dùng chung GET /inbound-receipts/{id} (BE cần trả thêm xe, tài xế, pallet)
export const getAsnDetail = (id) =>
  USE_MOCK ? mockResolve({ ...structuredClone(asnDetailMock), id }) : axiosClient.get(`/inbound-receipts/${id}`)

// SCHEDULED → RECEIVING
export const startReceipt = (id) =>
  USE_MOCK ? mockResolve({ id, status: 'RECEIVING' }) : axiosClient.post(`/inbound-receipts/${id}/start`)

export const saveDraft = (id, payload) =>
  USE_MOCK ? mockResolve({ id, saved: true }) : axiosClient.put(`/inbound-receipts/${id}/draft`, payload)

// RECEIVING → CONFIRMED (1 DB transaction, idempotent).
// Lỗi: 409 INVALID_RECEIPT_STATUS, 409 RECEIPT_NOT_FULLY_COUNTED
export const confirmReceipt = (id, payload) =>
  USE_MOCK ? mockResolve({ id, status: 'CONFIRMED' }) : axiosClient.post(`/inbound-receipts/${id}/confirm`, payload)

export default { getAll, getSchedule, getReceiptById, getAsnDetail, startReceipt, saveDraft, confirmReceipt }