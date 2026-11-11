# Chạy Backend và kiểm tra API bằng Swagger

Tài liệu này hướng dẫn khởi động Spring Boot backend trong VS Code, mở Swagger UI và xem OpenAPI JSON trên máy local Windows.

## 1. Chuẩn bị

- Cài JDK 21 và kiểm tra trong terminal:

  ```powershell
  java -version
  ```

- Đảm bảo MySQL đang chạy trên cổng `3306`. Nếu dùng XAMPP, bấm **Start** ở dòng **MySQL** trong XAMPP Control Panel. Apache không cần thiết cho backend.
- Database mặc định là `warehouse_db`. Cần có schema và các bảng theo `docs/warehouse_db.sql`.

> **Cảnh báo:** `docs/warehouse_db.sql` có lệnh xóa và tạo lại các bảng. Chỉ chạy toàn bộ file này khi khởi tạo database mới hoặc khi chấp nhận mất dữ liệu hiện có. Với database đang sử dụng, áp dụng migration phù hợp trong `docs/migrations/`.

## 2. Mở backend trong VS Code

1. Mở thư mục dự án trong VS Code.
2. Chọn **Terminal > New Terminal** (hoặc nhấn `` Ctrl+` ``).
3. Các lệnh dưới đây dùng **PowerShell** — shell mặc định thường thấy trong VS Code trên Windows.

Di chuyển đến thư mục backend:

```powershell
Set-Location "C:\Users\Admin\Desktop\J2EE\Seminar_va_do_an\He_Thong_Quan_Ly_Ton_Kho\backend"
```

Nếu dự án nằm ở đường dẫn khác, thay đường dẫn trên bằng đường dẫn backend thực tế. Kiểm tra thư mục hiện tại có `mvnw.cmd`:

```powershell
Get-ChildItem mvnw.cmd
```

## 3. Cấu hình biến môi trường và khởi động

Backend lấy thông tin kết nối database từ các biến môi trường. Ví dụ dưới đây dùng MySQL local với user `warehouse_app`; thay mật khẩu bằng mật khẩu đã cấu hình cho user đó:

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/warehouse_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8"
$env:DB_USERNAME = "warehouse_app"
$env:DB_PASSWORD = "MAT_KHAU_MYSQL_CUA_BAN"
```

Ứng dụng cũng bắt buộc có `JWT_SECRET` dài ít nhất 32 byte UTF-8. Để tạo một khóa ngẫu nhiên cho môi trường phát triển trong phiên PowerShell hiện tại:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Khởi động backend:

```powershell
.\mvnw.cmd spring-boot:run
```

Giữ terminal này mở trong lúc sử dụng backend. Khi dừng ứng dụng, nhấn `Ctrl+C`. Các biến `$env:...` chỉ có hiệu lực trong cửa sổ terminal hiện tại; nếu mở terminal mới, cần thiết lập lại chúng.

Nếu muốn giữ JWT ổn định qua nhiều lần khởi động local, hãy tạo một khóa riêng đủ dài và đặt làm biến môi trường `JWT_SECRET` trong cấu hình môi trường của máy hoặc VS Code. Không dùng khóa phát triển cho production, không chia sẻ khóa và không commit bí mật vào Git. Thay đổi khóa sẽ làm các JWT đã phát hành bằng khóa cũ không còn xác thực được.

### Nếu chưa có MySQL user hoặc bị `Access denied`

Trong phpMyAdmin hoặc MySQL Workbench, đăng nhập bằng tài khoản quản trị và tạo/cấp quyền cho user backend. Thay mật khẩu mẫu bằng mật khẩu riêng của bạn:

```sql
CREATE USER IF NOT EXISTS 'warehouse_app'@'localhost'
IDENTIFIED BY 'MAT_KHAU_MYSQL_CUA_BAN';

GRANT ALL PRIVILEGES ON warehouse_db.* TO 'warehouse_app'@'localhost';
```

Nếu user đã tồn tại nhưng mật khẩu không khớp, đặt lại mật khẩu rồi dùng chính mật khẩu đó cho `DB_PASSWORD`:

```sql
ALTER USER 'warehouse_app'@'localhost'
IDENTIFIED BY 'MAT_KHAU_MYSQL_CUA_BAN';
```

## 4. Xác nhận backend đã chạy

Đợi log báo ứng dụng đã khởi động, thường có dòng tương tự:

```text
Tomcat started on port 8080
Started WarehouseApplication
```

Chỉ thấy `BUILD SUCCESS` chưa chắc ứng dụng đã chạy được. Nếu log có `Application run failed`, hãy xử lý lỗi xuất hiện trước đó; những nguyên nhân thường gặp:

| Thông báo | Cách kiểm tra |
| --- | --- |
| `Access denied for user ...` | Kiểm tra `DB_USERNAME`, `DB_PASSWORD` và quyền user trên `warehouse_db`. |
| `Communications link failure` | Kiểm tra MySQL của XAMPP đang chạy, đúng cổng `3306` và `DB_URL`. |
| `Unknown database 'warehouse_db'` | Tạo database/schema cần thiết trước khi chạy backend. |
| `JWT_SECRET must contain at least 32 UTF-8 bytes` | Đặt `JWT_SECRET` đủ dài trong chính terminal đang chạy backend. |
| `Port 8080 was already in use` | Dừng tiến trình backend đang chiếm cổng hoặc đổi `SERVER_PORT` sang cổng khác rồi dùng URL tương ứng. |

## 5. Mở Swagger UI và OpenAPI JSON

Khi backend chạy trên cổng mặc định `8080`, mở trình duyệt và truy cập:

- **Swagger UI:** <http://localhost:8080/swagger-ui/index.html>
- **OpenAPI JSON:** <http://localhost:8080/v3/api-docs>

Swagger UI và OpenAPI JSON được cấu hình cho phép truy cập không cần đăng nhập. Tuy vậy, phần lớn API nghiệp vụ yêu cầu JWT. Khi gọi endpoint được bảo vệ, cần đăng nhập/lấy access token theo API xác thực rồi nhập token trong Swagger bằng nút **Authorize** (nếu có).

Nếu đã đặt `SERVER_PORT` khác `8080`, thay `8080` trong hai địa chỉ trên bằng cổng đã cấu hình.

## 6. Ghi chú khi dùng XAMPP

- XAMPP phải hiển thị MySQL đang chạy; cổng cấu hình trong backend phải trùng cổng MySQL thực tế.
- Ứng dụng kết nối vào schema `warehouse_db`, không chỉ cần dịch vụ MySQL đang hoạt động.
- Kiểm tra phiên bản server bằng phpMyAdmin nếu Hibernate in cảnh báo phiên bản database. Cấu hình dự án khuyến nghị **MySQL 8.0.16 trở lên**; một số bản XAMPP có thể đi kèm MariaDB, không phải MySQL. Cảnh báo phiên bản cần được xem xét riêng, nhưng lỗi xác thực (`Access denied`) hoặc lỗi kết nối sẽ làm ứng dụng khởi động thất bại.
