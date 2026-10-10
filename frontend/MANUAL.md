# DQE Lab Agent 前端静态演示 · 使用说明手册

> 适用对象：一线操作员 / 工程人员（用户视图）与平台管理员（管理员视图）、以及后续开发维护人员
> 数据与流程基准：`PFD/required.md`（流程定义）+ `WorkFlow.md`（真实业务）

---

## 1. 这是什么

一份**前端 + 轻量本地服务**的演示应用，用来演示 Lab Agent 建成后的操作形态。本版（2026-10-08）在原有演示之上落地了四项硬能力：

| 核心能力 | 说明 | 页面体现 |
|---------|------|---------|
| ① 自定义工作节点 | 每个节点有「任务」（上传/分析/处理/确认/审核，下拉选择）+ 负责人；节点可**细分**为子节点（子节点各有任务 + 负责人），子节点**仅负责人本人可见** | `#/defs` 作业定义中心 → `#/workflow-config` 流程排配 → `#/travel-sheet` 节点作业 |
| ② 报告纸 | 上传 Excel 只带出 Units 基础数据，**模板本身可调整、可另存为固定模板**；报告纸含**多选下拉栏位**，下拉数据**一处修改、多处生效** | `#/dicts` 字典中心 → `#/admin-forms` 报告纸模板 → `#/report` 报告纸 |
| ③ 数据持久化 | 业务动作（提交流转 / 退回确认 / 照片复核 / 报告与工站入口 / 台账新增 / 设备控制 / 定义与流程发布 / 脚本运行 / 数据源维护）经统一提交钩子 `commit()` 落盘到 `data/demo.json`，**刷新页面状态保持**；顶栏有保存状态指示（已保存 / 保存中 / 保存失败） | 全应用 |
| ④ 节点严格执行（R2） | 提交前强制三关：**节点检查表勾选** + **人工交接物上传登记**（manual 类交接物）+ **整批门闩**（批内同阶段机台进度落后时冻结提交，保持节拍一致）；推进序按已发布作业定义自动派生 | `#/travel-sheet` 节点作业 |

两个老能力的共同基础是**集中管理的下拉字典**（`#/dicts` 字典中心），这是整套演示的枢纽。

**重要说明**：这是界面与数据流的演示，所连服务仅做「数据存取」这一件事，**不连接真实系统**（iMES / CTMS / Recon / Radar 均为模拟）。它用于：确认各角色要什么界面、验证「一次录入多处复用」的流程、给管理层演示评审，以及作为后续开发的前端蓝本。

---

## 2. 如何打开

本版起需要 **Node.js 内置服务**（数据要落盘，`file://` 直开不再可用）。零第三方依赖：

```
node server.js
# 启动后：
浏览器打开 http://localhost:8080/frontend/
```

要求：Node.js ≥ 18（现代内置属性和顶层 fetch），现代浏览器（Chrome / Edge / Safari / Firefox），启用 JavaScript。

- 首次启动：`data/demo.json` 不存在时，服务端用种子生成器自动生成（700 台机台 / 45 本台账 / 28 台设备）并落盘。
- 重置演示数据：`curl http://localhost:8080/api/reset`（重新生成并覆盖 demo.json）。
- 保存：业务动作经防抖 300ms 后 `POST /api/save`，以「临时文件 + 原子改名」写盘，最大 64MB。

目录结构：

```
lab-agent/
├── server.js        # 零依赖 Node 服务：静态 frontend/ + /api/data + /api/save + /api/reset
├── package.json     # scripts.start = node server.js
├── data/
│   ├── seed.js      # 种子生成器（唯一数据源：buildSeed 产出全部 mock）
│   └── demo.json    # 运行时数据（首次启动生成；gitignore；所有业务动作都写这里）
└── frontend/
    ├── index.html   # 入口壳（只挂载 app.js）
    ├── styles.css   # 全部样式（工业实验室风设计系统）
    └── app.js       # 路由 + 视图渲染 + 交互 + 持久化 / 节点严格执行
```

---

## 3. 最核心的概念：身份切换 = 数据与页面一起切换

整个演示围绕「身份」运转。切换身份后，**侧边栏菜单、工作台指标、可操作的内容都随之改变**。

两种切换入口：

