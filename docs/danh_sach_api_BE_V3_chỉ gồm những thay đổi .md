# Tóm tắt thay đổi V3 (chỉ phần mới và sửa)

File này gom lại **những gì V3 thêm mới hoặc sửa** so với V2, để cả nhóm nhìn nhanh. Mọi thứ thuộc V2 mà V3 không đụng tới đã được lược bỏ. Khi cần xem đầy đủ một endpoint (các trường không đổi), mở file `danh_sach_api_BE_phan_cong_v3.md` theo cùng số mục.

**Cách đọc**

- **[MỚI V3]**: thêm mới ở đợt này.
- **[SỬA V3]**: sửa so với V2. Chữ in đậm trong dòng cho biết chính xác phần nào đổi.
- Dòng nào có trong phần 2 đều là dòng V3 có chạm vào. Phần còn lại của dòng là nội dung đã có từ trước, để bạn đọc đủ ngữ cảnh.
- Những endpoint bị bỏ nằm ở mục A bên dưới, chỉ để biết, không cần làm.

---

# Phần 1. Quy tắc và danh sách thay đổi

**Nguyên tắc V3: không sửa schema database.** Thay đổi API/nghiệp vụ không thêm cột hay bảng; dữ liệu mẫu carrier được cập nhật theo danh sách hiện hành.


### A. BỎ (5 endpoint)

| **Endpoint bỏ** | **Lý do** |
| --- | --- | 
| POST /auth/google (idToken) | Trùng với luồng redirect Google của Spring Security, chỉ giữ một cách | 
| PATCH /outbound-orders/{id}/approve | Không đổi trạng thái nào, thừa | 
| POST /outbound-orders/{id}/items | V2 chỉ có thêm item, không có sửa/xóa; mỗi lần thêm lại phải tạm giữ tồn | 
| POST /payments/{id}/cod/confirm | Trùng với xác nhận COD ở đơn xuất | 
| DELETE /products/{id} | Trùng với ẩn sản phẩm | 

### B. THÊM (3 endpoint + 1 tham số)

| **Thêm** | **Mục đích** |
| --- | --- |
| GET /oauth2/authorization/google | Nút "Đăng nhập bằng Google" (Spring Security có sẵn, không tự viết controller) |
| PATCH /auth/change-password | Staff do Admin cấp mật khẩu ban đầu cần đổi được mật khẩu |
| POST /auth/dev-login | Chỉ profile `dev`, để test Swagger không cần Google |
| Tham số `hasCustomerProfile` của GET /users | Admin tìm tài khoản CUSTOMER chưa có hồ sơ để tạo bằng POST /customers |

Mã lỗi mới: INVALID_CREDENTIALS, CUSTOMER_PROFILE_REQUIRED, CUSTOMER_PROFILE_EXISTS, CAPACITY_EXCEEDED, OVERDUE_DEBT, INVALID_QUANTITY, COD_OFFSET_EXCEEDED (xem mục 3).

### C. SỬA (đánh dấu `[SỬA V3]` ngay tại dòng)

Xác thực JWT Bearer (thay cho lựa chọn session-cookie trong tài liệu này theo yêu cầu triển khai), POST /auth/register, POST /auth/login, GET /auth/me, GET /users, POST /users, POST /customers, POST /products, PUT /products/{id}, POST /inbound-receipts, PATCH /inbound-receipts/{id}/cancel, PATCH /inbound-receipts/{id}/confirm, POST /outbound-orders, start-preparing, actual-quantity, mark-returned, cancel đơn xuất, GET /invoices, POST /invoices/{id}/send-email, POST /outbound-orders/{id}/cod/confirm, GET /cod/orders, tác vụ định kỳ OVERDUE, email tự động, enum carrier.

### D. Quy tắc nghiệp vụ chung V3

