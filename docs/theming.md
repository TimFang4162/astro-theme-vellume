# 主题定制指南

Vellume 的视觉由"皮肤（skin）"决定。一个皮肤就是 `src/site/profiles/` 下的一个
CSS 文件，外加 `src/config/theme-profiles.ts` 里的一行注册——所有已注册皮肤
会全量注入站点并出现在访客可见的**皮肤切换器**（页头调色板按钮）里，
`theme.profile` 只决定服务端默认值。

级联优先级从低到高，完全由加载顺序决定（皮肤选择器经构建期 `:where()` 作用域，
零特异度，不参与特异度竞争）：

```
tokens.css 默认值 < 皮肤（全部） < 用户覆盖（src/site/theme.css） < src/site/custom.css
```

- **tokens.css** 定义全部语义变量及其派生关系，是"default 皮肤"本身。
- **皮肤文件** 携带自己的 token 与结构规则，一处文件即完整外观。
- **theme.css** 是你的手改入口，永远最优先，对任何皮肤生效。

## 快速开始

```ts
// src/site/config.ts —— 换默认皮肤 = 改一个键
theme: {
  profile: "material",  // default | material | thesis | 你注册的任何名字
},
```

改过 `browserColor` 后，favicon 需要 `bun run generate:favicons` 重新生成。
皮肤 CSS 改动在 `astro dev` 下即时热更新；改注册表（theme-profiles.ts）或
槽位配置（`src/site/config.ts`）需要重启 dev server。

## 模式槽位（亮 / 暗 / 打印）

`profile` 决定亮色与家族默认。想按模式拆分，在它上面再配两个可选槽位：

```ts
// src/site/config.ts
theme: {
  profile: "material", // 亮色 + 家族默认
  dark: "default",     // 可选：暗色模式改用该皮肤的暗色半边
  print: "thesis",     // 可选：打印一律用该皮肤
}
```

- **`dark`** 服务"白天要纸张排版、夜里不要白纸刺眼"这类组合。构建期把该
  皮肤的暗色块（暗色 token + 暗色结构）单独抽出，作用域改成 `data-skin-dark`
  追加注入；screen 层各皮肤自己的暗色块会带上 `:not([data-skin-dark])`
  守卫，槽位存在时让位。**访客一选皮肤即删除 `data-skin-dark`**（选择的皮肤
  拥有两种模式）；不配或名字无效＝暗色跟随 `profile`。
- **`print`**：打印与打印预览固定用该皮肤——不管访客切到哪个皮肤、也不管
  明暗模式，一律渲染成纸面。构建期把该皮肤的整个文件按原文包进
  `@media print`（不约束 `data-skin`）。不配＝打印跟随活动皮肤的亮色半边。
  特别地，`print: "thesis"` 让你在屏幕上用任意皮肤，打印仍得论文排版。
- 两个槽位都不配＝现状（一套皮肤，屏幕亮暗两半 + 打印走其亮色）。
- 槽位参与者在现有皮肤里选；新增皮肤（注册表）后它们自动可用。

`browserColor`、shiki 主题的**暗色半边**跟随 `dark` 槽（否则暗色槽开了、
浏览器栏却还是 profile 的暗色）；OG / Mermaid 是整站一份的构建产物，固定
跟随 `profile`。

## 内置皮肤

```
src/site/profiles/
  default.css    ← 空文件（tokens.css 就是默认外观）
  material.css   ← 灰绿画布统一底色（sheet 同色），仅卡片白色且无边框 + 绿色主色 + 大圆角 + 标题正文一张卡片
  thesis.css     ← 论文排版：纯白纸面、衬线正文、首行缩进、黑体标题、三线表、极简代码面板（无边框、无阴影、无语言行）、紧凑打印间距
```

thesis 是"纸张调性"的皮肤：屏幕上呈现的就是纸上排版（WYSIWYG），打印时
直接继承；它的暗色块刻意镜像亮色值，暗色模式下仍是纸张观感。

## 文件形态（由 `src/config/theme-profiles.ts` 解析）

皮肤 CSS 由 lightningcss 真实解析驱动，选择器改写走 AST，不是文本正则替换：

- **亮色 token**：一个扁平 `:root { --token: value; }` 块；
- **暗色 token**：一个暗色锚定的块（`[data-theme="dark"]` 置于选择器最前，
  `:root`/`html` 紧随其后也可，如 `:root[data-theme="dark"]`）——构建期把
  块**按原文**包进 `@media screen`，**纸张永远渲染亮色值**（打印与打印
  对话框预览都是 print media），皮肤作者无需关心打印；块内的 `var()`、
  字面量、任意格式都原样保留。同时给暗色块加一个零特异度守卫
  `:not([data-skin-dark])`——配置了 `theme.dark` 槽位时，槽位皮肤接管
  暗色模式，各皮肤自己的暗色半边让位；不配槽位时该属性不存在，守卫恒真；
