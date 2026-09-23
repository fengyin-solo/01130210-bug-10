import type { ApiResponse, Well, WellListResult, WellStatistics } from '@/types/well'

/**
 * Mock 后端：在没有真实后端服务时，模拟 /well 系列接口。
 * 数据保存在模块内存中，刷新页面后恢复初始种子数据。
 * 切换真实后端时，只需把 api/well.ts 改回 request 调用，本文件可删除。
 */

let seq = 5

const seedData: Well[] = [
  { id: 1, wellCode: 'A-001', wellName: 'A-01井', wellType: '开发井', blockName: '胜利油田', longitude: 118.5236, latitude: 38.2356, designDepth: 3500, status: '生产中', createTime: '2024-01-01 10:00:00' },
  { id: 2, wellCode: 'B-003', wellName: 'B-03井', wellType: '探井', blockName: '胜利油田', longitude: 118.8562, latitude: 38.5123, designDepth: 4200, status: '钻井中', createTime: '2024-01-02 14:30:00' },
  { id: 3, wellCode: 'C-002', wellName: 'C-02井', wellType: '开发井', blockName: '胜利油田', longitude: 119.1254, latitude: 38.3456, designDepth: 3800, status: '生产中', createTime: '2024-01-03 09:15:00' },
  { id: 4, wellCode: 'D-005', wellName: 'D-05井', wellType: '评价井', blockName: '胜利油田', longitude: 118.6587, latitude: 38.7895, designDepth: 4000, status: '待修井', createTime: '2024-01-04 16:45:00' },
  { id: 5, wellCode: 'E-001', wellName: 'E-01井', wellType: '开发井', blockName: '胜利油田', longitude: 118.9563, latitude: 38.4562, designDepth: 3600, status: '关停井', createTime: '2024-01-05 11:20:00' }
]

const db: Well[] = seedData.map(item => ({ ...item }))

/**
 * 接口失败模拟开关。打开后下一次任意井位接口请求会返回 500，
 * 用于演示/验证"接口失败时拒绝操作并说明原因"。
 */
export const mockFailState = { next: false }

const LATENCY = 300

const delay = (ms = LATENCY) => new Promise(resolve => setTimeout(resolve, ms))

const formatTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 模拟服务端响应包装（统一延迟与响应结构） */
async function mock<T>(data: T, code = 200, message = '操作成功'): Promise<ApiResponse<T>> {
  await delay()
  return { code, message, data }
}

/**
 * 失败注入判定：必须在任何数据变更之前调用。
 * 命中时消费一次开关，调用方直接返回 500，且不得再执行落库逻辑。
 */
function failArmed(): boolean {
  if (mockFailState.next) {
    mockFailState.next = false
    return true
  }
  return false
}

const FAIL_MESSAGE = '接口请求失败（模拟网络异常），请稍后重试'

const matchQuery = (well: Well, params?: any) => {
  if (params?.wellName && !well.wellName.includes(String(params.wellName).trim())) return false
  if (params?.wellType && well.wellType !== params.wellType) return false
  if (params?.status && well.status !== params.status) return false
  return true
}

const sameCode = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export async function mockGetWellList(params?: any): Promise<ApiResponse<WellListResult>> {
  if (failArmed()) return mock(null as unknown as WellListResult, 500, FAIL_MESSAGE)
  const page = Number(params?.page) || 1
  const size = Number(params?.size) || 10
  const filtered = db.filter(item => matchQuery(item, params))
  const start = (page - 1) * size
  return mock({
    list: filtered.slice(start, start + size).map(item => ({ ...item })),
    total: filtered.length
  })
}

export async function mockGetAllWells(): Promise<ApiResponse<Well[]>> {
  if (failArmed()) return mock(null as unknown as Well[], 500, FAIL_MESSAGE)
  return mock(db.map(item => ({ ...item })))
}

export async function mockGetWellDetail(id: number): Promise<ApiResponse<Well>> {
  if (failArmed()) return mock(null as unknown as Well, 500, FAIL_MESSAGE)
  const well = db.find(item => item.id === id)
  if (!well) {
    return mock(null as unknown as Well, 404, `井位不存在或已被删除（ID: ${id}）`)
  }
  return mock({ ...well })
}

export async function mockCreateWell(data: Partial<Well>): Promise<ApiResponse<Well>> {
  if (failArmed()) return mock(null as unknown as Well, 500, FAIL_MESSAGE)
  const code = (data.wellCode || '').trim()
  if (db.some(item => sameCode(item.wellCode, code))) {
    return mock(null as unknown as Well, 409, `井号 ${code} 已存在，请更换井号后提交`)
  }
  const well: Well = {
    id: ++seq,
    wellCode: code,
    wellName: data.wellName || '',
    wellType: data.wellType || '',
    blockName: data.blockName || '',
    longitude: Number(data.longitude) || 0,
    latitude: Number(data.latitude) || 0,
    designDepth: Number(data.designDepth) || 0,
    status: data.status || '',
    createTime: formatTime(new Date())
  }
  db.unshift(well)
  return mock({ ...well }, 200, '新增成功')
}

export async function mockUpdateWell(data: Partial<Well> & { id: number }): Promise<ApiResponse<Well>> {
  if (failArmed()) return mock(null as unknown as Well, 500, FAIL_MESSAGE)
  const index = db.findIndex(item => item.id === data.id)
  if (index === -1) {
    return mock(null as unknown as Well, 404, '该井位已被删除，无法保存编辑，请刷新列表')
  }
  const code = (data.wellCode || '').trim()
  if (db.some(item => item.id !== data.id && sameCode(item.wellCode, code))) {
    return mock(null as unknown as Well, 409, `井号 ${code} 已被其他井位占用，请更换井号后提交`)
  }
  db[index] = {
    ...db[index],
    ...data,
    wellCode: code,
    longitude: Number(data.longitude) || 0,
    latitude: Number(data.latitude) || 0,
    designDepth: Number(data.designDepth) || 0
  }
  return mock({ ...db[index] }, 200, '编辑成功')
}

export async function mockDeleteWell(id: number): Promise<ApiResponse<null>> {
  if (failArmed()) return mock(null, 500, FAIL_MESSAGE)
  const index = db.findIndex(item => item.id === id)
  if (index === -1) {
    return mock(null, 404, '该井位已被删除，列表数据可能不是最新，请刷新后重试')
  }
  db.splice(index, 1)
  return mock(null, 200, '删除成功')
}

export async function mockGetWellStatistics(): Promise<ApiResponse<WellStatistics>> {
  if (failArmed()) return mock(null as unknown as WellStatistics, 500, FAIL_MESSAGE)
  const byStatus: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const byBlock: Record<string, number> = {}
  for (const well of db) {
    byStatus[well.status] = (byStatus[well.status] || 0) + 1
    byType[well.wellType] = (byType[well.wellType] || 0) + 1
    byBlock[well.blockName] = (byBlock[well.blockName] || 0) + 1
  }
  return mock({ total: db.length, byStatus, byType, byBlock })
}