**D1. Đăng nhập: cả hai cách cùng tồn tại**
- Email/mật khẩu: `POST /auth/register` (khách) và `POST /auth/login`. Admin tạo Staff kèm mật khẩu ban đầu.
- Google: nút Đăng nhập Google đi qua `/oauth2/authorization/google`. Bắt buộc `email_verified = true`, rồi khớp theo email: chưa có user thì tạo `users` (CUSTOMER, loginMethod GOOGLE, googleId); đã có user (kể cả tài khoản email, Staff, Admin) thì gán `googleId` nếu còn trống và giữ nguyên role.
- `password_hash = NULL` nghĩa là tài khoản chỉ có Google; đăng nhập email trả 401 INVALID_CREDENTIALS, không tiết lộ lý do.
- LOCKED bị chặn ở cả hai đường (403 ACCOUNT_LOCKED). LOCKED chỉ dùng khi Admin khóa thủ công, **không dùng để phạt nợ cước** (xem D3).

**D2. Khách chưa có hồ sơ** (không cần cột mới: chưa có dòng `customers` = chưa có hồ sơ)
- Đăng ký hoặc Google chỉ tạo `users`. Admin tạo hồ sơ bằng POST /customers.
- Khi chưa có hồ sơ: đăng nhập, GET /auth/me được; mọi API nghiệp vụ kho (sản phẩm, tồn kho, nhập, xuất, hóa đơn) trả 403 CUSTOMER_PROFILE_REQUIRED.

**D3. Nợ cước**
- Còn hóa đơn OVERDUE: chặn POST /inbound-receipts và POST /outbound-orders (422 OVERDUE_DEBT), tính động khi gọi.
- Khách vẫn đăng nhập, xem và thanh toán hóa đơn bình thường.

**D4. Tồn kho khi xuất: giữ nguyên V2, bổ sung 2 quy tắc**
- Giữ: tạo đơn thì `allocated += qty`; start-preparing thì `quantity -= qty`, `allocated -= qty`; hủy khi PENDING thì `allocated -= qty`.
- Thêm: start-preparing gán `quantityActual = quantityRequested`. Khi Staff giảm `quantityActual`, BE hoàn phần chênh về `quantity`.
- Thêm: mark-returned cộng lại `quantity += quantityActual`.
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

---

# Phần 2. Chi tiết từng endpoint đã sửa hoặc thêm mới

Số mục giữ nguyên như file V3 đầy đủ.

## 1. Quy ước hợp đồng API chung


### 2.1. Auth, tài khoản và khách hàng (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| POST /auth/register **[SỬA V3]** | {fullName, email, password, phone?} | {userId, fullName, email, role, loginMethod, hasCustomerProfile: false}. Chỉ tạo `users` (CUSTOMER, loginMethod EMAIL, mật khẩu bcrypt); hồ sơ `customers` do Admin tạo sau. Email đã tồn tại (kể cả tài khoản Google) → 409 EMAIL_ALREADY_EXISTS | Công khai; chỉ tạo Customer |
| POST /auth/login **[SỬA V3]** | {email, password} | {data: {accessToken, tokenType: "Bearer", expiresIn, user: {id, fullName, email, role, loginMethod}}}. LOCKED → 403 ACCOUNT_LOCKED. Sai email/mật khẩu, hoặc tài khoản chỉ có Google (password_hash NULL) → 401 INVALID_CREDENTIALS, không tiết lộ lý do | Công khai |
| GET /oauth2/authorization/google **[MỚI V3]** | Không có (Spring Security cung cấp sẵn) | Chuyển sang Google rồi về callback. Success handler: bắt buộc email_verified = true; chưa có user theo email thì tạo `users` CUSTOMER (loginMethod GOOGLE, googleId); đã có thì gán googleId nếu trống, giữ nguyên role; LOCKED thì chặn và chuyển về FE kèm lỗi ACCOUNT_LOCKED; thành công thì phát JWT và chuyển token về FE qua URL fragment | Công khai |
| GET /auth/me **[SỬA V3]** | Không có | {id, fullName, email, role, status, loginMethod, customerId?, customerCode?, businessName?, hasCustomerProfile} (customerId null và hasCustomerProfile = false nghĩa là chưa có hồ sơ; FE ẩn chức năng kho và hiện thông báo chờ Admin tạo hồ sơ) | Đã đăng nhập |
| PATCH /auth/change-password **[MỚI V3]** | {currentPassword, newPassword} (newPassword ≥ 8 ký tự) | Thông báo đổi mật khẩu thành công. Tài khoản Google chưa có mật khẩu → 400 INVALID_REQUEST | Đã đăng nhập |
| POST /auth/dev-login **[MỚI V3]** | {email} | Phát JWT cho email đó, không cần mật khẩu/Google, để test Swagger | Chỉ bật khi profile `dev`; tắt ở môi trường khác |
| GET /users | Query page, size, keyword?, role?, status?, loginMethod? (GOOGLE\|EMAIL), hasCustomerProfile? (true/false) **[SỬA V3]** | {id, fullName, email, phone, role, status, lockReason, loginMethod, organization} | Admin |
| POST /users **[SỬA V3]** | {fullName, email, phone?, role, password} | Tài khoản mới (loginMethod EMAIL). Admin đặt mật khẩu ban đầu (≥ 8 ký tự), BE lưu bcrypt; Staff đổi qua /auth/change-password và cũng đăng nhập được bằng Google nếu email trùng | Admin; chỉ tạo Staff theo MVP |
| POST /customers **[SỬA V3]** | {userId, businessName, phone, address, taxCode?, legalRepresentative?, billingEmail?, servicePackage?, capacityM3?} | Hồ sơ khách hàng (customerCode tự sinh dạng CUST-VNxx). userId phải là tài khoản role CUSTOMER chưa có hồ sơ (đã có → 409 CUSTOMER_PROFILE_EXISTS); tìm bằng GET /users?role=CUSTOMER&hasCustomerProfile=false | Admin |

