import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { usersMock } from '../mocks/data'

export const getAll = (params) =>
  USE_MOCK ? mockResolve([...usersMock]) : axiosClient.get('/users', { params })

// payload: { role, email, password, fullName | companyName, ... } (xem UserCreateModal)
export const create = (payload) => {
  if (!USE_MOCK) return axiosClient.post('/users', payload)
  const prefix = { CUSTOMER: 'CUS', STAFF: 'STF', ADMIN: 'ADM' }[payload.role]
  const row = {
    id: `USR-${prefix}-${String(usersMock.length + 100).padStart(3, '0')}`,
    name: payload.role === 'CUSTOMER' ? payload.contactName : payload.fullName,
    email: payload.email, provider: 'Email', role: payload.role,
    org: payload.role === 'CUSTOMER' ? payload.companyName : (payload.branch ?? 'Trung tâm Điều hành Quốc gia'),
    status: 'ACTIVE',
  }
  usersMock.unshift(row)
  return mockResolve(row)
}

// Cập nhật phạm vi dữ liệu / quyền: PATCH /users/{id}/roles
export const updatePermissions = (id, scopes) =>
  USE_MOCK ? mockResolve({ id, scopes }) : axiosClient.patch(`/users/${id}/roles`, { scopes })

export default { getAll, create, updatePermissions }
