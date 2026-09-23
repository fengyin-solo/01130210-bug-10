<template>
  <router-view />
  <!-- 井位编辑弹窗全局挂载：查看详情、切换菜单后返回，草稿与弹窗状态不丢失 -->
  <WellEditDialog />
</template>

<script setup lang="ts">
import WellEditDialog from '@/views/well/components/WellEditDialog.vue'
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
}
</style>
