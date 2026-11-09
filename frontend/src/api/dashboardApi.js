import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { dashboardMock } from '../mocks/data'
import { staffDashboardMock } from '../mocks/staffData'

export const getAdminDashboard = () =>
  USE_MOCK ? mockResolve(dashboardMock) : axiosClient.get('/dashboard/admin')

export const getStaffDashboard = () =>
  USE_MOCK ? mockResolve(staffDashboardMock) : axiosClient.get('/dashboard/staff')

export default { getAdminDashboard, getStaffDashboard }
