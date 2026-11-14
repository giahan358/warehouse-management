| **Thành viên** | **Công việc** |
| --- | --- |
| BE 1 – Huy Kỳ | Mục 2.1, 2.2, 2.3, 2.8 (bao gồm tích hợp đăng nhập tài khoản bằng email thật) |
| BE 2 – Tuấn Minh | Mục 2.4, 2.5, 2.6, 2.7 (bao gồm tích hợp thanh toán VNPay, gửi thông báo cho customer qua email) |

Lưu ý: nên tạo tài khoản email riêng để phục vụ cho đồ án, không nên dùng email thật.

---

## Nguyên tắc và quy tắc chung

**Nguyên tắc: không sửa database.** Mọi thay đổi chỉ nằm ở API, quy tắc Service và tài liệu. File `warehouse_db.sql` giữ nguyên.

Chú thích nhãn: `[BỔ SUNG V3]` là công thức tính toán được ghi rõ thêm (không đổi API, không đổi DB).

### Quy tắc nghiệp vụ chung

**D1. Đăng nhập: cả hai cách cùng tồn tại**
- Email/mật khẩu: `POST /auth/register` (khách) và `POST /auth/login`. Admin tạo Staff kèm mật khẩu ban đầu.
- Google: nút Đăng nhập Google đi qua `/oauth2/authorization/google`. Bắt buộc `email_verified = true`, rồi khớp theo email: chưa có user thì tạo `users` (CUSTOMER, loginMethod GOOGLE, googleId); đã có user (kể cả tài khoản email, Staff, Admin) thì gán `googleId` nếu còn trống và giữ nguyên role.
- `password_hash = NULL` nghĩa là tài khoản chỉ có Google; đăng nhập email trả 401 INVALID_CREDENTIALS, không tiết lộ lý do.
- Cả hai cách đăng nhập cùng phát **JWT** (không dùng session cookie); sau khi có token, BE xử lý hai loại tài khoản giống hệt nhau.
- LOCKED bị chặn ở cả hai đường (403 ACCOUNT_LOCKED), và được kiểm tra lại ở mỗi request vì token đã cấp vẫn còn hạn. LOCKED chỉ dùng khi Admin khóa thủ công, **không dùng để phạt nợ cước** (xem D3).

**D2. Khách chưa có hồ sơ** (không cần cột mới: chưa có dòng `customers` = chưa có hồ sơ)
- Đăng ký hoặc Google chỉ tạo `users`. Admin tạo hồ sơ bằng POST /customers.
- Khi chưa có hồ sơ: đăng nhập, GET /auth/me được; mọi API nghiệp vụ kho (sản phẩm, tồn kho, nhập, xuất, hóa đơn) trả 403 CUSTOMER_PROFILE_REQUIRED.

**D3. Nợ cước**
- Còn hóa đơn OVERDUE: chặn POST /inbound-receipts và POST /outbound-orders (422 OVERDUE_DEBT), tính động khi gọi.
- Khách vẫn đăng nhập, xem và thanh toán hóa đơn bình thường.

**D4. Tồn kho khi xuất**
- Tạo đơn thì `allocated += qty`; start-preparing thì `quantity -= qty`, `allocated -= qty`; hủy khi PENDING thì `allocated -= qty`.
- start-preparing gán `quantityActual = quantityRequested`. Khi Staff giảm `quantityActual`, BE hoàn phần chênh về `quantity`.
- mark-returned cộng lại `quantity += quantityActual`.
- Hủy đơn chỉ khi PENDING (cả khách lẫn Staff/Admin), vì sang PREPARING tồn đã trừ.

**D5. COD và paymentMethod (giữ nguyên cột trong DB, chỉ làm rõ nghĩa)**
- `paymentMethod = COD` khi và chỉ khi `codAmount > 0`: phí kho của đơn được cấn trừ từ tiền thu hộ.
- `paymentMethod = VNPAY` thì `codAmount = 0` hoặc bỏ trống: khách trả phí kho qua VNPay.
- Chỉ có một endpoint xác nhận COD: `POST /outbound-orders/{id}/cod/confirm`. Luồng đầy đủ và quy tắc cấn trừ xem **D7**.

**D6. Dữ liệu mẫu:** admin, staff, Bình đang `loginMethod = EMAIL` nhưng `password_hash = NULL` nên không đăng nhập email được. Gán mật khẩu bcrypt cho họ, hoặc dùng `/auth/dev-login` khi phát triển.

**D7. Luồng COD và quy tắc cấn trừ** (không cần sửa DB)

Các trường dùng: `outbound_orders.cod_amount`, `cod_status`, `cod_confirmed_by`, `cod_confirmed_at`; `invoices`; `payments` (method COD).

```text
B1  KHÁCH   POST /outbound-orders (paymentMethod = COD, codAmount > 0)
            đơn PENDING, codStatus = NONE
B2  STAFF   mark-in-delivery  → IN_DELIVERY, codStatus = PENDING_RECONCILE
            (gửi email thông báo cho khách)
B3  STAFF   mark-delivered    → DELIVERED     (codStatus giữ PENDING_RECONCILE)
        hoặc mark-returned    → RETURNED, codStatus = RETURNED  (KẾT THÚC, không có tiền)
B4  ĐỐI TÁC VẬN CHUYỂN gửi sao kê (ngoài hệ thống, làm thủ công)
B5  ADMIN   PATCH /outbound-orders/{id}/cod/status {COLLECTED}
            chỉ khi đơn DELIVERED và codStatus = PENDING_RECONCILE
B6  ADMIN   POST /outbound-orders/{id}/cod/confirm {offsetInvoiceIds?}
            1 transaction:
              (1) codStatus = COLLECTED, sai → 409 COD_INVALID_STATUS
              (2) từng hóa đơn: thuộc khách của đơn, UNPAID/OVERDUE, chưa có payment SUCCESS
              (3) tổng total_amount ≤ codAmount, vượt → 422 COD_OFFSET_EXCEEDED
              (4) mỗi hóa đơn: tạo payment COD SUCCESS (amount = total_amount,
                  transactionRef = COD-{orderCode}, confirmedBy, paidAt) → hóa đơn PAID
              (5) codStatus = CONFIRMED, ghi cod_confirmed_by / cod_confirmed_at
            response: offsetTotal, remainingAmount = codAmount − offsetTotal
B7  ADMIN   chuyển phần remainingAmount cho khách theo bank_* trong hồ sơ khách,
            làm NGOÀI hệ thống (ngoài phạm vi MVP, ghi rõ trong README)
B8  KHÁCH   GET /cod/me xem trạng thái đối soát (chỉ xem); GET /invoices/me thấy hóa đơn PAID
```

