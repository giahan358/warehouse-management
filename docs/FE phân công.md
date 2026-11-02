**1\. PHÂN CÔNG CÔNG VIỆC:**

| **Thành viên** | **Công việc** |
| --- | --- |
| FE 1 – Gia Hân | Làm giao diện liên quan đến role admin và staff |
| FE 2 – Nam Quang | Làm giao diện liên quan đến role khách hàng |

Lưu ý: nhìn vào cột Vai trò ở mục 2 và làm theo công việc đã phân công.

**2\. Danh sách màn hình và chức năng Frontend**

| **STT** | **Màn hình** | **Vai trò** | **Chức năng chính** |
| --- | --- | --- | --- |
| 1 | Đăng nhập / Đăng ký | Tất cả | Đăng nhập bằng email và mật khẩu; đăng nhập Google; đăng ký tài khoản khách hàng; kiểm tra dữ liệu nhập. |
| 2 | Dashboard( thống kê) | Cả 3 vai trò | Hiển thị thống kê theo quyền: Admin xem tổng quan hệ thống; Staff xem phiếu nhập, đơn xuất cần xử lý và tồn kho; Customer xem sản phẩm, tồn kho, phiếu nhập/xuất và hóa đơn của mình. |
| 3 | Quản lý tài khoản | Admin | Xem danh sách tài khoản; tìm kiếm, lọc theo role/trạng thái; tạo tài khoản nhân viên; xem thông tin; khóa/mở khóa tài khoản; phân quyền. |
| 4 | Quản lý khách hàng | Admin | Xem danh sách khách hàng; tìm kiếm; xem chi tiết hồ sơ; thêm, sửa thông tin cửa hàng, số điện thoại và địa chỉ; xem các sản phẩm, phiếu nhập/xuất liên quan. |
| 5 | Quản lý sản phẩm | Admin / Staff / Customer theo quyền | Xem danh sách sản phẩm; tìm kiếm, lọc; xem chi tiết; Customer thêm/sửa sản phẩm của mình; Admin quản lý toàn bộ sản phẩm; Staff tra cứu sản phẩm phục vụ nghiệp vụ kho. |
| 6 | Quản lý tồn kho | Cả 3 vai trò | Xem số lượng tồn theo sản phẩm; tìm kiếm, lọc; xem chi tiết tồn kho. Admin/Staff xem toàn kho; Customer chỉ xem hàng của mình. Không cho người dùng sửa tồn kho trực tiếp. |
| 7 | Lịch nhập kho và danh sách phiếu nhập | Cả 3 vai trò | Hiển thị phiếu nhập theo trạng thái, khách hàng và thời gian dự kiến; tìm kiếm, lọc; Customer xem phiếu của mình; Staff/Admin theo dõi lịch nhập và các phiếu cần tiếp nhận. |
| 8 | Đăng ký nhập kho | Customer | Chọn sản phẩm, nhập số lượng dự kiến, ngày giờ hàng đến và ghi chú; thêm nhiều sản phẩm vào một phiếu; gửi đăng ký; xem hoặc chỉnh sửa phiếu khi còn được phép. |
| 9 | Tiếp nhận và kiểm đếm hàng nhập | Staff / Admin | Xem chi tiết phiếu; bắt đầu tiếp nhận; nhập số lượng thực nhận cho từng sản phẩm; ghi chú chênh lệch; xác nhận nhập kho hoặc hủy theo quy định. Tồn kho được cập nhật sau khi xác nhận thành công. |
| 10 | Quản lý đơn xuất kho (có kèm chức năng gửi email)| Cả 3 vai trò | Xem danh sách đơn xuất; tìm kiếm, lọc theo trạng thái và thời gian; Customer xem đơn của mình; Staff/Admin xem và xử lý đơn theo quyền.Thêm nút Gửi email ở mỗi đơn; Chỉ Staff/Admin có quyền gửi theo quy tắc phân quyền;
Hiển thị thông báo gửi thành công hoặc thất bại. |
| 11 | Tạo yêu cầu xuất kho | Customer | Chọn sản phẩm và số lượng cần xuất; nhập người nhận, số điện thoại, địa chỉ giao hàng và phương thức thanh toán; kiểm tra thông tin trước khi gửi yêu cầu. |
| 12 | Xử lý đơn xuất kho | Staff / Admin; Customer xem | Xem chi tiết đơn; kiểm tra tồn kho; chuyển trạng thái chuẩn bị hàng, đang giao và đã giao; hủy đơn khi đáp ứng điều kiện. Customer chỉ xem chi tiết và tiến độ đơn của mình. |
| 13 | Quản lý hóa đơn dịch vụ | Admin / Customer | Admin tạo và quản lý hóa đơn, xem số tiền và trạng thái thanh toán; Customer xem hóa đơn của mình, chi tiết phí dịch vụ và số tiền cần trả. |
| 14 | Thanh toán | Customer | Chọn thanh toán VNPay hoặc COD nếu được hỗ trợ; khởi tạo giao dịch VNPay; hiển thị kết quả và trạng thái thanh toán của hóa đơn. |
| 15 | Hồ sơ cá nhân | Cả 3 vai trò | Xem và cập nhật thông tin cá nhân như họ tên, số điện thoại, địa chỉ; hiển thị email và vai trò tài khoản. Khách hàng có thể xem thông tin cửa hàng riêng. |
| 16 | Lịch sử gửi email | Admin và Staff | Danh sách email, người nhận, tiêu đề, thời gian gửi. Trạng thái SENT hoặc FAILED. Xem nội dung email và lỗi gửi nếu có. |

