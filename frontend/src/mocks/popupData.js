// Mock cho các popup Admin (lấy từ màn hình Stitch). Khi BE sẵn sàng, chuyển VITE_USE_MOCK=false.

// ===== Hóa đơn =====
export const VAT_RATE = 0.08
// Đơn giá biểu phí (khớp màn hình "Lập hóa đơn cước")
export const FEE_RATES = { storage: 50000, inbound: 1200000, packing: 5000 }

const buildInvoiceDetail = ({ id, customer, tax, address, location, m3, days, trips, pieces, period, vnpay }) => {
  const items = [
    { name: 'Thuê dung tích lưu kho sàn', spec: `Tiêu chuẩn m³/ngày, ${period}`, qty: `${m3} m³ x ${days} ngày`, price: 5000, priceUnit: '/m³/ngày', amount: m3 * days * 5000 },
    { name: 'Phí xe nâng & Dỡ hàng Cont Inbound', spec: 'Xe cont 40ft (bốc dỡ pallet cơ giới)', qty: `${trips} xe`, price: 1200000, priceUnit: '/xe', amount: trips * 1200000 },
    { name: 'Phí hoàn tất đóng gói & In tem Outbound', spec: 'Thùng carton chuẩn 5 lớp + tem barcode', qty: `${pieces} kiện`, price: 5000, priceUnit: '/kiện', amount: pieces * 5000 },
  ]
  const subtotal = items.reduce((s, i) => s + i.amount, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  return { id, customer, tax, address, location, items, subtotal, vat, total: subtotal + vat, vnpay: vnpay ?? null }
}

export const invoiceDetailMock = {
  'INV-202410-AP01': buildInvoiceDetail({
    id: 'INV-202410-AP01', customer: 'Công ty Cổ phần An Phát Technology', tax: '0314892019',
    address: 'Lô E4, KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM', location: 'Khu Zone A (Ô A12-A20, Tầng 1 - 3)',
    m3: 450, days: 15, trips: 6, pieces: 824, period: 'từ 01/10 đến 15/10',
    vnpay: { txnRef: 'INV-202410-AP01', transactionNo: '14682910', bankCode: 'NCB (Ngân hàng Quốc Dân)', payDate: '20241018143210', secureHash: '68a9fc8192db4321faec9812480b0012e87...' },
  }),
  'INV-202410-VC02': buildInvoiceDetail({
    id: 'INV-202410-VC02', customer: 'Việt Cosmetics & Beauty Ltd', tax: '0108742911',
    address: '25 Nguyễn Thị Minh Khai, Bến Nghé, Quận 1, TP.HCM', location: 'Khu Zone A (Ô A21-A26, Tầng 1 - 2)',
    m3: 340, days: 10, trips: 4, pieces: 240, period: 'từ 01/10 đến 10/10',
  }),
  'INV-202410-HV03': buildInvoiceDetail({
    id: 'INV-202410-HV03', customer: 'Thời Trang Havico Logistics', tax: '0311228833',
    address: '112 Phan Văn Trị, P.7, Gò Vấp, TP.HCM', location: 'Khu Zone B (Ô B03-B08, Tầng 1)',
    m3: 200, days: 10, trips: 2, pieces: 400, period: 'từ 01/10 đến 10/10',
  }),
  'INV-202409-TD04': buildInvoiceDetail({
    id: 'INV-202409-TD04', customer: 'Dược Phẩm Trung Đô Pharma', tax: '0300188732',
    address: 'KCN Long Hậu, Cần Giuộc, Long An', location: 'Khu Zone C - Kho mát (Ô C10-C14)',
    m3: 400, days: 15, trips: 5, pieces: 500, period: 'từ 01/09 đến 15/09',
  }),
}

// ===== Khách hàng =====
export const planOptions = [
  { value: 'STANDARD', label: 'Standard (<200 m³ - Phí theo Pallet)' },
  { value: 'PRO', label: 'Pro (200 - 1,000 m³ - Khu riêng biệt)' },
  { value: 'ENTERPRISE', label: 'Enterprise (>1,000 m³ - Dedicated Hub)' },
]

export const hubOptions = [
  { value: 'Kho Tân Bình - Hub 01 (Zone B)', label: 'Kho Tân Bình - Hub 01 (Zone B)' },
  { value: 'Kho Long Hậu - Logistics Park (Zone C)', label: 'Kho Long Hậu - Logistics Park (Zone C)' },
  { value: 'Kho VSIP 1 - Bình Dương (Zone A)', label: 'Kho VSIP 1 - Bình Dương (Zone A)' },
]

const customerDetailOverrides = {
  'CUST-VN01': {
    capacity: { total: 3200, stored: 2304, reserved: 496, free: 400 },
    contract: { code: 'HD-2023-TB09/WMS', type: 'Thuê kho theo khối (m³) + Fulfillment', signedAt: '2024-01-15', expiresAt: '2027-01-14', unitPrice: 185000, cycle: 'Hàng tháng (Ngày 25)' },
    authorized: [
      { name: 'Nguyễn Thanh Tùng', title: 'Giám đốc vận hành', phone: '0908 123 456', right: 'Ký xuất/nhập & Hóa đơn', primary: true },
      { name: 'Hoàng Văn Thái', title: 'Điều phối Logistics Hub', phone: '0912 334 556', right: 'Chỉ nhận lệnh nhập kho' },
    ],
    invoices: [
      { id: 'INV-2024-03-0149', label: 'Phí kho T03/2024', method: 'Thanh toán qua VNPay Doanh Nghiệp', paidAt: '2024-03-25', amount: 592000000 },
      { id: 'INV-2024-02-0098', label: 'Phí kho T02/2024', method: 'Thanh toán chuyển khoản BIDV', paidAt: '2024-02-24', amount: 588400000 },
      { id: 'INV-2024-01-0021', label: 'Phí kho T01/2024', method: 'Thanh toán qua Cổng VNPay QR', paidAt: '2024-01-26', amount: 574100000 },
    ],
    shelves: [
      { zone: 'ZONE A', range: 'Kệ A01-A07', floors: 'Tầng 1-4', desc: 'Hàng gia dụng kích thước lớn, TV, tủ lạnh', m3: 1600, pallets: 480 },
      { zone: 'ZONE A', range: 'Kệ A08-A14', floors: 'Tầng 1-3', desc: 'Hàng điện tử nhỏ, linh kiện nhạy cảm sốc', m3: 1200, pallets: 320 },
    ],
  },
}

// Các khách hàng còn lại: dựng chi tiết từ dòng trong bảng
export const buildCustomerDetail = (c) => {
  if (customerDetailOverrides[c.id]) return customerDetailOverrides[c.id]
  const stored = Math.round(c.capacity * 0.72)
  const reserved = Math.round(c.capacity * 0.08)
  const [repName, repTitle] = c.rep.replace(')', '').split(' (')
  const rent = c.capacity * 185000
  return {
    capacity: { total: c.capacity, stored, reserved, free: c.capacity - stored - reserved },
    contract: { code: `HD-2023-${c.id.slice(-2)}/WMS`, type: 'Thuê kho theo khối (m³) + Fulfillment', signedAt: '2024-02-01', expiresAt: '2027-01-31', unitPrice: 185000, cycle: 'Hàng tháng (Ngày 25)' },
    authorized: [{ name: repName, title: repTitle ?? 'Người đại diện', phone: c.phone, right: 'Ký xuất/nhập & Hóa đơn', primary: true }],
    invoices: [
      { id: `INV-2024-03-01${c.id.slice(-2)}`, label: 'Phí kho T03/2024', method: 'Thanh toán qua Cổng VNPay QR', paidAt: c.fee === 'PAID' ? '2024-03-25' : null, amount: rent },
      { id: `INV-2024-02-00${c.id.slice(-2)}`, label: 'Phí kho T02/2024', method: 'Thanh toán chuyển khoản', paidAt: '2024-02-24', amount: rent },
    ],
    shelves: [{ zone: 'ZONE', range: c.location, floors: 'Tầng 1-3', desc: 'Hàng hóa lưu kho theo hợp đồng', m3: c.capacity, pallets: Math.round(c.capacity / 3.5) }],
  }
}

// ===== Tồn kho / SKU =====
export const skuTenantOptions = [
  { value: 'CUST-B2B-0108', label: 'Cty CP Mỹ Phẩm An Phát (CUST-B2B-0108)' },
  { value: 'CUST-B2B-0042', label: 'Tech Global Smart Devices (CUST-B2B-0042)' },
  { value: 'CUST-B2B-0089', label: 'Tập đoàn Thực Phẩm Việt Nhật (CUST-B2B-0089)' },
  { value: 'CUST-B2B-0056', label: 'Urban Chic Fashion Vina (CUST-B2B-0056)' },
  { value: 'CUST-B2B-0112', label: 'Dược Phẩm & Y Tế Sài Gòn (CUST-B2B-0112)' },
]

export const skuCategoryOptions = [
  { value: 'COSMETIC', label: 'Mỹ phẩm & Chăm sóc da (Cosmetics)' },
  { value: 'ELECTRONIC', label: 'Linh kiện Điện tử & Viễn thông (Electronics)' },
  { value: 'FOOD', label: 'Thực phẩm & Đồ uống mát (Cold Food/Beverage)' },
  { value: 'PHARMA', label: 'Dược phẩm & Thiết bị Y tế (Pharma / GSP)' },
  { value: 'FASHION', label: 'Thời trang & May mặc (Apparel & Fashion)' },
]

export const uomOptions = ['Chai (Bottle)', 'Hộp (Box)', 'Thùng (Carton)', 'Bộ (Set)', 'Gói (Pack)']
  .map((l) => ({ value: l.split(' (')[0], label: l }))

export const storageZoneOptions = [
  { value: 'A', title: 'Zone A - Mát 18°C - 24°C', desc: 'Hàng Khô / Mỹ Phẩm / FMCG' },
  { value: 'B', title: 'Zone B - Thường / Khô Ráo', desc: 'Điện Tử & ESD Safe' },
  { value: 'C', title: 'Zone C - Lạnh 2°C - 8°C', desc: 'Dược Phẩm GSP & Sữa Men Sống' },
]

export const relocationZoneOptions = [
  { value: 'A', label: 'Zone A - Hàng Khô & Tiêu Dùng' },
  { value: 'B', label: 'Zone B - Linh Kiện & Điện Tử (ESD)' },
  { value: 'C', label: 'Zone C - Kho Mát & Dược Phẩm (2°C - 8°C)' },
]

export const auditZoneOptions = [
  { value: 'ALL', label: 'Toàn bộ Kho Tân Bình Central' },
  { value: 'A', label: 'Zone A - Hàng Khô & Tiêu Dùng' },
  { value: 'B', label: 'Zone B - Linh Kiện & ESD Safe' },
  { value: 'C', label: 'Zone C - Kho Mát & Dược Phẩm (2°C - 8°C)' },
]

// type: OUTBOUND | INBOUND | RELOCATE | DAMAGE
export const stockHistoryMock = {
  'SKU-AP-9921': [
    { type: 'OUTBOUND', title: 'Xuất kho đơn hàng TMĐT #SO-29188', delta: -50, note: 'Đơn vị vận chuyển: SPX Express • Đóng gói bàn giao', after: 4800, time: '14:15 - Hôm nay', by: 'NV: Nguyễn Văn An' },
    { type: 'INBOUND', title: 'Nhập kho bổ sung PO #INB-7721', delta: 1200, note: 'Nhập từ Container số CONT-88412 • Đã hoàn tất QC chất lượng', after: 4850, time: '09:20 - 18/10/2023', by: 'NV: Trần Đình Tú' },
    { type: 'RELOCATE', title: 'Điều chuyển nội bộ kệ kho', route: 'ZA-R02 → ZA-R04', note: 'Lý do: Tối ưu lộ trình lấy hàng Picker Zone A', extra: 'Khối lượng: 4 Pallets', time: '16:45 - 15/10/2023', by: 'NV: Lê Hoàng Nam' },
    { type: 'DAMAGE', title: 'Ghi nhận vỡ/hỏng trong lúc bốc dỡ', delta: -2, note: 'Biên bản số BB-VH-094 • Chuyển khu chờ đền bù đối tác', after: 3650, time: '11:00 - 12/10/2023', by: 'Giám sát Kho' },
  ],
  'SKU-TG-4402': [
    { type: 'OUTBOUND', title: 'Xuất kho đơn hàng TMĐT #SO-29102', delta: -15, note: 'Đơn vị vận chuyển: GHN • Đóng gói bàn giao', after: 85, time: '10:05 - 20/10/2023', by: 'NV: Nguyễn Văn An' },
    { type: 'INBOUND', title: 'Nhập kho bổ sung PO #INB-7702', delta: 100, note: 'Đã hoàn tất QC chất lượng', after: 100, time: '08:30 - 02/10/2023', by: 'NV: Trần Đình Tú' },
  ],
  'SKU-VN-1108': [
    { type: 'OUTBOUND', title: 'Xuất kho đơn hàng #SO-28870', delta: -80, note: 'Ưu tiên FEFO do cận hạn sử dụng', after: 420, time: '13:40 - 20/10/2023', by: 'NV: Lê Hoàng Nam' },
    { type: 'INBOUND', title: 'Nhập kho bổ sung PO #INB-7611', delta: 500, note: 'Nhập từ xe lạnh 51D-662.18 • Đạt kiểm tra nhiệt độ', after: 500, time: '09:10 - 11/09/2023', by: 'NV: Trần Đình Tú' },
  ],
  'SKU-UB-8870': [
    { type: 'OUTBOUND', title: 'Xuất kho đơn hàng #SO-28105', delta: -120, note: 'Xuất hết lô hàng cuối', after: 0, time: '15:20 - 01/10/2023', by: 'NV: Nguyễn Văn An' },
    { type: 'INBOUND', title: 'Nhập kho bổ sung PO #INB-7490', delta: 120, note: 'Đã hoàn tất QC chất lượng', after: 120, time: '10:00 - 15/08/2023', by: 'NV: Lê Hoàng Nam' },
  ],
  'SKU-PM-3319': [
    { type: 'OUTBOUND', title: 'Xuất kho đơn hàng #SO-29044', delta: -300, note: 'Đơn vị vận chuyển: Viettel Post', after: 12400, time: '16:10 - 19/10/2023', by: 'NV: Nguyễn Văn An' },
    { type: 'INBOUND', title: 'Nhập kho bổ sung PO #INB-7655', delta: 5000, note: 'Nhập từ Container số CONT-90231 • Đạt chuẩn GSP', after: 12700, time: '09:00 - 25/09/2023', by: 'NV: Trần Đình Tú' },
  ],
}

// ===== Tài khoản & phân quyền =====
export const serviceTierOptions = [
  { value: 'PRO', label: 'Pro Storage (Ưu tiên lưu kho tiêu chuẩn)' },
  { value: 'STANDARD', label: 'Standard (Cơ bản theo m³/tháng)' },
  { value: 'ENTERPRISE', label: 'Enterprise (Phân khu riêng & Cross-docking)' },
]

export const zoneAccessOptions = [
  { value: 'A', label: 'Zone A - Kho Mát (18°C - 22°C)' },
  { value: 'B', label: 'Zone B - Hàng Khô Tiêu Chuẩn' },
  { value: 'C', label: 'Zone C - Kho Lạnh Âm Sâu' },
]

export const branchOptions = [
  { value: 'Kho Tân Bình - Hub Central HCM', label: 'Kho Tân Bình - Hub Central HCM' },
  { value: 'Kho Long Hậu - Logistics Park', label: 'Kho Long Hậu - Logistics Park' },
  { value: 'Kho VSIP 1 - Bình Dương Hub', label: 'Kho VSIP 1 - Bình Dương Hub' },
]

export const shiftOptions = [
  { value: 'DAY', label: 'Ca Ngày (06:00 - 14:00)' },
  { value: 'AFTERNOON', label: 'Ca Chiều (14:00 - 22:00)' },
  { value: 'NIGHT', label: 'Ca Đêm (22:00 - 06:00)' },
  { value: 'FLEX', label: 'Toàn thời gian linh hoạt' },
]

// Phạm vi dữ liệu theo vai trò (checked = mặc định bật, disabled = không thể cấp cho vai trò này)
export const permissionScopesMock = {
  CUSTOMER: [
    { key: 'inbound', label: 'Xem và tạo phiếu Nhập kho (Inbound Gate)', checked: true },
    { key: 'inventory', label: 'Xem thông tin tồn kho và tình trạng Pallet (Chỉ hàng của doanh nghiệp mình)', checked: true },
    { key: 'payment', label: 'Thanh toán hóa đơn phí lưu kho qua cổng VNPay', checked: true },
    { key: 'internal', label: 'Truy cập hệ thống quản trị nội bộ hoặc điều chuyển hàng (Chỉ dành cho Staff/Admin)', checked: false, disabled: true },
  ],
  STAFF: [
    { key: 'inbound', label: 'Kiểm đếm và xác nhận phiếu Nhập kho (Inbound)', checked: true },
    { key: 'outbound', label: 'Soạn hàng, đóng gói và bàn giao Xuất kho (Outbound)', checked: true },
    { key: 'inventory', label: 'Xem tồn kho toàn Hub (Chỉ đọc - không sửa trực tiếp)', checked: true },
    { key: 'admin', label: 'Quản trị tài khoản, hợp đồng và hóa đơn (Chỉ dành cho Admin)', checked: false, disabled: true },
  ],
  ADMIN: [
    { key: 'users', label: 'Quản trị tài khoản & phân quyền hệ thống', checked: true },
    { key: 'contracts', label: 'Ký duyệt hợp đồng, hạn mức SLA và hóa đơn cước', checked: true },
    { key: 'inventory', label: 'Quản trị danh mục SKU và điều chuyển vị trí kho', checked: true },
    { key: 'lock', label: 'Khóa / mở khóa tài khoản khách hàng (PATCH /users/{id}/status)', checked: true },
  ],
}