Quy tắc kèm theo:
- Cấn trừ nguyên hóa đơn, không trả một phần.
- Không gửi `offsetInvoiceIds` thì chỉ chuyển CONFIRMED và `remainingAmount = codAmount`.
- Gọi `cod/confirm` lần hai trả 409 COD_INVALID_STATUS vì đã CONFIRMED (khóa dòng đơn để hai Admin bấm cùng lúc không tạo hai payment).
- Hóa đơn được cấn trừ mà đang có payment VNPAY ở PENDING thì chuyển payment đó sang FAILED; nếu IPN thành công đến muộn cho hóa đơn đã PAID thì ghi nhận lỗi và xử lý hoàn tiền thủ công.
- `remainingAmount` không có cột riêng, luôn tính lại: `codAmount − SUM(payments.amount)` với method COD, status SUCCESS, `transactionRef = COD-{orderCode}`.
- Chỉ Admin được gọi B5 và B6; Staff không được chạm dòng tiền.

**D8. Công thức bổ sung `[BỔ SUNG V3]`** (không đổi API, không đổi DB; chi tiết nằm đúng ở mục API tương ứng)
- Tiền hóa đơn: mục 2.5, `POST /invoices` và ghi chú tính toán hóa đơn.
- Thể tích phiếu mới (CAPACITY_EXCEEDED): mục 2.3, `POST /inbound-receipts` và ghi chú tính toán.
- Thứ tự ưu tiên `stockStatus`: phần Enum dùng chung và mục 2.2 (ghi chú tính toán).
- Chênh lệch nhập kho (`variance`, tổng, thiếu/hỏng): mục 2.3, `GET /inbound-receipts`, `GET /inbound-receipts/{id}`, `discrepancy-report` và ghi chú tính toán.
- `remainingM3`, `usedPercent`: mục 2.1, `GET /customers/me` và ghi chú tính toán.
---

## 1. Quy ước hợp đồng API chung

Trước khi code, cả 4 thành viên thống nhất các quy ước sau.

| **Nội dung** | **Quy ước** |
| --- | --- |
| Base URL | http://localhost:8080/api/v1 |
| Định dạng | JSON, UTF-8 |
| Tên thuộc tính | camelCase, ví dụ receiptCode, expectedQuantity |
| Ngày giờ | ISO 8601, ví dụ 2026-10-19T09:30:00+07:00 |
| ID | Số nguyên Long |
| Tiền | Số thập phân, ví dụ 150000.00 |
| Danh sách | Hỗ trợ phân trang bằng page, size; bộ lọc theo trạng thái khi cần |
| Xác thực | Dùng JWT Bearer cho API; gửi `Authorization: Bearer <accessToken>`. JWT ký HS256, thời hạn cấu hình qua `JWT_EXPIRATION_SECONDS` |
| Nội dung token | `sub` = userId, `role`, `exp`. Access token sống ngắn (ví dụ 30 phút) |
| Kiểm tra mỗi request | Filter giải mã JWT rồi đọc lại `users.status` từ DB; LOCKED → 403 ACCOUNT_LOCKED ngay cả khi token còn hạn |
| CORS / CSRF | Cấu hình CORS cho domain FE (cho phép header `Authorization`). Tắt CSRF vì không dùng cookie |
| Phân quyền | Backend kiểm tra vai trò, quyền sở hữu dữ liệu và trạng thái nghiệp vụ |
| Response | Thống nhất một cấu trúc JSON cho thành công và lỗi |
| API thay đổi trạng thái | Chỉ cho phép chuyển trạng thái hợp lệ; không nhận trạng thái tùy ý từ client |
| Tính toán phía server | Các giá trị dẫn xuất (tồn khả dụng, thể tích, tổng tiền, VAT, mã chứng từ) do Backend tính, FE không gửi lên |

Google OAuth2 vẫn dùng redirect/callback của Spring Security; sau callback, backend phát JWT và trả về frontend trong URL fragment để frontend lưu vào session storage. CSRF không cần thiết cho API JWT.


Danh sách có phân trang:

```json
{
  "data": {
    "content": [],
    "page": 0,
    "size": 10,
    "totalElements": 25,
    "totalPages": 3
  },
  "message": "Lấy danh sách thành công"
}
```

### Enum dùng chung

| **Nhóm** | **Giá trị** |
| --- | --- |
| users.role | ADMIN, WAREHOUSE_STAFF, CUSTOMER |
| users.status | ACTIVE, LOCKED |
| servicePackage | STANDARD, PRO, ENTERPRISE |
| products.status | ACTIVE, HIDDEN |
| products.category | ELECTRONIC, COSMETIC, PHARMA, FASHION, PACKAGING, OTHER |
| stockStatus (tính ở BE) | SAFE (khả dụng > 100), LOW (≤ 100), OUT_OF_STOCK (= 0), NEAR_EXPIRY (HSD ≤ 20 ngày). `[BỔ SUNG V3]` Xét theo thứ tự **OUT_OF_STOCK → NEAR_EXPIRY → LOW → SAFE**, dừng ở điều kiện đầu tiên thỏa (mỗi dòng tồn chỉ có đúng một trạng thái). "Khả dụng" = `available` |
| inbound status | SCHEDULED, RECEIVING, CONFIRMED, CANCELLED |
| outbound status | PENDING, PREPARING, PACKED, IN_DELIVERY, DELIVERED, RETURNED, CANCELLED |
| carrier | GHN, VIETTEL_POST, SELF_PICKUP |
| codStatus | NONE, PENDING_RECONCILE, COLLECTED, CONFIRMED, RETURNED |
| invoice status | UNPAID, PAID, OVERDUE, CANCELLED |
| payment status | PENDING, SUCCESS, FAILED |
| paymentMethod | VNPAY, COD |
| loginMethod | EMAIL, GOOGLE |
| inbound timeSlot | MORNING, AFTERNOON |
---

## 2. Bảng hợp đồng API: Endpoint, request, response, lỗi và quyền

Các request/response dưới đây là hợp đồng đề xuất để FE và BE thống nhất. Những trường không liệt kê là trường tùy chọn hoặc cần chốt thêm trước khi code.

