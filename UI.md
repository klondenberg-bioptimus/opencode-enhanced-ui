# TUI timeline / tool 展示对照

本文基于 upstream `opencode/` 的 TUI 实现，以及当前仓库 `src/panel/webview/` 的实现，对比各类 tool 在 timeline 中的展示方式、markdown 高亮、thinking 高亮与整体视觉语义。

## 参考实现位置

### upstream TUI

- `opencode/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`
  - assistant timeline part 分发：`TextPart` / `ReasoningPart` / `ToolPart`
  - 各 tool 的专用 renderer
- `opencode/packages/opencode/src/cli/cmd/tui/context/theme.tsx`
  - markdown 颜色映射
  - syntax / subtleSyntax
  - `thinkingOpacity`
- `opencode/packages/opencode/src/tool/*.ts`
  - tool metadata 来源，决定 TUI 能拿到哪些 title / count / diff / diagnostics / sessionId

### 当前仓库

- `src/panel/webview/index.tsx`
  - turn 结构、part 可见性、tool variant 分发
  - markdown-it + highlight.js 渲染
- `src/panel/webview/styles.css`
  - tool 行/面板样式
  - markdown / code / thinking 样式

---

## 一、upstream TUI 的总体展示规律

### 1. timeline 主体是文本流，不是卡片流

upstream TUI 的 assistant timeline 主要由三类内容构成：

- `text`
- `reasoning`
- `tool`

其中 tool 默认更接近“命令行里的状态行 / 操作行”，而不是大块卡片。很多 tool 只有一行摘要；只有少数高价值 tool 会展开成 block。

### 2. tool 默认尽量轻量

`ToolPart` 会根据 tool 名称进入专用 renderer。视觉上大体分两类：

- `InlineTool`
  - 单行、低干扰、像操作日志
  - 完成后通常变成 muted 文本
  - pending/running 时有 spinner 或更强提示
- `BlockTool`
  - 左边框 + 面板背景
  - 只给 bash 输出、write 内容、edit diff、apply_patch patch、todo/question 等高信息密度内容

同时，TUI 还有 `showDetails` / `tool_details` 概念：成功完成的 tool 在“详情关闭”时会被整体隐藏，进一步压缩噪音。

### 3. thinking 是“降权 markdown”，不是独立高饱和卡片

`ReasoningPart` 的内容会：

- 先过滤 `[REDACTED]`
- 只在 `showThinking()` 打开时显示
- 使用 `code filetype="markdown"`
- 套用 `subtleSyntax()`
- 同时前景色为 `theme.textMuted`

也就是：

- 仍按 markdown 高亮
- 但所有语法色都会乘上 `thinkingOpacity`
- 再叠加 muted 语义
- 最终效果是“同一套 markdown 语法，但整体更淡、更退后”

视觉结构是左侧细边框 + 缩进块，不是明显的强调卡片。

---

## 二、各 tool 在 upstream TUI timeline 中的展示方法

下表按当前关心的工具整理。

| Tool | upstream TUI 展示 | 关键细节 |
| --- | --- | --- |
| `read` | inline | `Read path`，附带 offset/limit 等输入摘要；完成后可额外显示 `↳ Loaded ...` 行，来自 `metadata.loaded` |
| `glob` | inline | `Glob pattern in path`，完成后显示 match count |
| `grep` | inline | `Grep pattern in path`，完成后显示 match count |
| `list` | inline | `List dir`，只保留路径级摘要 |
| `webfetch` | inline | `WebFetch url`，仅 URL 摘要 |
| `websearch` | inline | `Exa Web Search query`，可显示 result count |
| `codesearch` | inline | `Exa Code Search query`，可显示 result count |
| `bash` | inline → block | 无输出时是一行命令；有 `metadata.output` 后切成 block，标题来自 `description/workdir`，正文显示 `$ command` + shell 输出 |
| `task` | inline | 一行/多行轻量摘要；运行中显示 child session 当前 tool/title；完成后显示 toolcalls 数量和 duration；可点击跳 child session |
| `write` | inline → block | 准备阶段一行；完成后 block 中直接展示写入内容，按目标文件类型高亮，并附 diagnostics |
| `edit` | inline → block | 准备阶段一行；完成后 block 中展示真正 diff，支持 unified/split，附 diagnostics |
| `apply_patch` | inline → 多个 block | 完成后按文件拆块，区分 add/delete/move/update；非 delete 显示 diff，delete 显示删除行数，附 diagnostics |
| `todowrite` | block | todos 列表 |
| `question` | block | 问题 / 选项内容 |
| `skill` | inline | 轻量摘要 |
| unknown tool | inline 或简易 block | 默认 `GenericTool`；如果打开 generic output 才显示输出 block |

