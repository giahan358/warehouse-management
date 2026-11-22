import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { usersMock } from '../mocks/data'
import { unwrapApi, unwrapPage } from './apiResponse'

const normalizeUser = (user) => ({
  ...user,
  id: user.id,
  name: user.fullName ?? user.name ?? '—',
  provider: user.loginMethod === 'GOOGLE' ? 'Google' : user.loginMethod === 'EMAIL' ? 'Email' : user.provider,
  role: user.role === 'WAREHOUSE_STAFF' ? 'STAFF' : user.role,
  org: user.organization ?? user.org ?? '—',
  status: user.status,
})

export const getAll = async (params) => USE_MOCK
  ? mockResolve([...usersMock])
  : (await unwrapPage(await axiosClient.get('/users', { params }))).items.map(normalizeUser)

export const getSummary = async () => USE_MOCK
  ? mockResolve({ totalUsers: usersMock.length, customerCount: 0, staffCount: 0, lockedCount: 0 })
  : unwrapApi(await axiosClient.get('/users/summary'))
export const getPermissionMatrix = async () => USE_MOCK
  ? mockResolve(null)
  : unwrapApi(await axiosClient.get('/users/permission-matrix'))
export const getById = async (id) => normalizeUser(unwrapApi(await axiosClient.get(`/users/${id}`)))

export const create = async (payload) => {
  if (USE_MOCK) {
    const prefix = { CUSTOMER: 'CUS', STAFF: 'STF', ADMIN: 'ADM' }[payload.role]
    const row = { id: `USR-${prefix}-${String(usersMock.length + 100).padStart(3, '0')}`,
      name: payload.fullName,
      email: payload.email, provider: 'Email', role: payload.role,
      org: payload.role === 'CUSTOMER' ? payload.businessName : 'Trung tâm Điều hành Quốc gia', status: 'ACTIVE' }
    usersMock.unshift(row)
    return mockResolve(row)
  }
  if (payload.role === 'STAFF') {
    const result = unwrapApi(await axiosClient.post('/users', {
      fullName: payload.fullName, email: payload.email, phone: payload.phone,
      role: 'WAREHOUSE_STAFF', password: payload.password,
    }))
    return normalizeUser(result)
  }

  if (payload.role === 'CUSTOMER') {
    const customerUsers = unwrapPage(await axiosClient.get('/users', {
      params: { keyword: payload.email, role: 'CUSTOMER', hasCustomerProfile: false, page: 0, size: 100 },
    })).items
    let account = customerUsers.find((user) => user.email?.toLowerCase() === payload.email.trim().toLowerCase())
    const accountAlreadyExisted = Boolean(account)
    if (!account) {
      account = unwrapApi(await axiosClient.post('/auth/register', {
        fullName: payload.fullName, email: payload.email, phone: payload.phone, password: payload.password,
      }))
    }
    let profile
    try {
      profile = unwrapApi(await axiosClient.post('/customers', {
        userId: account.id,
        businessName: payload.businessName,
        phone: payload.phone,
        address: payload.address,
        taxCode: payload.taxCode,
        legalRepresentative: payload.legalRepresentative,
        billingEmail: payload.email,
        servicePackage: payload.servicePackage,
        capacityM3: payload.capacityM3,
      }))
    } catch (error) {
      throw new Error(`Tài khoản Customer đã tồn tại nhưng chưa tạo được hồ sơ doanh nghiệp: ${error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error.message}`)
    }
    return normalizeUser({
      ...account,
      role: 'CUSTOMER',
      organization: profile.businessName,
      accountAlreadyExisted,
    })
  }

  throw new Error('Vai trò tài khoản không được BE hỗ trợ tạo.')
}

export const updateStatus = async (id, status, reason) => {
  if (USE_MOCK) {
    const row = usersMock.find((user) => user.id === id)
    if (row) row.status = status
    return mockResolve(row ? { ...row } : { id, status })
  }
  return normalizeUser(unwrapApi(await axiosClient.patch(`/users/${id}/status`, { status, reason })))
}

// Backend has no role/scope mutation or delete endpoint; keep these calls explicit.
export const updatePermissions = (id, scopes) => USE_MOCK
  ? mockResolve({ id, scopes })
  : Promise.reject(new Error('Backend hiện chưa có API cập nhật ma trận phân quyền.'))
export const remove = (id) => USE_MOCK
  ? mockResolve({ id })
  : Promise.reject(new Error('Backend hiện chưa có API xóa tài khoản.'))

export default { getAll, getSummary, getPermissionMatrix, getById, create, updateStatus, updatePermissions, remove }