### 2.1. Auth, tài khoản và khách hàng (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| POST /auth/register | {fullName, email, password, phone?} | {userId, fullName, email, role, loginMethod, hasCustomerProfile: false}. Chỉ tạo `users` (CUSTOMER, loginMethod EMAIL, mật khẩu bcrypt); hồ sơ `customers` do Admin tạo sau. Email đã tồn tại (kể cả tài khoản Google) → 409 EMAIL_ALREADY_EXISTS | Công khai; chỉ tạo Customer |
| POST /auth/login `[SỬA]` `[SỬA V3]` | {email, password} | {data: {id, fullName, email, role, loginMethod}}; session cookie. LOCKED → 403 ACCOUNT_LOCKED. Sai email/mật khẩu, hoặc tài khoản chỉ có Google (password_hash NULL) → 401 INVALID_CREDENTIALS, không tiết lộ lý do | Công khai |
| GET /oauth2/authorization/google | Không có (Spring Security cung cấp sẵn) | Chuyển sang Google rồi về callback. Success handler: bắt buộc email_verified = true; chưa có user theo email thì tạo `users` CUSTOMER (loginMethod GOOGLE, googleId); đã có thì gán googleId nếu trống, giữ nguyên role; LOCKED thì chặn và chuyển về FE kèm lỗi ACCOUNT_LOCKED; thành công thì phát JWT và chuyển token về FE qua URL fragment | Công khai |
| GET /auth/me | Không có | {id, fullName, email, role, status, loginMethod, customerId?, customerCode?, businessName?, hasCustomerProfile} (customerId null và hasCustomerProfile = false nghĩa là chưa có hồ sơ; FE ẩn chức năng kho và hiện thông báo chờ Admin tạo hồ sơ) | Đã đăng nhập |
| POST /auth/logout | Không có | Thông báo đăng xuất; FE xóa access token. JWT đã phát hành không bị thu hồi và còn dùng được đến khi hết hạn | Đã đăng nhập |
| PATCH /auth/change-password | {currentPassword, newPassword} (newPassword ≥ 8 ký tự) | Thông báo đổi mật khẩu thành công. Tài khoản Google chưa có mật khẩu → 400 INVALID_REQUEST | Đã đăng nhập |
| POST /auth/dev-login `[MỚI V3]` | {email} | Phát JWT cho email đó, không cần mật khẩu/Google, để test Swagger | Chỉ bật khi profile `dev`; tắt ở môi trường khác |
| GET /users | Query page, size, keyword?, role?, status?, loginMethod? (GOOGLE\|EMAIL), hasCustomerProfile? (true/false) | {id, fullName, email, phone, role, status, lockReason, loginMethod, organization} | Admin |
| GET /users/summary | Không có | {totalUsers, customerCount, staffCount, lockedCount} (4 thẻ thống kê màn Tài khoản) | Admin |
| GET /users/permission-matrix | Không có | Ma trận 6 nhóm chức năng × 3 vai trò (dữ liệu tĩnh trong BE, không có bảng DB) | Admin |
| GET /users/{id} | Path id | Thông tin tài khoản | Admin |
| POST /users | {fullName, email, phone?, role, password} | Tài khoản mới (loginMethod EMAIL). Admin đặt mật khẩu ban đầu (≥ 8 ký tự), BE lưu bcrypt; Staff đổi qua /auth/change-password và cũng đăng nhập được bằng Google nếu email trùng | Admin; chỉ tạo Staff theo MVP |
| PATCH /users/{id}/status | {status: "ACTIVE" \| "LOCKED", reason?} | {id, status, lockReason}. Khi LOCKED bắt buộc reason; không cho Admin tự khóa chính mình | Admin |
| GET /customers | Query page, size, keyword?, servicePackage?, feeStatus?, accountStatus? | {id, customerCode, businessName, taxCode, legalRepresentative, phone, address, servicePackage, capacityM3, skuCount, totalUnits, feeStatus, outstandingDebt, accountStatus, userId, loginMethod} | Admin |
| POST /customers | {userId, businessName, phone, address, taxCode?, legalRepresentative?, billingEmail?, servicePackage?, capacityM3?} | Hồ sơ khách hàng (customerCode tự sinh dạng CUST-VNxx). userId phải là tài khoản role CUSTOMER chưa có hồ sơ (đã có → 409 CUSTOMER_PROFILE_EXISTS); tìm bằng GET /users?role=CUSTOMER&hasCustomerProfile=false | Admin |
| GET /customers/{id} | Path id | Hồ sơ đầy đủ + {usedM3, accountStatus, outstandingDebt} | Admin |
| PUT /customers/{id} | {businessName, phone, address, taxCode?, legalRepresentative?, billingEmail?, servicePackage?, capacityM3?, bankName?, bankAccountNumber?, bankAccountHolder?} | Hồ sơ đã cập nhật | Admin |
| GET /customers/me | Không có | Hồ sơ + tài nguyên kho: {capacityM3, usedM3, reservedInboundM3, remainingM3, usedPercent}. `[BỔ SUNG V3]` `remainingM3` và `usedPercent` tính theo "Ghi chú tính toán" bên dưới | Customer |
| PUT /customers/me | {businessName, phone, address, legalRepresentative?, billingEmail?, bankName?, bankAccountNumber?, bankAccountHolder?}. Không cho đổi taxCode, servicePackage, capacityM3 | Hồ sơ đã cập nhật | Customer |

Google OAuth2 sử dụng redirect/callback của Spring Security, ví dụ /oauth2/authorization/google; không cần tự viết API nhận mật khẩu Google. Sau khi đăng nhập Google, backend phát JWT và FE dùng token trong header Bearer. Tài khoản LOCKED bị chặn ở cả đăng nhập email và Google.

Ghi chú tính toán:
- `usedM3` = tổng (inventory.quantity × products.volumeM3) của khách.
- `reservedInboundM3` = tổng (expectedQuantity × volumeM3) của các phiếu nhập đang SCHEDULED hoặc RECEIVING.
- `feeStatus`: OVERDUE nếu có hóa đơn OVERDUE, UNPAID nếu còn hóa đơn UNPAID, ngược lại PAID.
- `remainingM3` `[BỔ SUNG V3]` = `capacityM3 − usedM3 − reservedInboundM3`. Trừ cả phần đã đặt chỗ để khớp luật chặn CAPACITY_EXCEEDED (mục 2.3): FE hiển thị còn trống bao nhiêu thì BE cho đăng ký phiếu nhập tối đa bấy nhiêu.
- `usedPercent` `[BỔ SUNG V3]` = `usedM3 / capacityM3 × 100`, làm tròn 1 chữ số thập phân; `capacityM3 = 0` thì trả 0. Chỉ dùng `usedM3`, không cộng `reservedInboundM3`. `usedPercent` ở các dashboard (mục 2.6) tính cùng cách.

