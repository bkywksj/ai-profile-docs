import DefaultTheme from 'vitepress/theme'
import AProductCard from './components/AProductCard.vue'
import Icon from './components/Icon.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 产品矩阵卡片（组件与 sigil 文档站同源，改动两边同步）
    app.component('AProductCard', AProductCard)
    // 全局 <Icon icon="lucide:xxx" />：离线内联图标，AProductCard 无 logo 时的兜底
    app.component('Icon', Icon)
  },
}
