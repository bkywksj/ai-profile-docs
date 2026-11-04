// 规范页（src/pages/reference/spec.astro）用到的静态对照与字符串拼装。
// 放在 .ts 里而不是 .astro 的 frontmatter：Astro 编译器扫 frontmatter 时，模板字符串里的 /spec/… 会被误认成正则，构建失败
import { latestVersion, specVersions } from '@/lib/spec-data';

const SITE = 'https://ai-profile.ruoyi.plus';

// 每个用例文件测的是链路的哪一段、要实现哪些函数（用例里的 fn 字段）
export const LINK: Record<string, string> = Object.fromEntries([
  ['endpoint.json', 'endpoint'],
  ['model_filter.json', 'verify'],
  ['models_response.json', 'verify'],
  ['diagnose.json', 'verify'],
  ['preset_lookup.json', 'preset'],
  ['ai_profile.json', 'share'],
  ['limits.json', 'verify'],
  ['history.json', 'chat'],
  ['stream.json', 'chat'],
]);
export const FNS: Record<string, string[]> = Object.fromEntries([
  ['endpoint.json', ['join_api_path', 'join_chat_endpoint', 'anthropic_base_url']],
  ['model_filter.json', ['is_chat_model_id', 'clean_fetched_models']],
  ['models_response.json', ['parse_models_response']],
  ['diagnose.json', ['diagnose', 'diagnose_success', 'suggest_url', 'check_required_fields']],
  ['ai_profile.json', ['parse_profiles', 'to_profile']],
  ['limits.json', ['merge_limits']],
  ['preset_lookup.json', ['infer_preset_key', 'model_limits', 'thinking_off_params', 'preset_endpoint']],
  ['history.json', ['is_context_overflow']],
  ['stream.json', ['decode', 'is_stream_options_rejected', 'looks_like_html']],
]);
export const chain = (seg: string) =>
  seg === 'share'
    ? '<span class="tag mono">ai.profile</span>'
    : seg === 'chat'
      ? '<span class="tag mono">对话请求前后</span>'
      : `<span class="ap-chain">${['preset', 'endpoint', 'verify'].map((s) => `<span${s === seg ? ' class="on"' : ''}>${s}</span>`).join('')}</span>`;
/** 一个版本里用例最多的文件的条数（用例数横条按它归一） */
export const max = (v: (typeof specVersions)[number]) => Math.max(...v.files.map((f) => f.cases));
export const prompt = `请用 <语言> 实现 ai-profile 的 <功能>。实现说明：${SITE}/reference/spec.md；用例在本仓库 spec/ 目录（来自 ${SITE}/spec/v${latestVersion}/）。要求：1. 先读「实现范围」与「测试连接的网络层」两节；2. 为每个 conformance/*.json 写参数化测试，按 JSON 值比较，一条都不许跳过；3. 不许修改用例文件来让测试通过，觉得期望值不合理就停下来告诉我；4. 预置数据运行时读 spec/presets.json，不要抄进代码；5. 全部通过后列出实现了哪些函数。`;
