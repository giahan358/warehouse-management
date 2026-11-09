import axios from 'axios'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  withCredentials: true, // gửi cookie session sau khi đăng nhập Google OAuth2
  headers: { 'Content-Type': 'application/json' },
})

axiosClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // Đăng nhập sai cũng trả 401: để trang Login tự hiển thị lỗi, không chuyển hướng
    const isLoginCall = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginCall) window.location.href = '/login'
    return Promise.reject(err)
  },
)

// Trả mock sau 300ms để thấy trạng thái loading
export const mockResolve = (data) => new Promise((r) => setTimeout(() => r(data), 300))

export default axiosClient
