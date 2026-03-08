# opencode-vscode-ui 方案

面向独立仓库落地的 VS Code 扩展实施计划。

---

## 目标

在当前仓库中推进一个独立的 `opencode-vscode-ui` 项目，用 VS Code 原生扩展能力承载 opencode 会话体验。

这个仓库现在不再挂在上游 opencode 仓库内部开发，而是作为单独 git 仓库维护；本地通过根目录下的 `opencode/` 软链接引用上游源码，供方案设计、代码复用和联调时参考。

核心交付仍是 3 个入口：

1. 打开工作区时自动启动对应目录的 opencode server
2. 在编辑器 tab 中展示会话 UI
3. 在左侧 Activity Bar 对应的 sidebar 中浏览、创建并打开会话

---

## 当前进展

### 已完成

- 已完成独立仓库初始化，并把规划迁移到当前仓库根目录
- 已创建 VS Code 扩展基础工程
  - `package.json`
  - `tsconfig.json`
  - `esbuild.js`
  - `eslint.config.mjs`
  - `.vscodeignore`
  - `.vscode/launch.json`
- 已实现扩展激活入口与基础命令注册
- 已实现 `WorkspaceRuntime` 管理器
- 已实现按 workspace 自动启动和关闭 `opencode serve`
- 已实现 `/global/health` 健康检查与 output channel 日志输出
- 已实现基础 TreeDataProvider，可展示 workspace 运行状态
- 已接入 SDK `session.list`、`session.create` 与 `session.delete`
- 已实现 host 侧 `SessionStore`
- 已实现按 workspace 分组展示的 session list sidebar
- 已修正 session list / create 的目录过滤，避免混入其他项目 session
- 已支持 sidebar 刷新 workspace sessions、新建 session、删除 session
- 已调整 sidebar 操作入口：保留 workspace hover 的 `New Session` / `Refresh`，移除顶部 toolbar 与其他非必要按钮
- 已将主入口从右侧 secondary sidebar 调整为左侧 Activity Bar，更符合实际使用体验
- 已实现最小可用的 session webview panel、bootstrap bridge 和 panel restore
- 已支持从 sidebar 打开 session tab，并保证同一 `sessionId + dir` 只复用一个 panel
- 已支持 session hover inline `Open` 右箭头按钮与 `Delete` 按钮
- 已支持删除 session 前的二次确认，以及删除后自动关闭已打开 tab
- 已扩展 host 侧 SDK，接入 `session.get`、`session.messages`、`session.status` 与 `session.promptAsync`
- 已扩展 panel bridge，支持 `snapshot`、`submit`、`refresh` 与错误反馈
- 已将 session tab 从占位 shell 升级为最小单会话 UI，支持 timeline 与 composer
- 已支持在 tab 内发送消息，并通过 host 侧轮询刷新会话状态与消息列表
- 已新增 host 侧 `EventHub`，按 workspace 订阅 `/event`
- 已让打开中的 session panel 基于事件做增量同步，覆盖 message、part 与 session status 变化
- 已扩展 host 侧 SDK，接入 `session.todo`、`permission.list/reply` 与 `question.list/reply/reject`
- 已让 session tab 支持最小阻塞态：permission、question、todo
- 已支持在 tab 内响应 permission、回答或拒绝 question，并在未阻塞时展示 todo
- 已完成依赖安装、lint、typecheck 和 compile 验证

### 当前状态

当前仓库已经具备“可启动、可见、可浏览、可打开 session tab”的前三阶段基础：

- 左侧 Activity Bar 中可看到 `OpenCode` 入口
- 打开后可在 sidebar 中看到 workspace 节点与对应 session 列表
- 扩展会尝试在工作区目录中启动 `opencode serve`
- server ready 后会自动拉取该 workspace 的 session list
- session list 已按 workspace 目录精确过滤
- 可在 workspace 节点 hover 时刷新 session 列表并创建新 session
- 可在 session 节点 hover 时通过右箭头按钮打开 session，通过 `x` 删除 session
- 删除 session 前会弹出二次确认，删除成功后会自动关闭对应 tab
- session 已可打开为真实 webview tab，且支持 reveal 与 restore
- session tab 已具备最小真实会话 UI：可查看 timeline、输入消息并触发发送
- 已接入 `/event` 增量同步，打开中的 tab 会随消息、part、status 变化实时更新
- session tab 已支持最小 permission / question / todo 交互，阻塞请求会暂时接管底部区域
- session tab 的 timeline 已完成一轮面向 upstream TUI 的重构：从 part 平铺改为 turn-based transcript，并补齐了 part 可见性语义、主要 tool renderer、tool 状态交互以及一轮视觉密度收口
- 当前仍保留少量 host 侧兜底刷新，用于 submit 后和异常情况下的状态校正
- `OpenCode UI` output channel 仍可通过命令访问，用于查看启动日志和错误