Lỗi thường gặp: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 403 ACCOUNT_LOCKED, 404 USER_NOT_FOUND, 409 EMAIL_ALREADY_EXISTS, 401 INVALID_CREDENTIALS, 403 CUSTOMER_PROFILE_REQUIRED, 409 CUSTOMER_PROFILE_EXISTS.

### 2.2. Sản phẩm và tồn kho (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /products | Query page, size, keyword? (SKU/tên/barcode), customerId?, category?, status?, stockStatus? | Danh sách: {id, sku, barcode, name, category, unit, lengthCm, widthCm, heightCm, volumeM3, status, onHand, allocated, available} | Admin, Staff, Customer (Customer tự lọc theo chính mình, bỏ qua customerId) |
| POST /products | {sku, barcode?, name, category?, description?, unit, lengthCm, widthCm, heightCm (bắt buộc cả 3, validate ở DTO)}. volumeM3 do BE tính = D×R×C/1.000.000 | Sản phẩm mới | Admin, Customer. Admin phải truyền thêm customerId |
| GET /products/{id} | Path id | Chi tiết sản phẩm | Admin/Staff theo quyền; Customer chỉ sản phẩm của mình |
| PUT /products/{id} | {sku, barcode?, name, category?, description?, unit, lengthCm, widthCm, heightCm (bắt buộc)} | Sản phẩm đã cập nhật | Admin hoặc chủ sở hữu |
| PATCH /products/{id}/status | {status: "ACTIVE" \| "HIDDEN"} | Sản phẩm với trạng thái mới (nút ẩn/hiện ở Danh mục sản phẩm) | Admin hoặc chủ sở hữu |
| GET /inventory | Query page, size, keyword? (SKU/tên/barcode/vị trí), customerId?, stockStatus?, zone? (A\|B\|C...) | Danh sách: {inventoryId, customerId, customerName, productId, sku, productName, category, unit, locationCode, zone, onHand, allocated, available, stockStatus, expiryDate, lastInboundAt, updatedAt} | Admin, Staff |
| GET /inventory/summary | Query customerId? | Số lượng theo trạng thái: {total, safe, low, outOfStock, nearExpiry} (các tab lọc ở màn Tồn kho toàn diện) | Admin, Staff |
| GET /inventory/me | Query phân trang, keyword?, stockStatus? | Tồn kho của Customer hiện tại, cùng cấu trúc /inventory (không có customerName) | Customer |
| GET /inventory/me/summary | Không có | {totalOnHand, totalAvailable, totalAllocated, skuCount, usedM3, capacityM3} (thẻ trên Tổng quan & Tồn kho) | Customer |
| GET /inventory/{productId} | Path productId | {productId, productName, quantity, allocated, available, locationCode, updatedAt} | Theo quyền sở hữu |
| PATCH /inventory/{id}/location | {locationCode} (ví dụ ZA-R04-S02-B12) | Vị trí kệ mới. Chỉ đổi vị trí, tuyệt đối không đổi quantity | Staff, Admin |

Lỗi riêng: 404 PRODUCT_NOT_FOUND, 403 PRODUCT_ACCESS_DENIED, 409 PRODUCT_HAS_TRANSACTIONS.

Không cung cấp API cho bất kỳ ai tự sửa inventory.quantity. Số lượng chỉ thay đổi khi nghiệp vụ nhập/xuất được xác nhận hợp lệ.

Ghi chú tính toán:
- `available` = quantity − allocatedQuantity.
- `stockStatus` `[BỔ SUNG V3]`: không có cột trong DB, BE tính khi trả dữ liệu. Thứ tự xét: (1) `available = 0` → OUT_OF_STOCK; (2) `expiryDate ≤ hôm nay + 20 ngày` → NEAR_EXPIRY; (3) `available ≤ 100` → LOW; (4) còn lại → SAFE. Áp dụng cho `GET /products`, `GET /inventory`, `GET /inventory/me`.
- Lọc theo tham số `stockStatus` `[BỔ SUNG V3]`: BE chuyển đúng bộ điều kiện trên thành điều kiện truy vấn DB (không lọc trong Java sau khi đã lấy dữ liệu), để `page`, `size`, `totalElements` đúng. `GET /inventory/summary` đếm theo cùng bộ điều kiện nên `safe + low + outOfStock + nearExpiry = total`.
- `zone` lấy từ ký tự thứ 2 của locationCode (ZA… = zone A).
- `lastInboundAt` lấy từ phiếu nhập CONFIRMED gần nhất có chứa sản phẩm.
- Khách (Customer) không bao giờ thấy sản phẩm của khách khác: BE luôn ép customerId theo user đăng nhập.

