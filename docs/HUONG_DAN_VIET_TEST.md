# Hướng dẫn viết test

Tài liệu này dành cho cả nhóm. Mục tiêu: có một bộ test **nhỏ nhưng đúng chỗ**, viết nhanh, chạy được bằng một lệnh. Đặt file này ở `docs/HUONG_DAN_VIET_TEST.md`.

> Tên thư mục (`backend/`, `frontend/`), tên package và tên class bên dưới chỉ là minh họa. Nhóm đổi cho khớp với source thật.

---

## 1. Công nghệ

| Phía | Công nghệ | Ghi chú |
| --- | --- | --- |
| BE | JUnit 5 + Mockito + AssertJ | Có sẵn trong `spring-boot-starter-test` |
| BE | MockMvc + `spring-security-test` | Chỉ để test phân quyền (401/403) |
| BE (tùy chọn) | Testcontainers MySQL | Cần Docker; chỉ làm nếu còn thời gian |
| FE | Vitest + React Testing Library + jsdom | Chạy cùng Vite |
| FE | `@testing-library/user-event` | Giả lập thao tác người dùng |

Không dùng: JaCoCo, Playwright/E2E, Selenium, Cucumber.

---

## 2. Viết test ở đâu

### Backend (Maven)

Test nằm trong `src/test/java`, **cùng package** với class được test, tên class thêm hậu tố `Test`.

```text
backend/
├── src/
│   ├── main/java/com/example/warehouse/
│   │   ├── service/OutboundOrderService.java
│   │   ├── service/InboundReceiptService.java
│   │   ├── service/CodService.java
│   │   ├── config/FeeProperties.java
│   │   └── domain/OutboundStatus.java
│   └── test/java/com/example/warehouse/
│       ├── domain/OutboundStatusTest.java          ← hàm thuần
│       ├── config/FeePropertiesTest.java
│       ├── service/OutboundOrderServiceTest.java   ← Mockito
│       ├── service/InboundReceiptServiceTest.java
│       ├── service/CodServiceTest.java
│       └── security/AuthorizationTest.java         ← MockMvc
└── pom.xml
```

Quy tắc: `OutboundOrderService` → test ở `OutboundOrderServiceTest`, cùng đường dẫn package trong `src/test/java`.

### Frontend (Vitest)

Đặt file test **cạnh file được test** (dễ tìm, dễ xóa cùng nhau), đuôi `.test.ts` hoặc `.test.tsx`. File cấu hình chung để trong `src/test/`.

```text
frontend/
├── src/
│   ├── test/
│   │   └── setup.ts                       ← cấu hình chung (matchMedia...)
│   ├── utils/
│   │   ├── errorMessage.ts
│   │   └── errorMessage.test.ts           ← hàm thuần
│   ├── routes/
│   │   ├── ProtectedRoute.tsx
│   │   └── ProtectedRoute.test.tsx        ← guard theo role
│   └── pages/outbound/
│       ├── CreateOutboundForm.tsx
│       └── CreateOutboundForm.test.tsx    ← validate COD
├── vite.config.ts
└── package.json
```

---

## 3. Backend

### 3.1. Cài đặt

`pom.xml` (không cần khai báo version, Spring Boot quản lý):

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.springframework.security</groupId>
  <artifactId>spring-security-test</artifactId>
  <scope>test</scope>
</dependency>
```

Lệnh chạy:

```bash
mvn test                                  # chạy tất cả
mvn -Dtest=OutboundOrderServiceTest test  # chạy một class
```

### 3.2. Loại 1: test hàm thuần (làm trước, nhanh nhất)

Không mock, không Spring. Phù hợp cho: chuỗi trạng thái, VAT/tổng hóa đơn, thể tích, `stockStatus`, `remainingAmount`.

Gợi ý: tách chuỗi chuyển trạng thái ra enum hoặc class riêng thay vì viết `if` rải rác trong service.

```java
class OutboundStatusTest {

  @ParameterizedTest
  @CsvSource({
    "PENDING,PREPARING", "PREPARING,PACKED", "PACKED,IN_DELIVERY",
    "IN_DELIVERY,DELIVERED", "IN_DELIVERY,RETURNED", "PENDING,CANCELLED"
  })
  void chuyen_hop_le(OutboundStatus from, OutboundStatus to) {
    assertThat(from.canMoveTo(to)).isTrue();
  }