同时，当前 UI 虽然已经完成第一轮结构性重构，但与 upstream OpenCode TUI 仍有剩余差距，主要集中在更细的 tool 细节保真、context tool 分组、timeline 导航类交互，以及继续基于真实使用反馈做针对性收口。

### 下一步

下一阶段不再是从零开始重构 timeline，而是在当前 4A ~ 4E 第一版基础上做第二轮对齐与验证，重点包括：

- 继续提高各类 tool renderer 与 upstream 的细节保真度，尤其是 `bash`、`task`、`edit`、`write`、`apply_patch`
- 评估并补齐 `read/glob/grep/list` 的 context grouping，而不是仅按单条工具结果展示
- 根据真实会话使用反馈继续收口 transcript 的默认显隐、折叠和阅读流噪音
- 评估是否补充轻量 timeline picker / turn jump 等导航能力
- 在结构稳定后，再决定是否需要把当前部分本地 tool 元数据类型补强，避免 renderer 长期依赖宽松 metadata 解析

当前 4A ~ 4E 的分阶段方案仍保留在下文，作为本轮已完成工作的记录和后续第二轮迭代的基线。

---

## 当前仓库约束

### 仓库角色

- 当前仓库是独立项目仓库
- `opencode/` 是本地软链接，不属于本仓库源码
- `opencode/` 只作为参考实现、依赖来源和联调对象
- `opencode/` 不应提交到当前仓库的 git 历史中

### 目录基线

```txt
opencode-vscode-ui/
  PLAN.md
  AGENTS.md
  opencode/   -> ../opencode   (local symlink, git ignored)
```

后续真正开始实现时，建议把扩展源码直接放在当前仓库，例如：

```txt
src/
webview/
scripts/
package.json
tsconfig.json
esbuild.js
```

不再以 `sdks/opencode-ui/` 作为本仓库内路径前提，因为这里已经是独立仓库。

---

## 排除范围

- 第一版只保证 VS Code 可用
- 不处理 Cursor、Windsurf、VSCodium 兼容
- 不重做 opencode 服务端业务逻辑
- 不新增服务端协议
- 不把上游 `sdks/vscode` 原地升级后直接提交到这里
- 不优先处理多根工作区之外的复杂远程场景优化

---

## 设计架构

建议保持“三层”结构：

1. **Extension host 层**
   - 管 VS Code 生命周期、命令、sidebar、tab、server 进程管理
2. **Webview UI 层**
   - 管会话渲染、输入、事件订阅、轻量状态同步
3. **Opencode server 层**
   - 复用 `opencode serve` 和 `@opencode-ai/sdk/v2`

建议目录：

```txt
src/
  extension.ts
  core/
    workspace.ts
    server.ts
    session.ts
    tabs.ts
    commands.ts
    events.ts
  sidebar/
    provider.ts
    item.ts
  panel/
    serializer.ts
    provider.ts
    html.ts
  bridge/
    host.ts
    webview.ts
    types.ts
  ui/
    main.tsx
    app.tsx
    styles.css
```

`src/core` 负责 VS Code 侧控制面，`src/ui` 负责 webview 前端壳，避免两侧状态和依赖互相污染。

---

## 和上游 opencode 的关系

### 复用原则

优先复用上游仓库已有能力，但把“可运行产物”和“项目边界”留在当前独立仓库。

### 直接复用

1. `opencode/packages/sdk/js`
   - 作为唯一 server client
2. `opencode/packages/app`
   - 复用单会话 UI 思路与可拆分组件
3. `opencode/packages/ui`
   - 复用基础 UI 组件
