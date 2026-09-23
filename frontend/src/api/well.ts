import type { WellForm, WellQuery } from '@/types/well'
import {
  mockCreateWell,
  mockDeleteWell,
  mockGetWellDetail,
  mockGetWellList,
  mockGetWellStatistics,
  mockUpdateWell
} from './mock/well'

// 当前项目无后端，接口由前端 mock 提供；切换真实后端时只需将实现换回 request(...)
export function getWellList(params: WellQuery) {
  return mockGetWellList(params)
}

export function getWellDetail(id: number) {
  return mockGetWellDetail(id)
}

export function createWell(data: WellForm) {
  return mockCreateWell(data)
}

export function updateWell(data: WellForm) {
  return mockUpdateWell(data)
}

export function deleteWell(id: number) {
  return mockDeleteWell(id)
}

export function getWellStatistics() {
  return mockGetWellStatistics()
}
