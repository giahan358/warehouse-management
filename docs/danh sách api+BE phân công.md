| **Thành viên** | **Công việc** |
| --- | --- |
| BE 1 – Huy Kỳ | Mục 2.1, 2.2, 2.3 (bao gồm tích hợp đăng nhập tài khoản bằng email thật (nên tạo 1 tài khoản email riêng để phục vụ cho đồ án, k nên dùng email thật)) |
| BE 2 – Nhật Minh | Mục 2.4, 2.5, 2.6 (bao gồm tích hợp thanh toán vnpay)|

**1\. Quy ước hợp đồng API chung**

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

Với dự án có Google OAuth2, nhóm có thể cân nhắc session cookie để đơn giản hóa việc đăng nhập Google. Nếu chọn cách này, cần cấu hình CORS, cookie và CSRF đúng cách.

**Cấu trúc response thành công**
```text
{

"data": {

"id": 101,

"receiptCode": "IN-2026-001"

},

"message": "Tạo phiếu nhập thành công"

}

```


Danh sách có phân trang:

```text
{

"data": {

"content": \[\],

"page": 0,

"size": 10,

"totalElements": 25,

"totalPages": 3

},

"message": "Lấy danh sách thành công"

}
```

**Cấu trúc response lỗi**

```text
{

"error": {

"code": "INSUFFICIENT\_STOCK",

"message": "Số lượng tồn kho không đủ",

"details": null

}

}
```

**2.Bảng hợp đồng API: Endpoint, request, response, lỗi và quyền**

Các request/response dưới đây là hợp đồng đề xuất để FE và BE thống nhất. Những trường không liệt kê là trường tùy chọn hoặc cần chốt thêm trước khi code.

**2.1. Auth, tài khoản và khách hàng**

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| POST /auth/register | {fullName, email, password, phone?} | {userId, fullName, email, role} | Công khai; chỉ tạo Customer |
| POST /auth/login | {email, password} | {data: {id, fullName, email, role}}; session cookie qua header | Công khai |
| GET /auth/me | Không có | Thông tin người dùng hiện tại | Đã đăng nhập |
| POST /auth/logout | Không có | Thông báo đăng xuất | Đã đăng nhập |
| GET /users | Query page, size, keyword?, role?, status? | Danh sách tài khoản phân trang | Admin |
| GET /users/{id} | Path id | Thông tin tài khoản | Admin |
| POST /users | {fullName, email, phone?, role} | Tài khoản mới | Admin; chỉ tạo Staff theo MVP |
| PATCH /users/{id}/status | {status: "ACTIVE" \\\| "LOCKED"} | Trạng thái mới | Admin |
| GET /customers | Query phân trang, từ khóa | Danh sách khách hàng | Admin |
| POST /customers | {userId, businessName, phone, address} | Hồ sơ khách hàng | Admin |
| GET /customers/{id} | Path id | Hồ sơ khách hàng | Admin |
| PUT /customers/{id} | {businessName, phone, address} | Hồ sơ đã cập nhật | Admin |
| GET /customers/me | Không có | Hồ sơ cửa hàng hiện tại | Customer |
| PUT /customers/me | {businessName, phone, address} | Hồ sơ đã cập nhật | Customer |

Google OAuth2 sử dụng redirect/callback của Spring Security, ví dụ /oauth2/authorization/google; không cần tự viết API nhận mật khẩu Google. Sau khi đăng nhập Google, nhóm phải thống nhất cách chuyển về FE và cách duy trì session.

Lỗi thường gặp: 400 VALIDATION\_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 USER\_NOT\_FOUND, 409 EMAIL\_ALREADY\_EXISTS.

**2.2. Sản phẩm và tồn kho**

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /products | Query page, size, keyword?, customerId? | Danh sách sản phẩm theo quyền | Admin, Staff, Customer |
| POST /products | {sku, name, description?, unit} | Sản phẩm mới | Admin, Customer |
| GET /products/{id} | Path id | Chi tiết sản phẩm | Admin/Staff theo quyền; Customer chỉ sản phẩm của mình |
| PUT /products/{id} | {sku, name, description?, unit} | Sản phẩm đã cập nhật | Admin hoặc chủ sở hữu |
| DELETE /products/{id} | Path id | Thông báo ngừng sử dụng | Admin; chỉ khi không vi phạm ràng buộc nghiệp vụ |
| GET /inventory | Query phân trang, keyword?, customerId? | Danh sách tồn kho toàn hệ thống | Admin, Staff |
| GET /inventory/me | Query phân trang, keyword? | Tồn kho của Customer hiện tại | Customer |
| GET /inventory/{productId} | Path productId | {productId, productName, quantity, updatedAt} | Theo quyền sở hữu |