4. `opencode/packages/opencode`
   - 复用既有 server 接口与事件模型
5. `opencode/sdks/vscode`
   - 参考扩展打包、发布和最小脚手架

### 谨慎复用

- 借鉴 `packages/app` 的 session 页面和全局同步方式
- 不把完整 web app 原样塞进 webview
- 先抽“单会话最小闭环”，再补外围能力

### 不建议复用

- 直接照搬上游扩展里的终端驱动逻辑
- 直接依赖 `/tui/*` 作为主交互接口

新项目应以 `/session/*`、`/message/*`、`/event` 为主。

---

## 生命周期规划

### 激活时

扩展在以下时机激活：

- 打开工作区
- 打开 sidebar view
- 执行 `opencode-ui.*` 命令
- 恢复已序列化 tab

激活后先注册 provider、commands、serializer，再按当前 workspace folders 启动 runtime。

### 打开文件夹时

当首次打开文件夹或新增工作区文件夹时：

1. 建立 `WorkspaceRuntime`
2. 分配随机空闲端口
3. 在对应工作区目录下执行 `opencode serve --port <port> --hostname 127.0.0.1`
4. 轮询 `/global/health`
5. 建立 SDK client
6. 拉取会话列表并刷新 sidebar

### 打开 tab 时

1. 查找已有 session tab
2. 若存在则 reveal
3. 若不存在则新建 webview panel
4. 通过 bridge 下发 `bootstrap`

### 关闭时

- panel 关闭时只销毁该 tab 的 webview 状态
- workspace 被移除时终止对应 server
- extension deactivate 时清理全部子进程和事件流

---

## 核心数据模型

### WorkspaceRuntime

```ts
type WorkspaceRuntime = {
  dir: string
  port: number
  url: string
  state: "starting" | "ready" | "error" | "stopped"
  proc?: ChildProcess
  sdk?: OpencodeClient
  sessions: Map<string, SessionMeta>
}
```

### SessionRef

```ts
type SessionRef = {
  id: string
  dir: string
  title: string
  status?: string
  tab?: string
}
```

### TabRef

```ts
type TabRef = {
  key: string
  sessionId: string
  dir: string
  panel: vscode.WebviewPanel
}
```

约束：

- 一个 `sessionId + dir` 只允许一个 panel
- 一个 workspace 对应一个 server runtime
- sidebar 只展示 session list，不承担 panel 状态

---

## 数据流

### 会话列表流

```txt
opencode server
  -> SDK session.list / event stream
  -> Extension host SessionStore
  -> TreeDataProvider.refresh()
  -> Sidebar Tree View
```

### 会话 tab 流

```txt
Sidebar click
  -> Extension command openSession
  -> TabManager / SessionPanelManager
  -> create or reveal WebviewPanel
  -> bridge bootstrap payload
  -> bridge postMessage
  -> Webview shell render
```

### 新建会话流

```txt
Sidebar click
  -> Extension command
  -> SessionStore.create(workspace)
  -> SDK session.create
  -> refresh list
  -> session 出现在 sidebar 中
```

---

## 体验决策

### 启动策略

默认在工作区打开后自动启动 server，不等待用户首次点击。

### tab 标题

建议格式：

```txt
OpenCode: <session title>
```

标题缺失时回退到 `OpenCode: <session id 前缀>`。

### 打开行为

- 单击 session 树项执行 `openSession`
- 回车可继续执行 `openSession`
- session hover inline 显示右箭头 `Open` 按钮

### 新建入口

- workspace 节点 hover inline `New Session`
- command palette `OpenCode: New Session`

### 删除入口

- session 节点 hover inline 显示 `Delete` 按钮
- 删除前弹 modal 二次确认
- 删除成功后自动关闭对应已打开 tab

### 错误反馈

server 启动失败、health check 超时、SDK 调用失败都通过 `window.showErrorMessage` 提示，并写入 output channel。

---

## VS Code API 选择

- `vscode.ExtensionContext`
- `vscode.commands.registerCommand`
- `vscode.workspace.workspaceFolders`
- `vscode.workspace.onDidChangeWorkspaceFolders`
- `viewsContainers.activitybar`
- `TreeDataProvider`
- `TreeItem`
- `EventEmitter`
- `vscode.window.createWebviewPanel`
- `vscode.WebviewPanelSerializer`
- Node `child_process.spawn`
- `OutputChannel`