### 重点观察

#### `read / glob / grep / list`

这几个“上下文收集型工具”在 upstream 里都偏向 **inline 摘要**，而不是展开成大面板。

这意味着 TUI 在节奏上把它们视为：

- 辅助动作
- 过程信号
- 低权重上下文采样

而不是主要阅读内容。

#### `bash`

`bash` 是明显的两阶段表现：

- 发命令前/无输出：inline
- 有输出后：block

这样做的效果是：

- 短命令不会抢占太多空间
- 真正有 shell 输出时才升级为重内容区域

#### `write / edit / apply_patch`

这三类文件修改工具在 upstream 里都不是“文件名摘要卡”就结束，而是直接给：

- 文件内容
- diff
- patch 文件级拆解
- diagnostics

属于真正的高价值 block。

#### `task`

`task` 不是一张普通面板，而是偏“代理执行进度条目”：

- 描述 delegation 任务本身
- 运行中显示 child 当前正在做什么
- 完成后显示 toolcalls 数量和耗时
- 点击直接跳转 child session

它在 TUI 中更像“子线程状态入口”。

---

## 三、upstream markdown 高亮与 thinking 高亮

### 1. markdown 颜色不是写死在组件里，而是来自 theme

`theme.tsx` 中定义了 markdown 相关颜色槽位：

- `markdownText`
- `markdownHeading`
- `markdownLink`
- `markdownLinkText`
- `markdownCode`
- `markdownBlockQuote`
- `markdownEmph`
- `markdownStrong`
- `markdownHorizontalRule`
- `markdownListItem`
- `markdownListEnumeration`
- `markdownImage`
- `markdownImageText`
- `markdownCodeBlock`

默认 system-theme 下大致是：

- link: blue / cyan
- code: green
- quote / emphasis: yellow
- heading / strong / text: 跟随前景色

并且这些颜色会被映射到 markdown highlight scope，例如：

- `markup.heading`
- `markup.bold`
- `markup.italic`
- `markup.list`
- `markup.quote`
- `markup.raw`
- `markup.raw.inline`
- `markup.link`
- `markup.link.label`
- `markup.list.checked`
- `markup.list.unchecked`

所以 upstream 的 markdown 颜色体系有两个特点：

1. 是 theme-native 的，可被内置/自定义 TUI 主题覆盖
2. markdown 与 syntax highlight 属于同一颜色系统，不是额外拼一套 CSS

### 2. thinking 高亮来自 subtleSyntax + thinkingOpacity

`generateSubtleSyntax()` 会基于普通 syntax 规则，把前景 alpha 统一降低到 `theme.thinkingOpacity`。

默认：

- `thinkingOpacity = 0.6`

因此 reasoning/thinking 的视觉并不是单独换一套颜色，而是：

- 保留 markdown/syntax 的色相关系
- 统一降低不透明度
- 再配合 muted 文本色和左边框容器

这就是 upstream thinking 看起来“像正文的影子层”的核心原因。

---

## 四、我们当前仓库的展示方式

## 1. timeline 结构

当前实现已经是 turn-based：

- 一个 user turn
- 后面挂一串 assistant parts

并提供：

- `Thinking` toggle
- `Internals` toggle

但 tool 的视觉语义仍然更偏“Web 卡片 UI”，不是 TUI 的“日志行优先”。

## 2. tool variant 映射

当前 `toolVariant()`：

- `read` / `webfetch` / `task` / `skill` → `row`
- `websearch` / `codesearch` → `links`
- `write` / `edit` / `apply_patch` → `files`
- `todowrite` → `todos`
- `question` → `question`
- 其它（包括 `glob` / `grep` / `list` / `bash`）→ `panel`

