# Cấu hình Email SMTP

Backend gửi email thật qua SMTP bằng `JavaMailSender` của Spring Boot, không giả lập việc gửi email. Cấu hình mặc định trong `backend/src/main/resources/application.properties` dùng Gmail SMTP:

| Thuộc tính | Giá trị |
| --- | --- |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Xác thực SMTP | Bật |
| STARTTLS | Bật |
| Tài khoản gửi | `MAIL_USERNAME` |
| Mật khẩu SMTP | `MAIL_PASSWORD` |

Spring ưu tiên `MAIL_USERNAME` và `MAIL_PASSWORD` từ biến môi trường; nếu không có, ứng dụng dùng giá trị fallback trong `application.properties`. Với cấu hình được commit, nên để fallback rỗng (`${MAIL_USERNAME:}` và `${MAIL_PASSWORD:}`) rồi cung cấp thông tin thật qua biến môi trường. Không commit thông tin SMTP thật. Nếu credential đã từng được commit, hãy thu hồi và tạo credential mới.

## Dùng Gmail SMTP

1. Tạo hoặc chọn một tài khoản Gmail riêng cho hệ thống.
2. Bật xác minh 2 bước cho tài khoản đó.
3. Tạo **App Password** trong phần bảo mật của Google. Dùng App Password làm mật khẩu SMTP, không dùng mật khẩu đăng nhập Gmail.
4. Cấu hình hai biến môi trường:
   - `MAIL_USERNAME`: địa chỉ Gmail gửi thư.
   - `MAIL_PASSWORD`: App Password.

Ví dụ nhập cấu hình trong PowerShell cho terminal hiện tại; mật khẩu được nhập ẩn:

```powershell
$env:MAIL_USERNAME = Read-Host "Gmail sender address"
$securePassword = Read-Host "Gmail App Password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:MAIL_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer).Replace(" ", "")
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}
```

Sau đó khởi động backend trong chính terminal đó:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Các biến `$env:...` chỉ tồn tại trong terminal hiện tại. Để dùng lại sau khi đóng terminal, thêm `MAIL_USERNAME` và `MAIL_PASSWORD` vào **User environment variables** của Windows rồi khởi động lại VS Code. Không commit các giá trị này lên Git.

## Kiểm tra gửi email

Đăng nhập bằng tài khoản Admin, sau đó gọi:

```http
POST /api/v1/email-notifications/test
Authorization: Bearer <accessToken>
Content-Type: application/json

{"recipientEmail":"recipient@example.com"}
```

Endpoint gửi email thử đến địa chỉ nhận và yêu cầu role Admin. Nếu SMTP chưa cấu hình, API trả `EMAIL_NOT_CONFIGURED`; nếu nhà cung cấp từ chối gửi, API trả `EMAIL_SEND_FAILED`.

Các luồng email hiện có gồm thông báo đơn xuất khi đơn chuyển sang trạng thái giao hàng, gửi lại thông báo đơn xuất, và gửi hóa đơn đến billing email của khách hàng (hoặc email tài khoản nếu chưa khai báo billing email). Lịch sử các email nghiệp vụ được lưu trong hệ thống.

## Xác minh email khi đăng ký

`POST /api/v1/auth/register` tạo tài khoản ở trạng thái chưa xác minh và gửi link đến `MAIL_USERNAME`/SMTP. Người dùng mở link, sau đó phải nhấn nút xác minh; thao tác GET mở link không tiêu thụ token để tránh email scanner tự xác minh. Token được lưu dưới dạng SHA-256 hash, dùng một lần, hết hạn sau 24 giờ. Hệ thống giới hạn gửi lại một link mỗi 60 giây cho mỗi tài khoản.

Backend dùng `BACKEND_BASE_URL` để tạo URL xác nhận, mặc định `http://localhost:8080`. Cần đặt biến này thành URL backend truy cập được từ trình duyệt khi chạy ngoài local.

API:

- `POST /api/v1/auth/verify-email` với JSON `{"token":"..."}` xác minh token; trang link trong email cũng POST token sau khi người dùng nhấn nút.
- `POST /api/v1/auth/resend-verification` với JSON `{"email":"..."}` gửi lại link nếu tài khoản chưa xác minh. Response luôn dùng thông báo chung để hạn chế dò tài khoản.
- `POST /api/v1/auth/login` trả `403 EMAIL_NOT_VERIFIED` sau khi mật khẩu được xác thực nếu email chưa xác minh.

SMTP phải được cấu hình trước khi đăng ký email/mật khẩu mới; nếu không, đăng ký trả `EMAIL_VERIFICATION_UNAVAILABLE` và transaction tạo tài khoản được rollback. Các tài khoản đã tồn tại trước khi áp dụng migration được giữ ở trạng thái đã xác minh. Google OAuth chỉ đánh dấu xác minh khi Google xác nhận `email_verified=true`.

Trạng thái xác minh được lưu riêng, không dùng chung token thiết lập mật khẩu của tài khoản Staff.

Nếu dùng nhà cung cấp SMTP khác Gmail, hãy thay host, port và các tùy chọn bảo mật cho phù hợp với nhà cung cấp đó. Khi triển khai thật, nên dùng sender/domain đã xác minh và cấu hình SPF/DKIM theo hướng dẫn của nhà cung cấp.