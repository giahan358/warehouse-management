export function unwrapApi(response) {
  const body = response?.data ?? response
  if (body && typeof body === 'object' && body.success === false) {
    throw new Error(body.message || body.error?.message || 'Yêu cầu không thành công.')
  }
  return body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'data')
    ? body.data
    : body
}

export function unwrapPage(response) {
  const body = response?.data ?? response
  const data = unwrapApi(response)
  if (Array.isArray(data)) return { items: data, page: 0, size: data.length, totalElements: data.length, totalPages: 1 }
  const items = data?.content ?? data?.items ?? []
  return {
    items,
    page: data?.page ?? body?.meta?.page ?? 0,
    size: data?.size ?? body?.meta?.size ?? items.length,
    totalElements: data?.totalElements ?? body?.meta?.totalElements ?? items.length,
    totalPages: data?.totalPages ?? body?.meta?.totalPages ?? 1,
  }
}

export function toNumber(value) {
  if (value == null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

