### 1.BE — Java + Spring Boot

**Lần đầu sử dụng project**

Mở terminal riêng:

cd S:\\warehouse-management\\backend

Nếu project dùng Maven Wrapper (mvnw.cmd), chạy:
```
.\mvnw.cmd clean test
```
Lệnh này kiểm tra và chạy các test backend hiện có.

Sau đó khởi động BE:
```
.\mvnw.cmd spring-boot:run
```
Nếu project không có mvnw.cmd nhưng máy đã cài Maven, thay bằng:

```
mvn clean test
```
```
mvn spring-boot:run
```

BE thường chạy tại http://localhost:8080. Nếu cấu hình có Swagger, cậu có thể kiểm tra API tại http://localhost:8080/swagger-ui/index.html.

Lưu ý: MySQL phải chạy và cấu hình kết nối database trong application.properties phải chính xác nếu ứng dụng cần database khi khởi động.

**Những lần sử dụng sau**

Thông thường, chỉ cần:

cd S:\\warehouse-management\\backend

```
.\mvnw.cmd spring-boot:run
```
Không cần chạy clean test mỗi lần khởi động. Chạy lại test khi sửa code hoặc trước khi tích hợp, merge và bàn giao.

**Cách test BE**

BE không dùng mock để thay thế toàn bộ việc kiểm thử. Nên chia thành:

| **Loại test** | **Công cụ/cách làm** | **Kiểm tra** |
| --- | --- | --- |
| Unit test | JUnit + Mockito | Logic service, nghiệp vụ, kết quả xử lý |
| API test | MockMvc hoặc gọi API qua Swagger/Postman | Request, response, HTTP status, validation |
| Integration test | Spring Boot Test + MySQL test database | API, repository, truy vấn và quan hệ dữ liệu |

Lệnh chạy toàn bộ test:
```
.\mvnw.cmd test
```
Lệnh build project:
```
.\mvnw.cmd clean package
```
Nếu muốn test API thủ công, chạy BE trước rồi mở Swagger hoặc Postman để gửi request. Không nên dùng database thật chứa dữ liệu quan trọng cho các bài test có thao tác thêm, sửa hoặc xóa.

### 2. Cấu trúc Backend Spring Boot

```text
backend/src/main/java/com/warehouse/
├── WarehouseApplication.java
├── config/
│   ├── OpenApiConfig.java
│   └── CorsConfig.java
├── security/
│   ├── SecurityConfig.java
│   ├── JwtService.java
│   ├── JwtAuthenticationFilter.java
│   ├── GoogleIdTokenVerifier.java
│   ├── ApiAuthenticationEntryPoint.java
│   └── ApiAccessDeniedHandler.java
├── common/
├── exception/
├── response/
├── auth/
│   ├── controller/
│   │   └── AuthController.java
│   ├── service/
│   │   └── AuthService.java
│   └── dto/
│       └── AuthUserResponse.java
├── user/
│   ├── controller/
│   │   └── UserController.java
│   ├── service/
│   │   ├── UserService.java
│   │   └── UserServiceImpl.java
│   ├── repository/
│   │   └── UserRepository.java
│   ├── model/
│   │   └── User.java
│   └── dto/
│       ├── UserResponse.java
│       └── UpdateUserRequest.java
├── customer/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── model/
│   └── dto/
├── product/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── model/
│   └── dto/
├── inventory/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── model/
│   └── dto/
├── inbound/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── model/
│   └── dto/
├── outbound/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── model/
│   └── dto/
├── invoice/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── model/
│   └── dto/
├── payment/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── model/
│   └── dto/
├── email/
│   ├── service/
│   │   └── EmailService.java
│   ├── model/
│   │   └── EmailNotification.java
│   └── repository/
│       └── EmailNotificationRepository.java
└── dashboard/
    ├── controller/
    ├── service/
    └── dto/
```
Các module customer, product, inventory, inbound, outbound, invoice, payment và dashboard áp dụng cùng quy tắc tổ chức tương tự user. Chỉ tạo những file cần thiết cho nghiệp vụ thực tế, không tạo hàng loạt file rỗng.

#### Nhiệm vụ của từng layer

