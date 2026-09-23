<template>
  <el-dialog
    :model-value="wellStore.dialogVisible"
    :title="wellStore.dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleChange"
    @open="handleOpen"
  >
    <el-form :model="form" :rules="wellRules" ref="formRef" label-width="100px">
      <el-form-item label="井号" prop="wellCode">
        <el-input v-model="form.wellCode" placeholder="请输入井号" />
      </el-form-item>
      <el-form-item label="井名" prop="wellName">
        <el-input v-model="form.wellName" placeholder="请输入井名" />
      </el-form-item>
      <el-form-item label="井型" prop="wellType">
        <el-select v-model="form.wellType" placeholder="请选择井型" style="width: 100%">
          <el-option label="探井" value="探井" />
          <el-option label="开发井" value="开发井" />
          <el-option label="评价井" value="评价井" />
        </el-select>
      </el-form-item>
      <el-form-item label="区块" prop="blockName">
        <el-input v-model="form.blockName" placeholder="请输入区块" />
      </el-form-item>
      <el-form-item label="经度" prop="longitude">
        <el-input-number v-model="form.longitude" :precision="6" style="width: 100%" />
      </el-form-item>
      <el-form-item label="纬度" prop="latitude">
        <el-input-number v-model="form.latitude" :precision="6" style="width: 100%" />
      </el-form-item>
      <el-form-item label="设计井深" prop="designDepth">
        <el-input-number v-model="form.designDepth" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
          <el-option label="钻井中" value="钻井中" />
          <el-option label="生产中" value="生产中" />
          <el-option label="待修井" value="待修井" />
          <el-option label="关停井" value="关停井" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="wellStore.submitting" @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="wellStore.submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { useWellStore } from '@/store/modules/well'

const wellStore = useWellStore()

const formRef = ref<FormInstance>()

// 直接绑定 store 中的草稿；弹窗全局挂载，切页面、看详情再返回，输入内容都不会丢
const form = computed(() => wellStore.draft)

const wellRules = {
  wellCode: [{ required: true, message: '请输入井号', trigger: 'blur' }],
  wellName: [{ required: true, message: '请输入井名', trigger: 'blur' }],
  wellType: [{ required: true, message: '请选择井型', trigger: 'change' }]
}

const handleOpen = () => {
  formRef.value?.clearValidate()
}

const handleVisibleChange = (visible: boolean) => {
  // 右上角 X / ESC：等同取消，丢弃草稿
  if (!visible) handleCancel()
}

const handleCancel = () => {
  wellStore.discardDraft()
}

const handleSubmit = async () => {
  if (!formRef.value) return
  // 前端先做一层重复井号校验，服务端仍会再次校验
  const code = form.value.wellCode.trim()
  const duplicated = wellStore.wells.some(
    well => well.wellCode.trim().toLowerCase() === code.toLowerCase() && well.id !== form.value.id
  )
  if (duplicated) {
    ElMessage.error(`井号 ${code} 已存在，请更换井号后提交`)
    return
  }
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  await wellStore.saveDraft()
}
</script>
