import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { inventoryMock } from '../mocks/data'
import { staffInventoryMock } from '../mocks/staffData'
import { stockHistoryMock } from '../mocks/popupData'
import { unwrapApi, unwrapPage, toNumber } from './apiResponse'

const normalizeInventory = (row) => ({
  ...row,
  id: row.inventoryId,
  productId: row.productId,
  sku: row.sku ?? '—',
  name: row.productName ?? '—',
  owner: row.customerName ?? '—',
  ownerId: row.customerId,
  tag: row.category ?? '—',
  zone: row.zone ?? row.locationCode?.match(/^Z?([A-Z])/i)?.[1] ?? '—',
  bin: row.locationCode ?? '—',
  onHand: toNumber(row.onHand),
  allocated: toNumber(row.allocated),
  available: toNumber(row.available),
  unit: row.unit ?? '—',
  status: row.stockStatus === 'OUT_OF_STOCK' ? 'OUT' : row.stockStatus === 'NEAR_EXPIRY' ? 'EXPIRING' : row.stockStatus ?? (toNumber(row.onHand) === 0 ? 'OUT' : 'SAFE'),
  received: row.lastInboundAt ? new Date(row.lastInboundAt).toLocaleDateString('vi-VN') : '—',
  note: row.expiryDate ? `Hạn sử dụng: ${new Date(`${row.expiryDate}T00:00:00`).toLocaleDateString('vi-VN')}` : '',
  volume: row.volumeM3 == null ? null : toNumber(row.volumeM3),
})

async function getLiveInventory(params) {
  return unwrapPage(await axiosClient.get('/inventory', { params }))
}

export const getAll = async (params) => {
  if (USE_MOCK) return mockResolve([...inventoryMock])
  const [productsResponse, inventoryResponse, customersResponse] = await Promise.all([
    axiosClient.get('/products', { params: { page: 0, size: 100, ...params } }),
    axiosClient.get('/inventory', { params: { page: 0, size: 100, ...params } }),
    axiosClient.get('/customers', { params: { page: 0, size: 100 } }),
  ])
  const products = unwrapPage(productsResponse).items
  const inventory = unwrapPage(inventoryResponse).items.map(normalizeInventory)
  const customers = unwrapPage(customersResponse).items
  const inventoryByProduct = new Map(inventory.map((row) => [row.productId, row]))
  const customerNames = new Map(customers.map((row) => [row.id, row.businessName]))
  return products.map((product) => {
    const stock = inventoryByProduct.get(product.id)
    const status = product.stockStatus === 'OUT_OF_STOCK' ? 'OUT' : product.stockStatus === 'NEAR_EXPIRY' ? 'EXPIRING' : product.stockStatus
    return {
      ...stock,
      id: stock?.id ?? product.id,
      inventoryId: stock?.inventoryId,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      tag: product.category ?? '—',
      owner: stock?.owner ?? customerNames.get(product.customerId) ?? '—',
      ownerId: product.customerId,
      bin: stock?.bin ?? '—',
      zone: stock?.zone ?? '—',
      onHand: toNumber(product.onHand),
      allocated: toNumber(product.allocated),
      available: toNumber(product.available),
      unit: product.unit ?? '—',
      status,
      received: stock?.received ?? '—',
      note: stock?.note ?? '',
      volume: toNumber(product.volumeM3),
    }
  })
}

export const getStaffInventory = async (params) => {
  if (USE_MOCK) return mockResolve(staffInventoryMock)
  return (await getLiveInventory(params)).items.map(normalizeInventory)
}

export const getSummary = async (params) => {
  if (USE_MOCK) return mockResolve(null)
  return unwrapApi(await axiosClient.get('/inventory/summary', { params }))
}

// BE exposes a product's current stock, not a movement history endpoint.
export const getStockHistory = async (productId) => {
  if (USE_MOCK) return mockResolve(stockHistoryMock[productId] ?? [])
  throw new Error('Backend hiện chưa có API lịch sử biến động tồn kho.')
}

export const createSku = async (payload) => {
  if (USE_MOCK) {
    const { skuTenantOptions } = await import('../mocks/popupData')
    const owner = skuTenantOptions.find((t) => t.value === payload.tenantId)?.label.split(' (')[0] ?? payload.tenantId
    const row = { ...payload, sku: payload.sku, tag: payload.categoryTag, name: payload.name, owner,
      bin: `Z${payload.zone}-CHƯA GÁN`, onHand: 0, allocated: 0, unit: payload.uom,
      status: 'OUT', received: '—', note: 'Chờ nhập kho lần đầu' }
    inventoryMock.unshift(row)
    return mockResolve(row)
  }
  const dimensions = String(payload.dimensions ?? '').split(/[x×]/i).map((value) => Number(value.trim()))
  if (dimensions.length !== 3 || dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error('Kích thước sản phẩm cần đủ Dài × Rộng × Cao (cm).')
  }
  const request = {
    customerId: Number(payload.tenantId), sku: payload.sku, barcode: payload.barcode,
    name: payload.name, category: payload.category, unit: payload.uom,
    lengthCm: dimensions[0], widthCm: dimensions[1], heightCm: dimensions[2],
  }
  const product = unwrapApi(await axiosClient.post('/products', request))
  return normalizeInventory({ ...product, customerName: payload.tenantName, inventoryId: null, onHand: 0, allocated: 0, available: 0 })
}

export const relocate = async ({ targets = [], zone, rack, shelf, bin }) => {
  if (USE_MOCK) return mockResolve({ targets, zone, rack, shelf, bin })
  if (!targets.length || !zone || !rack || !shelf || !bin) throw new Error('Cần chọn tồn kho và vị trí kệ mới.')
  const locationCode = `Z${zone}-${rack}-${shelf}-${bin}`
  return Promise.all(targets.map(async (target) => {
    const inventoryId = target.inventoryId ?? target.id
    return unwrapApi(await axiosClient.patch(`/inventory/${inventoryId}/location`, { locationCode }))
  }))
}

// There is no inventory audit/adjustment API in the current BE.
export const createAudit = (payload) => USE_MOCK
  ? mockResolve({ id: `KK-${Date.now().toString().slice(-6)}`, ...payload })
  : Promise.reject(new Error('Backend hiện chưa có API tạo phiếu kiểm kê.'))

export default { getAll, getStaffInventory, getSummary, getStockHistory, createSku, relocate, createAudit }
