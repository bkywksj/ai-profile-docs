// 本地离线图标数据表 —— 逐个 import 保证 tree-shaking + 无运行时 Iconify API 请求。
// 图标集:Lucide(通用线性图标,来自 @iconify-icons/lucide 的单图标模块)。
// 说明:不用 @iconify/vue 的 addIcon+名字查找(它在 VitePress SSR 下注册晚于页面渲染,
// 会输出空占位 svg);这里导出「名字 → 图标数据」表,交给自写的 Icon.vue 直接内联渲染,
// SSR 同步出图。新增图标:确认 node_modules/@iconify-icons/lucide/<name>.js 存在后,
// 在下方 import + 注册两处补齐即可。
//
// 需要技术品牌 logo(Docker / MySQL / Redis / Nginx 等)时,改用 Simple Icons:
//   import docker from '@iconify-icons/simple-icons/docker'
//   然后在下方注册 'si:docker': docker,markdown 里 <Icon icon="si:docker" />。
// (当前文档的 emoji 都是通用概念,统一用 Lucide 即可,故暂未注册 Simple Icons。)
import check from '@iconify-icons/lucide/check'
import x from '@iconify-icons/lucide/x'
import alertTriangle from '@iconify-icons/lucide/alert-triangle'
import refreshCw from '@iconify-icons/lucide/refresh-cw'
import clock from '@iconify-icons/lucide/clock'
import cloud from '@iconify-icons/lucide/cloud'
import lightbulb from '@iconify-icons/lucide/lightbulb'
import tv from '@iconify-icons/lucide/tv'
import messageCircle from '@iconify-icons/lucide/message-circle'
import target from '@iconify-icons/lucide/target'
import wrench from '@iconify-icons/lucide/wrench'
import globe from '@iconify-icons/lucide/globe'
import monitor from '@iconify-icons/lucide/monitor'
import smartphone from '@iconify-icons/lucide/smartphone'
import bot from '@iconify-icons/lucide/bot'
import brain from '@iconify-icons/lucide/brain'
import factory from '@iconify-icons/lucide/factory'
import phone from '@iconify-icons/lucide/phone'
import mapPin from '@iconify-icons/lucide/map-pin'
import rocket from '@iconify-icons/lucide/rocket'
import zap from '@iconify-icons/lucide/zap'
import camera from '@iconify-icons/lucide/camera'
import bookOpen from '@iconify-icons/lucide/book-open'
import shield from '@iconify-icons/lucide/shield'

// 一个 Lucide 图标数据的形状(viewBox 尺寸 + 内部 svg 片段)
export interface IconData {
  width?: number
  height?: number
  body: string
}

// 键名统一用 `lucide:<name>`,与 Iconify 官方命名一致;markdown 里写 <Icon icon="lucide:globe" />
export const icons: Record<string, IconData> = {
  'lucide:check': check,
  'lucide:x': x,
  'lucide:alert-triangle': alertTriangle,
  'lucide:refresh-cw': refreshCw,
  'lucide:clock': clock,
  'lucide:cloud': cloud,
  'lucide:lightbulb': lightbulb,
  'lucide:tv': tv,
  'lucide:message-circle': messageCircle,
  'lucide:target': target,
  'lucide:wrench': wrench,
  'lucide:globe': globe,
  'lucide:monitor': monitor,
  'lucide:smartphone': smartphone,
  'lucide:bot': bot,
  'lucide:brain': brain,
  'lucide:factory': factory,
  'lucide:phone': phone,
  'lucide:map-pin': mapPin,
  'lucide:rocket': rocket,
  'lucide:zap': zap,
  'lucide:camera': camera,
  'lucide:book-open': bookOpen,
  'lucide:shield': shield,
}