| **Folder** | **Chịu trách nhiệm** | **Ví dụ** |
| --- | --- | --- |
| controller/ | Nhận HTTP request, trả HTTP response | InboundController |
| service/ | Xử lý nghiệp vụ, kiểm tra điều kiện | InboundService |
| repository/ | Truy vấn database bằng Spring Data JPA | InboundReceiptRepository |
| model/ | Entity ánh xạ bảng database | InboundReceipt |
| dto/ | Dữ liệu request/response | CreateInboundRequest |
| config/ | Cấu hình ứng dụng, CORS, OpenAPI | OpenApiConfig |
| security/ | OAuth2, bảo mật, xác định người dùng và vai trò | SecurityConfig |
| common/ | Exception, response, enum và tiện ích dùng lại | GlobalExceptionHandler, PageResponse, EnumParser |

#### Ví dụ một request chạy qua Backend

```text
FE gọi POST /api/v1/inbound-receipts
|
v
InboundController
|
v
InboundService

- kiểm tra người dùng và quyền sở hữu

- kiểm tra ngày giờ và số lượng

- tạo phiếu SCHEDULED
|
v
InboundReceiptRepository
|
v
MySQL
```
## 3.Luồng code Backend (Spring Boot)

Để đảm bảo tính chặt chẽ, thứ tự code khuyến nghị cho mỗi nghiệp vụ (feature) nên đi từ dưới lên trên (từ Database lên API):

1. **Entity (Model)**
   - Ánh xạ các bảng trong Database sang object Java bằng JPA (sử dụng các annotation như `@Entity`, `@Table`).

2. **Repository**
   - Truy vấn dữ liệu bằng Spring Data JPA (thường kế thừa `JpaRepository`).

3. **DTO (Data Transfer Object)**
   - Định nghĩa cấu trúc dữ liệu cho Request (nhận từ Client) và Response (trả về cho Client), giúp tách biệt với Entity.

4. **Service**
   - Viết các logic xử lý nghiệp vụ, phân quyền dữ liệu, và quản lý các giao dịch database (`@Transactional`).

5. **Controller**
   - Khai báo các API Endpoints, nhận dữ liệu Request qua DTO, gọi đến Service để xử lý và trả về Response (thường bọc trong `ApiResponse`).

6. **Kiểm thử API**
   - Sử dụng **Swagger UI** (đã tích hợp sẵn) hoặc phần mềm **Postman** để kiểm tra và xác nhận API hoạt động đúng như mong đợi.
Lưu ý: Controller không nên code trước toàn bộ nghiệp vụ. Nhóm cần thống nhất endpoint và DTO trước; sau đó có thể tạo Controller khung sớm, nhưng nên hoàn thiện Service trước khi kiểm thử API.

| **Thành phần** | **Nhiệm vụ** |
| --- | --- |
| Entity | Ánh xạ bảng dữ liệu |
| Repository | Truy vấn, thêm, sửa dữ liệu |
| DTO | Quy định dữ liệu đầu vào/đầu ra |
| Service | Xử lý nghiệp vụ và kiểm tra quyền |
| Controller | Nhận HTTP request, gọi Service |
| Security/Config | Xác thực, phân quyền, cấu hình chung |
| Exception Handler | Chuẩn hóa mã lỗi và response lỗi |
| Test | Kiểm thử nghiệp vụ và API |

## 4. Cài đặt database MySQL

Dùng MySQL 8.0.16 trở lên. Schema và dữ liệu mẫu nằm trong [`docs/warehouse_db.sql`](docs/warehouse_db.sql).
Khi cập nhật database đã có, áp dụng các script migration tương ứng trong `docs/migrations/`; không chạy lại `warehouse_db.sql` trên database cần giữ dữ liệu vì script khởi tạo này xóa và tạo lại các bảng.

## 5. Cấu hình và chạy backend

Backend lấy thông tin kết nối từ biến môi trường:

