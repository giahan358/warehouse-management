export const LOW_STOCK_THRESHOLD = 100

export const getAvailable = (r) => (r.onHand ?? 0) - (r.allocated ?? 0)

// OUT: hết hàng | LOW: khả dụng ≤ 100 | SAFE: còn lại
export function getStockStatus(r) {
  if (!r.onHand) return 'OUT'
  return getAvailable(r) <= LOW_STOCK_THRESHOLD ? 'LOW' : 'SAFE'
}
