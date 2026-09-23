<template>
  <div class="well-detail-container">
    <el-card v-loading="wellStore.loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button :icon="ArrowLeft" plain size="small" @click="goBack">返回列表</el-button>
            <span class="title">井位详情</span>
          </div>
          <div v-if="well" class="header-actions">
            <el-button type="primary" @click="wellStore.openEditDialog(well)">编辑</el-button>
            <el-button type="danger" @click="handleDelete">删除</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!well && !wellStore.loading" description="井位不存在或已被删除">
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </el-empty>

      <el-descriptions v-else-if="well" :column="2" border>
        <el-descriptions-item label="井号">{{ well.wellCode }}</el-descriptions-item>
        <el-descriptions-item label="井名">{{ well.wellName }}</el-descriptions-item>
        <el-descriptions-item label="井型">{{ well.wellType }}</el-descriptions-item>
        <el-descriptions-item label="区块">{{ well.blockName }}</el-descriptions-item>
        <el-descriptions-item label="经度">{{ well.longitude }}</el-descriptions-item>
        <el-descriptions-item label="纬度">{{ well.latitude }}</el-descriptions-item>
        <el-descriptions-item label="设计井深(m)">{{ well.designDepth }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(well.status)" size="small">{{ well.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ well.createTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useWellStore } from '@/store/modules/well'

const route = useRoute()
const router = useRouter()
const wellStore = useWellStore()

// 详情与列表读的是 store 中的同一份 wells：列表编辑保存后详情即时一致
const well = computed(() => wellStore.getWellById(route.params.id as string))

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    生产中: 'success',
    钻井中: 'primary',
    待修井: 'warning',
    关停井: 'danger'
  }
  return map[status] || 'info'
}

const goBack = () => {
  router.push({ name: 'Well' })
}

const handleDelete = () => {
  if (!well.value) return
  ElMessageBox.confirm(`确定要删除 ${well.value.wellName} 吗?`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      const ok = await wellStore.removeWell(well.value!.id)
      if (ok) {
        // 删除成功后详情入口已不存在，直接返回列表（列表与统计已在 store 中刷新）
        router.push({ name: 'Well' })
      }
    })
    .catch(() => {})
}

onMounted(async () => {
  // 刷新同一份数据；若井已被删除，getWellById 返回 undefined，展示空状态
  await wellStore.fetchWells(true)
})
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
