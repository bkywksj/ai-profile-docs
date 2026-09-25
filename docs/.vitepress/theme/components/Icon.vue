<script setup lang="ts">
// 极简离线图标组件 —— 直接把本地 Lucide 图标数据内联成 <svg>,SSR 同步出图、无运行时请求。
// 用法(markdown / 组件均可):<Icon icon="lucide:globe" />
// 尺寸默认 1em(跟随文字大小),颜色 currentColor(跟随文字颜色,由 CSS 覆盖为品牌色)。
import { computed } from 'vue'
import { icons, type IconData } from '../icons'

const props = defineProps<{ icon: string }>()

const data = computed<IconData | undefined>(() => icons[props.icon])
const viewBox = computed(() => {
  const d = data.value
  return `0 0 ${d?.width ?? 24} ${d?.height ?? 24}`
})
// 追加语义修饰类(如 li-icon--check / li-icon--x),供 CSS 给对错标记上绿/红色
const shortName = computed(() => props.icon.split(':').pop() ?? '')
</script>

<template>
  <svg
    v-if="data"
    :class="['li-icon', `li-icon--${shortName}`]"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    :viewBox="viewBox"
    aria-hidden="true"
    role="img"
    v-html="data.body"
  />
  <!-- 开发期兜底:图标名未注册时输出可见占位,便于发现拼写错误 -->
  <span v-else class="li-icon-missing" :title="`未注册图标: ${icon}`">□</span>
</template>
