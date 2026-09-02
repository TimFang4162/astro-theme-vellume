# 主题定制指南

Vellume 的视觉由"皮肤（skin）"决定。一个屏幕皮肤就是 `src/site/profiles/` 下的
一个 CSS 文件，外加 `src/config/theme-profiles.ts` 里的一行注册。站长在
`src/site/config.ts` 里通过 `theme.profile` **选定一个屏幕皮肤**，它决定整个
站点的亮色与暗色外观；**没有访客侧换肤**——选择在构建期定死、打进产物。
打印可以另指一个"打印模板"（`theme.print`，内置 thesis），让打印固定走纸面
排版，与屏幕皮肤无关。

级联优先级从低到高，完全由加载顺序决定：

```
tokens.css 默认值 < profile 屏幕皮肤 < 打印模板（theme.print） < 用户覆盖（src/site/theme.css） < src/site/custom.css
```

- **tokens.css** 定义全部语义变量及其派生关系，是"default 皮肤"本身。
- **profile 皮肤文件** 携带自己的 token 与结构规则，一处文件即完整外观
  （亮色 + 暗色两个半块配对写在同一个文件里）。
- **打印模板**（若配置）以 `@media print` 层注入，仅打印与打印预览可见。
- **theme.css** 是你的手改入口，永远最优先，对屏幕与打印都生效。

## 快速开始

```ts
// src/site/config.ts —— 换皮肤 = 改一个键
theme: {
  profile: "material",  // default | material | 你注册的任何屏幕皮肤
  print: "thesis",      // 可选：打印一律用 thesis 纸面排版
},
```

- 只改 `theme.profile`，站点整套亮暗配色随之切换（material 会把 `--primary`、
  卡片、圆角、OG/浏览器栏配色一起带过去）。
- 想要"屏幕常规皮肤、打印论文排版"？配 `theme.print: "thesis"` 即可——这正是
  thesis 的定位：**它不是一个常规屏幕皮肤，而是打印模板**，不该当 `profile` 用。
- 打印模板不配＝打印跟随 profile 皮肤自己的亮色半边（皮肤暗色块已在构建期
  门控在 `@media screen` 内，打印永远渲染亮色值）。

改过 `browserColor` 后，favicon 需要 `bun run generate:favicons` 重新生成。
皮肤 CSS 改动在 `astro dev` 下即时热更新；改注册表（theme-profiles.ts）或
`src/site/config.ts`（profile/print 选择）需要重启 dev server。

## 内置皮肤与模板

```
src/site/profiles/
  default.css    ← 空文件（tokens.css 就是默认外观）
  material.css   ← 屏幕皮肤：灰绿画布统一底色（sheet 同色），仅卡片白色且无边框 + 绿色主色 + 大圆角 + 标题正文一张卡片
  thesis.css     ← 打印模板：论文排版——纯白纸面、衬线正文、首行缩进、黑体标题、三线表、极简代码面板、章节起新页
```

thesis 写成打印模板时**只取其纸面**：它文件里的暗色块（刻意镜像亮色的"纸张"
观感）在屏幕层根本不会发射，只有整体包进 `@media print` 的纸面排版进入产物。

## 文件形态（由 `src/config/theme-profiles.ts` 解析）

皮肤 CSS 由 lightningcss 真实解析驱动（先做一遍去注释/规范的 parse→serialize，
再做定位与文本拼接），不是文本正则替换：

- **亮色 token**：一个扁平 `:root { --token: value; }` 块；
- **暗色 token**：一个暗色锚定的块（`[data-theme="dark"]` 置于选择器最前，
  `:root`/`html` 紧随其后也可，如 `:root[data-theme="dark"]`）——构建期把
  块**按原文**包进 `@media screen`，**纸张永远渲染亮色值**（打印与打印
  对话框预览都是 print media），皮肤作者无需关心打印；块内的 `var()`、
  字面量都原样保留；
- **结构规则**：允许携带（如 material 的文章卡片）；**不作用域化**——发射的
  就是作者写的样子，特异度与 authored 一致，cascade 顺序与文件内的书写顺序
  决定胜负；
- **暗色属性必须锚定选择器**：出现在选择器中段（`.x [data-theme="dark"]`）
  或与普通选择器混在同一个列表（`[data-theme="dark"] .x, .y`）都不会被
  门控、会把暗色样式泄漏进打印，构建直接报错——把暗色部分拆成独立的
  暗色锚定规则。写进其他媒体块内的暗色块不会被门控（该媒体块自己定义
  了上下文）。

只需写"个性"：`--accent`、`--ring`、tonal 填充阶梯、代码块外框、首页粒子
全部从 `--primary` 等基底自动派生（material.css 只写值加一条"标题+正文"
文章卡片规则）。屏幕专属的视觉装饰应包一层 `@media screen`，纸张保持素面。