第一阶段优先 `WebviewPanel + serializer`，不急着上 `CustomEditorProvider`。

---

## 里程碑

### 里程碑 1：仓库脚手架

- 在当前独立仓库补齐扩展工程骨架
- 建立基础构建链
- 注册 Activity Bar 容器和基础命令
- 建立 `WorkspaceRuntime` 管理器
- 能在打开文件夹时启动/关闭 server

验收：打开项目后 output channel 可见健康启动日志。

当前状态：已完成。

### 里程碑 2：打通 sidebar

- 接入 SDK `session.list`
- 实现 TreeDataProvider
- 展示工作区节点和 session 节点
- 支持刷新和新建 session

验收：sidebar 能稳定展示会话并创建新会话。

当前状态：已完成。

### 里程碑 3：打通 tab

- 实现 webview panel
- 定义 bridge 协议
- 支持打开 session tab
- 支持 panel restore

验收：session 可在 tab 内打开、关闭、恢复。

当前状态：已完成，目前 tab 内为最小 webview shell。

### 里程碑 4：接入真实会话 UI

- 从 `opencode/packages/app` 抽出单会话壳
- 接入 timeline、composer、发送消息
- 订阅 `/event` 做增量刷新

验收：tab 内可收发消息并实时更新。

当前状态：已完成基础闭环。现已具备最小 timeline/composer、`/event` 增量同步、最小 permission/question/todo 交互，以及 focused-session 的 Todo / Modified Files sidebar views。

更新：里程碑 4 的“能用”目标已达成，并且 timeline presentation layer 已完成一轮专项重构。当前剩余工作不再是基础闭环，而是继续提高与 upstream 的保真度和稳定性。

### 里程碑 4A：重建 timeline 信息架构

目标：把当前按 part 平铺的 session 页面，重构为更接近 upstream 的 turn-based timeline。

- 在 panel webview 中引入 turn 概念，而不是直接逐条输出 `SessionMessage.parts`
- 明确 user turn 与 assistant turn 的组织关系
- user message 只取首个可见文本作为主正文，附件 file 挂在该 turn 下方
- assistant message 不再把所有 part 等权展示，而是先按 upstream 可见性做筛选
- 预留 turn-level meta 区域，用于承载 model、duration、tokens、cost、finish reason 等元信息

验收：

- timeline 不再呈现“每个 part 一个卡片”的 inspector 风格
- user / assistant 轮次结构清晰可辨
- user prompt、assistant answer、attachment、meta 的层级稳定

当前状态：已完成第一版。session timeline 已改为 turn-based transcript，user prompt / assistant lane / attachment / turn meta 的层级已经建立。

### 里程碑 4B：建立 part 可见性与语义映射

目标：对 schema 中存在的所有 part 类型建立明确展示策略，而不是默认全部直出。

- `text`：保留为正文
- `reasoning`：改为独立 Thinking block，并预留显示/隐藏开关
- `file`：作为附件条目，而不是独立 section
- `compaction`：改为 timeline divider
- `step-finish`：转为 footer/meta 信息来源，而不是正文块
- `step-start`、`snapshot`：默认不作为主正文显示，必要时仅保留轻量调试入口
- `patch`：重新定义其与 Modified Files / tool diff 的关系，避免重复信息
- `agent`、`subtask`、`retry`：明确是主展示、弱提示还是只在特定上下文出现

验收：

- 每种 part 类型都有清晰的展示归属
- timeline 中不再出现大量无正文价值的空 section 或调试式 block
- compaction、reasoning、step meta 的语义层级明确

当前状态：已完成第一版。Thinking、Internals、divider/meta、隐藏内部 part、footer meta 等语义映射已接入。

### 里程碑 4C：建立 tool renderer 体系

目标：把 `tool` 从“统一 dump 输出”升级为按工具类别分派的专用 UI。

建议先分三层：

1. 上下文工具
   - `read`
   - `glob`
   - `grep`
   - `list`
2. 执行工具
   - `bash`
   - `task`
   - `webfetch`
   - `websearch`
   - `codesearch`
