| **Thành viên** | **Công việc** |
| --- | --- |
| BE 1 – Huy Kỳ | Mục 2.1, 2.2, 2.3, 2.8 (bao gồm tích hợp đăng nhập tài khoản bằng email thật) |
| BE 2 – Tuấn Minh | Mục 2.4, 2.5, 2.6, 2.7 (bao gồm tích hợp thanh toán VNPay, gửi thông báo cho customer qua email) |

Lưu ý: nên tạo tài khoản email riêng để phục vụ cho đồ án, không nên dùng email thật.

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
| Xác thực | Chọn session cookie hoặc JWT, chỉ dùng một cơ chế nhất quán |
| Phân quyền | Backend kiểm tra vai trò, quyền sở hữu dữ liệu và trạng thái nghiệp vụ |
| Response | Thống nhất một cấu trúc JSON cho thành công và lỗi |
| API thay đổi trạng thái | Chỉ cho phép chuyển trạng thái hợp lệ; không nhận trạng thái tùy ý từ client |
| Tính toán phía server `[MỚI]` | Các giá trị dẫn xuất (tồn khả dụng, thể tích, tổng tiền, VAT, mã chứng từ) do Backend tính, FE không gửi lên |

Với dự án có Google OAuth2, nhóm có thể cân nhắc session cookie để đơn giản hóa việc đăng nhập Google. Nếu chọn cách này, cần cấu hình CORS, cookie và CSRF đúng cách.

## API Response:
1. Thành Công 
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "fullName": "John Smith"
  },
  "meta": null,
  "message": "Lấy thông tin thành công"
}   
``

Danh sách có phân trang:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Football Open Play",
      "status": "OPEN"
    },
    {
      "id": 2,
      "title": "Badminton Open Play",
      "status": "FULL"
    }
  ],
  "meta": {
    "page": 0,
    "size": 10,
    "totalElements": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  },
  "message": "Lấy thông tin thành công"
}
```
2. Thất bại
404 NOT FOUND

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Booking not found",
    "details": null
  }
}
```

