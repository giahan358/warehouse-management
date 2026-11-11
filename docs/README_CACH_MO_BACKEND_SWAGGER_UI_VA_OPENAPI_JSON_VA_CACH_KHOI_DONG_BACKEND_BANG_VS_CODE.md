# Chạy Backend và kiểm tra API bằng Swagger

Tài liệu này hướng dẫn chạy Spring Boot backend, kết nối MySQL và sử dụng Swagger UI trên Windows. Backend dùng JWT Bearer cho API nghiệp vụ; Google OAuth2 là luồng đăng nhập tùy chọn.

## 1. Chuẩn bị

- JDK 21; kiểm tra trong terminal VS Code:

  ```powershell
  java -version
  ```

- MySQL đang chạy, thường ở cổng `3306`. Nếu dùng XAMPP, chỉ cần khởi động MySQL; Apache không cần thiết.
- Mã nguồn nằm trong thư mục dự án `warehouse-management`. Mở thư mục này trong VS Code.

Database mặc định là `warehouse_db`. Backend đặt `spring.jpa.hibernate.ddl-auto=none`, vì vậy Hibernate **không tạo hoặc cập nhật schema**.

### Tạo database lần đầu

Mở `docs/warehouse_db.sql` bằng MySQL Workbench hoặc phpMyAdmin và chạy khi muốn tạo database mới kèm dữ liệu mẫu.

> **Cảnh báo mất dữ liệu:** file này có lệnh `DROP TABLE`. Không chạy lại trên database đang sử dụng trừ khi đã sao lưu và chấp nhận xóa toàn bộ dữ liệu.

### Database đã tồn tại

Không chạy lại file khởi tạo. Đối chiếu schema hiện có và áp dụng migration còn thiếu trong `docs/migrations/` theo thứ tự ngày:

1. `2026-11-04-account-setup-token.sql`
2. `2026-11-10-outbound-invoice-notes.sql`

Các migration không được chạy lặp lại: trước khi áp dụng, kiểm tra xem các cột và constraint mà chúng thêm đã tồn tại chưa. Bản `warehouse_db.sql` hiện tại đã bao gồm các thay đổi này. Sao lưu database trước khi thay đổi schema.

## 2. Mở thư mục Backend

Trong VS Code, mở terminal (**Terminal > New Terminal**) ở thư mục gốc `warehouse-management`, rồi chuyển vào `backend` theo shell đang dùng:

```powershell
Set-Location .\backend
Get-ChildItem .\mvnw.cmd
```

```bat
cd backend
dir mvnw.cmd
```

```bash
cd backend
ls mvnw*
```

Các khối lệnh lần lượt dành cho PowerShell, Command Prompt và Git Bash. Nếu terminal không bắt đầu tại thư mục gốc dự án, hãy chuyển đến `<đường-dẫn-dự-án>\warehouse-management\backend` trước. Cần thấy file `mvnw.cmd` (PowerShell/Command Prompt) hoặc `mvnw` (Git Bash).

## 3. Cấu hình và chạy môi trường phát triển

### Nếu báo `powershell is not recognized`

`backend/mvnw.cmd` gọi lệnh `powershell.exe` bên trong wrapper. Lỗi này có thể xảy ra dù PowerShell đã cài nếu thư mục chứa `powershell.exe` chưa nằm trong biến môi trường `PATH`.

Trong terminal PowerShell của VS Code, kiểm tra lệnh và đường dẫn mặc định của Windows PowerShell:

```powershell
Get-Command powershell.exe -ErrorAction SilentlyContinue
Test-Path "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
```

Nếu `Test-Path` trả về `True` nhưng `Get-Command` không tìm thấy lệnh, thêm thư mục PowerShell vào `PATH` cho terminal hiện tại rồi xác nhận lại:

```powershell
$env:PATH = "$env:PATH;$env:WINDIR\System32\WindowsPowerShell\v1.0"
Get-Command powershell.exe
```

Sau đó chạy lại wrapper trong **chính terminal đó**. Thay đổi trên chỉ tồn tại đến khi đóng terminal. Để sửa lâu dài, mở **Edit the system environment variables > Environment Variables**, chỉnh biến `Path` (User hoặc System) và thêm thư mục chứa `powershell.exe`, thường là:

```text
C:\Windows\System32\WindowsPowerShell\v1.0
```

Nếu PowerShell được cài ở vị trí khác, dùng thư mục thực tế chứa `powershell.exe`. Lưu thay đổi, đóng và mở lại VS Code/terminal để `PATH` mới được nạp. Không cần thêm thư mục `pwsh.exe` nếu wrapper đang gọi tên `powershell.exe`; hai tên này không nhất thiết cùng tồn tại.

### Cấu hình bằng PowerShell

Ví dụ sau kết nối MySQL local với tài khoản `root`. Thay `DB_PASSWORD` theo cấu hình MySQL trên máy; nếu tài khoản root không có mật khẩu thì để giá trị rỗng.

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/warehouse_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = ""
```

`JWT_SECRET` là bắt buộc. Tạo secret riêng cho môi trường local, tối thiểu 32 byte UTF-8:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Chạy profile `dev` để bật endpoint đăng nhập phục vụ kiểm thử Swagger:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
.\mvnw.cmd spring-boot:run
```

