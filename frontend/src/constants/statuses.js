// Mỗi trạng thái: label + màu (theo status chips của DESIGN.md)
const green = { color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f' }
const blue = { color: '#0057c2', bg: '#e6f0ff', border: '#91caff' }
const orange = { color: '#d48806', bg: '#fffbe6', border: '#ffe58f' }
const red = { color: '#cf1322', bg: '#fff2f0', border: '#ffccc7' }
const cyan = { color: '#08979c', bg: '#e6fffb', border: '#87e8de' }
const gray = { color: '#595959', bg: '#fafafa', border: '#d9d9d9' }

export const INBOUND_STATUS = {
  SCHEDULED: { label: 'SCHEDULED', ...blue },
  RECEIVING: { label: 'RECEIVING', ...orange },
  CONFIRMED: { label: 'CONFIRMED', ...cyan },
  CANCELLED: { label: 'CANCELLED', ...red },
}

export const OUTBOUND_STATUS = {
  IN_DELIVERY: { label: 'Đang giao hàng', ...blue },
  DELIVERED: { label: 'Giao thành công', ...green },
  RETURNED: { label: 'Chuyển hoàn kho', ...red },
}

export const INVOICE_STATUS = {
  PAID: { label: 'PAID (ĐÃ THU)', ...green },
  PENDING: { label: 'CHỜ THANH TOÁN', ...orange },
  PROCESSING: { label: 'ĐANG XỬ LÝ', ...blue },
  OVERDUE: { label: 'QUÁ HẠN NỘP CƯỚC', ...red },
}

export const STOCK_STATUS = {
  SAFE: { label: 'An Toàn', ...cyan },
  LOW: { label: 'Tồn Thấp (<100)', ...blue },
  EXPIRING: { label: 'Cận Hạn (<20 ngày)', ...red },
  OUT: { label: 'Hết Hàng (0)', ...gray },
}

export const ACCOUNT_STATUS = {
  ACTIVE: { label: 'ACTIVE', ...green },
  LOCKED: { label: 'LOCKED (Khóa)', ...red },
}

// ===== Nhân viên kho =====
export const TASK_STATUS = {
  RECEIVING: { label: 'RECEIVING', ...blue },
  PENDING: { label: 'PENDING', ...gray },
  PREPARING: { label: 'PREPARING', ...orange },
  IN_DELIVERY: { label: 'IN_DELIVERY', ...blue },
}

// Luồng chuẩn bị & xuất kho: PENDING → PICKING → PACKED → HANDED_OVER → IN_DELIVERY
export const FULFILLMENT_STATUS = {
  PENDING: { label: 'Chờ lấy hàng', ...red },
  PICKING: { label: 'Đang lấy hàng', ...blue },
  PACKED: { label: 'Đã đóng gói', ...cyan },
  HANDED_OVER: { label: 'Đã bàn giao xe', ...gray },
  IN_DELIVERY: { label: 'Đang giao hàng', ...blue },
}

export const FULFILLMENT_NEXT = {
  PENDING: 'PICKING',
  PICKING: 'PACKED',
  PACKED: 'HANDED_OVER',
  HANDED_OVER: 'IN_DELIVERY',
}

export const STAFF_STOCK_STATUS = {
  SAFE: { label: 'Đủ an toàn', ...cyan },
  LOW: { label: 'Cảnh báo thiếu', ...blue },
  OUT: { label: 'Hết hàng', ...red },
}

export const APPEARANCE_OPTIONS = [
  { value: 'OK', label: 'Nguyên vẹn 100%' },
  { value: 'DENTED', label: 'Móp bao bì' },
  { value: 'TORN', label: 'Rách / ướt bao bì' },
  { value: 'DAMAGED', label: 'Hư hỏng sản phẩm' },
]

export const SHORTAGE_REASONS = [
  { value: 'MISMATCH', label: 'Lệch tồn kho thực tế so với hệ thống (thất thoát / mismatch)' },
  { value: 'DAMAGED', label: 'Hàng tại vị trí bị móp méo, ướt, lỗi bao bì (không đạt tiêu chuẩn xuất)' },
  { value: 'DUPLICATE_PICK', label: 'Đã bị lấy trùng bởi nhân viên ca trước' },
  { value: 'OTHER', label: 'Khác (ghi chú chi tiết)' },
]