Lỗi thường gặp: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 403 ACCOUNT_LOCKED, 404 USER_NOT_FOUND, 409 EMAIL_ALREADY_EXISTS; thêm **[MỚI V3]**: 401 INVALID_CREDENTIALS, 403 CUSTOMER_PROFILE_REQUIRED, 409 CUSTOMER_PROFILE_EXISTS.


### 2.2. Sản phẩm và tồn kho (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| POST /products | {sku, barcode?, name, category?, description?, unit, lengthCm, widthCm, heightCm **[SỬA V3: bắt buộc cả 3, validate ở DTO]**}. volumeM3 do BE tính = D×R×C/1.000.000 | Sản phẩm mới | Admin, Customer. Admin phải truyền thêm customerId |
| PUT /products/{id} | {sku, barcode?, name, category?, description?, unit, lengthCm, widthCm, heightCm **[SỬA V3: bắt buộc]**} | Sản phẩm đã cập nhật | Admin hoặc chủ sở hữu |

### 2.3. Nhập kho (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| POST /inbound-receipts | {customerId? (chỉ Admin), expectedAt, vehiclePlate?, timeSlot? (MORNING\|AFTERNOON), note?, items: [{productId, expectedQuantity}]} | Phiếu nhập mới, trạng thái SCHEDULED, receiptCode tự sinh. **[SỬA V3]** Chặn: 403 CUSTOMER_PROFILE_REQUIRED, 422 OVERDUE_DEBT, 409 CAPACITY_EXCEEDED (usedM3 + reservedInboundM3 + phiếu mới > capacityM3), sản phẩm HIDDEN | Customer; Admin |
| PATCH /inbound-receipts/{id}/confirm | Không có, nếu tất cả số lượng thực tế đã được lưu | Phiếu CONFIRMED, kết quả cập nhật tồn kho; chưa có dòng inventory của (customer, product) thì tạo mới **[SỬA V3]** | Staff/Admin |
| PATCH /inbound-receipts/{id}/cancel | {reason?} | Phiếu CANCELLED; lý do (nếu có) nối vào `note` **[SỬA V3]**. Admin dùng endpoint này cho nút "Từ chối" | Customer chỉ khi SCHEDULED; Staff/Admin theo chính sách |

