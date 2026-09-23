import { defineStore } from 'pinia'
import {
  createWell,
  deleteWell,
  getWellDetail,
  getWellList,
  getWellStatistics,
  updateWell
} from '@/api/well'
import type { Well, WellForm, WellPageResult, WellQuery, WellStatistics } from '@/types/well'

interface WellState {
  /** 列表数据与分页 */
  list: Well[]
  total: number
  listLoading: boolean
  listError: string

  /** 筛选条件：进入详情页再返回时原样保留 */
  filters: {
    wellName: string
    wellType: string
    status: string
  }
  page: number
  size: number

  /** 统计 */
  statistics: WellStatistics | null
  statisticsLoading: boolean

  /** 详情缓存：列表页与详情页共用同一份数据 */
  detailCache: Record<number, Well>
  detailLoading: boolean
  detailError: string

  /** 编辑中的草稿：刷新列表、跳转详情再返回都不会丢失 */
  editingWell: WellForm | null
  editingMode: 'create' | 'edit'
  submitting: boolean

  deletingId: number | null
}

const EMPTY_STATISTICS: WellStatistics = {
  wellCount: 0,
  drillingCount: 0,
  productionCount: 0,
  maintenanceCount: 0,
  shutdownCount: 0
}

function unwrap<T>(res: { code: number; message: string; data: T }): T {
  if (res.code !== 200) throw new Error(res.message || '接口请求失败')
  return res.data
}

function cloneForm(well: WellForm): WellForm {
  return {
    id: well.id ?? null,
    wellCode: well.wellCode ?? '',
    wellName: well.wellName ?? '',
    wellType: well.wellType ?? '',
    blockName: well.blockName ?? '',
    longitude: well.longitude ?? null,
    latitude: well.latitude ?? null,
    designDepth: well.designDepth ?? null,
    status: well.status ?? ''
  }
}

function emptyForm(): WellForm {
  return {
    id: null,
    wellCode: '',
    wellName: '',
    wellType: '',
    blockName: '',
    longitude: null,
    latitude: null,
    designDepth: null,
    status: ''
  }
}

export const useWellStore = defineStore('well', {
  state: (): WellState => ({
    list: [],
    total: 0,
    listLoading: false,
    listError: '',

    filters: { wellName: '', wellType: '', status: '' },
    page: 1,
    size: 10,

    statistics: null,
    statisticsLoading: false,

    detailCache: {},
    detailLoading: false,
    detailError: '',

    editingWell: null,
    editingMode: 'create',
    submitting: false,

    deletingId: null
  }),

  getters: {
    wellStatistics(state): WellStatistics {
      return state.statistics ?? EMPTY_STATISTICS
    },
    getCachedWell: state => (id: number): Well | undefined => state.detailCache[id]
  },

  actions: {
    buildQuery(): WellQuery {
      return { ...this.filters, page: this.page, size: this.size }
    },

    /** 拉取列表（保留当前筛选） */
    async fetchList() {
      this.listLoading = true
      this.listError = ''
      try {
        const data = unwrap<WellPageResult>(await getWellList(this.buildQuery()))
        this.list = data.list
        this.total = data.total
        // 列表数据同步进详情缓存，保证两个入口同源
        data.list.forEach(w => {
          this.detailCache[w.id] = w
        })
      } catch (e: any) {
        this.listError = e?.message || '井位列表加载失败'
        throw e
      } finally {
        this.listLoading = false
      }
    },

    /** 拉取统计（驾驶舱、列表共用） */
    async fetchStatistics() {
      this.statisticsLoading = true
      try {
        this.statistics = unwrap<WellStatistics>(await getWellStatistics())
      } finally {
        this.statisticsLoading = false
      }
    },

    /** 编辑/删除/返回后同时刷新列表与统计 */
    async refreshAll() {
      await Promise.all([this.fetchList(), this.fetchStatistics()])
    },

    /** 详情页：优先用缓存（与列表同源），首次进入或被删除时请求接口确认 */
    async fetchDetail(id: number, force = false) {
      this.detailLoading = true
      this.detailError = ''
      try {
        if (!force && this.detailCache[id]) {
          return this.detailCache[id]
        }
        const well = unwrap<Well>(await getWellDetail(id))
        this.detailCache[id] = well
        return well
      } catch (e: any) {
        this.detailError = e?.message || '井位详情加载失败'
        // 接口确认井已不存在时清掉可能残留的旧缓存
        if (/不存在|已被删除/.test(this.detailError)) {
          delete this.detailCache[id]
        }
        throw e
      } finally {
        this.detailLoading = false
      }
    },

    setFilters(filters: Partial<WellState['filters']>) {
      Object.assign(this.filters, filters)
    },

    resetFilters() {
      this.filters = { wellName: '', wellType: '', status: '' }
      this.page = 1
    },

    setPage(page: number) {
      this.page = page
    },

    setSize(size: number) {
      this.size = size
      this.page = 1
    },

    openCreate() {
      this.editingMode = 'create'
      this.editingWell = emptyForm()
    },

    openEdit(well: Well) {
      this.editingMode = 'edit'
      this.editingWell = cloneForm(well)
    },

    /** 取消/保存成功后清除草稿 */
    closeEditor() {
      this.editingWell = null
    },

    /** 保存草稿（新增/编辑）；失败时抛出原因，草稿原样保留 */
    async saveEditing() {
      if (!this.editingWell) throw new Error('没有正在编辑的井位')
      this.submitting = true
      try {
        const form = cloneForm(this.editingWell)
        if (this.editingMode === 'create') {
          const well = unwrap<Well>(await createWell(form))
          this.editingWell = null
          // 新增后回到第一页，确保能看到新建的井
          this.page = 1
          await this.refreshAll()
          return well
        } else {
          const well = unwrap<Well>(await updateWell(form))
          this.editingWell = null
          this.detailCache[well.id] = well
          await this.refreshAll()
          return well
        }
      } finally {
        this.submitting = false
      }
    },

    /**
     * 删除井位：
     * - 正在编辑该井（草稿未保存）时拒绝
     * - 接口失败时抛出原因，列表不做本地修改
     */
    async removeWell(well: Well) {
      if (
        this.editingWell &&
        this.editingMode === 'edit' &&
        this.editingWell.id === well.id
      ) {
        throw new Error(`${well.wellName} 正在编辑中，请先保存或取消编辑后再删除`)
      }

      this.deletingId = well.id
      try {
        unwrap(await deleteWell(well.id))
        delete this.detailCache[well.id]

        // 当前页删空且不是第一页时回退一页，避免停留在空页
        const isLastItemOnPage = this.list.length === 1 && this.page > 1
        if (isLastItemOnPage) this.page -= 1

        await this.refreshAll()
      } finally {
        this.deletingId = null
      }
    }
  }
})
