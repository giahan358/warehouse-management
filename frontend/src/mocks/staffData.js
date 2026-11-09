// Mock cho màn hình Nhân viên kho (lấy từ các màn hình Stitch).
// Khi BE sẵn sàng: đặt VITE_USE_MOCK=false, các api/*.js sẽ gọi endpoint thật.

export const staffDashboardMock = {
  kpi: { pendingAsn: 6, openCounts: 3, pickPack: 18, discrepancy: 2 },
  totalTasks: 18,
  tasks: [
    { id: 'TSK-202410-091', receiptId: 'NK-202410-0891', type: 'RECEIVE', typeLabel: 'Tiếp nhận xe tải Dock', customer: 'CTCP Điện Máy Xanh Toàn Cầu', location: 'Dock A-03', sla: '11:15', urgent: true, status: 'RECEIVING', actionLabel: 'Xem ASN & Kiểm', primary: true, to: '/staff/counting/NK-202410-0891' },
    { id: 'TSK-202410-094', type: 'COUNT', typeLabel: 'Đếm hàng lô thực tế', customer: 'Thời Trang Nhanh Fashtech', location: 'Kệ B-12-04', sla: '11:45', urgent: false, status: 'PENDING', actionLabel: 'Bắt đầu xử lý', primary: false, to: '/staff/counting' },
    { id: 'TSK-202410-098', type: 'PICK', typeLabel: 'Soạn hàng & Trừ on-hand', customer: 'Dược Y Tế An Phát', location: 'Kệ C-01-08', sla: '12:00', urgent: true, status: 'PREPARING', actionLabel: 'Bắt đầu xử lý', primary: true, to: '/staff/outbound' },
    { id: 'TSK-202410-102', type: 'HANDOVER', typeLabel: 'Bàn giao 3PL (UC11 / UC12)', customer: 'CTCP Điện Máy Xanh Toàn Cầu', location: 'Cửa Xuất B-01', sla: '13:30', urgent: false, status: 'IN_DELIVERY', actionLabel: 'Bàn giao 3PL', primary: false, to: '/staff/outbound' },
  ],
}

export const staffInventoryMock = [
  { sku: 'SKU-AP-9901', name: 'Bo mạch điều khiển IoT Gateway v3', owner: 'An Phát Tech Corp', ownerId: 'CUST-AP', zone: 'A', bin: 'ZA-R04-S02-B12', unit: 'Bộ', onHand: 12450, allocated: 1200, volume: 14.2 },
  { sku: 'SKU-HV-3021', name: 'Áo sơ mi Oxford Slim Fit - Navy L', owner: 'Thời Trang Havico', ownerId: 'CUST-HV', zone: 'A', bin: 'ZA-F08-S04-B02', unit: 'Chiếc', onHand: 8300, allocated: 2500, volume: 31.8 },
  { sku: 'SKU-TD-5044', name: 'Ống tiêm vô trùng dùng 1 lần 5ml', owner: 'Dược Trung Đô', ownerId: 'CUST-TD', zone: 'C', bin: 'ZC-M05-S02-B18', unit: 'Thùng', onHand: 120, allocated: 85, volume: 6.5 },
  { sku: 'SKU-AP-4412', name: 'Module Cảm biến siêu âm HC-SR04 Pro', owner: 'An Phát Tech Corp', ownerId: 'CUST-AP', zone: 'B', bin: 'ZB-E01-S01-B04', unit: 'Hộp', onHand: 95, allocated: 20, volume: 2.1 },
  { sku: 'SKU-HV-1090', name: 'Quần Khaki Chino Dáng Suông - Be 32', owner: 'Thời Trang Havico', ownerId: 'CUST-HV', zone: 'A', bin: 'ZA-F09-S01-B03', unit: 'Chiếc', onHand: 0, allocated: 0, volume: 0 },
  { sku: 'SKU-TD-8119', name: 'Dung dịch sát khuẩn cồn y tế 70 độ 500ml', owner: 'Dược Trung Đô', ownerId: 'CUST-TD', zone: 'C', bin: 'ZC-K02-S03-B01', unit: 'Chai', onHand: 18200, allocated: 3150, volume: 28.4 },
]

