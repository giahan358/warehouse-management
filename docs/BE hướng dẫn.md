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
│   ├── CorsConfig.java
│   ├── MailConfig.java
│   └── WebConfig.java
├── security/
│   ├── SecurityConfig.java
│   ├── OAuth2LoginSuccessHandler.java
│   ├── CustomOAuth2UserService.java
│   ├── UserPrincipal.java
│   └── CurrentUserService.java
├── common/
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   ├── ResourceNotFoundException.java
│   │   └── BusinessException.java
│   ├── response/
│   │   └── ApiResponse.java
│   ├── enums/
│   └── util/
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
| common/ | Exception, response chung, enum dùng lại | GlobalExceptionHandler |

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