- **结构规则**：允许携带（如 thesis 的居中标题）；构建期为每个选择器加上
  零特异度的 `:where([data-skin="<name>"])` 约束——根锚定选择器
  （`:root`、`html`、暗色锚点）后置附加（约束同一元素），其余前缀为
  后代；
- **暗色属性必须锚定选择器**：出现在选择器中段（`.x [data-theme="dark"]`）
  或与普通选择器混在同一个列表（`[data-theme="dark"] .x, .y`）都不会被
  门控、会把暗色样式泄漏进打印，构建直接报错——把暗色部分拆成独立的
  暗色锚定规则。写进其他媒体块内的暗色块不会被门控（该媒体块自己定义
  了上下文）。

只需写"个性"：`--accent`、`--ring`、tonal 填充阶梯、代码块外框、首页粒子
全部从 `--primary` 等基底自动派生（material.css 只写值加一条"标题+正文"
文章卡片规则）。结构规则里尽管引用 token（`var(--card)` 等），暗色跟随
token 翻转；屏幕专属的视觉装饰应包一层 `@media screen`，纸张保持素面。

## 注册表

`src/config/theme-profiles.ts` 里每个皮肤对应一条小注册项——名字、文件、
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

`meta` 的解析优先级：`src/site/config.ts` 显式配置 > 皮肤 `meta` > 内置默认
（"显式"按未合并的原始配置判断——即使设的值恰好等于默认值也按显式处理）。
浏览器地址栏 / favicon / OG 图 / 代码高亮 / Mermaid 图表跟随**站长选的默认
皮肤**（构建期产物，不随访客实时切换）。

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

## 皮肤切换与打印

- **暗色**：`[data-theme="dark"]` 属性切换（astro-theme-toggle），所有暗色
  token 块（tokens.css 与皮肤文件）都被限定在 `@media screen` 内。打印及
  打印对话框预览以 print media 渲染，自然得到亮色纸张——无需任何属性镜像
  或 JS。
- **皮肤切换**：访客经页头/抽屉的调色板菜单切换，写入 `<html data-skin>` 与
  localStorage（`vellume-skin`）；head 内联脚本在首绘前恢复，SPA 导航随
  `data-theme` 一同迁移。访客一旦选择皮肤，`theme.dark` 槽位即被忽略（该
  选择拥有两种模式），直到清除本地选择。
- **打印**：默认没有打印选项——切到想要的皮肤后直接 Ctrl+P（或文章菜单
  "打印"调起），皮肤亮色半边随皮肤进纸张。若配了 `theme.print` 槽位，打印
  固定走该皮肤（见"模式槽位"），这层 `@media print` 注入在 print.css 底线
  之前。print.css（纯 `@media print`）：隐藏 chrome、通栏单列、代码
  折行、外链展开为脚注、白纸白底、分页卫生（figure/table 不跨页、标题不
  孤悬、orphans/widows）。

## 边界与已知限制

- 皮肤系统是**无语义**的：只注入 `:where` 作用域的 token/规则。新增皮肤 =
  加一个 css 文件 + 注册表加一行 + 切换器自动出现，系统零改动。
- 皮肤文件可携带结构规则，但它们的特异度与 authored 写法一致（`:where` 零
  贡献），永远输给 theme.css / custom.css 的后置覆盖。
- 暗色块必须是**暗色锚定**的选择器（`[data-theme="dark"]` 置于最前，
  `:root`/`html` 紧随其后也可）才会被构建期包进 `@media screen`；中段引用
  会被构建报错拦下，写进其他媒体块内的暗色块不受门控保护。
- 皮肤在 `:root` 固定的 token 若要随暗色翻转，必须在暗色块里重新声明
  （同特异度下皮肤 `:root` 会压过 tokens.css 的暗色块）。
- CSS 文件没有编译期类型检查，写错属性名靠构建产物审查兜底。
- `@page` 页边距是主题固定值（2cm），不能吃自定义属性也不能按皮肤切换。
- 每页页眉/页码由浏览器自带开关控制，CSS 无法定制。
- OG 图 / favicon / 代码高亮主题跟随站长默认皮肤（构建期），不随访客切换
  （其中代码高亮与浏览器栏的**暗色半边**随 `theme.dark` 槽位）。

## 新增一个皮肤

1. 在 `src/site/profiles/` 放一个 css 文件（照抄 material.css 改值；
   需要结构就写规则，构建期自动作用域化）。
2. 在 `skins` 注册表加一行 `{ file, label, meta? }`。
3. 完成——切换器自动出现该皮肤；`theme.profile` 想指它就改一个键。
   未注册的名字会在构建时告警并回退 `default`。