export const inboundScheduleMock = [
  { id: 'NK-202410-0912', timeLabel: 'Hẹn: 08:30', customer: 'An Phát Tech Corp', plan: 'Enterprise', truck: 'CONTAINER 51D-894.22', qtyLabel: '350 thùng', skuCount: 12, qty: 350, unloaded: 0, dock: 'Dock A-02', dockNote: 'Hàng khô', dockTone: 'primary', status: 'RECEIVING', phase: 'AT_DOCK', progress: null },
  { id: 'NK-202410-0908', timeLabel: 'Bắt đầu lúc: 08:05', customer: 'Dược Phẩm SunStar', plan: 'Kho Lạnh Zone D', truck: '29H-671.05', qtyLabel: '180 thùng', skuCount: 4, skuSuffix: 'Lạnh', qty: 180, unloaded: 130, dock: 'Dock A-05', dockNote: 'Đệm lạnh', dockTone: 'cyan', status: 'RECEIVING', phase: 'UNLOADING', progress: 72 },
  { id: 'NK-202410-0915', timeLabel: 'Hẹn: 09:15', customer: 'Việt Cosmetics JSC', plan: 'Tiêu chuẩn', truck: '60C-512.88', qtyLabel: '620 kiện', skuCount: 28, qty: 620, unloaded: 0, dock: 'Dock A-01', dockNote: 'Chờ ghép', dockTone: 'gray', status: 'SCHEDULED', phase: 'WAITING', progress: null },
  { id: 'NK-202410-0902', timeLabel: 'Bắt đầu lúc: 07:45', customer: 'Tập đoàn Logistics Đông Nam', plan: 'Enterprise', truck: '50H-119.45', qtyLabel: '1,240 kiện', skuCount: 18, qty: 1240, unloaded: 1054, dock: 'Dock A-04', dockNote: 'Hàng nặng', dockTone: 'primary', status: 'RECEIVING', phase: 'UNLOADING', progress: 85 },
  { id: 'NK-202410-0916', timeLabel: 'Hẹn: 09:40', customer: 'Mộc Cao Nguyên Coffee', plan: 'Tiêu chuẩn', truck: '47C-228.31', qtyLabel: '300 bao', skuCount: 3, qty: 300, unloaded: 0, dock: 'Dock A-06', dockNote: 'Chờ ghép', dockTone: 'gray', status: 'SCHEDULED', phase: 'WAITING', progress: null },
  { id: 'NK-202410-0917', timeLabel: 'Hẹn: 10:10', customer: 'PetStore VN', plan: 'Tiêu chuẩn', truck: '61C-775.02', qtyLabel: '210 kiện', skuCount: 9, qty: 210, unloaded: 0, dock: null, dockNote: null, dockTone: 'gray', status: 'SCHEDULED', phase: 'WAITING', progress: null },
  { id: 'NK-202410-0903', timeLabel: 'Bắt đầu lúc: 08:20', customer: 'Thời Trang Havico', plan: 'Enterprise', truck: '51D-330.18', qtyLabel: '540 kiện', skuCount: 15, qty: 540, unloaded: 0, dock: 'Dock A-03', dockNote: 'Hàng khô', dockTone: 'primary', status: 'RECEIVING', phase: 'AT_DOCK', progress: null },
  { id: 'NK-202410-0899', timeLabel: 'Hoàn tất: 07:30', customer: 'Bách Hóa Á Châu Trading', plan: 'Tiêu chuẩn', truck: '51C-448.19 (Xe 5 Tấn)', qtyLabel: '970 kiện', skuCount: 11, qty: 970, unloaded: 970, dock: 'Dock A-03', dockNote: 'Đã giải phóng', dockTone: 'gray', status: 'CONFIRMED', phase: 'DONE', progress: 100 },
]

