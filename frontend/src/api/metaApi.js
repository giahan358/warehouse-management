import axiosClient, { USE_MOCK, mockResolve } from './axiosClient'
import { unwrapApi } from './apiResponse'

export const getOptions = async () => {
  if (USE_MOCK) return mockResolve(null)
  return unwrapApi(await axiosClient.get('/meta/options'))
}

export default { getOptions }
