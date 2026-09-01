# 主题定制指南

Vellume 的视觉由三层叠加决定，优先级从低到高：

```
tokens.css 默认值 < 主题档案（profile） < 用户覆盖（src/site/theme.css）
```

- **tokens.css** 定义全部语义变量及其派生关系，是"默认档案"本身。
- **主题档案** 是 `src/site/profiles/` 下的一个 CSS 文件——一个主题一个文件。
- **theme.css** 是你的手改入口，永远最优先，适合对某个档案做单点微调。

## 快速开始

```ts
// src/site/config.ts —— 换主题 = 改一个键
theme: {
  profile: "material",  // 屏幕：default | material | sepia | 你注册的任何名字
  print: "paper",       // 打印：default | paper | compact
},
```

改过 `browserColor` 或打印档案后，favicon 需要 `bun run generate:favicons` 重新生成。

## 一个主题一个文件

主题的全部 token 都住在自己的 CSS 文件里，所见即所得：

```
src/site/profiles/
  default.css        ← 空文件（tokens.css 就是默认外观）
  material.css       ← 灰绿画布 + 白色 sheet + 绿色主色 + 大圆角
  sepia.css          ← 暖纸中性底 + 陶土主色
  print/
    paper.css        ← 衬线正文、暖纸底
    compact.css      ← 小字号紧行距
```

文件形态（由 `src/config/theme-profiles.ts` 解析）：

- **屏幕档案**：一个 `:root { --token: value; }` 亮色块 + 可选的
  `[data-theme="dark"] { ... }` 暗色块，原样注入。
- **打印档案**：一个扁平的 `:root { ... }` token 块（不写 `@media print`，
  系统负责作用域）。

只需写"个性"：`--accent`、`--ring`、tonal 填充阶梯、代码块外框、首页粒子
全部从 `--primary` 等基底自动派生。material.css 一共也就二十几行。

## 注册表

`src/config/theme-profiles.ts` 里每个档案对应一条小注册项——名字、文件、
菜单标签，以及 CSS 装不下的非颜色消费方：

```ts
material: {
  file: "material.css",
  label: "Material",
  meta: {
    browserColor: { light: "#f0f1ec", dark: "#121411" },
    og: { accent: [105, 189, 117] /* ... */ },
    shiki: { light: "github-light", dark: "github-dark-default" },
  },
},
```

`meta` 的解析优先级：`src/site/config.ts` 显式配置 > 档案 `meta` > 内置默认。
浏览器地址栏 / favicon / OG 图 / 代码高亮 / Mermaid 图表全部跟随所选档案；
换打印档案后记得重跑 favicon 生成。

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

## 打印主题与打印预览

打印样式是**属性驱动**的：真实打印时由 `beforeprint` / `afterprint` 内联脚本在
`<html>` 上镜像 `data-print-style`，预览会话则直接持有该属性——同一份规则、
同一个开关，预览所见即打印所得。

- **站长**：`theme.print` 选默认打印档案。
- **访客**：文章标题右侧"更多"菜单 →"打印"进入**打印预览**：页面切换为打印
  样式，右下角浮出配置面板，可调打印风格（标准/纸张/紧凑）、链接展开、
  图片显隐、章节起新页，全部即时生效；"开始打印"调起浏览器打印（面板不会
  被印出），"退出预览"或 Esc 还原屏幕状态。

面板调整映射到根属性状态词汇（也可由自定义档案在注册表 `states` 里预置）：

| 状态 | 取值 |
| --- | --- |
| `data-print-links` | `footnote`（默认，展开链接）/ `plain`（收起）/ `external`（仅外链） |
| `data-print-images` | `all`（默认）/ `none` |
| `data-print-break` | `none`（默认）/ `chapter` |

`@media print` 只剩两件事：**无 JS 时的最低打印保障**（隐藏 chrome、白底黑字、
通栏布局——属性方案依赖 JS，这一块保底）和**面板隐藏**。`@page` 页边距是
主题固定值（2cm），属性表达不了。浏览器默认不打印背景色，`paper` 档案已
声明 `print-color-adjust: exact`，但最终仍受打印对话框"背景图形"开关影响。

## 边界与已知限制

- 主题管理器是**无语义**的：只注入 token 与透传状态。新增主题 = 加一个
  css 文件 + 注册表加一行；新增结构行为 = 主题样式表加规则，系统零改动。
- 档案文件只放 token（扁平声明块），不放 CSS 规则；结构性样式写进
  print.css 或 `src/site/custom.css`。
- CSS 文件没有编译期类型检查，写错属性名靠构建产物审查兜底。
- 打印样式的激活依赖 JS 镜像打印状态（`beforeprint`）；无 JS 访客打印时
  只应用 `@media print` 最低保障块。
- `@page` 页边距是主题固定值（2cm），既不能吃自定义属性也不能按属性切换。
- 每页页眉/页码由浏览器自带开关控制，CSS 无法定制。

## 新增一个主题

1. 在 `src/site/profiles/` 放一个 css 文件（照抄 material.css 改值）。
2. 在 `themeProfiles` 注册表加一行 `{ file, label, meta? }`。
3. `theme.profile` 指向它。未注册的名字会在构建时告警并回退 `default`。