  @ParameterizedTest
  @CsvSource({ "PREPARING,CANCELLED", "PACKED,CANCELLED", "DELIVERED,RETURNED", "PENDING,PACKED" })
  void chuyen_sai(OutboundStatus from, OutboundStatus to) {
    assertThat(from.canMoveTo(to)).isFalse();
  }
}
```

```java
class FeePropertiesTest {
  @Test
  void loai_hang_khong_co_gia_rieng_thi_dung_gia_mac_dinh() {
    FeeProperties fee = new FeeProperties();   // POJO, không cần Spring
    assertThat(fee.outboundPriceFor("OTHER")).isEqualByComparingTo("5000");
    assertThat(fee.outboundPriceFor(null)).isEqualByComparingTo("5000");
  }
}
```

### 3.3. Loại 2: test service bằng Mockito

Mock repository, kiểm tra **con số** và **việc có/không gọi** một thao tác. Dùng `isEqualByComparingTo` khi so sánh `BigDecimal`.

```java
@ExtendWith(MockitoExtension.class)
class OutboundOrderServiceTest {

  @Mock OutboundOrderRepository orders;
  @Mock InventoryRepository inventories;
  @InjectMocks OutboundOrderService service;

  @Test
  void start_preparing_tru_ton_va_nha_tam_giu() {
    Inventory inv = inventory(/*quantity*/ 100, /*allocated*/ 10);
    OutboundOrder order = orderPending(item(inv.getProduct(), 10));
    when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
    when(inventories.findByCustomerAndProductForUpdate(any(), any())).thenReturn(Optional.of(inv));

    service.startPreparing(1L);

    assertThat(inv.getQuantity()).isEqualByComparingTo("90");
    assertThat(inv.getAllocatedQuantity()).isEqualByComparingTo("0");
    assertThat(order.getStatus()).isEqualTo(OutboundStatus.PREPARING);
  }

  @Test
  void tao_don_vuot_ton_kha_dung_bi_409() {
    Inventory inv = inventory(100, 95);        // khả dụng = 5
    // ... mock repository trả về inv
    assertThatThrownBy(() -> service.create(requestVoiSoLuong(10)))
        .hasMessageContaining("INSUFFICIENT_STOCK");
  }
}
```

Nhập kho (xác nhận hai lần chỉ cộng tồn một lần):

```java
@Test
void confirm_lan_hai_bi_chan_va_khong_dung_toi_ton() {
  when(receipts.findByIdForUpdate(1L)).thenReturn(Optional.of(receipt(ReceiptStatus.CONFIRMED)));

  assertThatThrownBy(() -> service.confirm(1L, 2L))
      .hasMessageContaining("INVALID_RECEIPT_STATUS");
  verifyNoInteractions(inventories);
}
```

### 3.4. Loại 3: test phân quyền bằng MockMvc (một vài test là đủ)

```java
@WebMvcTest(DashboardController.class)
class AuthorizationTest {

  @Autowired MockMvc mvc;
  @MockBean DashboardService dashboardService;  // Spring Boot 3.4+: dùng @MockitoBean