Lỗi riêng: 404 PRODUCT\_NOT\_FOUND, 403 PRODUCT\_ACCESS\_DENIED, 409 PRODUCT\_HAS\_TRANSACTIONS.

Không cung cấp API cho Customer tự sửa inventory.quantity. Số lượng chỉ thay đổi khi nghiệp vụ nhập/xuất được xác nhận hợp lệ.

**2.3. Nhập kho**

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /inbound-receipts | Query page, size, status?, from?, to? | Danh sách phiếu theo quyền | Admin, Staff, Customer |
| POST /inbound-receipts | {expectedAt, note?, items: \[{productId, expectedQuantity}\]} | Phiếu nhập mới, trạng thái SCHEDULED | Customer |
| GET /inbound-receipts/{id} | Path id | Phiếu và danh sách item | Theo quyền sở hữu hoặc Staff/Admin |
| PUT /inbound-receipts/{id} | {expectedAt, note} | Phiếu đã cập nhật | Chủ sở hữu, phiếu còn sửa được |
| POST /inbound-receipts/{id}/items | {productId, expectedQuantity} | Item mới | Chủ sở hữu, phiếu còn sửa được |
| PUT /inbound-receipts/{id}/items/{itemId} | {expectedQuantity} | Item đã cập nhật | Chủ sở hữu, phiếu còn sửa được |
| PATCH /inbound-receipts/{id}/items/{itemId}/actual-quantity | {actualQuantity, note?} | Item đã kiểm đếm | Staff/Admin |
| PATCH /inbound-receipts/{id}/start | Không có | Phiếu chuyển RECEIVING | Staff/Admin |
| PATCH /inbound-receipts/{id}/confirm | Không có, nếu tất cả số lượng thực tế đã được lưu | Phiếu CONFIRMED, kết quả cập nhật tồn kho | Staff/Admin |
| PATCH /inbound-receipts/{id}/cancel | {reason?} | Phiếu CANCELLED | Customer nếu còn được hủy; Staff/Admin theo chính sách |

Lỗi riêng: 404 RECEIPT\_NOT\_FOUND, 409 INVALID\_RECEIPT\_STATUS, 409 RECEIPT\_NOT\_FULLY\_COUNTED, 403 RECEIPT\_ACCESS\_DENIED.

Khi xác nhận, Backend phải kiểm tra tất cả item đã được kiểm đếm và chỉ cộng tồn một lần. Nên thực hiện cập nhật trạng thái phiếu và tồn kho trong cùng transaction.

**2.4. Xuất kho**

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /outbound-orders | Query page, size, status?, from?, to? | Danh sách đơn theo quyền | Admin, Staff, Customer |
| POST /outbound-orders | {recipientName, recipientPhone, deliveryAddress, paymentMethod, items: \[{productId, quantityRequested}\]} | Đơn xuất mới, trạng thái PENDING | Customer |
| GET /outbound-orders/{id} | Path id | Đơn xuất và danh sách item | Theo quyền sở hữu hoặc Staff/Admin |
| POST /outbound-orders/{id}/items | {productId, quantityRequested} | Item mới | Chủ sở hữu, đơn còn sửa được |
| PATCH /outbound-orders/{id}/approve | Không có | Đơn được chấp nhận | Staff/Admin |
| PATCH /outbound-orders/{id}/start-preparing | Không có | Đơn chuyển PREPARING | Staff/Admin |
| PATCH /outbound-orders/{id}/mark-in-delivery | Không có | Đơn chuyển IN\_DELIVERY | Staff/Admin |
| PATCH /outbound-orders/{id}/mark-delivered | Không có | Đơn chuyển DELIVERED | Staff/Admin |
| PATCH /outbound-orders/{id}/cancel | {reason?} | Đơn CANCELLED | Customer khi còn được hủy; Staff/Admin theo chính sách |