### 2.4. Xuất kho (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| POST /outbound-orders | {recipientName, recipientPhone, deliveryAddress, paymentMethod (VNPAY hoặc COD) **[SỬA V3: COD khi và chỉ khi codAmount > 0; VNPAY thì codAmount = 0 hoặc bỏ trống; sai → 400 VALIDATION_ERROR]**, carrier?, codAmount?, note? (tối đa 200 ký tự), items: [{productId, quantityRequested}]} | Đơn xuất mới, trạng thái PENDING, orderCode tự sinh. BE tạm giữ allocatedQuantity ngay khi tạo. **[SỬA V3]** Chặn: 403 CUSTOMER_PROFILE_REQUIRED, 422 OVERDUE_DEBT, 409 INSUFFICIENT_STOCK, sản phẩm HIDDEN | Customer |
| PATCH /outbound-orders/{id}/start-preparing **[SỬA V3]** | Không có | Đơn chuyển PREPARING; trừ tồn thực tế và tạm giữ (quantity -= số lượng, allocatedQuantity -= số lượng); gán `quantityActual = quantityRequested` cho mọi item để nhân viên chỉnh giảm | Staff/Admin |
| PATCH /outbound-orders/{id}/items/{itemId}/actual-quantity | {quantityActual, note?} | **[SỬA V3]** Điều kiện 0 ≤ quantityActual ≤ quantityRequested (sai → 400 INVALID_QUANTITY). Tồn đã trừ theo số yêu cầu nên BE hoàn phần chênh: `quantity += (actual trước đó − actual mới)`, actual trước đó mặc định = quantityRequested; nếu làm vi phạm ràng buộc tồn → 409 INSUFFICIENT_STOCK. Item đã cập nhật số lượng thực soạn. Nếu quantityActual < quantityRequested thì đánh dấu thiếu hàng (nút "Thiếu hàng") | Staff/Admin, chỉ khi PREPARING |
| PATCH /outbound-orders/{id}/mark-returned | {note?} | Đơn chuyển RETURNED (3PL hoàn hàng về kho); codStatus chuyển RETURNED nếu có COD; **[SỬA V3]** cộng lại tồn `quantity += quantityActual` cho mỗi item (giả định hàng nguyên vẹn) | Staff/Admin; chỉ từ IN_DELIVERY |
| PATCH /outbound-orders/{id}/cancel | {reason?} | Đơn CANCELLED; nhả tạm giữ; lý do (nếu có) nối vào `note`, cắt ≤ 200 ký tự **[SỬA V3]** | Customer khi PENDING; Staff/Admin cũng chỉ khi PENDING (từ chối đơn) **[SỬA V3: bỏ "theo chính sách" vì sang PREPARING tồn đã trừ]** |

Lỗi riêng: 404 ORDER_NOT_FOUND, 409 INVALID_ORDER_STATUS, 409 INSUFFICIENT_STOCK, 403 ORDER_ACCESS_DENIED; thêm **[MỚI V3]**: 400 INVALID_QUANTITY, 403 CUSTOMER_PROFILE_REQUIRED, 422 OVERDUE_DEBT.


### 2.5. Hóa đơn, thanh toán VNPay và đối soát COD (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /invoices | Query page, size, status?, customerId?, keyword? (mã hóa đơn/MST/tên khách), month? (yyyy-MM) | Danh sách: {id, invoiceCode, customerName, taxCode, description, periodStart, periodEnd, dueDate, amount, vatRate, vatAmount, totalAmount, status} | Admin **[SỬA V3: bỏ Staff, khớp README]** |
| POST /invoices/{id}/send-email | Không có | Gửi email hóa đơn tới billingEmail của khách (dùng chung cơ chế mục 2.7; bảng email_notifications không có cột invoice_id nên ghi mã hóa đơn vào subject/content, outbound_order_id để NULL **[SỬA V3]**) | Admin |

