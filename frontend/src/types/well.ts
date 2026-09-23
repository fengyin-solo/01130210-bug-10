export interface Well {
  id: number
  wellCode: string
  wellName: string
  wellType: string
  blockName: string
  longitude: number
  latitude: number
  designDepth: number
  status: string
  createTime: string
}

export interface WellForm {
  id: number | null
  wellCode: string
  wellName: string
  wellType: string
  blockName: string
  longitude: number | null
  latitude: number | null
  designDepth: number | null
  status: string
}

export interface WellQuery {
  wellName: string
  wellType: string
  status: string
}

export interface WellListResult {
  list: Well[]
  total: number
}

export interface WellStatistics {
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  byBlock: Record<string, number>
}

/** 与后端约定的统一响应结构，与 utils/request.ts 拦截器处理的结构一致 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}