### 2.3. Nhập kho (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /inbound-receipts | Query page, size, status?, from?, to?, customerId?, keyword?, dockCode?, timeSlot? | {id, receiptCode, customerName, status, vehiclePlate, dockCode, timeSlot, expectedAt, receivedAt, declaredTotal, actualTotal, damagedTotal, variance}. `[BỔ SUNG V3]` các tổng này tính theo "Ghi chú tính toán" của mục 2.3 | Admin, Staff, Customer |
| GET /inbound-receipts/status-counts | Query from?, to? | {all, scheduled, receiving, confirmed, cancelled} (các tab Tất cả / Chờ xe đến / Đang tại dock...) | Admin, Staff, Customer |
| POST /inbound-receipts | {customerId? (chỉ Admin), expectedAt, vehiclePlate?, timeSlot? (MORNING\|AFTERNOON), note?, items: [{productId, expectedQuantity}]} | Phiếu nhập mới, trạng thái SCHEDULED, receiptCode tự sinh. Chặn: 403 CUSTOMER_PROFILE_REQUIRED, 422 OVERDUE_DEBT, 409 CAPACITY_EXCEEDED (usedM3 + reservedInboundM3 + phiếu mới > capacityM3; `[BỔ SUNG V3]` thể tích phiếu mới = Σ (expectedQuantity × volumeM3) của các item trong phiếu), sản phẩm HIDDEN | Customer; Admin |
| GET /inbound-receipts/{id} | Path id | Phiếu + items: {itemId, productId, sku, productName, unit, expectedQuantity, actualQuantity, damagedQuantity, locationCode, note, variance}. `[BỔ SUNG V3]` `variance` = actualQuantity − expectedQuantity | Theo quyền sở hữu hoặc Staff/Admin |
| PUT /inbound-receipts/{id} | {expectedAt, vehiclePlate?, timeSlot?, note?} | Phiếu đã cập nhật | Chủ sở hữu, chỉ khi SCHEDULED |
| POST /inbound-receipts/{id}/items | {productId, expectedQuantity} | Item mới | Chủ sở hữu, chỉ khi SCHEDULED |
| PUT /inbound-receipts/{id}/items/{itemId} | {expectedQuantity} | Item đã cập nhật | Chủ sở hữu, chỉ khi SCHEDULED |
| DELETE /inbound-receipts/{id}/items/{itemId} | Path id, itemId | Thông báo đã xóa item (nút thùng rác ở form đăng ký) | Chủ sở hữu, chỉ khi SCHEDULED; phiếu phải còn ít nhất 1 item |
| PATCH /inbound-receipts/{id}/items/{itemId}/actual-quantity | {actualQuantity, damagedQuantity?, locationCode?, note?} | Item đã kiểm đếm | Staff/Admin, chỉ khi RECEIVING |
| PUT /inbound-receipts/{id}/counting | {items: [{itemId, actualQuantity, damagedQuantity?, locationCode?, note?}]} | Lưu tạm toàn bộ kết quả kiểm đếm trong một lần (nút "Lưu tạm") | Staff/Admin, chỉ khi RECEIVING |
| POST /inbound-receipts/{id}/scan | {barcode, quantity (mặc định 1)} | Cộng dồn actualQuantity cho item khớp barcode, trả về item đã cập nhật (ô quét barcode, nút +1 / +10) | Staff/Admin, chỉ khi RECEIVING |
| PATCH /inbound-receipts/{id}/start | {dockCode?} | Phiếu chuyển RECEIVING, lưu dockCode | Staff/Admin; chỉ từ SCHEDULED |
| PATCH /inbound-receipts/{id}/confirm | Không có, nếu tất cả số lượng thực tế đã được lưu | Phiếu CONFIRMED, kết quả cập nhật tồn kho; chưa có dòng inventory của (customer, product) thì tạo mới | Staff/Admin |
| PATCH /inbound-receipts/{id}/cancel | {reason?} | Phiếu CANCELLED; lý do (nếu có) nối vào `note`. Admin dùng endpoint này cho nút "Từ chối" | Customer chỉ khi SCHEDULED; Staff/Admin theo chính sách |
| GET /inbound-receipts/{id}/discrepancy-report | Path id | Biên bản chênh lệch: các item có variance ≠ 0 hoặc damagedQuantity > 0, tổng thiếu/hỏng (nút "Biên bản"). `[BỔ SUNG V3]` trả thêm `totalShortage` và `totalDamaged`, công thức ở "Ghi chú tính toán" của mục 2.3 | Theo quyền sở hữu hoặc Staff/Admin |

Lỗi riêng: 404 RECEIPT_NOT_FOUND, 409 INVALID_RECEIPT_STATUS, 409 RECEIPT_NOT_FULLY_COUNTED, 403 RECEIPT_ACCESS_DENIED.

Khi xác nhận, Backend phải kiểm tra tất cả item đã được kiểm đếm và chỉ cộng tồn một lần (gọi lại trả 409 INVALID_RECEIPT_STATUS). Cập nhật trạng thái phiếu và tồn kho trong cùng transaction.

Quy tắc số lượng: khi confirm, `inventory.quantity += actualQuantity` (hàng đạt). `damagedQuantity` chỉ lưu để lập biên bản, không cộng vào tồn. Đồng thời set `receivedAt = now`, `confirmedBy = user hiện tại`, và gán `inventory.locationCode` theo locationCode của item nếu có.

Quy tắc Khách hàng: sửa/hủy phiếu chỉ khi SCHEDULED. Từ RECEIVING trở đi trả 409 INVALID_RECEIPT_STATUS.

Ghi chú tính toán `[BỔ SUNG V3]`:
- Thể tích phiếu mới (dùng cho CAPACITY_EXCEEDED) = Σ (expectedQuantity × products.volumeM3) của các item trong phiếu, cùng cách tính với `reservedInboundM3` ở mục 2.1. Khi thêm hoặc sửa số lượng item của phiếu SCHEDULED (`POST/PUT .../items`) cũng kiểm tra lại cùng điều kiện.
- `variance` của item = actualQuantity − expectedQuantity (âm là thiếu, dương là thừa).
- Các tổng trên phiếu: `declaredTotal` = Σ expectedQuantity; `actualTotal` = Σ actualQuantity; `damagedTotal` = Σ damagedQuantity; `variance` = actualTotal − declaredTotal.
- Biên bản chênh lệch: `totalDamaged` = Σ damagedQuantity; `totalShortage` = Σ max(0, expectedQuantity − actualQuantity − damagedQuantity). Trừ `damagedQuantity` vì hàng hỏng đã tính ở `totalDamaged`, tránh tính trùng (ví dụ khai 200, đạt 196, hỏng 4 thì thiếu = 0, hỏng = 4).

