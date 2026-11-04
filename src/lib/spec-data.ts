// 构建期读 public/spec/（crate 发布的规范文件，pnpm sync-spec 原样同步）：服务商清单页、规范页、首页数字都从这里取，不手抄。
// 逻辑来自原型 _src/gen_data.cjs（当时从旧站 /spec 生成 assets/data.js），这里改成构建期直接读同一份文件。
// 只在服务端（.astro frontmatter）调用；按 process.cwd() 读文件：打包后 import.meta.url 指向 dist，找不到 public/
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SPEC = join(process.cwd(), 'public/spec');
const read = <T>(rel: string): T => JSON.parse(readFileSync(join(SPEC, rel), 'utf8')) as T;

export type PresetKind = 'chat' | 'image' | 'video' | 'tts';
/** 「类型」口径与 crate 生成的 providers.md 一致：本地 > 有申请密钥页 = 云端 > 其余 = 自定义端点 */
export type PresetType = 'cloud' | 'custom' | 'local';

interface RawPreset {
  key: string;
  label: string;
  kind: PresetKind;
  groupLabel: string;
  vendorId: string;
  baseUrl: string | null;
  model?: string | null;
  models?: unknown[];
  protocol: string;
  verifiedAt: string | null;
  isLocal?: boolean;
  applyUrl?: string | null;
  thinkingOff?: Record<string, unknown> | null;
  extraFields?: { key: string; required?: boolean }[];
}
interface RawVendor {
  id: string;
  label: string;
  kinds: PresetKind[];
  host: string | null;
  groupLabel: string;
  isLocal?: boolean;
  presetKeys: string[];
}

/** 服务商清单页的一行 */
export interface PresetRow {
  key: string;
  label: string;
  kind: PresetKind;
  group: string;
  vendor: string;
  baseUrl: string | null;
  model: string | null;
  models: number;
  protocol: string;
  verifiedAt: string | null;
  type: PresetType;
  /** 关思考要并入请求体的字段（JSON 文本），没登记为 null */
  thinkingOff: string | null;
  /** 必填的专有字段 key */
  extra: string[];
}

/** 服务商目录（设置页下拉那一层）的一行 */
export interface VendorRow {
  id: string;
  label: string;
  kinds: PresetKind[];
  host: string | null;
  group: string;
  presets: number;
}

/** 一个规范版本目录里的用例文件 */
export interface SpecVersion {
  version: string;
  files: { file: string; title: string; cases: number }[];
  total: number;
}

const presetsJson = read<{ crateVersion: string; specVersion: number; presets: RawPreset[]; vendors: RawVendor[] }>('presets.json');
const vendorLabel = Object.fromEntries(presetsJson.vendors.map((v) => [v.id, v.label]));

/** 当前 presets.json 对应的 crate 版本 */
export const crateVersion = presetsJson.crateVersion;

/** 全部预置，顺序同 presets.json（即设置页下拉的顺序） */
export const presets: PresetRow[] = presetsJson.presets.map((p) => ({
  key: p.key,
  label: p.label,
  kind: p.kind,
  group: p.groupLabel,
  vendor: vendorLabel[p.vendorId] ?? p.vendorId,
  baseUrl: p.baseUrl,
  model: p.model ?? null,
  models: (p.models ?? []).length,
  protocol: p.protocol,
  verifiedAt: p.verifiedAt,
  type: p.isLocal ? 'local' : p.applyUrl ? 'cloud' : 'custom',
  thinkingOff: p.thinkingOff ? JSON.stringify(p.thinkingOff) : null,
  extra: (p.extraFields ?? []).filter((f) => f.required).map((f) => f.key),
}));

/** 服务商目录，顺序同 presets.json 的 vendors */
export const vendors: VendorRow[] = presetsJson.vendors.map((v) => ({
  id: v.id,
  label: v.label,
  kinds: v.kinds,
  host: v.host,
  group: v.groupLabel,
  presets: v.presetKeys.length,
}));

const versionsJson = read<{ latest: string; versions: string[] }>('versions.json');
/** 最新发布版本（versions.json 的 latest） */
export const latestVersion = versionsJson.latest;

/** 每个已发布版本的用例文件与条数（新的在前） */
export const specVersions: SpecVersion[] = versionsJson.versions.map((ver) => {
  const dir = join(SPEC, `v${ver}`, 'conformance');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { title?: string; cases?: unknown[] };
      return { file: f, title: j.title ?? '', cases: (j.cases ?? []).length };
    });
  return { version: ver, files, total: files.reduce((a, b) => a + b.cases, 0) };
});

/** 按条件计数（页面上的分段、下拉计数都用它，不手写数字） */
export const count = (pred: (p: PresetRow) => boolean): number => presets.filter(pred).length;
