export const formatCurrency = (v) =>
  `${new Intl.NumberFormat('vi-VN').format(v ?? 0)} ₫`

export const formatNumber = (v) => new Intl.NumberFormat('vi-VN').format(v ?? 0)
