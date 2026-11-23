import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { customersMock } from '../mocks/data'
import { buildCustomerDetail } from '../mocks/popupData'
import { unwrapApi, unwrapPage, toNumber } from './apiResponse'

const normalizeCustomer = (customer) => ({
  ...customer,
  id: customer.id,
  code: customer.customerCode ?? customer.code ?? customer.id,
  name: customer.businessName ?? customer.name ?? '—',
  plan: customer.servicePackage ?? customer.plan ?? '—',
  tax: customer.taxCode ?? customer.tax ?? '—',
  location: customer.address ?? customer.location ?? '—',
  rep: customer.legalRepresentative ?? customer.rep ?? '—',
  capacity: toNumber(customer.capacityM3 ?? customer.capacity),
  sku: toNumber(customer.skuCount ?? customer.sku),
  units: toNumber(customer.totalUnits ?? customer.units),
  fee: customer.feeStatus ?? customer.fee ?? '—',
  debt: toNumber(customer.outstandingDebt ?? customer.debt),
  account: customer.accountStatus ?? customer.account ?? '—',
})

export const getAll = async (params) => USE_MOCK
  ? mockResolve([...customersMock])
  : (await unwrapPage(await axiosClient.get('/customers', { params }))).items.map(normalizeCustomer)

export const getDetail = async (id) => {
  if (USE_MOCK) return mockResolve(buildCustomerDetail(customersMock.find((c) => c.id === id)))
  const customer = normalizeCustomer(unwrapApi(await axiosClient.get(`/customers/${id}`)))
  return {
    ...customer,
    capacity: {
      total: customer.capacity,
      stored: toNumber(customer.usedM3),
      reserved: toNumber(customer.reservedInboundM3),
      free: toNumber(customer.remainingM3),
    },
    contract: { code: '—', type: customer.plan, signedAt: null, expiresAt: null, unitPrice: null, cycle: '—' },
    authorized: [], invoices: [], shelves: [],
  }
}

export const create = async (payload) => {
  if (USE_MOCK) {
    const row = { id: `CUST-VN${String(customersMock.length + 1).padStart(2, '0')}`,
      name: payload.name, plan: payload.plan, tax: payload.taxCode, location: payload.hub,
      rep: payload.representative, phone: payload.phone, capacity: payload.capacity,
      sku: 0, units: 0, fee: 'PAID', account: 'ACTIVE' }
    customersMock.push(row)
    return mockResolve(row)
  }
  const usersPage = unwrapPage(await axiosClient.get('/users', { params: { role: 'CUSTOMER', hasCustomerProfile: false, size: 100 } }))
  const linkedAccount = usersPage.items.find((user) => user.email?.toLowerCase() === payload.email?.trim().toLowerCase())
  if (!linkedAccount) throw new Error('Không tìm thấy tài khoản Customer chưa có hồ sơ khớp email này. Hãy tạo/đăng ký tài khoản trước.')
  return normalizeCustomer(unwrapApi(await axiosClient.post('/customers', {
    userId: linkedAccount.id,
    businessName: payload.name,
    phone: payload.phone,
    address: payload.address ?? payload.hub ?? '—',
    taxCode: payload.taxCode,
    legalRepresentative: payload.representative,
    billingEmail: payload.email,
    servicePackage: payload.plan,
    capacityM3: payload.capacity,
  })))
}

export const update = async (id, payload) => normalizeCustomer(unwrapApi(await axiosClient.put(`/customers/${id}`, payload)))
export const setAccountStatus = async (customer, status) => {
  if (USE_MOCK) return mockResolve({ ...customer, account: status })
  if (!customer?.userId) throw new Error('Khách hàng chưa có tài khoản liên kết để đổi trạng thái.')
  return unwrapApi(await axiosClient.patch(`/users/${customer.userId}/status`, {
    status,
    ...(status === 'LOCKED' ? { reason: 'Khóa theo thao tác của Admin trên màn hình khách hàng.' } : {}),
  }))
}

export const renewContract = (id, months) => USE_MOCK
  ? mockResolve({ id, months })
  : Promise.reject(new Error('Backend hiện chưa có API gia hạn hợp đồng.'))

export default { getAll, getDetail, create, update, setAccountStatus, renewContract }