3. 修改工具
   - `write`
   - `edit`
   - `apply_patch`
   - `todowrite`
   - `question`
   - `skill`

具体改造项：

- 建立 `tool -> renderer` 路由层
- `bash` 展示 command、cwd、output、running/error/completed 状态
- `read/glob/grep/list` 展示紧凑摘要，不霸占主时间线高度
- `task` 展示 subagent 摘要并与 child session 导航联动
- `write/edit/apply_patch` 展示结构化 diff / 写入结果，而不是原始文本 dump
- `todowrite` 与当前 sidebar Todo 视图语义对齐
- `question` 明确与底部阻塞问答区的关系，避免重复展示
- 未命中专用 renderer 的工具，才走 generic fallback

验收：

- timeline 中主要 tool 都有稳定、可读、非调试风格的展示
- 上下文工具足够紧凑，执行工具具备状态感，修改工具具备 diff 感
- child task / child session 的关联入口自然可见

当前状态：已完成第一版。主要 tool 已按 row、panel、links、files、todos、question 等形态拆分 renderer，但与 upstream 的细节保真仍可继续提高。

### 里程碑 4D：对齐关键交互行为

目标：不只对齐视觉，还要对齐 upstream TUI 的关键交互路径。

- 为 reasoning block 增加显示策略，而不是永远展开
- 对 completed tool 引入弱化/折叠策略，减少时间线噪音
- 对 running / error tool 引入更明确状态视觉
- 梳理 permission / question / retry 与主 timeline 的关系，避免信息重复和抢焦点
- 把 task tool、child session 导航、当前已实现的 Parent / Prev / Next 按钮统一到一个连贯交互模型中
- 评估是否需要类似 upstream timeline picker / turn jump 的轻量版导航

验收：

- timeline 的主阅读流畅度明显提升
- 用户能区分正文、thinking、tool、阻塞态、子任务态
- child session 与 task 的关系比当前更直观

当前状态：已完成第一版。已接入 active tool 强调、completed tool 弱化/折叠、task 到 child session 的更直观入口。

### 里程碑 4E：样式与密度收口

目标：在信息架构和交互层稳定后，再进行统一的视觉收口，而不是先做零散像素微调。

- 收口 turn 容器、正文、thinking、tool、divider、footer 的 spacing system
- 对齐与 upstream 接近的终端式层级感，同时保持 VS Code webview 可读性
- 校正字体层级、hover、选区、code block、tool block、diff block 的密度
- 统一深色主题下的对比度、弱文本、错误文本、状态色
- 避免 sidebar 与 tab 内出现重复但风格不一致的同类信息块

验收：

- timeline 各类块级元素风格一致
- 相同语义在不同区域的视觉语言统一
- 样式调整建立在正确的信息架构之上，而不是继续放大结构问题

当前状态：已完成第一版。已对 spacing、contrast、turn hierarchy、footer command area 做过一轮统一收口。

### 里程碑 5：完善体验

- loading、error、empty 状态
- server 异常恢复
- tab 标题同步
- context menu、快捷键、日志面板
- 基础集成测试

补充说明：里程碑 5 的体验工作现在可以开始逐步推进，但应建立在当前 4A ~ 4E 第一版结构之上，并优先结合真实会话反馈处理残余问题，而不是再次回到无结构的零散样式微调。

验收：多工作区、重启、断流场景可用。

---

## 风险

### UI 复用过重

直接搬 `packages/app` 会导致 webview 体积大、耦合高、落地慢，应优先抽离单会话必需能力。

### 多工作区复杂度

多根工作区会带来多个 server、多个 session 树、多个 tab 命名空间，必须始终保留 `dir` 维度。

### server 生命周期漂移

扩展只信任自己启动并持有 PID 的实例，不模糊复用外部已启动 server。

### 本地软链接依赖

`opencode/` 是本地开发便利手段，不应成为当前仓库提交物或 CI 前提。后续若要共享开发环境，应补正式依赖获取方案。

---

## 建议落点

先把 `server + sidebar + open tab` 打通，再接入真实聊天 UI。

只要 `WorkspaceRuntime`、`SessionStore`、`TabRef` 三个核心模型先站稳，后面的功能就能沿着上游 SDK 与 app 能力逐步填充。
