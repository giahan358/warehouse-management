// Tài khoản mock để đăng nhập khi chưa có BE (VITE_USE_MOCK !== 'false').
// Khi có BE: POST /auth/login xác thực bằng Spring Security, mật khẩu không bao giờ nằm ở FE.
export const accountsMock = [
  {
    id: 'USR-ADM-001',
    name: 'Trần Đình Khang',
    email: 'admin@example.com',
    password: 'Admin@123',
    role: 'ADMIN',
    org: 'Trung tâm Điều hành Quốc gia',
  },
  {
    id: 'USR-STF-021',
    name: 'Trần Văn Mạnh',
    email: 'staffmanh@example.com',
    password: 'Staff@123',
    role: 'STAFF',
    org: 'Kỹ thuật viên Kho Vận',
  },
  {
    id: 'USR-STF-022',
    name: 'Phạm Quốc Bảo',
    email: 'staffbao@example.com',
    password: 'Staff@123',
    role: 'STAFF',
    org: 'Đội Vận Hành Hub Tân Bình',
  },
  {
    id: 'USR-CUS-108',
    name: 'Nguyễn Hoàng Lan',
    email: 'lan.nguyen@anphattech.vn',
    password: 'Customer@123',
    role: 'CUSTOMER',
    org: 'An Phát Tech Corp',
  },
]