这和 upstream 的最大差别是：

- `glob` / `grep` / `list` 在 upstream 是 inline，现在是 collapsible panel
- `bash` 在 upstream 是“无输出 inline，有输出 block”，现在默认就是 panel 体系
- `websearch` / `codesearch` 在 upstream 更像 inline 搜索摘要，现在我们把它做成 link list panel
- `write` / `edit` / `apply_patch` 在 upstream 是内容级 renderer，现在我们主要是文件摘要 renderer

---

## 五、逐项对照：upstream vs 当前实现

| Tool | upstream TUI | 当前实现 | 差异判断 |
| --- | --- | --- | --- |
| `read` | inline 摘要 + `Loaded ...` 跟随行 | row，显示 title/subtitle/offset/limit/status | 接近，但缺少 `Loaded ...` 补充行与更强的上下文工具组感 |
| `glob` | inline + count | panel，带标题、参数 pills、可折叠正文 | 当前过重，信息密度方向不对 |
| `grep` | inline + count | panel，带参数 pills、可折叠正文 | 当前过重，且正文价值通常不如 summary |
| `list` | inline path | panel | 当前明显过重 |
| `webfetch` | inline URL | row | 接近 |
| `websearch` | inline 搜索摘要 + 结果数 | links panel，从 output 抽 URL | 当前更像“结果列表页”，而不是 TUI 的搜索状态行 |
| `codesearch` | inline 搜索摘要 + 结果数 | links panel，从 output 抽 URL | 同上，语义偏差较大 |
| `bash` | 无输出 inline；有输出 block | panel，标题=description，subtitle=command，正文=`$ command`+output | 基本信息齐全，但缺少 upstream 的阶段切换语义 |
| `task` | inline delegation 摘要，运行中展示 child 当前 tool，完成后展示 toolcalls/duration，可点击跳转 | row，显示 title/subtitle/status，可 `Open child` | 当前缺少“运行中 child 进度”和“完成统计”这两个最像 upstream 的关键信号 |
| `write` | 完成后展示完整文件内容 + syntax highlight + diagnostics | files panel，仅 path + `written` summary | 当前信息损失很大 |
| `edit` | 完成后展示真实 diff，支持 split/unified + diagnostics | files panel，仅 path + `+A / -D` summary | 当前与 upstream 差距很大 |
| `apply_patch` | 按文件拆 block，区分 add/delete/move/update，显示 patch/diff + diagnostics | files panel，通常只列 patched 文件名 | 当前与 upstream 差距最大之一 |
| `todowrite` | block | todos panel | 接近 |
| `question` | block | question panel | 接近 |
| `skill` | inline | row | 接近 |

### 结论

当前最需要向 upstream 靠拢的 tool 不是 `read`，而是：

1. `glob`
2. `grep`
3. `list`
4. `bash`
5. `task`
6. `write`
7. `edit`
8. `apply_patch`
9. `websearch`
10. `codesearch`

其中又可以分两组：

- **应更轻**：`glob` / `grep` / `list` / `websearch` / `codesearch`
- **应更深**：`bash` / `task` / `write` / `edit` / `apply_patch`

---

## 六、markdown 对照

### upstream

- 使用 TUI 内部 markdown / code 渲染管线
- markdown scope 直接映射到 theme 色槽
- inline code、code block、heading、quote、link、task list 均有专门 scope
- 颜色体系与整体 TUI theme 完全一致

### 当前

- 使用 `markdown-it` 渲染 HTML
- fenced code 使用 `highlight.js`
- 链接颜色来自 `--vscode-textLink-foreground`
- code syntax 颜色主要来自 VS Code terminal ANSI 变量：
  - magenta / green / yellow / blue
- blockquote、pre、table、hr 由本地 CSS 自定义
- heading 被压成统一 13px，且 h1-h3 额外加 `# ` 前缀

### 关键差异

1. **upstream 是 theme token 驱动；当前是 CSS 驱动**
2. **upstream markdown 与 thinking 共用同一套语法色系统；当前 thinking 只是复用同一个 HTML markdown 块**
3. **当前 inline code 样式定义了 `.oc-inlineCode`，但 markdown renderer 没有专门把 inline code 挂到这个 class 上，实际未完全接通**
4. **当前 heading / blockquote / pre 的视觉更像编辑器嵌入网页，而不是 TUI 的终端高亮延续**

