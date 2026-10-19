**1\. Tổng quan đề tài**

Tên đề tài: Hệ thống quản lý kho hàng và dịch vụ lưu trữ cho cửa hàng/doanh nghiệp.

Hệ thống cung cấp dịch vụ tiếp nhận, lưu trữ và xuất hàng cho nhiều khách hàng. Khách hàng có thể đăng ký lịch nhập kho, theo dõi tồn kho, yêu cầu xuất hàng và thanh toán phí dịch vụ.

Đây không phải website bán hàng: sản phẩm thuộc sở hữu của khách hàng; hệ thống không quản lý giỏ hàng mua sắm hay doanh thu bán sản phẩm. Phí trong hệ thống là phí dịch vụ kho.

**Phạm vi nghiệp vụ được giữ lại**

- Đăng nhập bằng Google OAuth2.
- Ba vai trò: Admin, Nhân viên kho, Khách hàng.
- Quản lý khách hàng, sản phẩm và tồn kho.
- Đăng ký lịch nhập kho, tiếp nhận và xác nhận số lượng hàng thực tế.
- Tạo yêu cầu xuất kho, xử lý và cập nhật trạng thái xuất hàng.
- Lập hóa đơn phí dịch vụ, thanh toán VNPay Sandbox và hỗ trợ COD ở mức đơn giản.
- Dashboard và thống kê cơ bản cho từng vai trò.
- Kiểm thử API bằng Swagger UI, viết báo cáo và tổ chức source code rõ ràng.

**2\. Công nghệ sử dụng**

| **Thành phần** | **Công nghệ** | **Mục đích** |
| --- | --- | --- |
| Frontend | React + Vite, Vites | Xây dựng giao diện web và test |
| UI | Ant Design | Bảng dữ liệu, form, modal, menu, dashboard |
| Điều hướng | React Router | Chuyển trang theo chức năng và vai trò |
| Gọi API | Axios | Kết nối Frontend với Backend |
| Backend | Java 17+ + Spring Boot 3.x | Xây dựng REST API |
| ORM | Spring Data JPA + Hibernate | Ánh xạ entity và thao tác dữ liệu |
| Bảo mật | Spring Security + OAuth2 Client | Đăng nhập Google, xác thực và phân quyền |
| Database | MySQL | Lưu dữ liệu nghiệp vụ |
| Thanh toán | VNPay Sandbox | Kiểm thử thanh toán trực tuyến |
| Tài liệu API | Springdoc OpenAPI + Swagger UI | Mô tả và thử API trên trình duyệt |
| Kiểm thử BE | JUnit + Mockito | Kiểm thử service và nghiệp vụ |
| Quản lý source | Git + GitHub | Phối hợp nhóm, quản lý phiên bản |
| Triển khai bổ sung | Docker + Docker Compose | Đóng gói và chạy ứng dụng đồng nhất |

## 3. Phân quyền và chức năng từng vai trò

### 3.1. Admin — Quản trị viên

Quản lý toàn hệ thống

- Quản lý tài khoản, khóa/mở khóa tài khoản và phân quyền.
- Xem, thêm, sửa thông tin khách hàng.
- Quản lý danh mục sản phẩm và thông tin sản phẩm.
- Xem tồn kho của tất cả khách hàng.
- Xem và quản lý tất cả phiếu nhập kho, đơn xuất kho.
- Tạo hóa đơn phí dịch vụ, xem trạng thái thanh toán.
- Xác nhận COD khi có khoản tiền đã được thu thực tế.
- Xem dashboard và thống kê tổng hợp.

### 3.2. Nhân viên kho — Warehouse Staff

Thực hiện nghiệp vụ kho

- Xem lịch nhập kho do khách hàng đăng ký.
- Mở phiếu khi hàng thực tế đến kho.
- Chuyển trạng thái sang đang tiếp nhận.
- Nhập số lượng thực tế, ghi chú chênh lệch nếu có.
- Xác nhận nhập kho để hệ thống cập nhật tồn kho.
- Xem tồn kho theo khách hàng và sản phẩm.
- Xem yêu cầu xuất kho đang chờ xử lý.
- Chuẩn bị xuất hàng, cập nhật trạng thái giao hàng.
- Xem dashboard công việc cần xử lý.

Nhân viên kho không được tự tạo giao dịch thanh toán thành công, thay đổi tồn kho tùy ý hoặc quản lý tài khoản và phân quyền.

### 3.3. Khách hàng — Customer

Quản lý hàng hóa của chính mình

- Đăng nhập bằng Google.
- Xem và cập nhật hồ sơ cá nhân/doanh nghiệp.
- Tạo, sửa thông tin sản phẩm thuộc quyền quản lý.
- Đăng ký lịch nhập kho, chọn ngày giờ dự kiến và khai báo hàng hóa, số lượng dự kiến.
- Theo dõi trạng thái tiếp nhận và lịch sử nhập kho.
- Xem tồn kho của chính mình.
- Tạo yêu cầu xuất kho, khai báo số lượng, người nhận và địa chỉ giao hàng.
- Theo dõi trạng thái xử lý đơn xuất.
- Xem hóa đơn và thanh toán VNPay.
- Xem trạng thái các yêu cầu, hóa đơn và thông báo của mình.

Nguyên tắc bảo mật quan trọng: Ẩn nút trên giao diện không đủ để bảo vệ dữ liệu. Backend phải xác thực người dùng và kiểm tra quyền sở hữu ở từng API. Khách hàng A không được xem hay sửa tồn kho, phiếu nhập, đơn xuất hoặc hóa đơn của khách hàng B.
