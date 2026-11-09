import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { inventoryMock } from '../mocks/data'
import { staffInventoryMock } from '../mocks/staffData'
import { stockHistoryMock, skuTenantOptions } from '../mocks/popupData'

export const getAll = (params) =>
  USE_MOCK ? mockResolve([...inventoryMock]) : axiosClient.get('/inventory', { params })

// Nhân viên kho: chỉ xem (tồn kho chỉ đổi qua xác nhận nhập kho / xuất kho)
export const getStaffInventory = (params) =>
  USE_MOCK ? mockResolve(staffInventoryMock) : axiosClient.get('/inventory', { params })

// Thẻ kho & lịch sử biến động tồn của 1 SKU
export const getStockHistory = (sku) =>
  USE_MOCK ? mockResolve(stockHistoryMock[sku] ?? []) : axiosClient.get(`/inventory/${sku}/history`)

// Khai báo SKU mới (Product Master Data - UC06). Tồn ban đầu = 0, chỉ tăng qua phiếu nhập kho.
export const createSku = (payload) => {
  if (!USE_MOCK) return axiosClient.post('/products', payload)
  const owner = skuTenantOptions.find((t) => t.value === payload.tenantId)?.label.split(' (')[0] ?? payload.tenantId
  const row = {
    sku: payload.sku, tag: payload.categoryTag, name: payload.name, owner,
    bin: `Z${payload.zone}-CHƯA GÁN`, onHand: 0, allocated: 0, unit: payload.uom,
    status: 'OUT', received: '—', note: 'Chờ nhập kho lần đầu',
  }
  inventoryMock.unshift(row)
  return mockResolve(row)
}

// Lệnh điều chuyển vị trí (xuất ra PDA của tổ xe nâng)
// payload: { skus[], zone, rack, shelf, bin, quantity, reason }
export const relocate = (payload) =>
  USE_MOCK ? mockResolve(payload) : axiosClient.post('/inventory/relocations', payload)

// Phiếu kiểm kê: { zone, type: 'ROLLING' | 'FULL', note }
export const createAudit = (payload) =>
  USE_MOCK ? mockResolve({ id: `KK-${Date.now().toString().slice(-6)}`, ...payload }) : axiosClient.post('/inventory/audits', payload)

export default { getAll, getStaffInventory, getStockHistory, createSku, relocate, createAudit }