### 2.4. Xuất kho (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /outbound-orders | Query page, size, status?, from?, to?, customerId?, carrier?, keyword? (mã đơn/SĐT/người nhận/mã vận đơn) | Danh sách: {id, orderCode, customerName, recipientName, recipientPhone, deliveryAddress, carrier, trackingCode, status, paymentMethod, codAmount, codStatus, itemCount, totalQuantity, createdAt} | Admin, Staff, Customer (Customer chỉ đơn của mình) |
| GET /outbound-orders/status-counts | Query from?, to? | {pending, preparing, packed, inDelivery, delivered, returned, cancelled} (4 thẻ bước 1-4 màn Chuẩn bị & Xuất kho) | Admin, Staff, Customer |
| POST /outbound-orders | {recipientName, recipientPhone, deliveryAddress, paymentMethod (VNPAY hoặc COD; COD khi và chỉ khi codAmount > 0; VNPAY thì codAmount = 0 hoặc bỏ trống; sai → 400 VALIDATION_ERROR), carrier?, codAmount?, note? (tối đa 200 ký tự), items: [{productId, quantityRequested}]} | Đơn xuất mới, trạng thái PENDING, orderCode tự sinh. BE tạm giữ allocatedQuantity ngay khi tạo. Chặn: 403 CUSTOMER_PROFILE_REQUIRED, 422 OVERDUE_DEBT, 409 INSUFFICIENT_STOCK, sản phẩm HIDDEN | Customer |
| GET /outbound-orders/{id} | Path id | Đơn + items: {itemId, productId, sku, productName, unit, quantityRequested, quantityActual, unitPrice} | Theo quyền sở hữu hoặc Staff/Admin |
| PATCH /outbound-orders/{id}/start-preparing | Không có | Đơn chuyển PREPARING; trừ tồn thực tế và tạm giữ (quantity -= số lượng, allocatedQuantity -= số lượng); gán `quantityActual = quantityRequested` cho mọi item để nhân viên chỉnh giảm | Staff/Admin |
| PATCH /outbound-orders/{id}/items/{itemId}/actual-quantity | {quantityActual, note?} | Điều kiện 0 ≤ quantityActual ≤ quantityRequested (sai → 400 INVALID_QUANTITY). Tồn đã trừ theo số yêu cầu nên BE hoàn phần chênh: `quantity += (actual trước đó − actual mới)`, actual trước đó mặc định = quantityRequested; nếu làm vi phạm ràng buộc tồn → 409 INSUFFICIENT_STOCK. Item đã cập nhật số lượng thực soạn. Nếu quantityActual < quantityRequested thì đánh dấu thiếu hàng (nút "Thiếu hàng") | Staff/Admin, chỉ khi PREPARING |
| PATCH /outbound-orders/{id}/mark-packed | Không có | Đơn chuyển PACKED (nút "Xác nhận đóng gói") | Staff/Admin; chỉ từ PREPARING |
| PATCH /outbound-orders/{id}/tracking | {carrier, trackingCode} | Cập nhật đơn vị vận chuyển và mã vận đơn | Staff/Admin |
| PATCH /outbound-orders/{id}/mark-in-delivery | Không có | Đơn chuyển IN_DELIVERY (bàn giao xe 3PL); kích hoạt gửi email thông báo | Staff/Admin; chỉ từ PACKED |
| PATCH /outbound-orders/{id}/mark-delivered | Không có | Đơn chuyển DELIVERED | Staff/Admin |
| PATCH /outbound-orders/{id}/mark-returned | {note?} | Đơn chuyển RETURNED (3PL hoàn hàng về kho); codStatus chuyển RETURNED nếu có COD; cộng lại tồn `quantity += quantityActual` cho mỗi item (giả định hàng nguyên vẹn) | Staff/Admin; chỉ từ IN_DELIVERY |
| PATCH /outbound-orders/{id}/cancel | {reason?} | Đơn CANCELLED; nhả tạm giữ; lý do (nếu có) nối vào `note`, cắt ≤ 200 ký tự | Customer khi PENDING; Staff/Admin cũng chỉ khi PENDING (từ chối đơn, vì sang PREPARING tồn đã trừ) |
| GET /outbound-orders/{id}/handover-report | Path id | Biên bản bàn giao 3PL: danh sách item, số lượng thực tế, chữ ký (nếu có) | Staff/Admin |

Lỗi riêng: 404 ORDER_NOT_FOUND, 409 INVALID_ORDER_STATUS, 409 INSUFFICIENT_STOCK, 403 ORDER_ACCESS_DENIED, 400 INVALID_QUANTITY, 403 CUSTOMER_PROFILE_REQUIRED, 422 OVERDUE_DEBT.

Chuỗi trạng thái hợp lệ: PENDING → PREPARING → PACKED → IN_DELIVERY → DELIVERED hoặc RETURNED. CANCELLED chỉ từ PENDING. Mọi chuyển trạng thái khác trả 409 INVALID_ORDER_STATUS.

Quy tắc tồn kho (chốt theo SQL gọn):
- Tạo đơn (PENDING): kiểm tra `quantity − allocatedQuantity ≥ quantityRequested`, nếu thiếu trả 409 INSUFFICIENT_STOCK; sau đó `allocatedQuantity += quantityRequested`.
- start-preparing: `quantity -= số lượng`, `allocatedQuantity -= số lượng`.
- Hủy khi PENDING: `allocatedQuantity -= số lượng`.
- Dùng khóa dòng (`SELECT ... FOR UPDATE` hoặc `@Lock(PESSIMISTIC_WRITE)`) trên bảng inventory để hai đơn không cùng vượt tồn khả dụng.

Với đơn có COD: khi `mark-in-delivery`, BE đặt `codStatus = PENDING_RECONCILE` nếu `codAmount > 0`, ngược lại giữ `NONE`.

