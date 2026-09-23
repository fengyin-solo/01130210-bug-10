export type WellStatus = '钻井中' | '生产中' | '待修井' | '关停井'
export type WellType = '探井' | '开发井' | '评价井'

export interface Well {
  id: number
  wellCode: string
  wellName: string
  wellType: string
  blockName: string
  longitude: number | null
  latitude: number | null
  designDepth: number | null
  status: string
  createTime: string
}

export interface WellQuery {
  wellName: string
  wellType: string
  status: string
  page: number
  size: number
}

export interface WellPageResult {
  list: Well[]
  total: number
}

export interface WellStatistics {
  wellCount: number
  drillingCount: number
  productionCount: number
  maintenanceCount: number
  shutdownCount: number
}

export type WellForm = Partial<Well> & {
  id?: number | null
  wellCode?: string
  wellName?: string
  wellType?: string
  blockName?: string
  longitude?: number | null
  latitude?: number | null
  designDepth?: number | null
  status?: string
}

export interface ApiResult<T = any> {
  code: number
  message: string
  data: T
}
