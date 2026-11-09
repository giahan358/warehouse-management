import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'

export const confirmCod = (id) => axiosClient.post(`/payments/${id}/cod/confirm`)
export const createVnpayUrl = (invoiceId) => axiosClient.post(`/payments/vnpay/${invoiceId}`)

// Giả lập webhook IPN từ VNPay Sandbox (rspCode '00' = thành công, '24' = khách hủy)
// TODO: BE cung cấp endpoint test; mock trả kết quả sau 300ms
export const simulateIpn = (invoiceId, rspCode) =>
  USE_MOCK
    ? mockResolve({ invoiceId, rspCode })
    : axiosClient.post('/payments/vnpay-ipn/simulate', { invoiceId, rspCode })

export default { confirmCod, createVnpayUrl, simulateIpn }