### 2.5. Hóa đơn, thanh toán VNPay và đối soát COD (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /invoices | Query page, size, status?, customerId?, keyword? (mã hóa đơn/MST/tên khách), month? (yyyy-MM) | Danh sách: {id, invoiceCode, customerName, taxCode, description, periodStart, periodEnd, dueDate, amount, vatRate, vatAmount, totalAmount, status} | Admin |
| GET /invoices/summary | Query month? | {totalInvoices, totalUnpaid, totalOverdue, totalPaidAmount, totalUnpaidAmount} | Admin |
| POST /invoices | {customerId, outboundOrderId?, description, periodStart?, periodEnd?, dueDate?, vatRate (mặc định 0), items: [{description, quantity, unit, unitPrice}]}. BE tự tính lineAmount, amount, vatAmount, totalAmount, invoiceCode. `[BỔ SUNG V3]` công thức ở "Ghi chú tính toán" bên dưới | Hóa đơn mới, trạng thái UNPAID, kèm items | Admin |
| GET /invoices/me | Query phân trang, status?, keyword? | Hóa đơn của Customer hiện tại (lịch sử các kỳ) | Customer |
| GET /invoices/me/current | Không có | Hóa đơn UNPAID/OVERDUE gần hạn nhất: {invoice, daysLeft, amountDue} (thẻ "Cần thanh toán kỳ này") | Customer |
| GET /invoices/{id} | Path id | Chi tiết hóa đơn: {…, items: [{description, quantity, unit, unitPrice, lineAmount}], payments: [{id, paymentMethod, status, amount, vnpTransactionNo, vnpBankCode, paidAt}]} | Admin hoặc chủ hóa đơn |
| PATCH /invoices/{id}/cancel | {reason?} | Hóa đơn CANCELLED | Admin; chỉ khi UNPAID/OVERDUE và chưa có payment SUCCESS |
| POST /invoices/{id}/send-email | Không có | Gửi email hóa đơn tới billingEmail của khách (dùng chung cơ chế mục 2.7; bảng email_notifications không có cột invoice_id nên ghi mã hóa đơn vào subject/content, outbound_order_id để NULL) | Admin |
| POST /invoices/{id}/payments/vnpay | Không nhận số tiền từ FE; Backend lấy số tiền hóa đơn | {paymentUrl, paymentId} | Chủ hóa đơn |
| GET /payments/vnpay/return | Query do VNPay trả về | Trang/kết quả chuyển hướng; không dùng làm bằng chứng duy nhất để xác nhận thanh toán | Callback theo cấu hình |
| POST /payments/vnpay/ipn | Payload/query theo tài liệu VNPay | Phản hồi IPN theo giao thức VNPay | VNPay gọi |
| POST /payments/vnpay/ipn/mock | {txnRef, responseCode ("00" \| "24"...), amount} | Mô phỏng một cuộc gọi IPN hợp lệ để demo (nút "Gửi Test Ping Giả Lập IPN") | Admin; chỉ bật ở môi trường Development |
| GET /payments | Query page, size, method?, status?, invoiceId?, from?, to? | Danh sách giao dịch: {id, invoiceCode, paymentMethod, amount, status, vnpTxnRef, vnpTransactionNo, vnpBankCode, vnpResponseCode, paidAt} (bảng giám sát IPN & lịch sử giao dịch) | Admin |
| GET /payments/{id} | Path id | Chi tiết một giao dịch | Admin hoặc chủ hóa đơn |

Ghi chú tính toán hóa đơn `[BỔ SUNG V3]` (áp dụng cho `POST /invoices`; BE lưu kết quả vào đúng các cột `invoice_items.line_amount`, `invoices.amount`, `vat_amount`, `total_amount`):
- `lineAmount` = quantity × unitPrice (mỗi dòng).
- `amount` = Σ lineAmount (tiền dịch vụ trước thuế).
- `vatAmount` = amount × vatRate / 100.
- `totalAmount` = amount + vatAmount. Đây là số tiền gửi sang VNPay và là số dùng để cấn trừ COD.
- FE không gửi `lineAmount`, `amount`, `vatAmount`, `totalAmount`.
- Ví dụ: 1 dòng, quantity 1, unitPrice 38.500.000, vatRate 8 → amount 38.500.000, vatAmount 3.080.000, totalAmount 41.580.000.

**Đối soát COD** (dữ liệu nằm trong bảng outbound_orders: codAmount, codStatus, codConfirmedBy, codConfirmedAt)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /cod/orders | Query page, size, codStatus?, carrier?, customerId?, keyword? (mã đơn/mã vận đơn) | Danh sách: {orderId, orderCode, trackingCode, carrier, customerName, recipientName, deliveryAddress, shippingStatus, codAmount, codStatus, offsetTotal, remainingAmount (tính từ tổng payments COD SUCCESS có transactionRef = COD-{orderCode})} (tab "Đối Soát & Xác Nhận COD") | Admin |
| GET /cod/orders/summary | Không có | {pendingCount, pendingAmount, collectedAmount, confirmedAmount, returnedAmount} | Admin |
| PATCH /outbound-orders/{id}/cod/status | {codStatus: "COLLECTED" \| "RETURNED"} | Cập nhật theo sao kê 3PL (thủ công trong MVP). COLLECTED chỉ khi đơn DELIVERED; RETURNED chỉ khi đơn RETURNED | Admin |
| POST /outbound-orders/{id}/cod/confirm | {offsetInvoiceIds?: [Long]} | codStatus: COLLECTED → CONFIRMED, ghi codConfirmedBy/At. Nếu có offsetInvoiceIds thì tạo payment COD SUCCESS và chuyển các hóa đơn UNPAID/OVERDUE tương ứng sang PAID (cấn trừ phí kho). Trong một transaction (khóa dòng đơn và hóa đơn), BE kiểm tra theo thứ tự: (1) codStatus = COLLECTED, sai → 409 COD_INVALID_STATUS; (2) mỗi hóa đơn tồn tại, thuộc đúng khách của đơn, đang UNPAID/OVERDUE, chưa có payment SUCCESS, không trùng id; (3) tổng total_amount các hóa đơn ≤ codAmount, vượt → 422 COD_OFFSET_EXCEEDED. Hợp lệ thì với mỗi hóa đơn tạo payment COD SUCCESS (amount = total_amount, transactionRef = COD-{orderCode}, confirmedBy, paidAt) và chuyển hóa đơn PAID. Response: {orderId, codAmount, offsetTotal, remainingAmount, codStatus, paidInvoices: [{id, invoiceCode, totalAmount}]} | Admin |
| GET /cod/me | Query phân trang, codStatus? | Danh sách đơn COD của chính Customer và trạng thái đối soát (chỉ xem) | Customer |

Lỗi riêng: 404 INVOICE_NOT_FOUND, 409 INVOICE_ALREADY_PAID, 409 INVOICE_CANNOT_CANCEL, 409 PAYMENT_ALREADY_PROCESSED, 409 COD_INVALID_STATUS, 400 PAYMENT_SIGNATURE_INVALID, 400 PAYMENT_AMOUNT_MISMATCH, 422 COD_OFFSET_EXCEEDED.

Với VNPay, Backend phải xác minh chữ ký (HMAC SHA512), số tiền, mã giao dịch và xử lý callback lặp an toàn. Mỗi lần thanh toán sinh một `vnpTxnRef` duy nhất. IPN thành công (`vnp_ResponseCode = 00`) thì payment SUCCESS và hóa đơn PAID; mã khác (ví dụ 24 = khách hủy) thì payment FAILED, hóa đơn giữ nguyên.

Với COD, chỉ ghi nhận đã thanh toán sau khi thu tiền thực tế và do Admin xác nhận. Không để FE tự gọi API để đánh dấu hóa đơn đã trả tiền.

