import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { accountsMock } from '../mocks/accounts'

export const MAX_FAILED_ATTEMPTS = 5
const failedAttempts = new Map() // mock: đếm số lần sai theo email

// Đăng nhập email + mật khẩu → trả về { id, name, email, role, org }
// Lỗi: { code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED', message, remaining? }
export const login = async (email, password) => {
  if (!USE_MOCK) return axiosClient.post('/auth/login', { email: email.trim(), password })

  await mockResolve(null)
  const key = email.trim().toLowerCase()
  const fails = failedAttempts.get(key) ?? 0
  if (fails >= MAX_FAILED_ATTEMPTS) {
    throw { code: 'ACCOUNT_LOCKED', message: 'Tài khoản bị khóa tạm thời do nhập sai quá 5 lần. Liên hệ Admin IT Support.' }
  }

  const acc = accountsMock.find((a) => a.email === key && a.password === password)
  if (!acc) {
    failedAttempts.set(key, fails + 1)
    const remaining = MAX_FAILED_ATTEMPTS - (fails + 1)
    throw {
      code: remaining <= 0 ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      message: remaining <= 0
        ? 'Tài khoản bị khóa tạm thời do nhập sai quá 5 lần. Liên hệ Admin IT Support.'
        : `Email hoặc mật khẩu không đúng. Còn ${remaining} lần thử trước khi bị khóa.`,
      remaining,
    }
  }
  failedAttempts.delete(key)
  // Không trả mật khẩu về cho FE
  return { id: acc.id, name: acc.name, email: acc.email, role: acc.role, org: acc.org }
}

export const me = () => axiosClient.get('/auth/me')
export const logout = () => (USE_MOCK ? mockResolve(null) : axiosClient.post('/auth/logout'))

export default { login, me, logout }