Giữ terminal chạy backend mở trong khi sử dụng ứng dụng; nhấn `Ctrl+C` để dừng. Các biến `$env:...` chỉ tồn tại trong terminal hiện tại. Tạo lại `JWT_SECRET` sẽ làm các JWT đã phát hành bởi secret cũ không còn hợp lệ.

Google OAuth2 không bắt buộc để chạy backend. Để bật đăng nhập Google, cấu hình `GOOGLE_OAUTH_ENABLED=true`, `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`; thông tin OAuth của Google cũng phải cho phép đúng callback URL của backend. Các cấu hình VNPay và email chỉ cần thiết khi kiểm thử các tích hợp tương ứng.

Không dùng profile `dev` hoặc endpoint dev-login trên môi trường triển khai thật. Không lưu secret, mật khẩu hay thông tin OAuth vào source control.

### Tài khoản MySQL riêng (tùy chọn)

Thay vì dùng `root`, có thể tạo tài khoản riêng trong MySQL Workbench/phpMyAdmin; thay mật khẩu mẫu bằng mật khẩu do bạn chọn:

```sql
CREATE USER IF NOT EXISTS 'warehouse_app'@'localhost'
IDENTIFIED BY 'MAT_KHAU_RIENG';

GRANT ALL PRIVILEGES ON warehouse_db.* TO 'warehouse_app'@'localhost';
```

Sau đó đặt `DB_USERNAME=warehouse_app` và `DB_PASSWORD` cùng mật khẩu trong terminal PowerShell.

## 4. Xác nhận Backend đã chạy

Chờ log cho biết ứng dụng đã khởi động, thường có các dòng tương tự:

```text
Tomcat started on port 8080
Started WarehouseApplication
```

`BUILD SUCCESS` riêng lẻ chưa xác nhận ứng dụng đang chạy; nếu thấy `Application run failed`, xem lỗi đầu tiên trước đó. Một số nguyên nhân thường gặp:

| Thông báo | Cách kiểm tra |
| --- | --- |
| `Access denied for user ...` | Kiểm tra `DB_USERNAME`, `DB_PASSWORD` và quyền trên `warehouse_db`. |
| `Communications link failure` | Kiểm tra MySQL đang chạy, cổng và `DB_URL`. |
| `Unknown database 'warehouse_db'` | Tạo database hoặc nhập file khởi tạo nếu đây là database mới. |
| Thiếu cột/bảng hoặc lỗi SQL khi khởi động | Đối chiếu schema và áp dụng migration còn thiếu; không bật Hibernate tự sửa schema. |
| `JWT_SECRET must contain at least 32 UTF-8 bytes` | Đặt `JWT_SECRET` dài ít nhất 32 byte trong terminal chạy backend. |
| `Port 8080 was already in use` | Dừng ứng dụng đang chiếm cổng hoặc đặt `SERVER_PORT` khác rồi dùng URL tương ứng. |

## 5. Mở Swagger và lấy JWT

Khi backend chạy ở cổng mặc định `8080`, mở:

- **Swagger UI:** <http://localhost:8080/swagger-ui/index.html>
- **OpenAPI JSON:** <http://localhost:8080/v3/api-docs>

Swagger UI và OpenAPI JSON có thể mở không cần đăng nhập. Để gọi API nghiệp vụ, cần JWT:

1. Trong Swagger, mở `POST /api/v1/auth/dev-login` và chọn **Try it out**.
2. Gửi email của tài khoản mẫu trong `docs/warehouse_db.sql`, ví dụ:

   ```json
   {
     "email": "admin@example.com"
   }
   ```

3. Sao chép giá trị `data.accessToken` trong response thành công.
4. Chọn **Authorize**; nhập token thuần, không thêm tiền tố `Bearer ` vì Swagger UI tự thêm tiền tố cho HTTP Bearer.
5. Gọi các endpoint cần xác thực theo vai trò của tài khoản vừa đăng nhập.

`/api/v1/auth/dev-login` chỉ được tạo khi profile `dev` đang bật. Nó bỏ qua mật khẩu, chỉ dùng để kiểm thử local và không được bật trên production. Các tài khoản mẫu có thể không có mật khẩu đăng nhập email; endpoint này không có nghĩa là đăng nhập email thông thường đã được thiết lập.

Đăng nhập email thực tế dùng `POST /api/v1/auth/login`; đăng nhập Google bắt đầu tại `/oauth2/authorization/google` khi Google OAuth2 đã được cấu hình.

## 6. Ghi chú MySQL/XAMPP

- Backend kết nối tới schema `warehouse_db`; MySQL chạy thôi chưa đủ nếu schema chưa được tạo.
- Cổng MySQL trong XAMPP phải khớp với cổng trong `DB_URL`.
- Một số phiên bản XAMPP dùng MariaDB thay vì MySQL. Dự án dùng MySQL Connector/J; kiểm tra tương thích nếu server báo lỗi hoặc cảnh báo dialect.
- Các thay đổi database phải được quản lý bằng SQL trong `docs/warehouse_db.sql` và `docs/migrations/`; không dựa vào Hibernate để tự cập nhật schema.