| Biến | Giá trị local mặc định/gợi ý |
| --- | --- |
| `DB_URL` | `jdbc:mysql://localhost:3306/warehouse_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8` |
| `DB_USERNAME` | `warehouse_app` |
| `DB_PASSWORD` | Mật khẩu bạn đặt khi tạo MySQL user |
| `MAIL_USERNAME` | Gmail dùng để gửi email thông báo; cần khi sử dụng tính năng mời nhân viên |
| `MAIL_PASSWORD` | Google App Password (không phải mật khẩu đăng nhập Gmail); cần khi sử dụng email |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | Thông tin merchant của VNPay Sandbox; không đưa secret thật lên source control |
| `VNPAY_PAY_URL` | URL thanh toán VNPay; mặc định là VNPay Sandbox |
| `VNPAY_RETURN_URL` | URL callback trình duyệt của backend, ví dụ `http://localhost:8080/api/v1/payments/vnpay/return` |
| `VNPAY_MOCK_ENABLED`, `SPRING_PROFILES_ACTIVE` | Chỉ bật mock IPN khi profile là `dev`/`development` và mock flag là `true` |
| `ZONE_A_CAPACITY_M3`, `ZONE_B_CAPACITY_M3`, `ZONE_C_CAPACITY_M3` | Sức chứa cấu hình cho biểu đồ zone; mặc định `0` nghĩa là chưa cấu hình |
| `JWT_SECRET` | Khóa ký JWT bí mật, tối thiểu 32 byte UTF-8; dùng cùng giá trị ở mọi instance Backend của một môi trường |
| `JWT_EXPIRATION_SECONDS` | Thời hạn access token tính bằng giây; mặc định `3600` |
| `JWT_ISSUER` | Issuer của JWT; mặc định `warehouse-api` và phải thống nhất giữa các instance |
| `SERVER_ADDRESS` | Địa chỉ backend bind; mặc định `0.0.0.0` để frontend trên máy khác có thể truy cập qua mạng |
| `SERVER_PORT` | Cổng backend; mặc định `8080` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID dùng để kiểm tra audience của Google ID token |
| `CORS_ALLOWED_ORIGINS` | Danh sách origin frontend được phép, phân cách bằng dấu phẩy; ví dụ `http://localhost:5173` hoặc domain frontend khi triển khai |
| `FRONTEND_BASE_URL` | URL frontend để tạo link thiết lập mật khẩu qua email; mặc định `http://localhost:5173` |
| `SHOW_SQL`, `FORMAT_SQL` | Bật/tắt log câu SQL và format SQL; mặc định `false` |
| `HIBERNATE_SQL_LOG_LEVEL` | Mức log câu SQL; mặc định `WARN`, tránh bật parameter/bind trace trên dữ liệu thật |

Frontend chọn địa chỉ API bằng `VITE_API_BASE_URL` (ví dụ `https://api.example.com/api/v1`). Khi FE và BE chạy trên các máy/môi trường khác nhau, FE phải trỏ tới hostname/IP mà trình duyệt truy cập được; không dùng `localhost` trừ khi FE và BE cùng chạy trên máy người dùng. Origin FE phải được khai báo trong `CORS_ALLOWED_ORIGINS`. Với JWT, FE gửi `Authorization: Bearer <accessToken>`; không cần cấu hình cookie credentials.

Không đưa `JWT_SECRET` hoặc thông tin xác thực Google vào source control. Tạo một secret riêng, ngẫu nhiên cho từng môi trường triển khai.
Nếu chưa cấu hình SMTP, ứng dụng vẫn có thể khởi động nhưng thao tác gửi email mời nhân viên sẽ trả lỗi `EMAIL_NOT_CONFIGURED`.
Nếu chưa cấu hình VNPay, tạo URL thanh toán trả `VNPAY_NOT_CONFIGURED`; thanh toán IPN thật cần cấu hình đúng merchant sandbox. Mock IPN mặc định tắt và chỉ hoạt động với profile phát triển.
Danh sách CORS phải gồm origin đầy đủ dạng `http(s)://host[:port]`, không thêm path hoặc dấu `/` cuối. Backend không bật cookie credentials; frontend gửi access token qua header `Authorization: Bearer <token>`. Để kết nối từ máy khác, ngoài `SERVER_ADDRESS=0.0.0.0`, cần dùng IP/hostname backend mà trình duyệt truy cập được và mở cổng tương ứng trên firewall/network.

Sau đó chạy backend:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