屏幕皮肤的 `:root` 会在暗色模式下也压过 tokens.css 的暗色块（同特异度、加载
在后）——所以要随暗色翻转的 token，必须在暗色块里重新声明（成对写，如
material 的 `--code-block-surface`）。打印模板（thesis）没有屏幕 `:root` 这个
问题，因为它的亮色块在打印层里就是唯一呈现。

## 注册表

`src/config/theme-profiles.ts` 里两张注册表：`skins`（屏幕皮肤，参与
`theme.profile`）与 `printTemplates`（打印模板，参与 `theme.print`）。屏幕皮肤
带 CSS 装不下的非颜色消费方（`meta`）：

```ts
material: {
  file: "material.css",
  meta: {
    browserColor: { light: "#f0f1ec", dark: "#121411" },
    og: { accent: [105, 189, 117] /* ... */ },
    mermaid: { secondaryColor: "#EDF5EE" /* ... */ },
  },
},
```

`meta` 的解析优先级：`src/site/config.ts` 显式配置 > 皮肤 `meta` > 内置默认
（"显式"按未合并的原始配置判断——即使设的值恰好等于默认值也按显式处理）。
浏览器地址栏 / favicon / OG 图 / 代码高亮 / Mermaid 图表跟随**站长选的
profile 皮肤**（构建期产物）。

## 派生与强度

| 派生量 | 依赖 |
| --- | --- |
| `--accent` / `--accent-foreground` | `--primary` 与 `--card` 混合 |
| `--ring` | `--primary` |
| `--container-faint` / `--container-subtle` | `--accent` 与 `--card` |
| `--code-block-*` | `--background` / `--muted` / `--border` |
| `--hero-particle-*` | `--primary` / `--foreground-strong` / `--muted` |
| `--radius-tight/control/inner/card/hero` | `--radius` |

混合强度可以单独调（放 `theme.css` 即可）：`--accent-strength`（默认 12%，
暗色 22%）、`--container-faint-strength`（50% / 64%）、
`--container-subtle-strength`（60% / 72%）、`--ring-strength`（72%）。

## Surface 层级

`--background`（页面画布）→ `--surface`（内容 sheet：header / main /
footer）→ `--card`（浮起元素）。`--surface` 默认等于 `--background`，
单画布零配置；给两者不同值（如 material）即得到分层 Material 效果。

## 暗色与打印

- **暗色**：`[data-theme="dark"]` 属性切换（astro-theme-toggle），所有暗色
  token 块（tokens.css 与皮肤文件）都被限定在 `@media screen` 内。打印及
  打印对话框预览以 print media 渲染，自然得到亮色纸张——无需任何属性镜像
  或 JS。
- **打印**：Ctrl+P（或浏览器打印）即可。`print.css`（纯 `@media print`，
  注入在打印模板层之后）提供固定底线：隐藏 chrome、通栏单列、代码折行、
  外链展开为脚注、白纸白底、分页卫生（figure/table 不跨页、标题不孤悬、
  orphans/widows）。配置了 `theme.print` 时，模板层在 print.css 之前注入、
  随模板带上排版（字体、缩进、章节起新页）；未配置则 profile 皮肤的亮色
  半边直接进纸。

## 边界与已知限制

- 屏幕皮肤**一个时间点只发射一个**（profile），改动立即全站生效；没有
  访客切换，也没有"换肤"的语义层。
- 皮肤文件可携带结构规则，特异度与 authored 一致，靠加载顺序输给
  theme.css / custom.css 的后置覆盖。
- 暗色块必须是**暗色锚定**的选择器才会被构建期包进 `@media screen`；中段引用
  会被构建报错拦下，写进其他媒体块内的暗色块不受门控保护。
- CSS 文件没有编译期类型检查，写错属性名靠构建产物审查兜底。
- `@page` 页边距是主题固定值（2cm），不能吃自定义属性也不能按皮肤切换。
- 每页页眉/页码由浏览器自带开关控制，CSS 无法定制。
- 打印模板不该当 `profile` 用：它的屏幕层不会发射，屏幕会退回 default/tokens
  外观，而它缺少屏幕皮肤该有的亮暗配对与品牌 meta。

## 新增一个屏幕皮肤

1. 在 `src/site/profiles/` 放一个 css 文件（照抄 material.css 改值：
   亮色 `:root` + 暗色锚定暗色块成对写；需要结构就写规则）。
2. 在 `skins` 注册表加一行 `{ file, meta? }`（branding meta 可选，缺省回落
   tokens/default 的默认值）。
3. `theme.profile` 指它即可。未注册的名字会在构建时告警并回退 `default`。