export const countingReceiptMock = {
  id: 'NK-202410-0891',
  customer: 'Công ty CP Thời Trang Fashtech Vietnam',
  customerCode: 'CUST-FASH-8819',
  vehicle: 'Xe tải nội bộ 51D-772.10',
  zone: 'Sàn đệm Staging Zone A',
  dock: 'Cửa tiếp nhận Dock 04',
  temperature: '24.2°C',
  createdAt: '2024-10-24T08:15:00',
  status: 'RECEIVING',
  lines: [
    { sku: 'FT-TS-BLK-L', barcode: '8935002148102', name: 'Áo Thun Cotton Basic Đen - Size L', unit: 'Cái', packLabel: 'Thùng 50 cái (8 thùng)', packSize: 50, expected: 400, actual: 400, bin: 'R04-ZA-S01-B08', thumb: '#1f2937', appearance: 'OK', damaged: 0, note: '' },
    { sku: 'FT-PL-NVY-L', barcode: '8935002148119', name: 'Áo Polo Classic Pique Xanh Navy - Size L', unit: 'Cái', packLabel: 'Thùng 30 cái (10 thùng)', packSize: 30, expected: 300, actual: 285, bin: 'R04-ZA-S02-B12', thumb: '#1e3a8a', appearance: 'DENTED', damaged: 4, note: 'Móp 02 thùng, thiếu 15 cái so với ASN. Đã lập biên bản.' },
    { sku: 'FT-KH-BGE-32', barcode: '8935002148126', name: 'Quần Khaki Slim-fit Màu Be - Size 32', unit: 'Cái', packLabel: 'Thùng 25 cái (10 thùng)', packSize: 25, expected: 250, actual: 250, bin: 'R04-ZA-S03-B01', thumb: '#a8896c', appearance: 'OK', damaged: 0, note: '' },
    { sku: 'FT-JK-GRN-M', barcode: '8935002148133', name: 'Áo Khoác Gió Kháng Nước Green Forest - Size M', unit: 'Cái', packLabel: 'Thùng 25 cái (10 thùng)', packSize: 25, expected: 250, actual: 250, bin: 'R04-ZA-S03-B04', thumb: '#166534', appearance: 'OK', damaged: 0, note: '' },
  ],
}

