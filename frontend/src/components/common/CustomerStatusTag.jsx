import { Tag } from 'antd';

const statusLabels = {
  SCHEDULED: 'Chờ tiếp nhận',
  RECEIVING: 'Đang tiếp nhận',
  CONFIRMED: 'Đã nhập kho',
  CANCELLED: 'Đã hủy',
  PENDING: 'Chờ xử lý',
  PREPARING: 'Đang soạn hàng',
  PACKED: 'Đã đóng gói',
  IN_DELIVERY: 'Đang giao',
  DELIVERED: 'Đã giao',
  RETURNED: 'Đã hoàn hàng',
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
  ACTIVE: 'Đang lưu kho',
  HIDDEN: 'Đã ẩn',
  SAFE: 'Đủ hàng',
  LOW: 'Sắp hết',
  OUT_OF_STOCK: 'Hết hàng',
  NEAR_EXPIRY: 'Gần hết hạn',
  NONE: 'Không áp dụng',
  PENDING_RECONCILE: 'Chờ đối soát',
  COLLECTED: 'Đã thu hộ',
};

const statusColors = {
  SCHEDULED: 'processing',
  RECEIVING: 'blue',
  CONFIRMED: 'success',
  CANCELLED: 'default',
  PENDING: 'warning',
  PREPARING: 'processing',
  PACKED: 'cyan',
  IN_DELIVERY: 'blue',
  DELIVERED: 'success',
  RETURNED: 'orange',
  UNPAID: 'warning',
  PAID: 'success',
  OVERDUE: 'error',
  ACTIVE: 'success',
  HIDDEN: 'default',
  SAFE: 'success',
  LOW: 'warning',
  OUT_OF_STOCK: 'error',
  NEAR_EXPIRY: 'orange',
  NONE: 'default',
  PENDING_RECONCILE: 'processing',
  COLLECTED: 'blue',
};

export default function StatusTag({ status, label }) {
  if (!status) return <Tag>Chưa cập nhật</Tag>;
  return <Tag color={statusColors[status] || 'default'}>{label || statusLabels[status] || status}</Tag>;
}
