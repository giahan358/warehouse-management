**1\. FE — React + Vite**

**Lần đầu sử dụng project**

Mở terminal tại thư mục gốc project, chạy:

cd S:\\warehouse-management\\frontend
```

npm install

npm run dev
```
- npm install: cài các thư viện theo package.json.
- npm run dev: chạy frontend.

Mở địa chỉ Vite hiển thị trong terminal, thường là http://localhost:5173/.

Nếu đã có node\_modules và các thư viện không thay đổi thì không cần chạy lại npm install mỗi lần.

**Những lần sử dụng sau**

cd S:\\warehouse-management\\frontend
```
npm run dev
```
Khi muốn dừng server, nhấn Ctrl + C.

**Cách test FE**

FE nên test ở 3 mức:

| **Loại test** | **Cách thực hiện** | **Mục đích** |
| --- | --- | --- |
| Test giao diện với mock data | Dùng dữ liệu giả, chưa cần BE | Kiểm tra giao diện, danh sách, form, trạng thái |
| Test component | Vitest + React Testing Library | Kiểm tra component và thao tác người dùng |
| Test tích hợp API | Kết nối BE thật | Kiểm tra gọi API, xử lý lỗi và hiển thị dữ liệu |

Ví dụ, FE có thể dùng dữ liệu giả để kiểm tra danh sách hàng hóa mà chưa cần kết nối MySQL. Khi BE hoàn thành API, chuyển sang gọi API thật qua axiosClient.js.

Chạy test:
```
npm run test:run
```
Để kiểm tra các lệnh test hiện có trong project, chạy:
```
npm run
```

Lệnh này liệt kê các script đã khai báo. Nếu chưa có script test, không thể mặc định chạy npm test được; cần cấu hình thư viện test trước.

Kiểm tra FE có build được không:
```
npm run build
```
Nếu build thành công, Vite sẽ tạo thư mục dist. Đây là kiểm tra build, không thay thế cho test giao diện hay test chức năng.

**2\. Cấu trúc FE**

```
frontend/src/
|── mocks/
|── test/
├── api/
│   ├── axiosClient.js
│   ├── authApi.js
│   ├── userApi.js
│   ├── customerApi.js
│   ├── productApi.js
│   ├── inventoryApi.js
│   ├── inboundApi.js
│   ├── outboundApi.js
│   ├── invoiceApi.js
│   ├── paymentApi.js
│   └── dashboardApi.js
├── assets/
│   ├── images/
│   └── styles/
├── components/
│   ├── common/
│   │   ├── PageHeader.jsx
│   │   ├── ConfirmModal.jsx
│   │   ├── Loading.jsx
│   │   └── StatusTag.jsx
│   ├── tables/
│   └── forms/
├── layouts/
│   ├── MainLayout.jsx
│   ├── AuthLayout.jsx
│   ├── Sidebar.jsx
│   └── Header.jsx
├── pages/
│   ├── auth/
│   │   └── LoginPage.jsx
│   ├── dashboard/
│   │   ├── AdminDashboard.jsx
│   │   ├── StaffDashboard.jsx
│   │   └── CustomerDashboard.jsx
│   ├── users/
│   │   └── UserListPage.jsx
│   ├── customers/
│   │   ├── CustomerListPage.jsx
│   │   └── CustomerFormPage.jsx
│   ├── products/
│   │   ├── ProductListPage.jsx
│   │   └── ProductFormPage.jsx
│   ├── inventory/
│   │   └── InventoryPage.jsx
│   ├── inbound/
│   │   ├── InboundListPage.jsx
│   │   ├── InboundCreatePage.jsx
│   │   └── InboundDetailPage.jsx
│   ├── outbound/
│   │   ├── OutboundListPage.jsx
│   │   ├── OutboundCreatePage.jsx
│   │   └── OutboundDetailPage.jsx
│   ├── invoices/
│   │   ├── InvoiceListPage.jsx
│   │   └── InvoiceDetailPage.jsx
│   └── profile/
│       └── ProfilePage.jsx
├── routes/
│   ├── AppRoutes.jsx
│   ├── ProtectedRoute.jsx
│   └── RoleRoute.jsx
├── contexts/
│   └── AuthContext.jsx
├── hooks/
├── constants/
│   ├── roles.js
│   └── statuses.js
├── utils/
│   ├── formatCurrency.js
│   └── formatDate.js
├── App.jsx
└── main.jsx
```

Ý nghĩa các folder:

- api/: tập trung các hàm gọi API, không viết URL rải rác khắp màn hình.
- components/: các thành phần dùng lại như bảng, modal, nhãn trạng thái.
- layouts/: bố cục chung, sidebar, header.
- pages/: các trang nghiệp vụ.
- routes/: điều hướng và bảo vệ trang.
- contexts/: lưu thông tin người dùng và trạng thái xác thực dùng chung.
- utils/: hàm định dạng ngày giờ, tiền tệ.

### 2. Luồng code Frontend (React)

*Thứ tự triển khai cho mỗi giao diện/chức năng:*

**1. Cấu trúc giao diện**
- Thiết lập Layout, Router, Menu, và phân quyền hiển thị.

**2. Component / Page**
- Xây dựng Form, bảng dữ liệu, nút thao tác, và modal.

**3. API Service**
- Cấu hình Axios để gọi đúng các endpoint Backend đã thống nhất.

**4. Tích hợp dữ liệu**
- Xử lý hiển thị dữ liệu thật, trạng thái loading, báo lỗi, và validate form.

**5. Kiểm thử giao diện và luồng nghiệp vụ**
- Kiểm tra thao tác theo từng vai trò và xác nhận luồng gọi API thực tế hoạt động ổn định.

Ví dụ với màn hình danh sách sản phẩm:

1. Dựng ProductListPage.jsx bằng dữ liệu giả.
2. Tạo productApi.js chứa hàm gọi GET /products.
3. Gọi API trong Page hoặc custom hook.
4. Hiển thị dữ liệu thật trên bảng Ant Design.
5. Tích hợp tìm kiếm, phân trang, thêm/sửa/xóa và xử lý lỗi.
6. Kiểm tra quyền Admin, Nhân viên và Customer.

Không cần chờ Backend hoàn thành toàn bộ mới làm Frontend. FE có thể dựng giao diện bằng mock data trong lúc BE triển khai API.
