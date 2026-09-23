<template>
  <div class="well-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>井位管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增井位
          </el-button>
        </div>
      </template>

      <el-form :model="wellStore.filters" inline class="mb-20">
        <el-form-item label="井名">
          <el-input v-model="wellStore.filters.wellName" placeholder="请输入井名" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="井型">
          <el-select v-model="wellStore.filters.wellType" placeholder="请选择井型" clearable>
            <el-option label="探井" value="探井" />
            <el-option label="开发井" value="开发井" />
            <el-option label="评价井" value="评价井" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="wellStore.filters.status" placeholder="请选择状态" clearable>
            <el-option label="钻井中" value="钻井中" />
            <el-option label="生产中" value="生产中" />
            <el-option label="待修井" value="待修井" />
            <el-option label="关停井" value="关停井" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="wellStore.listError"
        :title="wellStore.listError"
        type="error"
        show-icon
        :closable="false"
        class="mb-20"
      >
        <el-button type="danger" size="small" @click="wellStore.refreshAll()">重试</el-button>
      </el-alert>

      <el-table :data="wellStore.list" border stripe style="width: 100%" v-loading="wellStore.listLoading">
        <el-table-column prop="wellCode" label="井号" width="120" />
        <el-table-column prop="wellName" label="井名" width="120" />
        <el-table-column prop="wellType" label="井型" width="100" />
        <el-table-column prop="blockName" label="区块" width="120" />
        <el-table-column prop="longitude" label="经度" width="120" />
        <el-table-column prop="latitude" label="纬度" width="120" />
        <el-table-column prop="designDepth" label="设计井深(m)" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleView(row)">查看</el-button>
            <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              type="danger"
              size="small"
              link
              :loading="wellStore.deletingId === row.id"
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="wellStore.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        class="mt-20"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>

    <!--
      非模态弹窗：编辑时仍可操作列表（例如尝试删除正在编辑的井，会被拒绝）。
      草稿保存在 store 中：保存失败、列表刷新、跳转详情再返回都不会丢失。
    -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :modal="false"
      :close-on-click-modal="false"
    >
      <el-form
        v-if="wellStore.editingWell"
        :model="wellStore.editingWell"
        :rules="wellRules"
        ref="wellFormRef"
        label-width="100px"
      >
        <el-form-item label="井号" prop="wellCode">
          <el-input v-model="wellStore.editingWell.wellCode" placeholder="请输入井号" />
        </el-form-item>
        <el-form-item label="井名" prop="wellName">
          <el-input v-model="wellStore.editingWell.wellName" placeholder="请输入井名" />
        </el-form-item>
        <el-form-item label="井型" prop="wellType">
          <el-select v-model="wellStore.editingWell.wellType" placeholder="请选择井型" style="width: 100%">
            <el-option label="探井" value="探井" />
            <el-option label="开发井" value="开发井" />
            <el-option label="评价井" value="评价井" />
          </el-select>
        </el-form-item>
        <el-form-item label="区块" prop="blockName">
          <el-input v-model="wellStore.editingWell.blockName" placeholder="请输入区块" />
        </el-form-item>
        <el-form-item label="经度" prop="longitude">
          <el-input-number v-model="wellStore.editingWell.longitude" :precision="6" style="width: 100%" />
        </el-form-item>
        <el-form-item label="纬度" prop="latitude">
          <el-input-number v-model="wellStore.editingWell.latitude" :precision="6" style="width: 100%" />
        </el-form-item>
        <el-form-item label="设计井深" prop="designDepth">
          <el-input-number v-model="wellStore.editingWell.designDepth" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="wellStore.editingWell.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="钻井中" value="钻井中" />
            <el-option label="生产中" value="生产中" />
            <el-option label="待修井" value="待修井" />
            <el-option label="关停井" value="关停井" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="wellStore.submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { useWellStore } from '@/store/modules/well'
import type { Well } from '@/types/well'

const router = useRouter()
const wellStore = useWellStore()
const wellFormRef = ref<FormInstance>()

const dialogVisible = computed({
  get: () => wellStore.editingWell !== null,
  set: (val: boolean) => {
    // 主动关闭弹窗视为取消编辑，清空草稿
    if (!val) wellStore.closeEditor()
  }
})

const dialogTitle = computed(() => (wellStore.editingMode === 'edit' ? '编辑井位' : '新增井位'))

const currentPage = computed({
  get: () => wellStore.page,
  set: (val: number) => { wellStore.page = val }
})

const pageSize = computed({
  get: () => wellStore.size,
  set: (val: number) => { wellStore.size = val }
})

const wellRules = {
  wellCode: [{ required: true, message: '请输入井号', trigger: 'blur' }],
  wellName: [{ required: true, message: '请输入井名', trigger: 'blur' }],
  wellType: [{ required: true, message: '请选择井型', trigger: 'change' }]
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    '生产中': 'success',
    '钻井中': 'primary',
    '待修井': 'warning',
    '关停井': 'danger'
  }
  return map[status] || 'info'
}

// 每次进入列表（含从详情页返回）都按当前筛选重新拉取列表与统计
onMounted(() => {
  wellStore.refreshAll().catch(() => {
    // 错误已在 store.listError 中展示
  })
})

const handleQuery = () => {
  wellStore.page = 1
  wellStore.fetchList().catch(() => {})
}

const handleReset = () => {
  wellStore.resetFilters()
  wellStore.fetchList().catch(() => {})
}

const handleSizeChange = (size: number) => {
  wellStore.setSize(size)
  wellStore.fetchList().catch(() => {})
}

const handlePageChange = (page: number) => {
  wellStore.setPage(page)
  wellStore.fetchList().catch(() => {})
}

const handleAdd = () => {
  wellStore.openCreate()
  nextTick(() => wellFormRef.value?.clearValidate())
}

const handleEdit = (row: Well) => {
  wellStore.openEdit(row)
  nextTick(() => wellFormRef.value?.clearValidate())
}

const handleView = (row: Well) => {
  router.push(`/well/${row.id}`)
}

const handleDelete = (row: Well) => {
  ElMessageBox.confirm(`确定要删除 ${row.wellName} 吗?`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await wellStore.removeWell(row)
      ElMessage.success('删除成功')
    } catch (e: any) {
      // 正在编辑该井、接口失败等情况：拒绝并说明原因
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}

const handleSubmit = () => {
  if (!wellFormRef.value) return
  wellFormRef.value.validate(async valid => {
    if (!valid) return
    const isEdit = wellStore.editingMode === 'edit'
    try {
      await wellStore.saveEditing()
      ElMessage.success(isEdit ? '编辑成功' : '新增成功')
      // 保存成功后草稿已清除，弹窗随之关闭
    } catch (e: any) {
      // 接口失败 / 重复井号：弹窗保持打开、草稿与已填内容原样保留
      ElMessage.error(e?.message || '保存失败')
    }
  })
}
</script>

<style scoped lang="scss">
.well-container {
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mt-20 {
  margin-top: 20px;
}
</style>