---

## 七、thinking 对照

### upstream

- 隐藏条件：`showThinking()`
- 内容：`_Thinking:_ ...`
- 渲染：markdown code renderer
- 颜色：`subtleSyntax()` + `theme.textMuted`
- 容器：左侧边框 + 缩进，弱化展示

### 当前

- 隐藏条件：Thinking toggle
- 内容：清理 `[REDACTED]` 后进入 `MarkdownBlock`
- 渲染：与普通 markdown 相同的 `markdown-it + highlight.js`
- 颜色：通过 `.oc-part-reasoning` 的边框/背景做区分
- 容器：明显的 tinted panel/card

### 关键差异

当前 thinking 比 upstream **更重、更像独立内容卡**；而 upstream thinking 更像：

- 正文的次级层
- 同色系低透明度注释流
- “可看，但不抢正文焦点”

如果继续贴近 upstream，thinking 最重要的不是再加花样，而是：

- 降低背景存在感
- 弱化卡片感
- 让 markdown/syntax 整体褪色，而不只是给外层盒子上色

---

## 八、对当前实现的具体判断

### 已经比较接近 upstream 的部分

- turn-based timeline 结构
- thinking / internals 开关
- `read`、`webfetch`、`task`、`skill` 至少已经不再是大面板
- `todowrite` / `question` 有专门 renderer
- 工具 active/completed 状态已经有层级区分

### 仍明显偏离 upstream 的部分

#### 1. 上下文工具过重

`glob` / `grep` / `list` 现在还是 panel 化，打断阅读节奏。upstream 明显倾向把这些当成 inline 过程行。

#### 2. 文件修改工具过浅

`write` / `edit` / `apply_patch` 现在大多只是 summary，而 upstream 的核心价值正是：

- 直接看写了什么
- 直接看 diff/patch
- 直接看 diagnostics

#### 3. 搜索工具语义偏差

`websearch` / `codesearch` 现在偏“链接卡片”，upstream 更偏“搜索动作摘要”。

#### 4. thinking 视觉太像卡片

当前 reasoning 背景较强，和 upstream 的 subtle markdown thinking 不一致。

#### 5. markdown 颜色系统与 upstream 不同构

当前能看，但它不是 upstream 那种：

- 一套 theme 管全文本/markdown/code/diff/thinking
- thinking 通过同一语法色系统衰减出来

---

## 九、建议的后续对齐方向

### P1：先改 tool 信息架构

1. 把 `glob` / `grep` / `list` 改成 inline row
2. `bash` 改成 upstream 那种两阶段：
   - 无输出 row
   - 有输出 panel
3. `task` 增加 child 当前 tool/title、完成后的 toolcalls/duration

### P2：再补文件类重内容 renderer

4. `write` 展示写入后的完整内容，按文件类型高亮
5. `edit` 展示真正 diff，而不是只做 `+A / -D`
6. `apply_patch` 按文件拆开，区分 add/delete/move/update，并显示 patch/diff

### P3：最后处理视觉系统

7. thinking 改成更弱的左边框/低对比容器，减少 panel 感
8. markdown 颜色尽量收敛到一套更接近 upstream 的 token 映射，而不是继续堆局部 CSS 效果
9. 真正接通 inline code 的专门样式

---

## 十、结论

如果只看“有没有专门 renderer”，当前实现已经比最初版本强很多；但如果按 upstream TUI 的真实展示语义来衡量，当前差距主要不在“有没有卡片”，而在两件事：

1. **哪些工具应该轻量 inline，哪些工具应该重内容展开**
2. **thinking / markdown 是否属于同一套被主题驱动的语法色系统**

目前我们的主要偏差是：

- 该轻的工具还偏重
- 该深的工具还偏浅
- thinking 还偏卡片化
- markdown/highlight 还是 Web CSS 风格，不是 upstream TUI theme 风格

这几个点处理完，timeline 才会在“节奏、语义、观感”三个层面更像 upstream TUI。