**Đối soát COD** (dữ liệu nằm trong bảng outbound_orders: codAmount, codStatus, codConfirmedBy, codConfirmedAt)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /cod/orders | Query page, size, codStatus?, carrier?, customerId?, keyword? (mã đơn/mã vận đơn) | Danh sách: {orderId, orderCode, trackingCode, carrier, customerName, recipientName, deliveryAddress, shippingStatus, codAmount, codStatus, offsetTotal, remainingAmount **[SỬA V3: tính từ tổng payments COD SUCCESS có transactionRef = COD-{orderCode}]**} (tab "Đối Soát & Xác Nhận COD") | Admin |
| POST /outbound-orders/{id}/cod/confirm **[SỬA V3: là endpoint DUY NHẤT xác nhận COD]** | {offsetInvoiceIds?: [Long]} | codStatus: COLLECTED → CONFIRMED, ghi codConfirmedBy/At. Nếu có offsetInvoiceIds thì tạo payment COD SUCCESS và chuyển các hóa đơn UNPAID/OVERDUE tương ứng sang PAID (cấn trừ phí kho). **[SỬA V3]** Trong một transaction (khóa dòng đơn và hóa đơn), BE kiểm tra theo thứ tự: (1) codStatus = COLLECTED, sai → 409 COD_INVALID_STATUS; (2) mỗi hóa đơn tồn tại, thuộc đúng khách của đơn, đang UNPAID/OVERDUE, chưa có payment SUCCESS, không trùng id; (3) tổng total_amount các hóa đơn ≤ codAmount, vượt → 422 COD_OFFSET_EXCEEDED. Hợp lệ thì với mỗi hóa đơn tạo payment COD SUCCESS (amount = total_amount, transactionRef = COD-{orderCode}, confirmedBy, paidAt) và chuyển hóa đơn PAID. Response: {orderId, codAmount, offsetTotal, remainingAmount, codStatus, paidInvoices: [{id, invoiceCode, totalAmount}]} | Admin |

Lỗi riêng: 404 INVOICE_NOT_FOUND, 409 INVOICE_ALREADY_PAID, 409 INVOICE_CANNOT_CANCEL, 409 PAYMENT_ALREADY_PROCESSED, 409 COD_INVALID_STATUS, 400 PAYMENT_SIGNATURE_INVALID, 400 PAYMENT_AMOUNT_MISMATCH; thêm **[MỚI V3]**: 422 COD_OFFSET_EXCEEDED.

Tác vụ định kỳ (không phải API): job chạy hằng ngày chuyển hóa đơn UNPAID quá `dueDate` sang OVERDUE. **[SỬA V3]** Đặt trong package `scheduler/` (cần @EnableScheduling, @Scheduled cron hằng ngày).


### 2.7. Gửi thông báo qua email (BE 2)

Gửi tự động: khi đơn xuất chuyển IN_DELIVERY (`mark-in-delivery`), BE tự tạo và gửi email cho email của khách (`billing_email` nếu có, ngược lại `users.email`) **[SỬA V3: bỏ fulfillmentEmail vì DB không có cột này]** (bước "UC12 Auto Mail"). Gửi thất bại thì ghi `status = FAILED` kèm `errorMessage`, không làm hỏng giao dịch chuyển trạng thái.


## 3. Danh sách mã lỗi chung để BE thống nhất

| **HTTP status** | **Error code** | **Ý nghĩa** |
| --- | --- | --- |
| 400 | INVALID_QUANTITY **[MỚI V3]** | Số lượng ngoài khoảng cho phép |
| 401 | INVALID_CREDENTIALS **[MỚI V3]** | Sai email/mật khẩu, hoặc tài khoản chỉ có Google |
| 403 | CUSTOMER_PROFILE_REQUIRED **[MỚI V3]** | Khách chưa có hồ sơ nên chưa dùng được nghiệp vụ kho |
| 409 | CUSTOMER_PROFILE_EXISTS **[MỚI V3]** | Tài khoản đã có hồ sơ khách hàng |
| 409 | CAPACITY_EXCEEDED **[MỚI V3]** | Vượt hạn mức dung tích thuê |
| 422 | OVERDUE_DEBT **[MỚI V3]** | Còn hóa đơn quá hạn, tạm chặn tạo phiếu/đơn mới |
| 422 | COD_OFFSET_EXCEEDED **[MỚI V3]** | Tổng hóa đơn cấn trừ lớn hơn tiền COD đã thu |