1. **登录页切换**（推荐做演示时用）
   - 打开时直接进入上次身份的工作台；点顶栏「身份切换」或地址栏加 `#/login` 进入身份选择页。
   - 身份按分组展示：一线作业（外观目检 / 拍照 / 复核 / 报告 / Mini line）、测试与质量（Test Center / FA）、客户（F1）。
   - 点任一身份卡片即进入该身份的视图。

2. **顶栏身份下拉**（随时切换，无需回登录页）
   - 位置：右上角「身份切换」下拉框。
   - 含「管理员视图」+ 全部一线岗位（Tammy / Lucky / Amy / Bole / Yoke / Frank / Jackson / Aiden / Cody / Kevin / Lisa / F1）。
   - 注：切换只改变视角，不影响其他演示数据；身份存 localStorage，刷新后保留。

**权限模型**：页面访问按「有效岗位集」校验（`PAGE_ACL`）。有效岗位集 = 本人岗位 + 生效请假中由我代管的岗位（`effRoles`）。角色不足的页面直接落到 403 越权拦截页。

---

## 4. 页面总览（聚焦后）

### 配置侧（管理员 / F1 审核员）

| 页面 | 说明 | 主力 |
|------|------|------|
| `#/admin-dashboard` 平台总览 | 精简 KPI + 告警列表 + 阶段进度 | 管理员 |
| `#/dicts` 字典中心 | **枢纽**：集中管理任务类型 + 报告纸多选下拉栏位 + 外观问题 + 失败标签等选项，一处修改多处生效 | 管理员 / F1 |
| `#/defs` 作业定义中心 | 节点 + 任务下拉 + 子节点细分（SSOT） | 管理员 / F1 |
| `#/workflow-config` 流程排配 | 节点序 + 负责人绑定 + 请假委托 | 管理员 / F1 |
| `#/admin-forms` 报告纸模板 | 栏位配置 + 多选下拉栏位引用字典 | 管理员 |
| `#/admin-users` / `#/admin-roles` / `#/admin-posts` / `#/admin-depts` / `#/admin-menus` 组织权限 | 用户 / 角色 / 岗位 / 部门 / 菜单（M/C/F 树） | 管理员 |
| `#/admin-scripts` 脚本管理 / `#/data-sources` 取数源 / `#/devices` 设备 | 脚本注册与运行、取数源配置、设备远程控制 | 管理员（设备：Test Center 共用） |

### 运行侧（操作员）

| 页面 | 说明 | 主力 |
|------|------|------|
| `#/dashboard` 工作台 | 我的任务 + 对我可见的子节点 | 全员 |
| `#/travel-sheet` 节点作业 | 任务点 + 子节点可见性 + 报告纸预览（Mini line 与 Cosmetic 呈现不同作业视图） | 全员 |
| `#/report` 报告纸 | 上传 Excel → 自动生成报告纸 + 多选下拉栏位填写 | 全员 |
| `#/machines` 机台档案 | 机台台账 + 电子档详情 `#/machine-doc` | 全员 |
| `#/batches` 测试批次 | 批次列表 + 详情 `#/batch-detail` | 全员 |
| `#/photo-review` 照片复核 | 三项核对（照片 / 遗漏 / 命名）→ 复核通过 / 退回补拍 | 全员 |
| `#/my-scripts` 我的脚本 | 脚本注册 + 手动运行 / 定时任务 | 全员 |

---

## 5. 两大核心能力 · 分页说明

### 5.1 字典中心 `#/dicts` —— 一处修改，多处生效

集中维护所有「下拉 / 多选下拉」的选项（`DICTS`，唯一真源）：

| 字典 id | 名称 | 用途 |
|--------|------|------|
| `task_type` | 任务类型 | 节点任务下拉（上传数据 / 分析数据 / 处理数据 / 确认动作 / 审核） |
| `fx_issue` | 外观问题 | 报告纸外观问题多选下拉 + 目检勾选卡（6 项，含 part 部位） |
| `test_conclusion` | 测试结论 | 报告纸测试结论多选下拉（PASS / FAIL / N/A） |
| `env_item` | 环境测试项 | Test Center 环境测试 / 报告纸多选下拉（温度 / 湿度 / 温湿度循环） |
| `mech_item` | 机械测试项 | Test Center 机械测试 / 报告纸多选下拉（跌落 / 折叠 / 力度） |
| `recon_tag` | 失败标签 | 失败标签字典（6 类，含 color 颜色） |