Tác vụ định kỳ (không phải API): job chạy hằng ngày chuyển hóa đơn UNPAID quá `dueDate` sang OVERDUE. Đặt trong package `scheduler/` (cần @EnableScheduling, @Scheduled cron hằng ngày).

### 2.6. Dashboard (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /dashboard/admin | Không có hoặc query khoảng thời gian | {capacityM3, usedM3, usedPercent, activeCustomers, lockedCustomers, asnToday, receivingCount, activeOutboundOrders, codPendingAmount, serviceFeeThisMonth, unpaidInvoices, totalProducts} | Admin |
| GET /dashboard/admin/flow | Query from, to, granularity = day \| week | Chuỗi thời gian nhập/xuất: [{date, inboundQuantity, outboundQuantity}] (biểu đồ 30 ngày) | Admin |
| GET /dashboard/admin/tenant-usage | Không có | Top khách theo thể tích chiếm dụng: [{customerId, businessName, usedM3, capacityM3, quotaPercent, estimatedMonthlyFee}] | Admin |
| GET /dashboard/admin/zone-usage | Không có | Mức lấp đầy theo zone: [{zone, usedM3, capacityM3, usedPercent}]. Zone suy ra từ locationCode, sức chứa lấy từ file cấu hình (không có bảng zone) | Admin |
| GET /dashboard/staff | Không có | {receivingScheduledToday, openCountingReceipts, outboundToPrepare, outboundPacked, discrepancyReports, shiftName?} | Staff |
| GET /dashboard/staff/tasks | Query page, size | Hàng đợi tác vụ ưu tiên, BE suy ra từ phiếu nhập/đơn xuất theo trạng thái: [{taskType (RECEIVE_TRUCK\|COUNT\|PICK_PACK\|HANDOVER_3PL), refType, refId, refCode, customerName, locationOrDock, dueAt?, status}] | Staff |
| GET /dashboard/customer | Không có | {usedM3, capacityM3, usedPercent, totalOnHand, totalAvailable, totalAllocated, skuCount, activeInboundCount, provisionalFeeThisPeriod, unpaidInvoiceCount} | Customer |
| GET /dashboard/customer/operations | Query page, size | Phiếu vận hành gần nhất gộp phiếu nhập và đơn xuất: [{type (INBOUND\|OUTBOUND), code, createdAt, itemCount, totalQuantity, status, cancellable}] (bảng "Danh mục & Top SKU / phiếu vận hành") | Customer |

`usedPercent` trong các dashboard tính như mục 2.1 `[BỔ SUNG V3]`.

Lỗi chung: 401 UNAUTHENTICATED, 403 FORBIDDEN, 500 INTERNAL_ERROR.

### 2.7. Gửi thông báo qua email (BE 2)

**Prefix URL:** `/api/v1/email-notifications`

| Method | Endpoint | Chức năng | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `POST` | `/outbound-orders/{id}/send` | Gửi thông báo đơn xuất kho | Kích hoạt gửi email thông báo chi tiết cho một đơn xuất kho xác định theo `{id}`. |
| `GET` | `/` | Xem lịch sử gửi email | Trả về danh sách email đã gửi, hỗ trợ phân trang và bộ lọc `status?`, `customerId?`, `outboundOrderId?`. Admin xem tất cả; Customer chỉ xem email của mình. |
| `GET` | `/{id}` | Xem chi tiết email | Lấy thông tin chi tiết của một email theo `{id}` (trạng thái gửi, người nhận, thời gian, nội dung,...). |
| `POST` | `/test` | Gửi email thử nghiệm | Chỉ dành cho Admin hoặc môi trường Development/Staging. |

Gửi tự động: khi đơn xuất chuyển IN_DELIVERY (`mark-in-delivery`), BE tự tạo và gửi email cho email của khách (`billing_email` nếu có, ngược lại `users.email`) (bước "UC12 Auto Mail"). Gửi thất bại thì ghi `status = FAILED` kèm `errorMessage`, không làm hỏng giao dịch chuyển trạng thái.

### 2.8. Danh mục dùng chung

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /meta/options | Không có | {carriers (chỉ GHN, VIETTEL_POST, SELF_PICKUP), categories, servicePackages, units, orderStatuses, receiptStatuses, timeSlots, codStatuses, invoiceStatuses, loginMethods} | Đã đăng nhập |

---

## 3. Danh sách mã lỗi chung để BE thống nhất

| **HTTP status** | **Error code** | **Ý nghĩa** |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Request sai định dạng hoặc thiếu trường |
| 400 | INVALID_REQUEST | Dữ liệu đầu vào không hợp lệ |
| 401 | UNAUTHENTICATED | Thiếu, sai hoặc hết hạn JWT |
| 403 | FORBIDDEN | Không có quyền thực hiện |
| 403 | ACCOUNT_LOCKED | Tài khoản bị khóa, không được đăng nhập |
| 404 | RESOURCE_NOT_FOUND | Không tìm thấy dữ liệu |
| 409 | RESOURCE_CONFLICT | Trùng dữ liệu hoặc sai trạng thái nghiệp vụ |
| 409 | INSUFFICIENT_STOCK | Tồn kho không đủ |
| 422 | BUSINESS_RULE_VIOLATION | Vi phạm quy tắc nghiệp vụ |
| 400 | INVALID_QUANTITY | Số lượng ngoài khoảng cho phép |
| 401 | INVALID_CREDENTIALS | Sai email/mật khẩu, hoặc tài khoản chỉ có Google |
| 403 | CUSTOMER_PROFILE_REQUIRED | Khách chưa có hồ sơ nên chưa dùng được nghiệp vụ kho |
| 409 | CUSTOMER_PROFILE_EXISTS | Tài khoản đã có hồ sơ khách hàng |
| 409 | CAPACITY_EXCEEDED | Vượt hạn mức dung tích thuê |
| 422 | OVERDUE_DEBT | Còn hóa đơn quá hạn, tạm chặn tạo phiếu/đơn mới |
| 422 | COD_OFFSET_EXCEEDED | Tổng hóa đơn cấn trừ lớn hơn tiền COD đã thu |
| 500 | INTERNAL_ERROR | Lỗi hệ thống |

Ngoài các mã chung, có thể dùng mã riêng đã liệt kê trong từng nhóm API. FE nên xử lý theo error.code, không phụ thuộc vào nội dung câu message.

---
