import request from '@/utils/request'
import type { ApiResponse } from '@/types/well'
import {
  mockGetWellList,
  mockGetAllWells,
  mockGetWellDetail,
  mockCreateWell,
  mockUpdateWell,
  mockDeleteWell,
  mockGetWellStatistics
} from './mock/well'

export { mockFailState } from './mock/well'

/**
 * 当前无可用后端，井位接口走本地 mock（见 ./mock/well.ts）。
 * mock 与真实后端响应结构一致（{ code, message, data }）：
 * code !== 200 时 reject，错误说明通过 Error.message 抛出，由调用方统一提示。
 * 接入真实后端时，把 USE_MOCK 置为 false 即可（真实请求的错误提示由
 * utils/request.ts 拦截器负责，store 中的提示可相应移除以免重复）。
 */
const USE_MOCK = true

function unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
  return promise.then(res => {
    if (res.code !== 200) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  })
}

const realApi = {
  getWellList: (params: any) => request({ url: '/well/list', method: 'get', params }),
  getAllWells: () => request({ url: '/well/all', method: 'get' }),
  getWellDetail: (id: number) => request({ url: `/well/${id}`, method: 'get' }),
  createWell: (data: any) => request({ url: '/well', method: 'post', data }),
  updateWell: (data: any) => request({ url: '/well', method: 'put', data }),
  deleteWell: (id: number) => request({ url: `/well/${id}`, method: 'delete' }),
  getWellStatistics: () => request({ url: '/well/statistics', method: 'get' })
}

export function getWellList(params: any) {
  return USE_MOCK ? unwrap(mockGetWellList(params)) : realApi.getWellList(params)
}

/** 获取全量井位（不分页），供共享数据源、下拉选项和统计使用 */
export function getAllWells() {
  return USE_MOCK ? unwrap(mockGetAllWells()) : realApi.getAllWells()
}

export function getWellDetail(id: number) {
  return USE_MOCK ? unwrap(mockGetWellDetail(id)) : realApi.getWellDetail(id)
}

export function createWell(data: any) {
  return USE_MOCK ? unwrap(mockCreateWell(data)) : realApi.createWell(data)
}

export function updateWell(data: any) {
  return USE_MOCK ? unwrap(mockUpdateWell(data)) : realApi.updateWell(data)
}

export function deleteWell(id: number) {
  return USE_MOCK ? unwrap(mockDeleteWell(id)) : realApi.deleteWell(id)
}

export function getWellStatistics() {
  return USE_MOCK ? unwrap(mockGetWellStatistics()) : realApi.getWellStatistics()
}
