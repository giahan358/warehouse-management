import axiosClient from './axiosClient'

function unwrap(response) {
  const body = response.data
  if (body && typeof body === 'object' && 'success' in body && body.success === false) {
    throw new Error(body.error?.message || 'Yêu cầu không thành công.')
  }
  return body && typeof body === 'object' && 'data' in body ? body.data : body
}

function getPage(response) {
  const body = response.data
  const data = body && typeof body === 'object' && 'data' in body ? body.data : body
  if (!Array.isArray(data)) {
    throw new Error('Dữ liệu danh sách trả về không đúng định dạng.')
  }
  return {
    items: data,
    meta: body && typeof body === 'object' ? body.meta : null,
  }
}

export function getApiErrorMessage(error) {
  return error.response?.data?.error?.message
    || error.response?.data?.message
    || error.message
    || 'Đã xảy ra lỗi khi kết nối máy chủ.'
}

export const customerApi = {
  getIdentity: async () => unwrap(await axiosClient.get('/auth/me')),
  logout: async () => unwrap(await axiosClient.post('/auth/logout')),

  dashboard: {
    getSummary: async () => unwrap(await axiosClient.get('/dashboard/customer')),
    getOperations: async (params) => getPage(await axiosClient.get('/dashboard/customer/operations', { params })),
  },

  inventory: {
    getSummary: async () => unwrap(await axiosClient.get('/inventory/me/summary')),
    getList: async (params) => getPage(await axiosClient.get('/inventory/me', { params })),
  },

  inbound: {
    getList: async (params) => getPage(await axiosClient.get('/inbound-receipts', { params })),
    getStatusCounts: async (params) => unwrap(await axiosClient.get('/inbound-receipts/status-counts', { params })),
    getById: async (id) => unwrap(await axiosClient.get(`/inbound-receipts/${id}`)),
    create: async (payload) => unwrap(await axiosClient.post('/inbound-receipts', payload)),
    update: async (id, payload) => unwrap(await axiosClient.put(`/inbound-receipts/${id}`, payload)),
    addItem: async (id, payload) => unwrap(await axiosClient.post(`/inbound-receipts/${id}/items`, payload)),
    updateItem: async (id, itemId, payload) => unwrap(await axiosClient.put(`/inbound-receipts/${id}/items/${itemId}`, payload)),
    removeItem: async (id, itemId) => unwrap(await axiosClient.delete(`/inbound-receipts/${id}/items/${itemId}`)),
    cancel: async (id, payload = {}) => unwrap(await axiosClient.patch(`/inbound-receipts/${id}/cancel`, payload)),
    getDiscrepancyReport: async (id) => unwrap(await axiosClient.get(`/inbound-receipts/${id}/discrepancy-report`)),
  },

  outbound: {
    getList: async (params) => getPage(await axiosClient.get('/outbound-orders', { params })),
    getStatusCounts: async (params) => unwrap(await axiosClient.get('/outbound-orders/status-counts', { params })),
    getById: async (id) => unwrap(await axiosClient.get(`/outbound-orders/${id}`)),
    create: async (payload) => unwrap(await axiosClient.post('/outbound-orders', payload)),
    addItem: async (id, payload) => unwrap(await axiosClient.post(`/outbound-orders/${id}/items`, payload)),
    cancel: async (id, payload = {}) => unwrap(await axiosClient.patch(`/outbound-orders/${id}/cancel`, payload)),
  },

  products: {
    getList: async (params) => getPage(await axiosClient.get('/products', { params })),
    getById: async (id) => unwrap(await axiosClient.get(`/products/${id}`)),
    create: async (payload) => unwrap(await axiosClient.post('/products', payload)),
    update: async (id, payload) => unwrap(await axiosClient.put(`/products/${id}`, payload)),
    updateStatus: async (id, status) => unwrap(await axiosClient.patch(`/products/${id}/status`, { status })),
  },

  invoices: {
    getList: async (params) => getPage(await axiosClient.get('/invoices/me', { params })),
    getCurrent: async () => unwrap(await axiosClient.get('/invoices/me/current')),
    getById: async (id) => unwrap(await axiosClient.get(`/invoices/${id}`)),
    createVnpayPayment: async (id) => unwrap(await axiosClient.post(`/invoices/${id}/payments/vnpay`)),
  },

  profile: {
    get: async () => unwrap(await axiosClient.get('/customers/me')),
    update: async (payload) => unwrap(await axiosClient.put('/customers/me', payload)),
  },
}