**Lưu ý:**

Mỗi người tích hợp API cho màn hình mình làm, không chỉ code giao diện.

Dùng chung Layout, Router, API client và cách lưu đăng nhập. Hai người cần thống nhất từ đầu để tránh xung đột code.

Phân quyền phải được kiểm tra ở Backend. FE chỉ ẩn/hiện chức năng theo vai trò, không thể dựa vào đó để bảo mật.

**3.Phân chia FE đề xuất**

| **FE 1 – Admin và staff** | **FE 2 – Customer** |
| --- | --- |
| Đăng nhập | Đăng nhập/Đăng ký |
| Dashboard Admin/Nhân viên | Dashboard Customer |
| Quản lý tài khoản | Hồ sơ cá nhân |
| Quản lý khách hàng | Quản lý thông tin cửa hàng |
| Quản lý sản phẩm toàn hệ thống | Quản lý sản phẩm của mình |
| Xem kho hàng toàn hệ thống | Xem tồn kho của mình |
| Danh sách và tiếp nhận hàng nhập | Đăng ký nhập kho |
| Xử lý đơn xuất kho(có gửi email) | Tạo yêu cầu xuất kho |
| Quản lý hóa đơn | Xem hóa đơn của mình |
| Theo dõi thanh toán, nếu được phân quyền | Thanh toán VNPay/COD |

**Lưu ý**: Một số màn hình như đăng nhập, quản lý sản phẩm và tồn kho có thể dùng chung component nhưng hiển thị dữ liệu/chức năng khác nhau theo vai trò. Không cần tạo hai bộ giao diện hoàn toàn riêng.

## 4. Bảng đối chiếu 19 giao diện với API `[MỚI]`

### Admin

| **Giao diện** | **API chính** |
| --- | --- |
| Tổng quan hệ thống | GET /dashboard/admin, /dashboard/admin/flow, /dashboard/admin/tenant-usage, /dashboard/admin/zone-usage |
| Quản lý khách hàng | GET/POST /customers, GET/PUT /customers/{id}, PATCH /users/{id}/status |
| Danh mục & Tồn kho | GET /inventory, GET /inventory/summary, POST /products (kèm customerId), PATCH /products/{id}/status |
| Quản lý Nhập kho | GET /inbound-receipts, GET /inbound-receipts/status-counts, POST /inbound-receipts (customerId), PATCH …/start, …/confirm (Duyệt), …/cancel (Từ chối) |
| Xuất kho & COD | GET /outbound-orders, GET /cod/orders, GET /cod/orders/summary, PATCH /outbound-orders/{id}/cod/status, POST /outbound-orders/{id}/cod/confirm |
| Hóa đơn phí dịch vụ & VNPay | GET/POST /invoices, GET /invoices/summary, GET /payments, POST /payments/vnpay/ipn/mock, POST /invoices/{id}/send-email |
| Tài khoản & Phân quyền | GET /users (filter loginMethod), GET /users/summary, GET /users/permission-matrix, POST /users, PATCH /users/{id}/status |

### Khách hàng

| **Giao diện** | **API chính** |
| --- | --- |
| Tổng quan & Tồn kho của tôi | GET /dashboard/customer, GET /dashboard/customer/operations, GET /inventory/me, GET /inventory/me/summary |
| Đăng ký Lịch nhập kho | GET/POST/PUT /inbound-receipts, POST/PUT/DELETE …/items, PATCH …/cancel, GET …/discrepancy-report |
| Danh mục & Thông tin Sản phẩm | GET/POST/PUT /products, PATCH /products/{id}/status |
| Yêu cầu Xuất kho & Giao hàng | GET/POST /outbound-orders, POST …/items, PATCH …/cancel, GET /inventory/me (tra cứu kho tồn) |
| Hóa đơn Phí dịch vụ & Thanh toán VNPay | GET /invoices/me, GET /invoices/me/current, GET /invoices/{id}, POST /invoices/{id}/payments/vnpay |
| Hồ sơ Doanh nghiệp & Tài khoản | GET/PUT /customers/me |

### Nhân viên kho

| **Giao diện** | **API chính** |
| --- | --- |
| Bàn làm việc & Nhiệm vụ ca | GET /dashboard/staff, GET /dashboard/staff/tasks, GET /inventory (tra cứu nhanh) |
| Tiếp nhận & Lịch nhập kho | GET /inbound-receipts, GET /inbound-receipts/status-counts, PATCH …/start |
| Tiếp nhận & Xác nhận thực tế Nhập kho | GET /inbound-receipts/{id}, PATCH …/items/{itemId}/actual-quantity, PATCH …/confirm |
| Kiểm đếm & Xác nhận thực tế | POST …/scan, PUT …/counting, GET …/discrepancy-report, PATCH …/confirm |
| Chuẩn bị & Xuất kho | GET /outbound-orders, GET /outbound-orders/status-counts, PATCH …/start-preparing, …/items/{itemId}/actual-quantity, …/mark-packed, …/tracking, …/mark-in-delivery, GET …/handover-report |
| Tra cứu Tồn kho theo Khách hàng & Sản phẩm | GET /inventory (customerId, keyword, stockStatus), PATCH /inventory/{id}/location |

---