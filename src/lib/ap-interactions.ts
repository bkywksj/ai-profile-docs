// .ap 组件的浏览器端交互（原型 site.js 的通用部分）：复制、代码页签、自定义下拉、产品分类筛选、提示条。
// 只在浏览器里跑（PageScript.astro 的 <script> 引入）；按页面上有没有对应节点决定是否启用，没有就什么都不做

const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

/**
 * 写剪贴板：先用 Clipboard API，不可用（非安全上下文、权限被拒）时退回 execCommand
 * @param text 要复制的文字
 * @returns 是否成功（失败时调用方仍给反馈，只是文字不同）
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/**
 * 页面底部的提示条（复制成功等），1.8 秒后自动隐藏
 * @param msg 提示文字
 */
export function toast(msg: string): void {
  const el = document.querySelector<HTMLElement>('.ap-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(Number(el.dataset.t));
  el.dataset.t = String(setTimeout(() => el.classList.remove('show'), 1800));
}

/**
 * 绑定全部通用交互
 * @param root 文档根（一页调一次）
 */
export function initApInteractions(root: Document): void {
  // 复制：data-copy="文字"；没有值时复制所在代码窗当前可见页签里的 pre（去掉提示符 $）
  root.addEventListener('click', async (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.ap [data-copy], .ap .copy');
    if (!b) return;
    let text = b.dataset.copy ?? '';
    if (!text) {
      const box = b.closest('.code');
      const pane = box && ($$<HTMLElement>('.code-pane', box).find((p) => !p.hidden) ?? box);
      const pre = pane?.querySelector('pre');
      text = pre ? pre.innerText.replace(/^\$ /gm, '') : '';
    }
    const ok = await copyText(text);
    const label = b.querySelector('span');
    const old = label?.textContent;
    b.classList.add('done');
    if (label) label.textContent = ok ? '已复制' : '复制失败';
    toast(ok ? '已复制' : '复制失败，请手动选中复制');
    setTimeout(() => {
      b.classList.remove('done');
      if (label && old != null) label.textContent = old;
    }, 1600);
  });

  // 代码页签：.code[data-tabs] 里 .code-tab 与 .code-pane 按顺序一一对应
  for (const box of $$('.ap .code[data-tabs]', root)) {
    const tabs = $$('.code-tab', box);
    const panes = $$('.code-pane', box);
    tabs.forEach((t, i) =>
      t.addEventListener('click', () => {
        tabs.forEach((x, j) => x.setAttribute('aria-selected', String(i === j)));
        panes.forEach((p, j) => (p.hidden = i !== j));
      }),
    );
  }

  // 自定义下拉（不用原生 select：样式可控、键盘可用）：选中后在 .sel 上派发 change，detail = data-value
  for (const sel of $$('.ap .sel', root)) {
    const btn = sel.querySelector<HTMLElement>('.sel-btn')!;
    const opts = $$<HTMLElement>('.sel-list li', sel);
    let i = Math.max(
      0,
      opts.findIndex((o) => o.getAttribute('aria-selected') === 'true'),
    );
    const set = (v: boolean) => {
      sel.classList.toggle('open', v);
      btn.setAttribute('aria-expanded', String(v));
      if (v) opts.forEach((o, j) => o.classList.toggle('act', j === i));
    };
    const pick = (j: number) => {
      i = j;
      opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === j)));
      const b = btn.querySelector('b');
      if (b) b.textContent = opts[j].dataset.label ?? opts[j].firstChild?.textContent?.trim() ?? '';
      set(false);
      sel.dispatchEvent(new CustomEvent('change', { detail: opts[j].dataset.value }));
    };
    btn.addEventListener('click', () => set(!sel.classList.contains('open')));
    opts.forEach((o, j) => o.addEventListener('click', () => pick(j)));
    btn.addEventListener('keydown', (e) => {
      const open = sel.classList.contains('open');
      if (!open && ['ArrowDown', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        set(true);
        return;
      }
      if (!open) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        i = (i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        opts.forEach((o, j) => o.classList.toggle('act', j === i));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(i);
      } else if (e.key === 'Escape') set(false);
    });
    root.addEventListener('click', (e) => {
      if (!sel.contains(e.target as Node)) set(false);
    });
  }

  // 产品矩阵：分类筛选（data-cat 按钮 → data-cat-item 条目；整组都被筛掉时组标题一起藏）
  const cats = root.querySelector('.ap .cats');
  if (cats) {
    const btns = $$<HTMLButtonElement>('button', cats);
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const c = b.dataset.cat!;
        for (const el of $$<HTMLElement>('[data-cat-item]', root)) el.hidden = c !== '全部' && !el.dataset.catItem!.split(' ').includes(c);
        for (const g of $$<HTMLElement>('[data-grp]', root)) {
          const next = g.nextElementSibling;
          g.hidden = c !== '全部' && !!next && !$$<HTMLElement>('[data-cat-item]', next).some((x) => !x.hidden);
        }
      }),
    );
  }
}