在这里增删改选项后，**所有引用该字典 id 的下拉即时生效**——节点任务下拉、报告纸多选下拉、目检勾选卡自动出现新选项，无需再改任何页面。

### 5.2 作业定义中心 `#/defs` —— 自定义工作节点

站点作业定义的 SSOT（`STATION_DEFS`，共 22 个节点：T0 八节点 / TX 七节点 / TF 七节点）。每个节点：

- **任务点（`tasks[]`）**：从 `DICTS.task_type` 下拉多选（如「上传数据 / 分析数据」），选中即生成任务点 chips。
- **子节点（`subNodes[]`）**：节点可再拆分为若干子节点，各有任务 + 负责人。示范：
  - Cosmetic「外观目检 t0-01」→ `检测外观(tammy) → 拍照(lucky) → 核对(amy)`
  - Test Center「分段测试 tx-01」→ `环境测试(aiden) / 机械测试(cody)`
  - Mini line 工站（t0-03 / tx-04 / tf-04）自动补 `Summary IN 扫描 → 工站测试 → Summary OUT 判定`
- **子节点可见性**：子节点**仅负责人本人（含请假委托代理）可见**；管理员 / F1 审核员可见全部。

保存后经 `rebuildDefs()` 一处派生到流程排配 / 节点作业 / 台账环节流，0 处手工同步。每次修订写入审计日志，并支持「已下发快照」比对漂移。

### 5.3 流程排配 `#/workflow-config` —— 节点序 + 人员 + 委托

- 节点 → 该做什么 → 岗位 → 默认负责人 → **当前责任人**。
- 负责人请假登记代理人后，节点待办自动改派，`badge` 高亮「请假 → XX 代理」；委托留痕，实际执行人写入审计。

### 5.4 报告纸模板 `#/admin-forms` —— 模板可调整、可另存

`FORM_TEMPLATES` 是报告纸模板真源。关键点：

- 报告纸模板以 `cat: 'report'` 标记区分：`report_sheet`（报告纸）与 `report_sheet_miniline`（报告纸 · Mini line 版）。
- 栏位类型含「多选下拉」，引用 `dict` 字段指向字典（如 `dict: 'fx_issue'`），选项不内联——改字典即改报告纸。
- 报告纸顶部可勾选「机台基础信息区」表头（SN / 机型 / 客户产品 / 阶段 / 站别 / 班别 / 日期），由台账自动带出。
- 模板支持**调整 + 另存为固定模板**：在 `#/report` 页面点「调整模板 / 另存为固定模板」即可。

### 5.5 报告纸 `#/report` —— 上传 Excel 自动生成

- 「上传 Excel」文件选择 → 模拟解析（实际从 `REPORT_SHEETS` 样例读基础数据）。
- 自动带出基础数据表头 + 按 active 模板渲染报告纸。
- 多选下拉栏位选项来自字典，提交写回 `REPORT_SHEETS`。
- 顶部「模板」下拉可在多张报告纸模板间切换；「调整模板」进构建器；「另存为固定模板」把当前模板克隆为新的固定模板。

---

## 6. 运行侧 · 节点作业 `#/travel-sheet`

按机台所处节点（T0 / TX / TF 任一阶段）展示「任务点 + 子节点 + 报告纸预览」。顶栏可筛阶段、选 SN / 模拟扫码。

**关键：Mini line 与 Cosmetic 呈现不同作业视图**（`roleJobLabel`）：

- **Cosmetic 节点**（`cosmetic`，外观作业）：展示清洁 / 秤重 / 外观目检 / 色差 / 签名等完整外观作业表单。
- **Mini line 节点**（`miniline`，工站测试作业）：**只记录「该机台做了哪些工站 + 结果」**，不记录清洁/重量/外观/色差/签名。界面为：
  - KPI：工站总数 / 已通过 / 失败 / 待测
  - 工站测试记录表：工站 / 组 / 负责人 / 结果（FAIL 红 / 通过绿 / 待测灰）/ 备注
  - 数据来自 `MINI_STATIONS`（26 工站）的每台机 `units[]` 结果。

- **Test Center 节点**（`testcenter`）：环境测试 / 机械测试（对应 env_item / mech_item 字典）。

**R2 节点严格执行 · 提交三关口**（在机台当前环节作业卡内按序出现）：