400 BAD REQUEST

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email must be valid"
      },
      {
        "field": "password",
        "message": "Password must contain at least 8 characters"
      }
    ]
  }
}
```

### Enum dùng chung `[MỚI]`

| **Nhóm** | **Giá trị** |
| --- | --- |
| users.role | ADMIN, WAREHOUSE_STAFF, CUSTOMER |
| users.status | ACTIVE, LOCKED |
| servicePackage | STANDARD, PRO, ENTERPRISE |
| products.status | ACTIVE, HIDDEN |
| products.category | ELECTRONIC, COSMETIC, PHARMA, FASHION, PACKAGING, OTHER |
| stockStatus (tính ở BE) | SAFE (khả dụng > 100), LOW (≤ 100), OUT_OF_STOCK (= 0), NEAR_EXPIRY (HSD ≤ 20 ngày) |
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
| POST /auth/register | {fullName, email, password, phone?} | {userId, fullName, email, role, loginMethod} | Công khai; chỉ tạo Customer |
| POST /auth/login `[SỬA]` | {email, password} | {data: {id, fullName, email, role, loginMethod}}; session cookie qua header. Tài khoản LOCKED trả 403 ACCOUNT_LOCKED | Công khai |
| POST /auth/google `[MỚI]` | {idToken} | {data: {id, fullName, email, role, loginMethod: "GOOGLE"}}; session cookie | Công khai |
| GET /auth/me `[SỬA]` | Không có | {id, fullName, email, role, status, loginMethod, customerId?, customerCode?, businessName?} | Đã đăng nhập |
| POST /auth/logout | Không có | Thông báo đăng xuất | Đã đăng nhập |
| GET /users `[SỬA]` | Query page, size, keyword?, role?, status?, loginMethod? (GOOGLE\|EMAIL) | {id, fullName, email, phone, role, status, lockReason, loginMethod, organization} | Admin |
| GET /users/summary `[MỚI]` | Không có | {totalUsers, customerCount, staffCount, lockedCount} (4 thẻ thống kê màn Tài khoản) | Admin |
| GET /users/permission-matrix `[MỚI]` | Không có | Ma trận 6 nhóm chức năng × 3 vai trò (dữ liệu tĩnh trong BE, không có bảng DB) | Admin |
| GET /users/{id} | Path id | Thông tin tài khoản | Admin |
| POST /users | {fullName, email, phone?, role} | Tài khoản mới | Admin; chỉ tạo Staff theo MVP |
| PATCH /users/{id}/status `[SỬA]` | {status: "ACTIVE" \| "LOCKED", reason?} | {id, status, lockReason}. Khi LOCKED bắt buộc reason; không cho Admin tự khóa chính mình | Admin |
| GET /customers `[SỬA]` | Query page, size, keyword?, servicePackage?, feeStatus?, accountStatus? | {id, customerCode, businessName, taxCode, legalRepresentative, phone, address, servicePackage, capacityM3, skuCount, totalUnits, feeStatus, outstandingDebt, accountStatus, userId, loginMethod} | Admin |
| POST /customers `[SỬA]` | {userId, businessName, phone, address, taxCode?, legalRepresentative?, billingEmail?, servicePackage?, capacityM3?} | Hồ sơ khách hàng (customerCode tự sinh dạng CUST-VNxx) | Admin |
| GET /customers/{id} `[SỬA]` | Path id | Hồ sơ đầy đủ + {usedM3, accountStatus, outstandingDebt} | Admin |
| PUT /customers/{id} `[SỬA]` | {businessName, phone, address, taxCode?, legalRepresentative?, billingEmail?, servicePackage?, capacityM3?, bankName?, bankAccountNumber?, bankAccountHolder?} | Hồ sơ đã cập nhật | Admin |
| GET /customers/me `[SỬA]` | Không có | Hồ sơ + tài nguyên kho: {capacityM3, usedM3, reservedInboundM3, remainingM3, usedPercent} | Customer |
| PUT /customers/me `[SỬA]` | {businessName, phone, address, legalRepresentative?, billingEmail?, bankName?, bankAccountNumber?, bankAccountHolder?}. Không cho đổi taxCode, servicePackage, capacityM3 | Hồ sơ đã cập nhật | Customer |

Google OAuth2 sử dụng redirect/callback của Spring Security, ví dụ /oauth2/authorization/google; không cần tự viết API nhận mật khẩu Google. Sau khi đăng nhập Google, nhóm phải thống nhất cách chuyển về FE và cách duy trì session. Tài khoản LOCKED bị chặn ở cả đăng nhập email và Google.

Ghi chú tính toán `[MỚI]`:
- `usedM3` = tổng (inventory.quantity × products.volumeM3) của khách.
- `reservedInboundM3` = tổng (expectedQuantity × volumeM3) của các phiếu nhập đang SCHEDULED hoặc RECEIVING.
- `feeStatus`: OVERDUE nếu có hóa đơn OVERDUE, UNPAID nếu còn hóa đơn UNPAID, ngược lại PAID.

Lỗi thường gặp: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 403 ACCOUNT_LOCKED, 404 USER_NOT_FOUND, 409 EMAIL_ALREADY_EXISTS.

### 2.2. Sản phẩm và tồn kho (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /products `[SỬA]` | Query page, size, keyword? (SKU/tên/barcode), customerId?, category?, status?, stockStatus? | Danh sách: {id, sku, barcode, name, category, unit, lengthCm, widthCm, heightCm, volumeM3, status, onHand, allocated, available} | Admin, Staff, Customer (Customer tự lọc theo chính mình, bỏ qua customerId) |
| POST /products `[SỬA]` | {sku, barcode?, name, category?, description?, unit, lengthCm?, widthCm?, heightCm?}. volumeM3 do BE tính = D×R×C/1.000.000 | Sản phẩm mới | Admin, Customer. Admin phải truyền thêm customerId |
| GET /products/{id} | Path id | Chi tiết sản phẩm | Admin/Staff theo quyền; Customer chỉ sản phẩm của mình |
| PUT /products/{id} `[SỬA]` | {sku, barcode?, name, category?, description?, unit, lengthCm?, widthCm?, heightCm?} | Sản phẩm đã cập nhật | Admin hoặc chủ sở hữu |
| PATCH /products/{id}/status `[MỚI]` | {status: "ACTIVE" \| "HIDDEN"} | Sản phẩm với trạng thái mới (nút ẩn/hiện ở Danh mục sản phẩm) | Admin hoặc chủ sở hữu |
| DELETE /products/{id} | Path id | Thông báo ngừng sử dụng | Admin; chỉ khi không vi phạm ràng buộc nghiệp vụ |
| GET /inventory `[SỬA]` | Query page, size, keyword? (SKU/tên/barcode/vị trí), customerId?, stockStatus?, zone? (A\|B\|C...) | Danh sách: {inventoryId, customerId, customerName, productId, sku, productName, category, unit, locationCode, zone, onHand, allocated, available, stockStatus, expiryDate, lastInboundAt, updatedAt} | Admin, Staff |
| GET /inventory/summary `[MỚI]` | Query customerId? | Số lượng theo trạng thái: {total, safe, low, outOfStock, nearExpiry} (các tab lọc ở màn Tồn kho toàn diện) | Admin, Staff |
| GET /inventory/me `[SỬA]` | Query phân trang, keyword?, stockStatus? | Tồn kho của Customer hiện tại, cùng cấu trúc /inventory (không có customerName) | Customer |
| GET /inventory/me/summary `[MỚI]` | Không có | {totalOnHand, totalAvailable, totalAllocated, skuCount, usedM3, capacityM3} (thẻ trên Tổng quan & Tồn kho) | Customer |
| GET /inventory/{productId} | Path productId | {productId, productName, quantity, allocated, available, locationCode, updatedAt} | Theo quyền sở hữu |
| PATCH /inventory/{id}/location `[MỚI]` | {locationCode} (ví dụ ZA-R04-S02-B12) | Vị trí kệ mới. Chỉ đổi vị trí, tuyệt đối không đổi quantity | Staff, Admin |

Lỗi riêng: 404 PRODUCT_NOT_FOUND, 403 PRODUCT_ACCESS_DENIED, 409 PRODUCT_HAS_TRANSACTIONS.

Không cung cấp API cho bất kỳ ai tự sửa inventory.quantity. Số lượng chỉ thay đổi khi nghiệp vụ nhập/xuất được xác nhận hợp lệ.

Ghi chú tính toán `[MỚI]`:
- `available` = quantity − allocatedQuantity.
- `zone` lấy từ ký tự thứ 2 của locationCode (ZA… = zone A).
- `lastInboundAt` lấy từ phiếu nhập CONFIRMED gần nhất có chứa sản phẩm.
- Khách (Customer) không bao giờ thấy sản phẩm của khách khác: BE luôn ép customerId theo user đăng nhập.

### 2.3. Nhập kho (BE 1)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /inbound-receipts `[SỬA]` | Query page, size, status?, from?, to?, customerId?, keyword?, dockCode?, timeSlot? | {id, receiptCode, customerName, status, vehiclePlate, dockCode, timeSlot, expectedAt, receivedAt, declaredTotal, actualTotal, damagedTotal, variance} | Admin, Staff, Customer |
| GET /inbound-receipts/status-counts `[MỚI]` | Query from?, to? | {all, scheduled, receiving, confirmed, cancelled} (các tab Tất cả / Chờ xe đến / Đang tại dock...) | Admin, Staff, Customer |
| POST /inbound-receipts `[SỬA]` | {customerId? (chỉ Admin), expectedAt, vehiclePlate?, timeSlot? (MORNING\|AFTERNOON), note?, items: [{productId, expectedQuantity}]} | Phiếu nhập mới, trạng thái SCHEDULED, receiptCode tự sinh | Customer; Admin |
| GET /inbound-receipts/{id} `[SỬA]` | Path id | Phiếu + items: {itemId, productId, sku, productName, unit, expectedQuantity, actualQuantity, damagedQuantity, locationCode, note, variance} | Theo quyền sở hữu hoặc Staff/Admin |
| PUT /inbound-receipts/{id} `[SỬA]` | {expectedAt, vehiclePlate?, timeSlot?, note?} | Phiếu đã cập nhật | Chủ sở hữu, chỉ khi SCHEDULED |
| POST /inbound-receipts/{id}/items | {productId, expectedQuantity} | Item mới | Chủ sở hữu, chỉ khi SCHEDULED |
| PUT /inbound-receipts/{id}/items/{itemId} | {expectedQuantity} | Item đã cập nhật | Chủ sở hữu, chỉ khi SCHEDULED |
| DELETE /inbound-receipts/{id}/items/{itemId} `[MỚI]` | Path id, itemId | Thông báo đã xóa item (nút thùng rác ở form đăng ký) | Chủ sở hữu, chỉ khi SCHEDULED; phiếu phải còn ít nhất 1 item |
| PATCH /inbound-receipts/{id}/items/{itemId}/actual-quantity `[SỬA]` | {actualQuantity, damagedQuantity?, locationCode?, note?} | Item đã kiểm đếm | Staff/Admin, chỉ khi RECEIVING |
| PUT /inbound-receipts/{id}/counting `[MỚI]` | {items: [{itemId, actualQuantity, damagedQuantity?, locationCode?, note?}]} | Lưu tạm toàn bộ kết quả kiểm đếm trong một lần (nút "Lưu tạm") | Staff/Admin, chỉ khi RECEIVING |
| POST /inbound-receipts/{id}/scan `[MỚI]` | {barcode, quantity (mặc định 1)} | Cộng dồn actualQuantity cho item khớp barcode, trả về item đã cập nhật (ô quét barcode, nút +1 / +10) | Staff/Admin, chỉ khi RECEIVING |
| PATCH /inbound-receipts/{id}/start `[SỬA]` | {dockCode?} | Phiếu chuyển RECEIVING, lưu dockCode | Staff/Admin; chỉ từ SCHEDULED |
| PATCH /inbound-receipts/{id}/confirm | Không có, nếu tất cả số lượng thực tế đã được lưu | Phiếu CONFIRMED, kết quả cập nhật tồn kho | Staff/Admin |
| PATCH /inbound-receipts/{id}/cancel `[SỬA]` | {reason?} | Phiếu CANCELLED. Admin dùng endpoint này cho nút "Từ chối" | Customer chỉ khi SCHEDULED; Staff/Admin theo chính sách |
| GET /inbound-receipts/{id}/discrepancy-report `[MỚI]` | Path id | Biên bản chênh lệch: các item có variance ≠ 0 hoặc damagedQuantity > 0, tổng thiếu/hỏng (nút "Biên bản") | Theo quyền sở hữu hoặc Staff/Admin |

Lỗi riêng: 404 RECEIPT_NOT_FOUND, 409 INVALID_RECEIPT_STATUS, 409 RECEIPT_NOT_FULLY_COUNTED, 403 RECEIPT_ACCESS_DENIED.

Khi xác nhận, Backend phải kiểm tra tất cả item đã được kiểm đếm và chỉ cộng tồn một lần (gọi lại trả 409 INVALID_RECEIPT_STATUS). Cập nhật trạng thái phiếu và tồn kho trong cùng transaction.

Quy tắc số lượng `[MỚI]`: khi confirm, `inventory.quantity += actualQuantity` (hàng đạt). `damagedQuantity` chỉ lưu để lập biên bản, không cộng vào tồn. Đồng thời set `receivedAt = now`, `confirmedBy = user hiện tại`, và gán `inventory.locationCode` theo locationCode của item nếu có.

Quy tắc Khách hàng: sửa/hủy phiếu chỉ khi SCHEDULED. Từ RECEIVING trở đi trả 409 INVALID_RECEIPT_STATUS.

### 2.4. Xuất kho (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /outbound-orders `[SỬA]` | Query page, size, status?, from?, to?, customerId?, carrier?, keyword? (mã đơn/SĐT/người nhận/mã vận đơn) | Danh sách: {id, orderCode, customerName, recipientName, recipientPhone, deliveryAddress, carrier, trackingCode, status, paymentMethod, codAmount, codStatus, itemCount, totalQuantity, createdAt} | Admin, Staff, Customer (Customer chỉ đơn của mình) |
| GET /outbound-orders/status-counts `[MỚI]` | Query from?, to? | {pending, preparing, packed, inDelivery, delivered, returned, cancelled} (4 thẻ bước 1-4 màn Chuẩn bị & Xuất kho) | Admin, Staff, Customer |
| POST /outbound-orders `[SỬA]` | {recipientName, recipientPhone, deliveryAddress, paymentMethod, carrier?, codAmount?, note? (tối đa 200 ký tự), items: [{productId, quantityRequested}]} | Đơn xuất mới, trạng thái PENDING, orderCode tự sinh. BE tạm giữ allocatedQuantity ngay khi tạo | Customer |
| GET /outbound-orders/{id} `[SỬA]` | Path id | Đơn + items: {itemId, productId, sku, productName, unit, quantityRequested, quantityActual, unitPrice} | Theo quyền sở hữu hoặc Staff/Admin |
| POST /outbound-orders/{id}/items | {productId, quantityRequested} | Item mới (tạm giữ thêm tồn) | Chủ sở hữu, chỉ khi PENDING |
| PATCH /outbound-orders/{id}/approve | Không có | Đơn được chấp nhận | Staff/Admin |
| PATCH /outbound-orders/{id}/start-preparing | Không có | Đơn chuyển PREPARING; trừ tồn thực tế và tạm giữ | Staff/Admin |
| PATCH /outbound-orders/{id}/items/{itemId}/actual-quantity `[MỚI]` | {quantityActual, note?} | Item đã cập nhật số lượng thực soạn. Nếu quantityActual < quantityRequested thì đánh dấu thiếu hàng (nút "Thiếu hàng") | Staff/Admin, chỉ khi PREPARING |
| PATCH /outbound-orders/{id}/mark-packed `[MỚI]` | Không có | Đơn chuyển PACKED (nút "Xác nhận đóng gói") | Staff/Admin; chỉ từ PREPARING |
| PATCH /outbound-orders/{id}/tracking `[MỚI]` | {carrier, trackingCode} | Cập nhật đơn vị vận chuyển và mã vận đơn | Staff/Admin |
| PATCH /outbound-orders/{id}/mark-in-delivery | Không có | Đơn chuyển IN_DELIVERY (bàn giao xe 3PL); kích hoạt gửi email thông báo | Staff/Admin; chỉ từ PACKED |
| PATCH /outbound-orders/{id}/mark-delivered | Không có | Đơn chuyển DELIVERED | Staff/Admin |
| PATCH /outbound-orders/{id}/mark-returned `[MỚI]` | {note?} | Đơn chuyển RETURNED (3PL hoàn hàng về kho); codStatus chuyển RETURNED nếu có COD | Staff/Admin; chỉ từ IN_DELIVERY |
| PATCH /outbound-orders/{id}/cancel | {reason?} | Đơn CANCELLED; nhả tạm giữ | Customer khi PENDING; Staff/Admin theo chính sách |
| GET /outbound-orders/{id}/handover-report `[MỚI]` | Path id | Biên bản bàn giao 3PL: danh sách item, số lượng thực tế, chữ ký (nếu có) | Staff/Admin |

Lỗi riêng: 404 ORDER_NOT_FOUND, 409 INVALID_ORDER_STATUS, 409 INSUFFICIENT_STOCK, 403 ORDER_ACCESS_DENIED.

Chuỗi trạng thái hợp lệ `[MỚI]`: PENDING → PREPARING → PACKED → IN_DELIVERY → DELIVERED hoặc RETURNED. CANCELLED chỉ từ PENDING. Mọi chuyển trạng thái khác trả 409 INVALID_ORDER_STATUS.

Quy tắc tồn kho (chốt theo SQL gọn) `[MỚI]`:
- Tạo đơn (PENDING): kiểm tra `quantity − allocatedQuantity ≥ quantityRequested`, nếu thiếu trả 409 INSUFFICIENT_STOCK; sau đó `allocatedQuantity += quantityRequested`.
- start-preparing: `quantity -= số lượng`, `allocatedQuantity -= số lượng`.
- Hủy khi PENDING: `allocatedQuantity -= số lượng`.
- Dùng khóa dòng (`SELECT ... FOR UPDATE` hoặc `@Lock(PESSIMISTIC_WRITE)`) trên bảng inventory để hai đơn không cùng vượt tồn khả dụng.

Với đơn có COD: khi `mark-in-delivery`, BE đặt `codStatus = PENDING_RECONCILE` nếu `codAmount > 0`, ngược lại giữ `NONE`.

### 2.5. Hóa đơn, thanh toán VNPay và đối soát COD (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /invoices `[SỬA]` | Query page, size, status?, customerId?, keyword? (mã hóa đơn/MST/tên khách), month? (yyyy-MM) | Danh sách: {id, invoiceCode, customerName, taxCode, description, periodStart, periodEnd, dueDate, amount, vatRate, vatAmount, totalAmount, status} | Admin; Staff nếu được cấp quyền |
| GET /invoices/summary `[MỚI]` | Query month? | {totalInvoices, totalUnpaid, totalOverdue, totalPaidAmount, totalUnpaidAmount} | Admin |
| POST /invoices `[SỬA]` | {customerId, outboundOrderId?, description, periodStart?, periodEnd?, dueDate?, vatRate (mặc định 0), items: [{description, quantity, unit, unitPrice}]}. BE tự tính lineAmount, amount, vatAmount, totalAmount, invoiceCode | Hóa đơn mới, trạng thái UNPAID, kèm items | Admin |
| GET /invoices/me `[SỬA]` | Query phân trang, status?, keyword? | Hóa đơn của Customer hiện tại (lịch sử các kỳ) | Customer |
| GET /invoices/me/current `[MỚI]` | Không có | Hóa đơn UNPAID/OVERDUE gần hạn nhất: {invoice, daysLeft, amountDue} (thẻ "Cần thanh toán kỳ này") | Customer |
| GET /invoices/{id} `[SỬA]` | Path id | Chi tiết hóa đơn: {…, items: [{description, quantity, unit, unitPrice, lineAmount}], payments: [{id, paymentMethod, status, amount, vnpTransactionNo, vnpBankCode, paidAt}]} | Admin hoặc chủ hóa đơn |
| PATCH /invoices/{id}/cancel `[MỚI]` | {reason?} | Hóa đơn CANCELLED | Admin; chỉ khi UNPAID/OVERDUE và chưa có payment SUCCESS |
| POST /invoices/{id}/send-email `[MỚI]` | Không có | Gửi email hóa đơn tới billingEmail của khách (dùng chung cơ chế mục 2.7) | Admin |
| POST /invoices/{id}/payments/vnpay | Không nhận số tiền từ FE; Backend lấy số tiền hóa đơn | {paymentUrl, paymentId} | Chủ hóa đơn |
| GET /payments/vnpay/return | Query do VNPay trả về | Trang/kết quả chuyển hướng; không dùng làm bằng chứng duy nhất để xác nhận thanh toán | Callback theo cấu hình |
| POST /payments/vnpay/ipn | Payload/query theo tài liệu VNPay | Phản hồi IPN theo giao thức VNPay | VNPay gọi |
| POST /payments/vnpay/ipn/mock `[MỚI]` | {txnRef, responseCode ("00" \| "24"...), amount} | Mô phỏng một cuộc gọi IPN hợp lệ để demo (nút "Gửi Test Ping Giả Lập IPN") | Admin; chỉ bật ở môi trường Development |
| GET /payments `[MỚI]` | Query page, size, method?, status?, invoiceId?, from?, to? | Danh sách giao dịch: {id, invoiceCode, paymentMethod, amount, status, vnpTxnRef, vnpTransactionNo, vnpBankCode, vnpResponseCode, paidAt} (bảng giám sát IPN & lịch sử giao dịch) | Admin |
| GET /payments/{id} `[MỚI]` | Path id | Chi tiết một giao dịch | Admin hoặc chủ hóa đơn |
| POST /payments/{id}/cod/confirm `[SỬA]` | {} hoặc {transactionRef?} | Trạng thái thanh toán cập nhật, hóa đơn chuyển PAID | **Chỉ Admin** (Staff không có quyền xử lý dòng tiền) |

**Đối soát COD `[MỚI]`** (dữ liệu nằm trong bảng outbound_orders: codAmount, codStatus, codConfirmedBy, codConfirmedAt)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /cod/orders | Query page, size, codStatus?, carrier?, customerId?, keyword? (mã đơn/mã vận đơn) | Danh sách: {orderId, orderCode, trackingCode, carrier, customerName, recipientName, deliveryAddress, shippingStatus, codAmount, codStatus} (tab "Đối Soát & Xác Nhận COD") | Admin |
| GET /cod/orders/summary | Không có | {pendingCount, pendingAmount, collectedAmount, confirmedAmount, returnedAmount} | Admin |
| PATCH /outbound-orders/{id}/cod/status | {codStatus: "COLLECTED" \| "RETURNED"} | Cập nhật theo sao kê 3PL (thủ công trong MVP). COLLECTED chỉ khi đơn DELIVERED; RETURNED chỉ khi đơn RETURNED | Admin |
| POST /outbound-orders/{id}/cod/confirm | {offsetInvoiceIds?: [Long]} | codStatus: COLLECTED → CONFIRMED, ghi codConfirmedBy/At. Nếu có offsetInvoiceIds thì tạo payment COD SUCCESS và chuyển các hóa đơn UNPAID/OVERDUE tương ứng sang PAID (cấn trừ phí kho) | Admin |
| GET /cod/me | Query phân trang, codStatus? | Danh sách đơn COD của chính Customer và trạng thái đối soát (chỉ xem) | Customer |

Lỗi riêng: 404 INVOICE_NOT_FOUND, 409 INVOICE_ALREADY_PAID, 409 INVOICE_CANNOT_CANCEL, 409 PAYMENT_ALREADY_PROCESSED, 409 COD_INVALID_STATUS, 400 PAYMENT_SIGNATURE_INVALID, 400 PAYMENT_AMOUNT_MISMATCH.

Với VNPay, Backend phải xác minh chữ ký (HMAC SHA512), số tiền, mã giao dịch và xử lý callback lặp an toàn. Mỗi lần thanh toán sinh một `vnpTxnRef` duy nhất. IPN thành công (`vnp_ResponseCode = 00`) thì payment SUCCESS và hóa đơn PAID; mã khác (ví dụ 24 = khách hủy) thì payment FAILED, hóa đơn giữ nguyên.

Với COD, chỉ ghi nhận đã thanh toán sau khi thu tiền thực tế và do Admin xác nhận. Không để FE tự gọi API để đánh dấu hóa đơn đã trả tiền.

Tác vụ định kỳ `[MỚI]` (không phải API): job chạy hằng ngày chuyển hóa đơn UNPAID quá `dueDate` sang OVERDUE.

### 2.6. Dashboard (BE 2)

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /dashboard/admin `[SỬA]` | Không có hoặc query khoảng thời gian | {capacityM3, usedM3, usedPercent, activeCustomers, lockedCustomers, asnToday, receivingCount, activeOutboundOrders, codPendingAmount, serviceFeeThisMonth, unpaidInvoices, totalProducts} | Admin |
| GET /dashboard/admin/flow `[MỚI]` | Query from, to, granularity = day \| week | Chuỗi thời gian nhập/xuất: [{date, inboundQuantity, outboundQuantity}] (biểu đồ 30 ngày) | Admin |
| GET /dashboard/admin/tenant-usage `[MỚI]` | Không có | Top khách theo thể tích chiếm dụng: [{customerId, businessName, usedM3, capacityM3, quotaPercent, estimatedMonthlyFee}] | Admin |
| GET /dashboard/admin/zone-usage `[MỚI]` | Không có | Mức lấp đầy theo zone: [{zone, usedM3, capacityM3, usedPercent}]. Zone suy ra từ locationCode, sức chứa lấy từ file cấu hình (không có bảng zone) | Admin |
| GET /dashboard/staff `[SỬA]` | Không có | {receivingScheduledToday, openCountingReceipts, outboundToPrepare, outboundPacked, discrepancyReports, shiftName?} | Staff |
| GET /dashboard/staff/tasks `[MỚI]` | Query page, size | Hàng đợi tác vụ ưu tiên, BE suy ra từ phiếu nhập/đơn xuất theo trạng thái: [{taskType (RECEIVE_TRUCK\|COUNT\|PICK_PACK\|HANDOVER_3PL), refType, refId, refCode, customerName, locationOrDock, dueAt?, status}] | Staff |
| GET /dashboard/customer `[SỬA]` | Không có | {usedM3, capacityM3, usedPercent, totalOnHand, totalAvailable, totalAllocated, skuCount, activeInboundCount, provisionalFeeThisPeriod, unpaidInvoiceCount} | Customer |
| GET /dashboard/customer/operations `[MỚI]` | Query page, size | Phiếu vận hành gần nhất gộp phiếu nhập và đơn xuất: [{type (INBOUND\|OUTBOUND), code, createdAt, itemCount, totalQuantity, status, cancellable}] (bảng "Danh mục & Top SKU / phiếu vận hành") | Customer |

Lỗi chung: 401 UNAUTHENTICATED, 403 FORBIDDEN, 500 INTERNAL_ERROR.

### 2.7. Gửi thông báo qua email (BE 2)

**Prefix URL:** `/api/v1/email-notifications`

| Method | Endpoint | Chức năng | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `POST` | `/outbound-orders/{id}/send` | Gửi thông báo đơn xuất kho | Kích hoạt gửi email thông báo chi tiết cho một đơn xuất kho xác định theo `{id}`. |
| `GET` | `/` `[SỬA]` | Xem lịch sử gửi email | Trả về danh sách email đã gửi, hỗ trợ phân trang và bộ lọc `status?`, `customerId?`, `outboundOrderId?`. Admin xem tất cả; Customer chỉ xem email của mình. |
| `GET` | `/{id}` | Xem chi tiết email | Lấy thông tin chi tiết của một email theo `{id}` (trạng thái gửi, người nhận, thời gian, nội dung,...). |
| `POST` | `/test` | Gửi email thử nghiệm | Chỉ dành cho Admin hoặc môi trường Development/Staging. |

Gửi tự động `[MỚI]`: khi đơn xuất chuyển IN_DELIVERY (`mark-in-delivery`), BE tự tạo và gửi email cho `fulfillmentEmail`/email của khách (bước "UC12 Auto Mail"). Gửi thất bại thì ghi `status = FAILED` kèm `errorMessage`, không làm hỏng giao dịch chuyển trạng thái.

### 2.8. Danh mục dùng chung `[MỚI]`

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /meta/options | Không có | {carriers, categories, servicePackages, units, orderStatuses, receiptStatuses, timeSlots, codStatuses, invoiceStatuses, loginMethods} | Đã đăng nhập |

---

## 3. Danh sách mã lỗi chung để BE thống nhất

| **HTTP status** | **Error code** | **Ý nghĩa** |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Request sai định dạng hoặc thiếu trường |
| 400 | INVALID_REQUEST | Dữ liệu đầu vào không hợp lệ |
| 401 | UNAUTHENTICATED | Chưa đăng nhập hoặc session hết hạn |
| 403 | FORBIDDEN | Không có quyền thực hiện |
| 403 | ACCOUNT_LOCKED `[MỚI]` | Tài khoản bị khóa, không được đăng nhập |
| 404 | RESOURCE_NOT_FOUND | Không tìm thấy dữ liệu |
| 409 | RESOURCE_CONFLICT | Trùng dữ liệu hoặc sai trạng thái nghiệp vụ |
| 409 | INSUFFICIENT_STOCK | Tồn kho không đủ |
| 422 | BUSINESS_RULE_VIOLATION | Vi phạm quy tắc nghiệp vụ |
| 500 | INTERNAL_ERROR | Lỗi hệ thống |

Ngoài các mã chung, có thể dùng mã riêng đã liệt kê trong từng nhóm API. FE nên xử lý theo error.code, không phụ thuộc vào nội dung câu message.

---

