// Mock data lấy từ các màn hình Stitch. Khi BE sẵn sàng, chuyển VITE_USE_MOCK=false.
export const dashboardMock = {
  kpi: {
    capacity: { percent: 84.6, used: 12690, total: 15000, reserved: 2310 },
    customers: { active: 148, locked: 12, contracts: '136 / 148' },
    inbound: { today: 18, parcels: 840, docking: 3 },
    outbound: { orders: 64, cod: 45200000 },
    fee: { total: '342.8M' },
  },
  flow: {
    inbound: [18, 28, 38, 42, 47, 40, 30, 22, 25, 38, 62, 85, 98, 80, 70],
    outbound: [10, 18, 28, 36, 44, 50, 52, 52, 50, 46, 42, 38, 40, 48, 58],
    labels: ['01 Th08', '06 Th08', '12 Th08', '18 Th08', '24 Th08', 'Hôm nay (30)'],
  },
  tenants: [
    { name: '1. LogiTech Vietnam (Toàn cầu)', zone: 'Zone A, B', volume: 3680, percent: 29.0, quota: 'Hạn mức kho: 4,000 m³ (92% quota)', fee: '~99.3M đ/tháng', color: '#0057c2', fill: 92 },
    { name: '2. An Nam Gourmet & Retail', zone: 'Zone C (Kho mát)', volume: 2840, percent: 22.4, quota: 'Hạn mức kho: 3,000 m³ (94.6% quota)', fee: '~76.7M đ/tháng', color: '#006767', fill: 94.6 },
    { name: '3. KidsPlaza & Mẹ Bé', zone: 'Zone D', volume: 2150, percent: 16.9, quota: 'Hạn mức kho: 2,500 m³ (86% quota)', fee: '~58.0M đ/tháng', color: '#466082', fill: 86 },
    { name: '4. FPT Synnex Logistics', zone: 'Zone A', volume: 1920, percent: 15.1, quota: 'Hạn mức kho: 2,000 m³ (96% quota)', fee: '~51.8M đ/tháng', color: '#006ef2', fill: 96 },
    { name: '5. Doanh nghiệp khác (28 tenants)', zone: 'Zone E & Mezzanine', volume: 2100, percent: 16.6, quota: 'Linh hoạt theo ngày (On-demand)', fee: '~56.7M đ/tháng', color: '#727786', fill: 70 },
  ],
}

export const customersMock = [
  { id: 'CUST-VN01', name: 'Công ty CP Điện Máy Xanh Toàn Cầu', plan: 'ENTERPRISE', tax: '0314892019', location: 'Kệ Zone A-01 → A-14', rep: 'Nguyễn Thanh Tùng (GĐ Vận hành)', phone: '0908 123 456', capacity: 3200, sku: 1420, units: 248150, fee: 'PAID', account: 'ACTIVE' },
  { id: 'CUST-VN02', name: 'Thời Trang Nhanh Fashtech Vietnam', plan: 'PRO', tax: '0108933211', location: 'Zone B Kệ 01-10', rep: 'Trần Mỹ Duyên (Trưởng Kho)', phone: '0934 888 999', capacity: 650, sku: 3890, units: 512040, fee: 'DEBT', debt: '48.6M ₫', account: 'ACTIVE' },
  { id: 'CUST-VN03', name: 'Công ty TNHH Cà Phê Mộc Cao Nguyên', plan: 'STANDARD', tax: '5800192837', location: 'Pallet Rack C-04', rep: 'Lê Hoàng Nam (Chủ Doanh Nghiệp)', phone: '0919 776 543', capacity: 120, sku: 65, units: 18500, fee: 'PAID', account: 'ACTIVE' },
  { id: 'CUST-VN04', name: 'Thiết Bị Y Tế An Phát Pharma', plan: 'PRO', tax: '0309991200', location: 'Zone C-Lạnh (Khóa Xuất Hàng)', rep: 'Bác sĩ Phạm Văn Dũng', phone: '0982 445 112', capacity: 450, sku: 210, units: 42980, fee: 'OVERDUE', debt: '124.0M ₫ (Quá hạn)', account: 'LOCKED' },
  { id: 'CUST-VN05', name: 'Hệ Thống Phụ Kiện PetStore VN', plan: 'STANDARD', tax: '0317823901', location: 'Pallet Rack D-12', rep: 'Võ Thị Thu Hà', phone: '0971 998 011', capacity: 85, sku: 340, units: 31280, fee: 'PAID', account: 'ACTIVE' },
  { id: 'CUST-VN06', name: 'Cơ Khí & Phụ Tùng Tự Động Minh Đức', plan: 'ENTERPRISE', tax: '0304910294', location: 'Zone E Sàn Tải Trọng Nặng', rep: 'Đặng Minh Đức (TGĐ)', phone: '0903 555 777', capacity: 1850, sku: 820, units: 189480, fee: 'PAID', account: 'ACTIVE' },
]