Lỗi riêng: 404 ORDER\_NOT\_FOUND, 409 INVALID\_ORDER\_STATUS, 409 INSUFFICIENT\_STOCK, 403 ORDER\_ACCESS\_DENIED.

Nhóm cần chốt rõ thời điểm trừ tồn kho. Đề xuất: kiểm tra và giữ/trừ tồn trong transaction khi đơn bắt đầu được chuẩn bị; nếu hủy sau khi đã trừ tồn thì phải hoàn tồn theo quy tắc rõ ràng. Không để hai đơn cùng xuất vượt tồn khả dụng.

**2.5. Hóa đơn và thanh toán**

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /invoices | Query page, size, status?, customerId? | Danh sách hóa đơn | Admin; Staff nếu được cấp quyền |
| POST /invoices | {customerId, outboundOrderId?, description, amount, totalAmount} | Hóa đơn mới, trạng thái UNPAID | Admin |
| GET /invoices/me | Query phân trang, status? | Hóa đơn của Customer hiện tại | Customer |
| GET /invoices/{id} | Path id | Chi tiết hóa đơn | Admin hoặc chủ hóa đơn |
| POST /invoices/{id}/payments/vnpay | Không nhận số tiền từ FE; Backend lấy số tiền hóa đơn | {paymentUrl, paymentId} | Chủ hóa đơn |
| GET /payments/vnpay/return | Query do VNPay trả về | Trang/kết quả chuyển hướng; không dùng làm bằng chứng duy nhất để xác nhận thanh toán | Callback theo cấu hình |
| POST /payments/vnpay/ipn | Payload/query theo tài liệu VNPay | Phản hồi IPN theo giao thức VNPay | VNPay gọi |
| POST /payments/{id}/cod/confirm | {} hoặc {transactionRef?} | Trạng thái thanh toán cập nhật | Staff/Admin có quyền |

Lỗi riêng: 404 INVOICE\_NOT\_FOUND, 409 INVOICE\_ALREADY\_PAID, 409 PAYMENT\_ALREADY\_PROCESSED, 400 PAYMENT\_SIGNATURE\_INVALID, 400 PAYMENT\_AMOUNT\_MISMATCH.

Với VNPay, Backend phải xác minh chữ ký, số tiền, mã giao dịch và xử lý callback lặp an toàn. Với COD, chỉ ghi nhận đã thanh toán sau khi thu tiền thực tế. Không để FE tự gọi API để đánh dấu hóa đơn đã trả tiền.

**2.6. Dashboard**

| **Method, endpoint** | **Request** | **Response chính** | **Quyền** |
| --- | --- | --- | --- |
| GET /dashboard/admin | Không có hoặc query khoảng thời gian | Số khách hàng, sản phẩm, phiếu nhập/xuất, hóa đơn | Admin |
| GET /dashboard/staff | Không có | Phiếu chờ tiếp nhận, đơn cần xử lý, công việc theo trạng thái | Staff |
| GET /dashboard/customer | Không có | Tồn kho, phiếu nhập, đơn xuất và hóa đơn của chính Customer | Customer |

Lỗi chung: 401 UNAUTHENTICATED, 403 FORBIDDEN, 500 INTERNAL\_ERROR.

**3\. Danh sách mã lỗi chung để BE thống nhất**

| **HTTP status** | **Error code** | **Ý nghĩa** |
| --- | --- | --- |
| 400 | VALIDATION\_ERROR | Request sai định dạng hoặc thiếu trường |
| 400 | INVALID\_REQUEST | Dữ liệu đầu vào không hợp lệ |
| 401 | UNAUTHENTICATED | Chưa đăng nhập hoặc session hết hạn |
| 403 | FORBIDDEN | Không có quyền thực hiện |
| 404 | RESOURCE\_NOT\_FOUND | Không tìm thấy dữ liệu |
| 409 | RESOURCE\_CONFLICT | Trùng dữ liệu hoặc sai trạng thái nghiệp vụ |
| 409 | INSUFFICIENT\_STOCK | Tồn kho không đủ |
| 422 | BUSINESS\_RULE\_VIOLATION | Vi phạm quy tắc nghiệp vụ |
| 500 | INTERNAL\_ERROR | Lỗi hệ thống |

Ngoài các mã chung, có thể dùng mã riêng đã liệt kê trong từng nhóm API. FE nên xử lý theo error.code, không phụ thuộc vào nội dung câu message.