1. **节点检查表（`nodeDone`）**：本节点的任务点（上传 / 分析 / 处理 / 确认 / 审核）逐项勾选，勾选进度按「机台 × 节点」存入台账数据，刷新 / 持久化不丢。
2. **人工交接物登记（`ART_UPLOADS`）**：作业定义里 `kind: manual` 的交接物（当前版本仅「工站测试数据 ART_STATION」与「FA 裁决 ART_FA」）需上传共享盘路径后放行；auto 类交接物（外观勾选 / 拍照名单 / 报告台账 / Recon 等）由提交自动写出，不阻塞。
3. **整批门闩（`BATCH_ADVANCE_NODES`）**：在「Mini line 工站 t0-03 / tx-04 / tf-04」与「报告/Recon t0-05 / tx-06 / tf-06」等批量推进节点上，批内同阶段在制机台若进度落后（stage 序差 ≥1），冻结领先机台提交并提示落后清单——**批内节拍一致**。

推进序（如 T0：外观→拍照→工站→复核→报告/Recon→Test Center→完成投 TX）不再由手工表决定，而是从 `STATION_DEFS` 已发布节点顺序派生：**改定义即改流程**。签名未完成 / 不属当前责任人的提交会被拦截；退回确认后机台回到目标节点重做，重做完「快速归还」放行。

> 提示：演示数据里批内机台刻意处于不同环节（展示管线形态），逛到批量推进节点时会被门闩拦下并列出落后清单——先推进同批兄弟姐妹即可等齐流转。

---

## 7. 用户视图 · 分角色菜单

用户视图左侧菜单 = 通用菜单（工作台 / 节点作业 / 报告纸）+ 本岗位额外菜单。各岗位通用项相同，F1（客户审核）额外可见 `作业定义中心 / 流程排配 / 字典中心` 三项配置入口。

| 岗位 | 角色 | 典型操作 |
|------|------|---------|
| Tammy | cosmetic（外观目检） | 节点作业中完成外观目检、勾选问题、色差、签名 |
| Lucky | photo（拍照） | 拍照任务点 |
| Amy | review（照片复核） | 复核任务点 |
| Bole / Yoke | report（Report/Recon） | 报告 / 对账任务点 |
| Frank / Jackson | miniline（Mini line） | 工站测试记录（每台机做了哪些工站 + 结果） |
| Aiden / Cody | testcenter（Test Center） | 环境 / 机械测试 |
| Kevin / Lisa | fa（FA） | FA 裁决 / 退库 |
| F1（客户） | reviewer | 审核 + 配置（作业定义 / 流程排配 / 字典中心） |

---

## 8. 管理员视图

管理员菜单由 `data.js` 的 `MENUS` 树（M 目录 → C 菜单）派生：平台总览 → 配置中心（作业定义中心 / 流程排配 / 字典中心 / 报告纸模板）→ 脚本与数据（我的脚本 / 脚本管理 / 取数源）→ 组织权限（用户 / 角色 / 岗位 / 部门 / 菜单管理）→ 设备监控（设备）。管理员角色 `menus: ['*']` 授权全部菜单，`canView` 对管理员直接放行，可看全部子节点、全部通知。

- **平台总览**：精简 KPI + 告警 + 阶段进度，可直接处置告警。
- **配置中心**：与 F1 共用（见 §5）；报告纸模板栏位配置 + 多选下拉引用字典。
- **组织权限**：用户 / 角色 / 岗位 / 部门 / 菜单（RuoYi 风格 M/C/F 树），权限文字由 `roleScope()` 按岗位推导。

---

## 9. Agent 聊天（全局问诊抽屉）

右下角脉冲悬浮钮唤起 **Lab Agent 对话面板**（只读答询）。支持机台 / 单据号 / 根因 / 请假委托 / 当天运行等问询，回答引用数据源并写入审计日志。**Agent 只做只读回答与跟催建议，写操作保留人工确认。**

---

## 10. 数据从哪来 / 如何改数据

运行时数据由 `data/seed.js` 的种子生成器（`buildSeed()`）产生，首次启动落盘到 `data/demo.json`；此后所有业务动作都由 `app.js` 的统一提交钩子 `commit()` 防抖写回同一文件。**`data/demo.json` 是唯一真源**，`frontend/data.js` 已废弃删除。