export const fulfillmentMock = {
  summary: { pending: 18, preparing: 7, ready: 24, delivering: 86 },
  orders: [
    { id: 'OUT-2024-0012', createdAt: '10:05', customer: 'An Phát Tech Corp', receiver: 'Lê Hoàng Quân', phone: '0903.882.xxx', address: 'Cửa Hàng Boutique 18, TP. Thủ Đức, TP.HCM', itemsLabel: '03 mặt hàng (05 món)', carrier: 'GHN Hỏa Tốc', carrierTone: 'primary', tracking: 'VN892109841GT', speed: 'EXPRESS', status: 'PENDING', shortage: true,
      urgent: true, slaLeft: '42 phút', contract: 'APT-2023-F09', dock: 'Cửa Xuất D03 • Hub Tân Bình',
      items: [
        { sku: 'SKU-ELEC-4091', name: 'Cáp sạc Type-C siêu bền 100W Anker', bin: 'C2-P45', unit: 'cái', qty: 2, avail: 48 },
        { sku: 'SKU-ELEC-8820', name: 'Tai nghe chống ồn không dây Pro V2', bin: 'A4-P12', unit: 'cái', qty: 2, avail: 82 },
        { sku: 'SKU-ACC-0104', name: 'Ốp lưng bảo vệ Silicon MagSafe Black', bin: 'C2-P45', unit: 'cái', qty: 1, avail: 12 },
      ] },
    { id: 'OUT-2024-0015', createdAt: '09:40', customer: 'Việt Cosmetics', receiver: 'Nguyễn Thu Thảo', phone: '0988.112.xxx', address: '120 Hai Bà Trưng, Phường Bến Nghé, Quận 1', itemsLabel: '06 mặt hàng (18 món)', carrier: 'Viettel Post EMS', carrierTone: 'primary', tracking: 'VTP998124501', speed: 'STANDARD', status: 'PICKING', shortage: false,
      contract: 'VC-2024-B21', dock: 'Cửa Xuất D01 • Hub Tân Bình',
      items: [
        { sku: 'SKU-VC-1001', name: 'Kem dưỡng ẩm ban ngày SPF30', bin: 'ZB-C01-S01-B02', unit: 'hộp', qty: 3, avail: 140 },
        { sku: 'SKU-VC-1002', name: 'Sữa rửa mặt dịu nhẹ 150ml', bin: 'ZB-C01-S01-B03', unit: 'chai', qty: 3, avail: 220 },
        { sku: 'SKU-VC-1003', name: 'Toner cân bằng da 200ml', bin: 'ZB-C01-S02-B01', unit: 'chai', qty: 3, avail: 96 },
        { sku: 'SKU-VC-1004', name: 'Serum Vitamin C 30ml', bin: 'ZB-C01-S02-B04', unit: 'chai', qty: 3, avail: 64 },
        { sku: 'SKU-VC-1005', name: 'Kem chống nắng vật lý 50g', bin: 'ZB-C02-S01-B02', unit: 'tuýp', qty: 3, avail: 180 },
        { sku: 'SKU-VC-1006', name: 'Mặt nạ ngủ cấp ẩm 80g', bin: 'ZB-C02-S01-B05', unit: 'hũ', qty: 3, avail: 75 },
      ] },
    { id: 'OUT-2024-0018', createdAt: '09:12', customer: 'Thời Trang Havico', receiver: 'Đại lý Phân Phối Nam Định', phone: '', address: 'Lô CN-04 KCN Hòa Xá, TP. Nam Định', itemsLabel: '02 thùng carton (40 áo)', carrier: 'Viettel Post Tiết Kiệm', carrierTone: 'primary', tracking: 'VTP771029412', speed: 'STANDARD', status: 'PACKED', shortage: false,
      contract: 'HV-2024-A07', dock: 'Cửa Xuất D02 • Hub Tân Bình',
      items: [
        { sku: 'SKU-HV-3021', name: 'Áo sơ mi Oxford Slim Fit - Navy L', bin: 'ZA-F08-S04-B02', unit: 'áo', qty: 40, avail: 8300 },
      ] },
    { id: 'OUT-2024-0009', createdAt: '08:30', customer: 'An Phát Tech Corp', receiver: 'Phạm Quốc Hùng', phone: '0914.331.xxx', address: 'Tòa nhà Landmark 81, P22, Bình Thạnh', itemsLabel: '01 kiện tiêu chuẩn (2.4kg)', carrier: 'GHN', carrierTone: 'gray', tracking: 'VN442019941GT', speed: 'EXPRESS', status: 'HANDED_OVER', shortage: false,
      contract: 'APT-2023-F09', dock: 'Cửa Xuất D03 • Hub Tân Bình',
      items: [
        { sku: 'SKU-AP-4412', name: 'Module Cảm biến siêu âm HC-SR04 Pro', bin: 'ZB-E01-S01-B04', unit: 'hộp', qty: 1, avail: 75 },
      ] },
  ],
}

export const asnDetailMock = {
  dockLabel: 'Đang tiếp nhận tại Dock A-03',
  customer: 'CTCP Điện Máy Xanh Toàn Cầu',
  customerCode: 'CUST-VN-0094',
  vehicle: 'Xe tải 5T: 29C-741.22',
  driver: 'Nguyễn Văn Hưng',
  driverPhone: '0912.883.910',
  window: '10:30 - 11:30 (15/10/2024)',
  dock: 'Dock A-03',
  palletCount: 48,
  totalPackages: 1240,
  weightNote: 'Đã cân tải: 2,420 kg (Hợp lệ)',
  lines: [
    { sku: 'SKU-TV-55-LG', name: 'Smart Tivi LG 4K 55 inch OLED C3', unit: 'Kiện', expected: 480, actual: null, bin: 'Kệ A-02-14' },
    { sku: 'SKU-WM-90-SS', name: 'Máy giặt Inverter Samsung 9.5kg', unit: 'Kiện', expected: 360, actual: null, bin: 'Kệ A-03-02' },
    { sku: 'SKU-FR-320-PA', name: 'Tủ lạnh Panasonic Inverter 320L', unit: 'Kiện', expected: 400, actual: null, bin: 'Kệ A-04-01' },
  ],
}