export const inventoryMock = [
  { sku: 'SKU-AP-9921', tag: 'COSMETIC', name: 'Serum Phục Hồi Bio-Ceramide 50ml', owner: 'Cty CP Mỹ Phẩm An Phát', bin: 'ZA-R04-S02-B12', onHand: 4800, allocated: 350, unit: 'Chai', status: 'SAFE', received: '18/10/2023', note: 'HSD: 12/2025 (Còn 26 tháng)' },
  { sku: 'SKU-TG-4402', tag: 'ELECTRONIC', name: 'Router Wi-Fi 6 Mesh Enterprise AX3000', owner: 'Tech Global Smart Devices', bin: 'ZB-E01-S01-B04', onHand: 85, allocated: 60, unit: 'Bộ', status: 'LOW', received: '02/10/2023', note: 'Bảo hành: 24 tháng' },
  { sku: 'SKU-VN-1108', tag: 'CẬN DATE', name: 'Sữa Chua Men Sống Probiotic Organic (Thùng 24 hủ)', owner: 'Tập đoàn Thực Phẩm Việt Nhật', bin: 'ZC-K02-S03-B01', onHand: 420, allocated: 0, unit: 'Thùng', status: 'EXPIRING', received: '11/09/2023', note: 'HSD: 08/11/2023 (Gấp)' },
  { sku: 'SKU-UB-8870', tag: 'FASHION', name: 'Áo Polo Slimfit Cotton Compact Kháng Khuẩn (L)', owner: 'Urban Chic Fashion Vina', bin: 'ZA-F08-S04-B02', onHand: 0, allocated: 0, unit: 'Cái', status: 'OUT', received: '15/08/2023', note: 'Đã xuất hết 01/10' },
  { sku: 'SKU-PM-3319', tag: 'PHARMA', name: 'Nước Muối Sinh Lý Kháng Khuẩn Natri Clorid 0.9%', owner: 'Dược Phẩm & Y Tế Sài Gòn', bin: 'ZC-M05-S02-B18', onHand: 12400, allocated: 1200, unit: 'Chai', status: 'SAFE', received: '25/09/2023', note: 'HSD: 09/2026 (Còn 35 tháng)' },
]

export const zonesMock = [
  { name: 'Zone A (Hàng Khô / Tiêu dùng)', load: 88.4, used: 1414, total: 1600, free: 186 },
  { name: 'Zone B (Điện Tử & ESD Safe)', load: 64.0, used: 512, total: 800, free: 288 },
  { name: 'Zone C (Hàng Mát 2-8°C / Dược Phẩm)', load: 94.2, used: 565, total: 600, free: 35, warn: true },
]

export const inboundMock = [
  { id: 'NK-202410-0912', customer: 'An Phát Tech JSC', time: '28/10/2024 10:30', truck: '51D-892.44', dock: 'Dock D-02', declared: 500, actual: 496, status: 'RECEIVING' },
  { id: 'NK-202410-0913', customer: 'Dược Phẩm SunStar', time: '28/10/2024 11:15', truck: '29H-712.09', dock: 'Dock D-01', declared: 1200, actual: null, status: 'SCHEDULED' },
  { id: 'NK-202410-0910', customer: 'Thời Trang Havico', time: '28/10/2024 08:00', truck: '60B-331.87', dock: 'Dock D-03', declared: 850, actual: 850, status: 'CONFIRMED' },
  { id: 'NK-202410-0989', customer: 'Việt Cosmetics Group', time: '27/10/2024 16:45', truck: '50LD-112.50', dock: 'Dock D-02', declared: 320, actual: 320, status: 'CONFIRMED' },
  { id: 'NK-202410-0908', customer: 'An Phát Tech JSC', time: '27/10/2024 14:00', truck: null, dock: null, declared: 240, actual: 0, status: 'CANCELLED' },
]