种子生成器产出的主要数据面：

| 数据面 | 内容 |
|------|------|
| `MACHINES` | **700 台机台**（机型 / 客户产品 / 站别 / 状态分布） |
| `TRAVEL_SHEETS` | **45 本台账**（12 本样例 + 33 本生成；T0 / TX / TF 三阶段、含节点流水 timeline、nodeDone 检查表、fxIssue） |
| `BATCH_MACHINES` | 35 行批次归属（B-0917-01 24 台 / B-0921-02 11 台），供整批门闩比对 |
| `DEVICES` | **28 台设备**（Env 室 10 / Cycle 室 8 / 充电架 7；在线 约 23 / 离线 / 运行中、温湿度读数、运行时长） |
| `ART_UPLOADS` | 样例机台预登记的交接物（非 T0 阶段补 ART_FA、按需补 ART_STATION），保证开箱即能演示到流转 |
| 其余 | USERS / MENUS / ROLES / DICTS / STATION_DEFS / FORMS / REPORT_SHEETS / LEAVES / AGENT_CASES 等沿用既有结构。`LEAVES` 的日期与演示「今天」对齐：默认仅一条生效委托（Kevin→Lisa），不抢占一线主流程 |

修改方式：

- **改数据一键重建**：改完 `seed.js` 后执行 `curl http://localhost:8080/api/reset`（服务端清掉模块缓存重新生成）。
- **运行期改**：直接在界面上操作（发布定义 / 改字典 / 提交流转 / 设备控制…）都会写回 `demo.json`。
- 想加一个任务类型 → `seed.js` 的 `DICTS.task_type.options` 追加一行，重建即可。
- 想改某节点负责人 / 任务 → 改 `STATION_DEFS` 对应行，或直接在 `#/defs` 界面操作。

> 注意：`demo.json` 已被 `.gitignore` 忽略，属于本地运行态；不要手工编辑它作为配置入口。

---

## 11. 开发者扩展指南

### 11.1 新增一个页面（三步）

1. 在 `app.js` 写渲染函数，返回 HTML 字符串，例如 `viewMyNewPage()`；
2. 在 `VIEWS` 表注册 key（如 `'my-new-page': viewMyNewPage`）；
3. 在 `data.js` 的 `MENUS` 树加一条 C 型菜单 `{ key: 'my-new-page', type: 'C', name: '名称', parent: 'm-config', icon: 'xxx', sort: n, status: 'active' }`（父目录用 M 型 key），再把该 key 加进 `ROLES[].menus` 授予需要的角色——`PAGE_ACL` 由 `MENUS` + `ROLES` 反向生成（`rebuildAcl`），无需手工登记。

可选：在 `renderTopbar` 的 `labels` 中补中文名（用于面包屑）；新图标在 `ICONS` 对象里加一个 SVG path。

### 11.2 页面间跳转

- 菜单 / 链接统一用 `<a href="#/key">`。
- 代码跳转用 `location.hash = '#/key'` 或 `LabApp.go('key')`。

### 11.3 交互绑定

- 每个视图内的按钮事件在 `bindPage(route)` 中绑定（渲染后执行），新增页面的交互也在此追加，使用 `data-*` 属性区分。
- 全局 toast：`toast('文字', 'ok|warn|bad|accent')`；模态：`modal('标题', '<html>')`。

### 11.4 关键复用点（不重造）

- 派生引擎 `L.rebuildDefs()`：新增 tasks/subNodes 后仍经它一处派生到排配 / 环节流。
- 责任人链 `nodeOwner` / `effId`：子节点负责人直接复用，免费获得请假委托改派。
- 多选组件 `multiSelHtml` / `initMultiSel`：节点任务多选与报告纸多选下拉。
- 报告纸表设计器 `fdPreviewHtml` / `fieldRowHtml` / `openFormBuilder`：报告纸模板基于它。
- 基础信息表头 `basicHeaderHtml` / `machineBasicValue`：报告纸 Excel 自动带出。

### 11.5 已知边界（演示版刻意简化）

