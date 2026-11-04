// 作品集合 schema 的安全回归：works.url 只接受 http/https（防止 javascript: / data: 进入 <a href>）
// 直接读 src/content.config.ts 里的真实 schema：有人删掉协议限制时这里会变红。module-strip 的 works 预设会删除本文件。
// （vitest.config.ts 用 getViteConfig 复用了 Astro 的 Vite 配置，content.config.ts 可以正常导入）
import { describe, expect, it } from 'vitest';
import type { z } from 'astro/zod';
import { collections } from '@/content.config';

const worksSchema = collections.works.schema as z.ZodObject<z.ZodRawShape>;
const workUrl = worksSchema.shape.url as z.ZodType;

describe('works.url 协议白名单（真实 schema）', () => {
  // BV1Demo0Test 是占位值：B 站 BV 号的编码字母表里没有数字 0，不可能对应真实视频（反捏造口径）
  it('放行 http / https 与缺省', () => {
    expect(workUrl.safeParse('https://www.bilibili.com/video/BV1Demo0Test').success).toBe(true);
    expect(workUrl.safeParse('http://example.com/a').success).toBe(true);
    expect(workUrl.safeParse(undefined).success).toBe(true);
  });
  it('拒绝 javascript: 与 data:', () => {
    expect(workUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(workUrl.safeParse('data:text/html,<script>alert(1)</script>').success).toBe(false);
  });
});
