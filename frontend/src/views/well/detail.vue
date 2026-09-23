<template>
  <div class="well-detail-container">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <span class="title">井位详情</span>
            <el-tag v-if="well" :type="getStatusType(well.status)" size="default">{{ well.status }}</el-tag>
          </div>
          <el-button
            v-if="well"
            type="danger"
            :loading="wellStore.deletingId === well.id"
            @click="handleDelete"
          >删除该井</el-button>
        </div>
      </template>

      <el-result
        v-if="!loading && loadError && !well"
        icon="error"
        :title="loadError"
        sub-title="该井位可能已被删除，请返回列表查看"
      >
        <template #extra>
          <el-button type="primary" @click="goBack">返回列表</el-button>
        </template>
      </el-result>

      <el-descriptions v-else-if="well" :column="2" border>
        <el-descriptions-item label="井号">{{ well.wellCode }}</el-descriptions-item>
        <el-descriptions-item label="井名">{{ well.wellName }}</el-descriptions-item>
        <el-descriptions-item label="井型">{{ well.wellType }}</el-descriptions-item>
        <el-descriptions-item label="区块">{{ well.blockName }}</el-descriptions-item>
        <el-descriptions-item label="经度">{{ well.longitude ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="纬度">{{ well.latitude ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="设计井深(m)">{{ well.designDepth ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ well.status }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ well.createTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWellStore } from '@/store/modules/well'

const route = useRoute()
const router = useRouter()
const wellStore = useWellStore()

const wellId = Number(route.params.id)
const loading = ref(false)
const loadError = ref('')

// 详情与列表共用 store 中的同一份数据
const well = computed(() => wellStore.getCachedWell(wellId))

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    '生产中': 'success',
    '钻井中': 'primary',
    '待修井': 'warning',
    '关停井': 'danger'
  }
  return map[status] || 'info'
}

onMounted(async () => {
  if (!Number.isFinite(wellId)) {
    loadError.value = '井位 ID 无效'
    return
  }
  if (well.value) {
    // 已有列表带来的缓存：先展示，再静默同步一次接口
    wellStore.fetchDetail(wellId, true).catch(() => {})
    return
  }
  loading.value = true
  try {
    await wellStore.fetchDetail(wellId)
  } catch (e: any) {
    loadError.value = e?.message || '井位详情加载失败'
  } finally {
    loading.value = false
  }
})

// 返回列表：筛选条件保存在 store 中，列表挂载时按原筛选重新拉取
const goBack = () => {
  router.push('/well')
}

const handleDelete = () => {
  if (!well.value) return
  const target = well.value
  ElMessageBox.confirm(`确定要删除 ${target.wellName} 吗?`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await wellStore.removeWell(target)
      ElMessage.success('删除成功')
      router.push('/well')
    } catch (e: any) {
      // 正在编辑该井 / 接口失败：拒绝并说明原因
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}
</script>

<style scoped lang="scss">
.well-detail-container {
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;

  .title {
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
