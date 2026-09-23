<template>
  <div class="well-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>井位管理</span>
          <div class="header-actions">
            <el-tooltip content="开启后，下一次井位接口请求将返回失败，用于验证失败提示" placement="top">
              <el-button :type="failNext ? 'danger' : 'default'" plain size="small" @click="toggleFail">
                {{ failNext ? '模拟接口失败：待触发' : '模拟接口失败' }}
              </el-button>
            </el-tooltip>
            <el-button type="primary" @click="wellStore.openAddDialog()">
              <el-icon><Plus /></el-icon>新增井位
            </el-button>
          </div>
        </div>
      </template>

      <el-form :model="queryForm" inline class="mb-20">
        <el-form-item label="井名">
          <el-input v-model="queryForm.wellName" placeholder="请输入井名" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="井型">
          <el-select v-model="queryForm.wellType" placeholder="请选择井型" clearable>
            <el-option label="探井" value="探井" />
            <el-option label="开发井" value="开发井" />
            <el-option label="评价井" value="评价井" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="请选择状态" clearable>
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

      <el-table :data="wellStore.pagedWells" border stripe style="width: 100%" v-loading="wellStore.loading">
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
            <el-button type="primary" size="small" link @click="wellStore.openEditDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
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
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useWellStore } from '@/store/modules/well'
import { mockFailState } from '@/api/well'

const router = useRouter()
const wellStore = useWellStore()

// 筛选条件保存在 store：打开详情再返回，原筛选保留
const queryForm = reactive(wellStore.query)

const currentPage = computed({
  get: () => wellStore.page,
  set: (val: number) => wellStore.setPage(val)
})

const pageSize = computed({
  get: () => wellStore.size,
  set: (val: number) => wellStore.setSize(val)
})

const failNext = computed(() => mockFailState.next)
const toggleFail = () => {
  mockFailState.next = !mockFailState.next
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    生产中: 'success',
    钻井中: 'primary',
    待修井: 'warning',
    关停井: 'danger'
  }
  return map[status] || 'info'
}

const handleQuery = () => {
  // reactive(store.query) 已双向同步，只需重置到第一页；统计与列表来自同一份数据
  wellStore.setPage(1)
}

const handleReset = () => {
  wellStore.resetQuery()
  Object.assign(queryForm, wellStore.query)
}

const handleView = (row: any) => {
  router.push({ name: 'WellDetail', params: { id: row.id } })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除 ${row.wellName} 吗?`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      await wellStore.removeWell(row.id)
    })
    .catch(() => {})
}

onMounted(async () => {
  // 每次进入列表（含从详情页返回）都强制拉取最新数据，保证列表、总数与服务端一致；
  // 筛选条件与分页保存在 store 中，返回后原样保留。
  await wellStore.fetchWells(true)
})
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mt-20 {
  margin: 20px 0;
}
</style>
