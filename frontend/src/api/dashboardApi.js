import dayjs from 'dayjs'
import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { dashboardMock } from '../mocks/data'
import { staffDashboardMock } from '../mocks/staffData'
import { unwrapApi, unwrapPage, toNumber } from './apiResponse'

const cash = (value) => new Intl.NumberFormat('vi-VN').format(toNumber(value))

export const getAdminDashboard = async (range = 'Ngày') => {
  if (USE_MOCK) return mockResolve(dashboardMock)
  const now = dayjs()
  const from = now.subtract(29, 'day').format('YYYY-MM-DD')
  const to = now.format('YYYY-MM-DD')
  const [summaryRes, flowRes, tenantRes] = await Promise.all([
    axiosClient.get('/dashboard/admin'),
    axiosClient.get('/dashboard/admin/flow', { params: { from, to, granularity: range === 'Tuần' ? 'week' : 'day' } }),
    axiosClient.get('/dashboard/admin/tenant-usage'),
  ])
  const summary = unwrapApi(summaryRes) ?? {}
  const points = unwrapApi(flowRes) ?? []
  const tenants = unwrapApi(tenantRes) ?? []
  return {
    kpi: {
      capacity: { percent: toNumber(summary.usedPercent), used: toNumber(summary.usedM3), total: toNumber(summary.capacityM3), reserved: 0 },
      customers: { active: summary.activeCustomers ?? 0, locked: summary.lockedCustomers ?? 0, contracts: '—' },
      inbound: { today: summary.asnToday ?? 0, parcels: '—', docking: summary.receivingCount ?? 0 },
      outbound: { orders: summary.activeOutboundOrders ?? 0, cod: toNumber(summary.codPendingAmount) },
      fee: { total: cash(summary.serviceFeeThisMonth) },
    },
    flow: (() => {
      const chartPoints = points.length >= 2 ? points : points.length === 1 ? [points[0], points[0]] : [
        { date: from, inboundQuantity: 0, outboundQuantity: 0 },
        { date: to, inboundQuantity: 0, outboundQuantity: 0 },
      ]
      const indexes = chartPoints.length > 6
        ? Array.from({ length: 6 }, (_, index) => Math.round(index * (chartPoints.length - 1) / 5))
        : chartPoints.map((_, index) => index)
      return {
        inbound: chartPoints.map((point) => toNumber(point.inboundQuantity)),
        outbound: chartPoints.map((point) => toNumber(point.outboundQuantity)),
        totalInbound: points.reduce((sum, point) => sum + toNumber(point.inboundQuantity), 0),
        totalOutbound: points.reduce((sum, point) => sum + toNumber(point.outboundQuantity), 0),
        labels: indexes.map((index) => dayjs(chartPoints[index].date).format('DD/MM')),
      }
    })(),
    tenants: tenants.map((tenant, index) => ({
      id: tenant.customerId,
      name: tenant.businessName,
      zone: '—',
      volume: toNumber(tenant.usedM3),
      percent: toNumber(tenant.quotaPercent),
      fill: Math.min(100, Math.max(0, toNumber(tenant.quotaPercent))),
      quota: `${cash(tenant.capacityM3)} m³`,
      fee: tenant.estimatedMonthlyFee == null ? 'Chưa cấu hình' : `${cash(tenant.estimatedMonthlyFee)} ₫`,
      color: ['#0057c2', '#006767', '#d48806', '#722ed1'][index % 4],
    })),
  }
}

export const getZoneUsage = async () => {
  if (USE_MOCK) return []
  return unwrapApi(await axiosClient.get('/dashboard/admin/zone-usage')) ?? []
}

const taskDisplay = {
  RECEIVE_TRUCK: ['RECEIVE', 'Tiếp nhận xe tải Dock', 'Xem ASN & Kiểm', '/staff/counting'],
  COUNT: ['COUNT', 'Đếm hàng lô thực tế', 'Bắt đầu xử lý', '/staff/counting'],
  PICK_PACK: ['PICK', 'Soạn hàng & Đóng gói', 'Bắt đầu xử lý', '/staff/outbound'],
  HANDOVER_3PL: ['HANDOVER', 'Bàn giao 3PL', 'Bàn giao 3PL', '/staff/outbound'],
}

export const getStaffDashboard = async () => {
  if (USE_MOCK) return mockResolve(staffDashboardMock)
  const [summaryRes, tasksRes] = await Promise.all([
    axiosClient.get('/dashboard/staff'),
    axiosClient.get('/dashboard/staff/tasks', { params: { page: 0, size: 100, sort: 'dueAt,asc' } }),
  ])
  const summary = unwrapApi(summaryRes) ?? {}
  const { items: taskRows, totalElements } = unwrapPage(tasksRes)
  const tasks = taskRows.map((task) => {
    const [type, typeLabel, actionLabel, defaultTo] = taskDisplay[task.taskType] ?? ['COUNT', task.taskType ?? 'Nhiệm vụ kho', 'Xem chi tiết', '/staff/inbound']
    const to = ['COUNT', 'RECEIVE_TRUCK'].includes(task.taskType) ? `/staff/counting/${task.refId}` : defaultTo
    const due = task.dueAt ? dayjs(task.dueAt) : null
    return {
      id: task.refCode ?? `${task.refType ?? 'TASK'}-${task.refId}`,
      receiptId: task.refType === 'INBOUND' ? task.refId : undefined,
      type, typeLabel, customer: task.customerName ?? '—', location: task.locationOrDock ?? '—',
      sla: due?.isValid() ? due.format('HH:mm') : '—', urgent: Boolean(due?.isValid() && due.isBefore(dayjs().add(1, 'hour'))),
      status: task.status, actionLabel, primary: type === 'RECEIVE' || type === 'PICK', to,
    }
  })
  return {
    kpi: {
      pendingAsn: summary.receivingScheduledToday ?? 0,
      openCounts: summary.openCountingReceipts ?? 0,
      pickPack: summary.outboundToPrepare ?? 0,
      discrepancy: summary.discrepancyReports ?? 0,
    },
    totalTasks: totalElements,
    tasks,
  }
}

export default { getAdminDashboard, getStaffDashboard, getZoneUsage }