  @Test
  void chua_dang_nhap_bi_401() throws Exception {
    mvc.perform(get("/api/v1/dashboard/admin")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "CUSTOMER")
  void customer_goi_api_admin_bi_403() throws Exception {
    mvc.perform(get("/api/v1/dashboard/admin")).andExpect(status().isForbidden());
  }
}
```

Nếu `@WebMvcTest` không nạp đúng cấu hình bảo mật của dự án, import thêm class `SecurityConfig` bằng `@Import`. Ngoài ra, test **ở tầng service** việc "khách A không đọc được dữ liệu khách B" (gọi service bằng customer A với id của B, mong đợi `*_ACCESS_DENIED`). Làm cho từng module: sản phẩm, phiếu nhập, đơn xuất, hóa đơn.

### 3.5. Checklist test backend

| Ưu tiên | Test | Loại |
| --- | --- | --- |
| 1 | Chuyển trạng thái đơn xuất/phiếu nhập hợp lệ và sai → 409 | Thuần |
| 1 | Tính VAT, tổng hóa đơn, thể tích, `remainingAmount` | Thuần |
| 2 | Xuất: tạo đơn → allocated; start-preparing; giảm `quantityActual` hoàn đúng chênh lệch; mark-returned cộng lại; cancel chỉ PENDING | Mockito |
| 2 | Nhập: confirm hai lần; item chưa đếm → 409; hàng hỏng không cộng; chưa có dòng inventory thì tạo mới | Mockito |
| 2 | COD: tổng cấn trừ vượt `codAmount` → 422; confirm hai lần → 409; Staff gọi → 403 | Mockito |
| 3 | 401 chưa đăng nhập, 403 sai vai trò, khách A đọc dữ liệu khách B, `CUSTOMER_PROFILE_REQUIRED`, `OVERDUE_DEBT` | MockMvc + Mockito |
| 4 | Sai chữ ký VNPay → 400; IPN lặp không xử lý hai lần; mã 24 → FAILED | Thuần/Mockito |
| Tùy chọn | Hai request cùng đặt gần hết tồn, một cái thành công; CHECK trong DB | Testcontainers |

---

## 4. Frontend

### 4.1. Cài đặt

```bash
npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

`vite.config.ts`:

```ts
/// <reference types="vitest" />
export default defineConfig({
  // ...cấu hình hiện có
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

`package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Nếu dùng TypeScript, thêm `"types": ["vitest/globals"]` vào `tsconfig.json`.

`src/test/setup.ts` (bắt buộc khi dùng Ant Design, thiếu thì nhiều component báo lỗi):

```ts
import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Một số component Ant Design cần thêm:
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

### 4.2. Loại 1: test hàm thuần (làm trước)

```ts
// src/utils/errorMessage.test.ts
import { getErrorMessage } from './errorMessage';

describe('getErrorMessage', () => {
  it('OVERDUE_DEBT trả thông báo hóa đơn quá hạn', () => {
    expect(getErrorMessage('OVERDUE_DEBT')).toMatch(/quá hạn/i);
  });
  it('mã lạ thì dùng thông báo mặc định', () => {
    expect(getErrorMessage('SOMETHING_NEW')).toBeTruthy();
  });
});
```

FE phải xử lý theo `error.code`, không dựa vào nội dung `message`.

### 4.3. Loại 2: test component bằng React Testing Library

Để nhanh, mock module gọi API bằng `vi.mock`, không cần dựng MSW.

```tsx
// src/routes/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

function renderAt(role: string | null) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
        <Route path="/403" element={<div>Không có quyền</div>} />
        <Route element={<ProtectedRoute allow={['ADMIN']} user={role ? { role } : null} />}>
          <Route path="/admin" element={<div>Trang Admin</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

it('chưa đăng nhập thì về trang đăng nhập', () => {
  renderAt(null);
  expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument();
});

it('Customer vào trang Admin bị chặn', () => {
  renderAt('CUSTOMER');
  expect(screen.queryByText('Trang Admin')).not.toBeInTheDocument();
});
```

Form COD (validate không gọi API khi thiếu trường):

```tsx
it('chọn COD mà chưa nhập tiền thu hộ thì không gửi request', async () => {
  const onSubmit = vi.fn();
  render(<CreateOutboundForm onSubmit={onSubmit} />);

  await userEvent.click(screen.getByRole('radio', { name: /cod/i }));
  await userEvent.click(screen.getByRole('button', { name: /tạo đơn/i }));

  expect(onSubmit).not.toHaveBeenCalled();
});
```

Với Ant Design, `getByRole` đôi khi không khớp. Khi đó dùng `getByLabelText` hoặc `getByText`. Component cần router/provider thì bọc trong `MemoryRouter` hoặc wrapper chung.

### 4.4. Checklist test frontend

| Ưu tiên | Test |
| --- | --- |
| 1 | Hàm ánh xạ `error.code` → thông báo (`OVERDUE_DEBT`, `INSUFFICIENT_STOCK`, `CAPACITY_EXCEEDED`...) |
| 1 | Hàm quyết định menu/route theo role |
| 2 | Guard: chưa đăng nhập → trang đăng nhập; Customer vào trang Admin bị chặn |
| 2 | Khách chưa có hồ sơ (`hasCustomerProfile = false`) thấy màn chờ, không thấy menu kho |
| 2 | Form đơn xuất: COD bắt buộc `codAmount > 0`, VNPAY khóa ô tiền, thiếu trường không gửi request |
| 3 | Màn đối soát COD: tổng hóa đơn chọn lớn hơn `codAmount` thì nút xác nhận bị vô hiệu |
| 3 | Axios gửi kèm cookie (`withCredentials`); nhận 401 thì về trang đăng nhập |

---

## 5. Quy ước chung

- **Tên test** mô tả hành vi, ví dụ `confirm_lan_hai_bi_chan`, không đặt `test1`.
- **Cấu trúc** mỗi test: chuẩn bị dữ liệu, gọi hàm, kiểm tra (given / when / then).
- **Mỗi test kiểm tra một ý.** Test dài nhiều assert không liên quan khó đọc khi lỗi.
- **Không dùng DB dev** để test. Nếu có test cần DB thật, dùng schema riêng như `warehouse_db_test` hoặc Testcontainers.
- **Không test**: getter/setter, DTO, controller mỏng chỉ gọi service, giao diện thuần trình bày, component Ant Design có sẵn.
- **Test phải tự chạy lại được**: không phụ thuộc thứ tự chạy, không phụ thuộc dữ liệu do test khác để lại.

---

## 7. Thời điểm viết

- **Ngay khi code xong từng service lõi** (xuất kho, nhập kho, COD): viết test, mất khoảng 15 đến 30 phút mỗi service vì logic còn mới.
- **Khi API đã chốt**: test phân quyền bằng MockMvc, test FE, test VNPay.
