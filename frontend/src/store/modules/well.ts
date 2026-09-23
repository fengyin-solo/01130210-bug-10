import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import {
  getAllWells,
  createWell,
  updateWell,
  deleteWell
} from '@/api/well'
import type { Well, WellForm, WellQuery, WellStatistics } from '@/types/well'

const emptyForm = (): WellForm => ({
  id: null,
  wellCode: '',
  wellName: '',
  wellType: '',
  blockName: '',
  longitude: null,
  latitude: null,
  designDepth: null,
  status: ''
})

interface WellState {
  /** 全量井位，列表页、详情页、驾驶舱、生命周期共用的唯一数据源 */
  wells: Well[]
  loaded: boolean
  loading: boolean
  query: WellQuery
  page: number
  size: number
  dialogVisible: boolean
  dialogMode: 'add' | 'edit'
  /** 编辑中的表单草稿，独立于 wells 中的行数据，保存成功后才写回 */
  draft: WellForm
  submitting: boolean
}

export const useWellStore = defineStore('well', {
  state: (): WellState => ({
    wells: [],
    loaded: false,
    loading: false,
    query: { wellName: '', wellType: '', status: '' },
    page: 1,
    size: 10,
    dialogVisible: false,
    dialogMode: 'add',
    draft: emptyForm(),
    submitting: false
  }),

  getters: {
    /** 按当前筛选条件过滤后的井位（筛选存在 store，路由返回不丢失） */
    filteredWells(state): Well[] {
      const name = state.query.wellName.trim()
      return state.wells.filter(well => {
        if (name && !well.wellName.includes(name)) return false
        if (state.query.wellType && well.wellType !== state.query.wellType) return false
        if (state.query.status && well.status !== state.query.status) return false
        return true
      })
    },

    /** 当前页表格数据 */
    pagedWells(): Well[] {
      const start = (this.page - 1) * this.size
      return this.filteredWells.slice(start, start + this.size)
    },

    total(): number {
      return this.filteredWells.length
    },

    getWellById: (state) => (id: number | string | null): Well | undefined => {
      if (id == null) return undefined
      const numId = Number(id)
      return state.wells.find(well => well.id === numId)
    },

    /** 由 wells 直接派生，任何入口拿到的统计都不会残留旧值 */
    statistics(state): WellStatistics {
      const byStatus: Record<string, number> = {}
      const byType: Record<string, number> = {}
      const byBlock: Record<string, number> = {}
      for (const well of state.wells) {
        byStatus[well.status] = (byStatus[well.status] || 0) + 1
        byType[well.wellType] = (byType[well.wellType] || 0) + 1
        byBlock[well.blockName] = (byBlock[well.blockName] || 0) + 1
      }
      return { total: state.wells.length, byStatus, byType, byBlock }
    },

    dialogTitle(state): string {
      return state.dialogMode === 'edit' ? '编辑井位' : '新增井位'
    }
  },

  actions: {
    /** 拉取全量井位 */
    async fetchWells(force = false) {
      if (this.loading) return
      if (this.loaded && !force) return
      this.loading = true
      try {
        const res = await getAllWells()
        this.wells = res.data
        this.loaded = true
        this.clampPage()
      } catch (e: any) {
        ElMessage.error(e?.message || '井位列表加载失败')
        throw e
      } finally {
        this.loading = false
      }
    },

    /** 强制刷新：编辑、删除、从详情返回都调用它，列表与统计基于同一份数据同时更新 */
    async refresh() {
      return this.fetchWells(true)
    },

    setQuery(query: Partial<WellQuery>) {
      Object.assign(this.query, query)
      this.page = 1
    },

    resetQuery() {
      this.query = { wellName: '', wellType: '', status: '' }
      this.page = 1
    },

    setPage(page: number) {
      this.page = page
    },

    setSize(size: number) {
      this.size = size
      this.page = 1
    },

    /** 删除/刷新后当前页可能越界，回退到最后一个有效页 */
    clampPage() {
      const maxPage = Math.max(1, Math.ceil(this.filteredWells.length / this.size))
      if (this.page > maxPage) this.page = maxPage
    },

    openAddDialog() {
      this.dialogMode = 'add'
      this.draft = emptyForm()
      this.dialogVisible = true
    },

    openEditDialog(well: Well) {
      this.dialogMode = 'edit'
      // 拷贝一份，草稿改动不直接污染共享数据，保存成功后才生效
      this.draft = { ...emptyForm(), ...well }
      this.dialogVisible = true
    },

    /** 取消/关闭弹窗：丢弃草稿 */
    discardDraft() {
      this.dialogVisible = false
      this.draft = emptyForm()
    },

    /** 某口井是否正处于编辑弹窗中（草稿尚未提交） */
    isEditingWell(id: number): boolean {
      return this.dialogVisible && this.dialogMode === 'edit' && this.draft.id === id
    },

    async saveDraft(): Promise<boolean> {
      if (this.submitting) return false
      const payload = { ...this.draft, wellCode: this.draft.wellCode.trim() }
      this.submitting = true
      try {
        if (this.dialogMode === 'edit') {
          await updateWell(payload)
        } else {
          await createWell(payload)
        }
        // 保存成功：关闭弹窗、清草稿，并用同一份数据刷新列表与所有入口统计
        this.dialogVisible = false
        this.draft = emptyForm()
        ElMessage.success(this.dialogMode === 'edit' ? '编辑成功' : '新增成功')
        await this.refresh()
        return true
      } catch (e: any) {
        // 接口失败 / 重复井号：拒绝提交，说明原因，弹窗与草稿保留
        ElMessage.error(e?.message || '保存失败，请稍后重试')
        return false
      } finally {
        this.submitting = false
      }
    },

    async removeWell(id: number): Promise<boolean> {
      // 正在编辑该井：拒绝删除，避免草稿无法保存、总数与详情对不上
      if (this.isEditingWell(id)) {
        ElMessage.warning('该井位正在编辑中，请先完成保存或取消编辑后再删除')
        return false
      }
      try {
        await deleteWell(id)
        ElMessage.success('删除成功')
        // 删除成功：刷新同一份数据，列表、总数、详情入口、其他页面统计同时更新
        await this.refresh()
        return true
      } catch (e: any) {
        // 接口失败（含该井已被他人删除的 404）：拒绝并说明原因
        ElMessage.error(e?.message || '删除失败，请稍后重试')
        return false
      }
    }
  }
})