export const outboundMock = [
  { id: 'OUT-2024-001', waybill: 'S22.GHN.8912401', carrier: 'GHN', customer: 'An Phát Tech Corp', receiver: 'Nguyễn Văn Bình (0918.234.xxx)', address: 'Số 45 Lê Duẩn, P. Bến Nghé, Quận 1, TP.HCM', cod: 4850000, status: 'IN_DELIVERY' },
  { id: 'OUT-2024-002', waybill: 'VT881928392VN', carrier: 'Viettel Post', customer: 'Việt Cosmetics Group', receiver: 'Trần Mỹ Duyên (0982.119.xxx)', address: 'Toà Bitexco, 02 Hải Triều, P. Bến Nghé, TP.HCM', cod: 12200000, status: 'DELIVERED' },
  { id: 'OUT-2024-003', waybill: 'S22.GHN.9928122', carrier: 'GHN', customer: 'Thời Trang Havico Garments', receiver: 'Lê Hoàng Quân (0903.882.xxx)', address: 'Cửa Hàng Boutique 18, TP. Thủ Đức, TP.HCM', cod: 36500000, status: 'DELIVERED' },
  { id: 'OUT-2024-004', waybill: 'VT771829910VN', carrier: 'Viettel Post', customer: 'Dược Mỹ Phẩm SunStar', receiver: 'Vũ Thị Mai (0977.444.xxx)', address: 'Khu công nghiệp VSIP 1, Thuận An, Bình Dương', cod: 0, originalCod: 3420000, status: 'RETURNED' },
  { id: 'OUT-2024-005', waybill: 'S22.GHN.1102948', carrier: 'GHN', customer: 'An Phát Tech Corp', receiver: 'Bùi Tiến Đạt (0934.771.xxx)', address: 'Tầng 3, Toà Sunrise, Quận 7, TP.HCM', cod: 8950000, status: 'IN_DELIVERY' },
]

export const invoicesMock = [
  { id: 'INV-202410-AP01', customer: 'An Phát Technology JSC', tax: '0314892019', total: 48675600, status: 'PAID' },
  { id: 'INV-202410-VC02', customer: 'Việt Cosmetics & Beauty Ltd', tax: '0108742911', total: 24840000, status: 'PENDING' },
  { id: 'INV-202410-HV03', customer: 'Thời Trang Havico Logistics', tax: '0311228833', total: 15552000, status: 'PROCESSING' },
  { id: 'INV-202409-TD04', customer: 'Dược Phẩm Trung Đô Pharma', tax: '0300188732', total: 41580000, status: 'OVERDUE' },
]

export const ipnLogsMock = [
  { time: '18/10 14:32:18', txn: 'INV-202410-AP01', code: '00', label: '00 (Success)', amount: 48675600 },
  { time: '18/10 11:15:02', txn: 'INV-202410-AP02', code: '00', label: '00 (Success)', amount: 12500000 },
  { time: '17/10 09:40:11', txn: 'INV-202409-TD04', code: '24', label: '24 (User Canceled)', amount: 41580000 },
]

export const usersMock = [
  { id: 'USR-ADM-001', name: 'Trần Đình Khang', email: 'admin.khang@logistorage.vn', provider: 'Email', role: 'ADMIN', org: 'Trung tâm Điều hành Quốc gia', status: 'ACTIVE' },
  { id: 'USR-CUS-108', name: 'Nguyễn Hoàng Lan', email: 'lan.nguyen@anphattech.vn', provider: 'Google', role: 'CUSTOMER', org: 'An Phát Tech Corp', status: 'ACTIVE' },
  { id: 'USR-CUS-874', name: 'Vũ Minh Hùng', email: 'hungvm@dongatech.com', provider: 'Email', role: 'CUSTOMER', org: 'Đông Á Logistics Co.', status: 'LOCKED' },
  { id: 'USR-STF-021', name: 'Phạm Quốc Bảo', email: 'bao.pq@logistorage.vn', provider: 'Email', role: 'STAFF', org: 'Đội Vận Hành Hub Tân Bình', status: 'ACTIVE' },
  { id: 'USR-STF-029', name: 'Lê Thanh Thảo', email: 'thao.le@logistorage.vn', provider: 'Email', role: 'STAFF', org: 'Kho Long Hậu Logistics Park', status: 'ACTIVE' },
  { id: 'USR-CUS-142', name: 'Đỗ Nam Phong', email: 'namphong@greentrading.vn', provider: 'Google', role: 'CUSTOMER', org: 'Green Agri Commerce JSC', status: 'ACTIVE' },
]