- **持久化是文件级，不是真实业务系统**：一切落盘到 `data/demo.json`（本地文件），没有数据库 / 后端服务 / 多用户并发锁 / 服务端鉴权。
- 身份（localStorage）与业务数据（demo.json）分开存储；`/api/reset` 会还原到种子快照。
- 「模拟扫码」「提交」「上传 Excel」为本地状态：只更新演示数据，不会写入任何真实系统（iMES / CTMS / Recon）。
- 设备温湿度 / 计时为模拟读数；运行中设备每秒计时，但仅在离开看板 / 切页时随快照保存一次（`beforeunload` + `hashchange` 兜底），不做每秒写盘。

---

## 12. 常见问题（FAQ）

**Q1：双击 index.html 打不开 / 提交不保存？**
`file://` 直开在本版已不支持（数据要落盘）。请 `node server.js` 后用浏览器打开 `http://localhost:8080/frontend/`。

**Q2：切换身份后内容没变？**
检查顶栏「身份切换」下拉是否成功（地址会自动变为 `#/dashboard`）。若地址没变，刷新页面重试。

**Q3：填表 / 提交后能否保留？刷新会丢吗？**
能保留。业务动作经 `commit()` 防抖落盘到 `data/demo.json`，刷新后状态保持；顶栏有「已保存 / 保存中 / 保存失败」指示。想还原到种子快照：`curl http://localhost:8080/api/reset`。

**Q4：想改管理员能看的内容？**
改 `seed.js` 的 `MENUS`（C 型菜单的增删排序）或对应 `viewAdminXxx()` 函数 + `/api/reset` 重建即可；成员权限文字由 `roleScope()`（app.js）按岗位自动推导。

**Q5：为什么我在节点作业里提交被拦截？**
三关口逐一排查：① 检查表是否逐项勾选；② 本节点是否有 `manual` 交接物待上传（如工站测试数据 / FA 裁决）；③ 当前节点是否是批量推进节点且批内有落后机台（整批门闩会列出落后清单）。推进序由作业定义派生，状态不在序中不会自动推进。

**Q6：为什么我看不到别人的子节点？**
子节点可见性 = 仅负责人本人（含请假委托代理）；管理员 / F1 审核员可见全部。这是刻意的权限设计（`subVisible`）。

---

## 13. 附录：路由速查表

| 路由 | 页面 | 可访问 | 主力 |
|------|------|--------|------|
| `#/login` | 身份选择 | all | 全员 |
| `#/dashboard` | 工作台 | all | 全员 |
| `#/travel-sheet` | 节点作业 | all | 全员 |
| `#/report` | 报告纸 | all | 全员 |
| `#/machines` | 机台档案 | all | 全员 |
| `#/machine-doc` | 机台电子档 | all | 全员 |
| `#/batches` | 测试批次 | all | 全员 |
| `#/batch-detail` | 批次详情 | all | 全员 |
| `#/photo-review` | 照片复核 | all | 复核责任人 |
| `#/my-scripts` | 我的脚本 | all | 全员 |
| `#/dicts` | 字典中心 | reviewer / admin | F1 / 管理员 |
| `#/defs` | 作业定义中心 | reviewer / admin | F1 / 管理员 |
| `#/workflow-config` | 流程排配 | reviewer / admin | F1 / 管理员 |
| `#/admin-dashboard` | 平台总览 | admin | 管理员 |
| `#/admin-forms` | 报告纸模板 | admin | 管理员 |
| `#/admin-scripts` | 脚本管理 | admin | 管理员 |
| `#/admin-script-detail` | 脚本详情 | admin | 管理员 |
| `#/data-sources` | 取数源 | admin | 管理员 |
| `#/devices` | 设备 | admin / testcenter | 管理员 / Test Center |
| `#/admin-users` | 用户管理 | admin | 管理员 |
| `#/admin-roles` | 角色管理 | admin | 管理员 |
| `#/admin-posts` | 岗位管理 | admin | 管理员 |
| `#/admin-depts` | 部门管理 | admin | 管理员 |
| `#/admin-menus` | 菜单管理 | admin | 管理员 |

> 「可访问」由 `PAGE_ACL`（app.js）校验：`all` = 全员；`admin` = 仅管理员（`canView` 对管理员直接放行）；其余按角色 id 授予（`rebuildAcl` 由 `MENUS` + `ROLES` 反向生成）。越权访问落到 403 拦截页；不在 `VIEWS` 表内的旧路由（如 `#/ctms`、`#/unit-flow`、`#/run-tool`、`#/admin-logs` 等已随聚焦重构移除的页面）访问时会自动纠正为 `#/dashboard`。
