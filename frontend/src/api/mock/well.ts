import type { ApiResult, Well, WellForm, WellPageResult, WellQuery, WellStatistics } from '@/types/well'

/**
 * 井位内存 mock 服务：模拟后端 REST 接口。
 * - 数据持久化在 localStorage，保证各页面、详情页读到的是同一份数据
 * - 每个接口有网络延迟；可通过 setWellMockFail 注入接口失败
 * - 重复井号、操作不存在的井返回业务错误
 */

const STORAGE_KEY = 'mock_well_db'
const FAIL_KEY = 'mock_well_fail'

let seq = 100

const seedWells: Well[] = [
  { id: 1, wellCode: 'A-001', wellName: 'A-01井', wellType: '开发井', blockName: '胜利油田', longitude: 118.5236, latitude: 38.2356, designDepth: 3500, status: '生产中', createTime: '2024-01-01 10:00:00' },
  { id: 2, wellCode: 'B-003', wellName: 'B-03井', wellType: '探井', blockName: '胜利油田', longitude: 118.8562, latitude: 38.5123, designDepth: 4200, status: '钻井中', createTime: '2024-01-02 14:30:00' },
  { id: 3, wellCode: 'C-002', wellName: 'C-02井', wellType: '开发井', blockName: '胜利油田', longitude: 119.1254, latitude: 38.3456, designDepth: 3800, status: '生产中', createTime: '2024-01-03 09:15:00' },
  { id: 4, wellCode: 'D-005', wellName: 'D-05井', wellType: '评价井', blockName: '胜利油田', longitude: 118.6587, latitude: 38.7895, designDepth: 4000, status: '待修井', createTime: '2024-01-04 16:45:00' },
  { id: 5, wellCode: 'E-001', wellName: 'E-01井', wellType: '开发井', blockName: '胜利油田', longitude: 118.9563, latitude: 38.4562, designDepth: 3600, status: '关停井', createTime: '2024-01-05 11:20:00' }
]

function loadDb(): Well[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Well[]
  } catch (e) {
    // 数据损坏时回退到种子数据
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedWells))
  return [...seedWells]
}

function saveDb(wells: Well[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wells))
}

function nowString() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 让下一次 mock 接口调用失败（模拟接口异常），仅用于调试/测试 */
export function setWellMockFail(message = '网络异常，请稍后重试') {
  localStorage.setItem(FAIL_KEY, message)
}

/** 重置 mock 数据并清除失败标记 */
export function resetWellMock() {
  localStorage.removeItem(FAIL_KEY)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedWells))
}

function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function ensureRequestOk() {
  const failMsg = localStorage.getItem(FAIL_KEY)
  if (failMsg !== null) {
    localStorage.removeItem(FAIL_KEY)
    await delay()
    throw new Error(failMsg || '接口请求失败')
  }
}

async function respond<T>(data: T): Promise<ApiResult<T>> {
  await delay()
  await ensureRequestOk()
  return { code: 200, message: 'success', data }
}

function businessError(message: string): Promise<ApiResult<any>> {
  // 业务错误同样模拟网络耗时
  return delay().then(() => ({ code: 400, message, data: null }))
}

export async function mockGetWellList(params: WellQuery): Promise<ApiResult<WellPageResult>> {
  await ensureRequestOk()
  const all = loadDb()
  const wellName = (params.wellName || '').trim()
  let filtered = all.filter(w =>
    (!wellName || w.wellName.includes(wellName)) &&
    (!params.wellType || w.wellType === params.wellType) &&
    (!params.status || w.status === params.status)
  )
  // 新建的井排在前面
  filtered = [...filtered].sort((a, b) => b.id - a.id)

  const page = Math.max(1, Number(params.page) || 1)
  const size = Number(params.size) || 10
  const total = filtered.length
  const start = (page - 1) * size
  const list = filtered.slice(start, start + size)
  return respond({ list, total })
}

export async function mockGetWellDetail(id: number): Promise<ApiResult<Well>> {
  await ensureRequestOk()
  const well = loadDb().find(w => w.id === id)
  if (!well) return businessError(`井位不存在或已被删除（ID: ${id}）`)
  return respond(well)
}

export async function mockCreateWell(form: WellForm): Promise<ApiResult<Well>> {
  await ensureRequestOk()
  const code = (form.wellCode || '').trim()
  if (!code) return businessError('请输入井号')
  if (loadDb().some(w => w.wellCode === code)) {
    return businessError(`井号 ${code} 已存在，请勿重复提交`)
  }
  const well: Well = {
    id: ++seq,
    wellCode: code,
    wellName: form.wellName || '',
    wellType: form.wellType || '',
    blockName: form.blockName || '',
    longitude: form.longitude ?? null,
    latitude: form.latitude ?? null,
    designDepth: form.designDepth ?? null,
    status: form.status || '',
    createTime: nowString()
  }
  const db = loadDb()
  db.push(well)
  saveDb(db)
  return respond(well)
}

export async function mockUpdateWell(form: WellForm): Promise<ApiResult<Well>> {
  await ensureRequestOk()
  if (form.id == null) return businessError('缺少井位 ID，无法保存')
  const code = (form.wellCode || '').trim()
  if (!code) return businessError('请输入井号')

  const db = loadDb()
  const idx = db.findIndex(w => w.id === form.id)
  if (idx === -1) return businessError('该井位已被删除，无法保存编辑')
  if (db.some(w => w.wellCode === code && w.id !== form.id)) {
    return businessError(`井号 ${code} 已存在，请勿重复提交`)
  }

  const updated: Well = {
    ...db[idx],
    wellCode: code,
    wellName: form.wellName || '',
    wellType: form.wellType || '',
    blockName: form.blockName || '',
    longitude: form.longitude ?? null,
    latitude: form.latitude ?? null,
    designDepth: form.designDepth ?? null,
    status: form.status || ''
  }
  db.splice(idx, 1, updated)
  saveDb(db)
  return respond(updated)
}

export async function mockDeleteWell(id: number): Promise<ApiResult<null>> {
  await ensureRequestOk()

  const db = loadDb()
  const idx = db.findIndex(w => w.id === id)
  if (idx === -1) return businessError('该井位不存在或已被删除')
  db.splice(idx, 1)
  saveDb(db)
  return respond(null)
}

export async function mockGetWellStatistics(): Promise<ApiResult<WellStatistics>> {
  const wells = loadDb()
  const statistics: WellStatistics = {
    wellCount: wells.length,
    drillingCount: wells.filter(w => w.status === '钻井中').length,
    productionCount: wells.filter(w => w.status === '生产中').length,
    maintenanceCount: wells.filter(w => w.status === '待修井').length,
    shutdownCount: wells.filter(w => w.status === '关停井').length
  }
  return respond(statistics)
}
