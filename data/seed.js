/* ===================================================== * data.js — 前端静态演示的 mock 数据源
 * 依据：Lab_Agent_Plan_v2.md（三方向） + WorkFlow.md（真实业务）
 * 所有数据仅用于静态界面演示，与线上系统无关。
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- 用户（sys_user）----------------
     关联关系对齐 RuoYi：用户 → 部门(orgId) 单值；用户 → 角色(roleIds) / 岗位(postIds) 多对多。
     dept 为缓存的部门显示名（保存时由 orgId 派生）。 */
  var USERS = [
    { id: 'tammy',   name: 'Tammy',    roleIds: ['cosmetic'],   postIds: ['cosmetic-inspector'], dept: 'Cosmetic 外观组', orgId: 'cosmetic',   badge: 'T0/TX/TF', phone: '138-0000-0001', email: 'tammy@dqelab.com',   status: 'active' },
    { id: 'lucky',   name: 'Lucky',    roleIds: ['photo'],      postIds: ['photographer'],       dept: '拍照组',          orgId: 'photo',      badge: 'T0',      phone: '138-0000-0002', email: 'lucky@dqelab.com',   status: 'active' },
    { id: 'amy',     name: 'Amy',      roleIds: ['review'],     postIds: ['photo-reviewer'],     dept: '复核组',          orgId: 'review',     badge: 'T0/TX',   phone: '138-0000-0003', email: 'amy@dqelab.com',     status: 'active' },
    { id: 'bole',    name: 'Bole',     roleIds: ['report'],     postIds: ['report-recon'],       dept: 'Report/Recon',   orgId: 'report',     badge: 'T0/TX/TF', phone: '138-0000-0004', email: 'bole@dqelab.com',    status: 'active' },
    { id: 'yoke',    name: 'Yoke',     roleIds: ['report'],     postIds: ['recon-entry'],        dept: 'Report/Recon',   orgId: 'report',     badge: 'T0',      phone: '138-0000-0005', email: 'yoke@dqelab.com',    status: 'active' },
    { id: 'frank',   name: 'Frank',    roleIds: ['miniline'],   postIds: ['miniline-report'],    dept: 'Mini line',      orgId: 'miniline',   badge: 'T0/TX/TF', phone: '138-0000-0006', email: 'frank@dqelab.com',   status: 'active' },
    { id: 'jackson', name: 'Jackson',  roleIds: ['miniline'],   postIds: ['station-equip'],      dept: 'Mini line',      orgId: 'miniline',   badge: 'T0',      phone: '138-0000-0007', email: 'jackson@dqelab.com',  status: 'active' },
    { id: 'aiden',   name: 'Aiden',    roleIds: ['testcenter'], postIds: ['test-center'],        dept: 'Test Center',    orgId: 'testcenter', badge: 'T0/TX',   phone: '138-0000-0008', email: 'aiden@dqelab.com',   status: 'active' },
    { id: 'cody',    name: 'Cody',     roleIds: ['testcenter'], postIds: ['test-center'],        dept: 'Test Center',    orgId: 'testcenter', badge: 'T0/TX',   phone: '138-0000-0009', email: 'cody@dqelab.com',    status: 'active' },
    { id: 'kevin',   name: 'Kevin',    roleIds: ['fa'],         postIds: ['fa-ct-pm'],           dept: 'FA',             orgId: 'fa',         badge: 'T0/TX/TF', phone: '138-0000-0010', email: 'kevin@dqelab.com',   status: 'active' },
    { id: 'lisa',    name: 'Lisa',     roleIds: ['fa'],         postIds: ['fa-return'],          dept: 'FA',             orgId: 'fa',         badge: 'TF',      phone: '138-0000-0011', email: 'lisa@dqelab.com',    status: 'active' },
    { id: 'f1',      name: 'F1（客户）', roleIds: ['reviewer'],  postIds: ['customer-review'],    dept: '客户',           orgId: 'customer',  badge: '客户',   phone: '—', email: 'f1@customer.com',  status: 'active' },
    { id: 'admin',   name: 'Admin',    roleIds: ['admin'],      postIds: ['platform-admin'],     dept: '系统平台',       orgId: 'platform',  badge: 'All',     phone: '—', email: 'admin@dqelab.com',  status: 'active' }
  ];

  /* 用户登录态：切换身份会改变侧边栏/工作台/数据 */
  var SESSION = { userId: 'bole', mode: 'user' }; /* mode: 'user' | 'admin' */

  /* ---------------- 岗位（sys_post） ----------------
     扁平数组：code 岗位编码 / name 岗位名称 / sort 排序 / status 状态。
     岗位 → 角色为 N:1：report-recon/recon-entry 同属 report 角色，
     miniline-report/station-equip 同属 miniline 角色，体现「岗位 ≠ 角色」的分离。 */
  var POSTS = [
    { code: 'cosmetic-inspector', name: '外观目检',              sort: 1,  status: 'active' },
    { code: 'photographer',       name: '拍照',                  sort: 2,  status: 'active' },
    { code: 'photo-reviewer',     name: '照片复核',              sort: 3,  status: 'active' },
    { code: 'report-recon',       name: 'Report 对账',           sort: 4,  status: 'active' },
    { code: 'recon-entry',        name: 'Recon 录入',            sort: 5,  status: 'active' },
    { code: 'miniline-report',    name: 'Mini line 报告',        sort: 6,  status: 'active' },
    { code: 'station-equip',      name: '工站/设备',             sort: 7,  status: 'active' },
    { code: 'test-center',        name: 'Test Center',           sort: 8,  status: 'active' },
    { code: 'fa-ct-pm',           name: 'FA / CT PM',            sort: 9,  status: 'active' },
    { code: 'fa-return',          name: 'FA Return',             sort: 10, status: 'active' },
    { code: 'customer-review',    name: '客户 Disposition/审核', sort: 11, status: 'active' },
    { code: 'platform-admin',     name: '平台管理员',            sort: 12, status: 'active' }
  ];

  /* ---------------- 数据驱动 RBAC 注册中心（SSOT） ----------------
     MENUS   菜单唯一真源：树形 M/C/F（RuoYi sys_menu）。
             type: M=目录（侧边栏折叠分组）/ C=菜单（路由页，key=路由）/ F=按钮（权限字符 perms）。
             扁平数组 + parent（父菜单 key）构成树；数组顺序即树内展示顺序；
     ROLES   角色唯一真源：id 沿用既有角色 key（cosmetic/photo/…/admin），存量代码按 id 索引零破坏；
             name=中文名 / station=负责站点 / group=登录页分组 / dataScope=数据权限 / sort=排序 /
             menus=授权菜单（C 型 key + F 型 perms 混合，'*'=全部）；
     ORGS    组织架构（sys_dept）：人员通过 USERS[].orgId 挂到部门，叶子补 RuoYi 部门字段。 */
  var MENUS = [
    /* 顶级 C */
    { key: 'dashboard',       type: 'C', name: '工作台',     parent: null,      icon: 'grid',      sort: 1, status: 'active' },
    { key: 'admin-dashboard', type: 'C', name: '平台总览',   parent: null,      icon: 'grid',      sort: 2, status: 'active' },
    /* 作业执行 */
    { key: 'm-job',           type: 'M', name: '作业执行',   parent: null,      icon: 'folder',    sort: 3, status: 'active' },
    { key: 'travel-sheet',    type: 'C', name: '节点作业',   parent: 'm-job',   icon: 'clipboard', sort: 1, status: 'active' },
    { key: 'report',          type: 'C', name: '报告纸',     parent: 'm-job',   icon: 'file',      sort: 2, status: 'active' },
    { key: 'machines',        type: 'C', name: '机台档案',   parent: 'm-job',   icon: 'archive',   sort: 3, status: 'active' },
    { key: 'batches',         type: 'C', name: '测试批次',   parent: 'm-job',   icon: 'layers',    sort: 4, status: 'active' },
    /* 配置中心 */
    { key: 'm-config',        type: 'M', name: '配置中心',   parent: null,      icon: 'folder',    sort: 4, status: 'active' },
    { key: 'defs',            type: 'C', name: '作业定义中心', parent: 'm-config', icon: 'clipboard', sort: 1, status: 'active' },
    { key: 'workflow-config', type: 'C', name: '流程排配',   parent: 'm-config', icon: 'gear',      sort: 2, status: 'active' },
    { key: 'dicts',           type: 'C', name: '字典中心',   parent: 'm-config', icon: 'list',      sort: 3, status: 'active' },
    { key: 'admin-forms',     type: 'C', name: '报告纸模板', parent: 'm-config', icon: 'clipboard', sort: 4, status: 'active' },
    { key: 'system:dict:edit',  type: 'F', name: '字典编辑',       parent: 'dicts', perms: 'system:dict:edit',     sort: 1, status: 'active' },
    { key: 'system:def:edit',   type: 'F', name: '作业定义编辑/发布', parent: 'defs',  perms: 'system:def:edit',      sort: 1, status: 'active' },
    { key: 'system:workflow:edit', type: 'F', name: '流程排配编辑', parent: 'workflow-config', perms: 'system:workflow:edit', sort: 1, status: 'active' },
    { key: 'system:form:edit',  type: 'F', name: '表单模板编辑',  parent: 'admin-forms', perms: 'system:form:edit',   sort: 1, status: 'active' },
    /* 脚本与数据 */
    { key: 'm-script',        type: 'M', name: '脚本与数据', parent: null,      icon: 'folder',    sort: 5, status: 'active' },
    { key: 'my-scripts',      type: 'C', name: '我的脚本',   parent: 'm-script', icon: 'code',      sort: 1, status: 'active' },
    { key: 'admin-scripts',   type: 'C', name: '脚本管理',   parent: 'm-script', icon: 'code',      sort: 2, status: 'active' },
    { key: 'data-sources',    type: 'C', name: '取数源',     parent: 'm-script', icon: 'scan',      sort: 3, status: 'active' },
    { key: 'system:script:manage', type: 'F', name: '脚本管理',   parent: 'admin-scripts', perms: 'system:script:manage', sort: 1, status: 'active' },
    { key: 'system:datasource:edit', type: 'F', name: '取数源配置', parent: 'data-sources', perms: 'system:datasource:edit', sort: 1, status: 'active' },
    /* 组织权限 */
    { key: 'm-org',           type: 'M', name: '组织权限',   parent: null,      icon: 'folder',    sort: 6, status: 'active' },
    { key: 'admin-users',     type: 'C', name: '用户管理',   parent: 'm-org',   icon: 'users',     sort: 1, status: 'active' },
    { key: 'admin-roles',     type: 'C', name: '角色管理',   parent: 'm-org',   icon: 'shield',    sort: 2, status: 'active' },
    { key: 'admin-posts',     type: 'C', name: '岗位管理',   parent: 'm-org',   icon: 'tag',       sort: 3, status: 'active' },
    { key: 'admin-depts',     type: 'C', name: '部门管理',   parent: 'm-org',   icon: 'archive',   sort: 4, status: 'active' },
    { key: 'admin-menus',     type: 'C', name: '菜单管理',   parent: 'm-org',   icon: 'list',      sort: 5, status: 'active' },
    { key: 'system:member:manage', type: 'F', name: '成员管理', parent: 'admin-users', perms: 'system:member:manage', sort: 1, status: 'active' },
    { key: 'system:role:manage',   type: 'F', name: '角色管理', parent: 'admin-roles', perms: 'system:role:manage',   sort: 1, status: 'active' },
    { key: 'system:post:manage',   type: 'F', name: '岗位管理', parent: 'admin-posts', perms: 'system:post:manage',   sort: 1, status: 'active' },
    { key: 'system:dept:manage',   type: 'F', name: '部门管理', parent: 'admin-depts', perms: 'system:dept:manage',   sort: 1, status: 'active' },
    { key: 'system:menu:manage',   type: 'F', name: '菜单管理', parent: 'admin-menus', perms: 'system:menu:manage',   sort: 1, status: 'active' },
    /* 设备监控 */
    { key: 'm-device',        type: 'M', name: '设备监控',   parent: null,      icon: 'folder',    sort: 7, status: 'active' },
    { key: 'devices',         type: 'C', name: '设备',       parent: 'm-device', icon: 'pulse',      sort: 1, status: 'active' },
    { key: 'system:device:control', type: 'F', name: '设备远程控制', parent: 'devices', perms: 'system:device:control', sort: 1, status: 'active' }
  ];

  /* 一线岗位共用的用户视图菜单（避免逐角色重复写同一数组） */
  var RBAC_COMMON_MENUS = ['dashboard', 'travel-sheet', 'report', 'machines', 'batches', 'my-scripts'];
  var ROLES = [
    { id: 'cosmetic',   name: '外观目检',      station: 'Cosmetic',       group: '一线作业',   sort: 1, status: 'active', dataScope: '4', deptIds: [], menus: RBAC_COMMON_MENUS.slice() },
    { id: 'photo',      name: '拍照',          station: 'Photo Station',  group: '一线作业',   sort: 2, status: 'active', dataScope: '4', deptIds: [], menus: RBAC_COMMON_MENUS.slice() },
    { id: 'review',     name: '照片复核',      station: 'Photo Review',   group: '一线作业',   sort: 3, status: 'active', dataScope: '4', deptIds: [], menus: RBAC_COMMON_MENUS.slice() },
    { id: 'report',     name: 'Report/Recon',  station: 'Report/Recon',   group: '一线作业',   sort: 4, status: 'active', dataScope: '4', deptIds: [], menus: RBAC_COMMON_MENUS.slice() },
    { id: 'miniline',   name: 'Mini line',     station: 'Mini line',      group: '一线作业',   sort: 5, status: 'active', dataScope: '4', deptIds: [], menus: RBAC_COMMON_MENUS.slice() },
    { id: 'testcenter', name: 'Test Center',   station: 'Test Center',    group: '测试与质量', sort: 6, status: 'active', dataScope: '4', deptIds: [], menus: RBAC_COMMON_MENUS.concat(['devices', 'system:device:control']) },
    { id: 'fa',         name: 'FA',            station: 'FA',             group: '测试与质量', sort: 7, status: 'active', dataScope: '4', deptIds: [], menus: RBAC_COMMON_MENUS.slice() },
    { id: 'reviewer',   name: '客户（F1）',    station: 'F1/退库',        group: '客户',       sort: 8, status: 'active', dataScope: '1', deptIds: [], menus: RBAC_COMMON_MENUS.concat(['defs', 'workflow-config', 'dicts', 'system:dict:edit', 'system:def:edit', 'system:workflow:edit']) },
    { id: 'admin',      name: '平台管理员',    station: '系统平台',       group: '平台',       sort: 9, status: 'active', dataScope: '1', deptIds: [],
      menus: ['*'] }
  ];

  var ORGS = [
    { id: 'dqelab', name: 'DQE 实验室', orderNum: 1, leader: '—', phone: '—', email: '—', status: 'active', children: [
      { id: 'cosmetic',   name: 'Cosmetic 外观组', orderNum: 1, leader: 'Tammy',    phone: '138-0000-0001', email: 'tammy@dqelab.com',   status: 'active' },
      { id: 'photo',      name: '拍照组',          orderNum: 2, leader: 'Lucky',    phone: '138-0000-0002', email: 'lucky@dqelab.com',   status: 'active' },
      { id: 'review',     name: '复核组',          orderNum: 3, leader: 'Amy',      phone: '138-0000-0003', email: 'amy@dqelab.com',     status: 'active' },
      { id: 'miniline',   name: 'Mini line',       orderNum: 4, leader: 'Frank',    phone: '138-0000-0006', email: 'frank@dqelab.com',   status: 'active' },
      { id: 'report',     name: 'Report/Recon',    orderNum: 5, leader: 'Bole',     phone: '138-0000-0004', email: 'bole@dqelab.com',    status: 'active' },
      { id: 'testcenter', name: 'Test Center',     orderNum: 6, leader: 'Aiden',    phone: '138-0000-0008', email: 'aiden@dqelab.com',   status: 'active' },
      { id: 'fa',         name: 'FA',              orderNum: 7, leader: 'Kevin',    phone: '138-0000-0010', email: 'kevin@dqelab.com',   status: 'active' }
    ] },
    { id: 'customer', name: '客户',     orderNum: 2, leader: 'F1',       phone: '—', email: 'f1@customer.com',   status: 'active' },
    { id: 'platform', name: '系统平台', orderNum: 3, leader: 'Admin',    phone: '—', email: 'admin@dqelab.com',  status: 'active' }
  ];

  /* ---------------- 集中字典中心（唯一真源：一处修改，多处生效） ----------------
     所有「下拉 / 多选下拉」的选项统一在此维护：
       · task_type       节点任务下拉（自定义工作节点勾选任务）
       · fx_issue        外观问题（报告纸多选下拉 + 目检勾选卡）
       · test_conclusion 测试结论（报告纸多选下拉）
       · env_item        环境测试项（Test Center 子节点 / 报告纸多选下拉）
       · mech_item       机械测试项（Test Center 子节点 / 报告纸多选下拉）
       · recon_tag       失败标签（报告对账用）
     选项允许带额外字段：fx_issue 的 part（部位）、recon_tag 的 color（颜色）。
     编辑入口在「字典中心」#/dicts，保存后所有引用该字典 id 的下拉即时生效。 */
  var DICTS = [
    { id: 'task_type', name: '任务类型', desc: '节点任务下拉数据源（自定义工作节点勾选）', options: [
      { key: 'upload',  label: '上传数据' },
      { key: 'analyze', label: '分析数据' },
      { key: 'process', label: '处理数据' },
      { key: 'confirm', label: '确认动作' },
      { key: 'audit',   label: '审核' }
    ] },
    { id: 'fx_issue', name: '外观问题', desc: '报告纸外观问题多选下拉 + 目检勾选卡', options: [
      { key: 'FX-01', label: '屏幕划伤',     part: '屏幕' },
      { key: 'FX-02', label: '背盖刮伤',     part: '背盖' },
      { key: 'FX-03', label: '边框掉漆',     part: '边框' },
      { key: 'FX-04', label: 'L-wiper 毛絮', part: '镜片' },
      { key: 'FX-05', label: '摄像头进尘',   part: '镜头' },
      { key: 'FX-06', label: '按键回彈異常', part: '按键' }
    ] },
    { id: 'test_conclusion', name: '测试结论', desc: '报告纸测试结论多选下拉', options: [
      { key: 'pass', label: 'PASS' },
      { key: 'fail', label: 'FAIL' },
      { key: 'na',   label: 'N/A' }
    ] },
    { id: 'env_item', name: '环境测试项', desc: 'Test Center 环境测试 / 报告纸多选下拉', options: [
      { key: 'temp',  label: '温度' },
      { key: 'hum',   label: '湿度' },
      { key: 'cycle', label: '温湿度循环' }
    ] },
    { id: 'mech_item', name: '机械测试项', desc: 'Test Center 机械测试 / 报告纸多选下拉', options: [
      { key: 'drop',  label: '跌落' },
      { key: 'fold',  label: '折叠' },
      { key: 'force', label: '力度' }
    ] },
    { id: 'recon_tag', name: '失败标签', desc: 'Recon Tagging 标签（报告对账用）', options: [
      { key: 'lab-rel-t0',   label: 'Lab REL T0',        color: 'ok' },
      { key: 'test-failure', label: 'Test failure mode', color: 'bad' },
      { key: 'test',         label: 'Test',              color: 'info' },
      { key: 'tf-test',      label: 'TF Test',           color: 'warn' },
      { key: 'tf-lab',       label: 'TF Lab',            color: 'accent' },
      { key: 'dynamic',      label: 'Dynamic',           color: 'bad' }
    ] }
  ];

  /* ---------------- 脚本注册中心（WorkFlow 第 11 节，19 个） ----------------
     扩展字段：
       lang/lang: 语言徽标；file: 当前文件；files: 版本历史（新→旧，只增不改）
       code: 脚本内容（演示用 Python 骨架，可在编辑器修改并升版本）
       params: 运行参数模板 → 运行脚本模态按此生成表单（待处理文件地址 / 生成文件地址 / 常用参数）
       scheduleIds: 关联定时任务（与 SCHEDULE_TASKS.script 双向） */
  var SCRIPTS = [
    { id: 'S01', name: '报告导入脚本',        owner: 'yoke',  linkUsers: ['bole'],  stage: 'Report/Recon', category: 'excel',  tool: 'report_import',    status: 'enabled',  ver: 'v3.2.1', run: 128,   lastRun: '09-17 10:24', health: 'ok',
      lang: 'python', file: { name: 'S01_report_import.py', size: '12.4 KB' },
      files: [ { ver: 'v3.2.1', name: 'S01_report_import.py', size: '12.4 KB', by: 'yoke', at: '09-16 17:20', note: '支持下半年报告版式与外观/工站 Failed 分表' },
               { ver: 'v3.2.0', name: 'S01_report_import.py', size: '12.1 KB', by: 'yoke', at: '09-10 18:02', note: '字段映射改用配置文件，不再硬编码列名' } ],
      code: [
        '# -*- coding: utf-8 -*-  报告导入脚本 S01',
        'def main(excel_in, out_path, date):',
        '    # 导入外观 / 工站 Failed 到报告台账，SN 为主键',
        '    for sheet in ["Appearance", "Station", "Final"]:',
        '        df = read_excel(excel_in, sheet)',
        '        rows = df[df["Date"] == date]',
        '        upsert(dframe.REPORTS, rows)          # 幂等，重复导入不产生重复记录',
        '        log("imported {0} rows from {1}".format(len(rows), sheet))',
        '    return {status: "ok", data: len(rows), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/reports/2026-09-17/报告汇总.xlsx' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/S01 导入结果.json' },
                { key: 'date',   label: '处理日期',       type: 'text',  def: '2026-09-17' } ], scheduleIds: [] },
    { id: 'S02', name: '报告和 Recon 对比脚本', owner: 'yoke',  linkUsers: ['bole'],  stage: 'Report',        category: 'excel',  tool: 'recon_compare',   status: 'enabled',  ver: 'v2.7.0', run: 64,    lastRun: '09-17 09:02', health: 'ok',
      lang: 'python', file: { name: 'S02_recon_compare.py', size: '9.8 KB' },
      files: [ { ver: 'v2.7.0', name: 'S02_recon_compare.py', size: '9.8 KB', by: 'yoke', at: '09-14 11:30', note: '差异清单纯列出不一致字段，供 Bole 逐条处理' },
               { ver: 'v2.6.3', name: 'S02_recon_compare.py', size: '9.5 KB', by: 'yoke', at: '09-05 16:00', note: '修复补拍后 Compare 键位漂移' } ],
      code: [
        '# -*- coding: utf-8 -*-  报告 vs Recon 比对 S02',
        'def main(report_in, recon_in, out_path):',
        '    left = read(REPORTS, day=DAY)               # 公司侧报告台账',
        '    right = read_json(recon_in)                 # 客户侧 Recon 数据包',
        '    diff = compare_by(left, right, key="sn")',
        '    if diff: write_json(out_path, diff)',
        '    return {status: "ok", data: len(left), diff_report: len(diff), errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/recon/2026-09-17/recon.csv' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/S02 比对差异.json' },
                { key: 'date',   label: '处理日期',       type: 'text',  def: '2026-09-17' } ], scheduleIds: [] },
    { id: 'S03', name: 'Recon VS RelReport 脚本', owner: 'bole', linkUsers: [],     stage: 'Report',        category: 'excel',  tool: 'dashboard_reconcile', status: 'enabled', ver: 'v2.4.3', run: 31, lastRun: '09-17 09:05', health: 'ok',
      lang: 'python', file: { name: 'S03_dashboard_reconcile.py', size: '10.2 KB' },
      files: [ { ver: 'v2.4.3', name: 'S03_dashboard_reconcile.py', size: '10.2 KB', by: 'bole', at: '09-12 09:20', note: 'Dashboard 未下载时改为跳过并量化差异（不再中断）' },
               { ver: 'v2.4.2', name: 'S03_dashboard_reconcile.py', size: '10.0 KB', by: 'bole', at: '09-03 10:00', note: '接入 Dashboard CSV 模板' } ],
      code: [
        '# -*- coding: utf-8 -*-  Recon VS RelReport S03（间隔自动跑）',
        'def main(dash_csv, rel_in, out_path):',
        '    dash = read_csv(dash_csv)                  # 客户系统仅读，先手动下载',
        '    rel = read(REL_REPORTS)                    # 公司侧 RelReport',
        '    miss = find_missing(dash, rel)',
        '    if not dash: return {status: "skip", data: 0, diff_report: 0, errors: 0,',
        '                        note: "Dashboard 未下载，跳过 4 台并告警"}',
        '    return {status: "ok", data: len(dash), diff_report: len(miss), errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/recon/2026-09-17/dashboard.csv' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/S03 对账差异.json' },
                { key: 'mode',   label: '对账模式',       type: 'select', def: 'diff', opts: ['diff', 'full', 'check'] } ], scheduleIds: ['T02'] },
    { id: 'S04', name: '换行标蓝加粗脚本',      owner: 'bole', linkUsers: [],       stage: 'Report',        category: 'excel',  tool: 'log_format',      status: 'enabled',  ver: 'v1.9.8', run: 412,  lastRun: '09-17 11:12', health: 'ok',
      lang: 'python', file: { name: 'S04_log_format.py', size: '6.7 KB' },
      files: [ { ver: 'v1.9.8', name: 'S04_log_format.py', size: '6.7 KB', by: 'bole', at: '09-15 15:40', note: '标蓝边界优化：整行换行符后不误标' },
               { ver: 'v1.9.7', name: 'S04_log_format.py', size: '6.5 KB', by: 'bole', at: '09-08 11:00', note: '支持外观页标蓝加粗' } ],
      code: [
        '# -*- coding: utf-8 -*-  换行标蓝加粗 S04',
        'def main(log_in, out_xlsx, page="全部"):',
        '    wb = load_workbook(log_in)',
        '    for ws in pick_pages(wb, page):            # 客户阅读习惯：换行标蓝加粗',
        '        for row in ws.iter_rows():',
        '            if is_line_break(row): style(row, font=BLUE_BOLD)',
        '    wb.save(out_xlsx)',
        '    return {status: "ok", data: pages, diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/reports/2026-09-17/log_raw.xlsx' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/S04 标蓝报告.xlsx' },
                { key: 'page',   label: '处理页面',       type: 'select', def: '全部', opts: ['全部', '仅外观页', '仅 Log 页'] } ], scheduleIds: [] },
    { id: 'S05', name: 'Log 页 excel→csv',     owner: 'yoke', linkUsers: ['bole'], stage: 'Report',        category: 'convert', tool: 'excel_to_csv',   status: 'enabled',  ver: 'v1.3.2', run: 88,   lastRun: '09-16 18:40', health: 'ok',
      lang: 'python', file: { name: 'S05_excel_to_csv.py', size: '3.9 KB' },
      files: [ { ver: 'v1.3.2', name: 'S05_excel_to_csv.py', size: '3.9 KB', by: 'yoke', at: '09-06 10:00', note: 'TF 段转换支持' },
               { ver: 'v1.3.1', name: 'S05_excel_to_csv.py', size: '3.8 KB', by: 'yoke', at: '08-28 09:30', note: '' } ],
      code: [
        '# -*- coding: utf-8 -*-  Log 页 excel→csv S05',
        'def main(xlsx_in, out_dir):',
        '    sheet = first_sheet_with_name(xlsx_in, "Log")',
        '    df = read_sheet(xlsx_in, sheet)',
        '    csv_path = join(out_dir, "log_" + DAY + ".csv")',
        '    df.to_csv(csv_path, index=False)           # 供上传客户雷达',
        '    return {status: "ok", data: 3, diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/reports/2026-09-17/Log 页.xlsx' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/csv/' } ], scheduleIds: [] },
    { id: 'S06', name: '自动汇总报告脚本',      owner: 'frank', linkUsers: [],      stage: 'Mini line',     category: 'aggregate', tool: 'report_aggregate', status: 'enabled', ver: 'v2.0.1', run: 156, lastRun: '09-17 19:45', health: 'ok',
      lang: 'python', file: { name: 'S06_report_aggregate.py', size: '14.1 KB' },
      files: [ { ver: 'v2.0.1', name: 'S06_report_aggregate.py', size: '14.1 KB', by: 'frank', at: '09-16 09:00', note: '中班汇总初版自动起草，待 Function 确认后出终版' },
               { ver: 'v2.0.0', name: 'S06_report_aggregate.py', size: '13.9 KB', by: 'frank', at: '09-01 10:00', note: '多工站数据合并重写' } ],
      code: [
        '# -*- coding: utf-8 -*-  自动汇总报告 S06（每日排程）',
        'def main(reports_dir, out_xlsx):',
        '    merged = concat_reports(reports_dir, DAY)  # 12 台全工站',
        '    draft = build_draft(merged)                # 初版（草稿态）',
        '    if wait_confirm(draft): draft.publish()    # 各 Function 确认后出终版',
        '    return {status: "ok", data: len(merged), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/reports/2026-09-17/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/reports/2026-09-17/Mini line 汇总.xlsx' } ], scheduleIds: ['T03'] },
    { id: 'S07', name: '数据核对脚本',          owner: 'frank', linkUsers: [],      stage: 'Mini line',     category: 'excel', tool: 'data_reconcile',     status: 'enabled', ver: 'v1.1.0', run: 96,   lastRun: '09-17 20:10', health: 'ok',
      lang: 'python', file: { name: 'S07_data_reconcile.py', size: '5.2 KB' },
      files: [ { ver: 'v1.1.0', name: 'S07_data_reconcile.py', size: '5.2 KB', by: 'frank', at: '09-11 14:00', note: '支持两次核对运行去重统计' } ],
      code: [
        '# -*- coding: utf-8 -*-  数据核对 S07（SFC vs 报告）',
        'def main(reports_dir, out_json):',
        '    sfc = read_sfc_events(DAY)                 # iMES 工站事件',
        '    rep = read_reports(reports_dir)',
        '    diff = compare(sfc, rep, keys=["sn", "station", "result"])',
        '    return {status: "ok", data: len(rep), diff_report: len(diff), errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/reports/2026-09-17/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/S00-SFC 差异.json' } ], scheduleIds: [] },
    { id: 'S08', name: '刷 IMES & Summary 脚本', owner: 'aiden', linkUsers: ['cody'], stage: 'Test Center', category: 'system', tool: null,               status: 'enabled', ver: 'v1.0.7', run: 223,  lastRun: '09-17 21:03', health: 'ok',
      lang: 'python', file: { name: 'S08_imes_summary.py', size: '7.6 KB' },
      files: [ { ver: 'v1.0.7', name: 'S08_imes_summary.py', size: '7.6 KB', by: 'aiden', at: '09-13 16:00', note: 'Summary OUT 写入统一日志' } ],
      code: [
        '# -*- coding: utf-8 -*-  刷 IMES & Summary S08（Test Center 站点）',
        'def main(api="{imes}/kiosk", out_log="/shared/recon/.../Summary OUT.log"):',
        '    for sn in deque(SCAN_QUEUE):              # 机台过站刷 Summary OUT',
        '        imes.api(api, {"sn": sn, "action": "summary_out", "st": STATION})',
        '        append(out_log, sn)',
        '    return {status: "ok", data: len(SCAN_QUEUE), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'text',  def: 'iMES kiosk API（站点扫码）' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/recon/2026-09-17/Summary OUT.log' } ], scheduleIds: [] },
    { id: 'S09', name: '照片命名脚本',          owner: 'lucky', linkUsers: [],      stage: 'Photo Station', category: 'naming', tool: 'photo_naming',      status: 'enabled', ver: 'v2.1.4', run: 190,  lastRun: '09-17 13:22', health: 'ok',
      lang: 'python', file: { name: 'S09_photo_naming.py', size: '4.4 KB' },
      files: [ { ver: 'v2.1.4', name: 'S09_photo_naming.py', size: '4.4 KB', by: 'lucky', at: '09-15 09:00', note: '命名规则改为 SN_角度_序号.jpg，角度去重' } ],
      code: [
        '# -*- coding: utf-8 -*-  照片命名 S09',
        'def main(photos_dir, out_csv):',
        '    # 命名规则：SN_角度_序号.jpg（角度机位去重用）',
        '    names = [f"{sn}_{angle}_{i}.jpg" for i, f in enumerate(files(photos_dir))]',
        '    rename_all(photos_dir, names)',
        '    write_csv(out_csv, names)                  # 命名清单供复核',
        '    return {status: "ok", data: len(names), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/photos/2026-09-17/raw/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/photos/2026-09-17/naming_list.csv' } ], scheduleIds: [] },
    { id: 'S10', name: '治具匹配脚本',          owner: 'lucky', linkUsers: [],      stage: 'Photo Station', category: 'system', tool: null,               status: 'enabled', ver: 'v1.5.6', run: 190,  lastRun: '09-17 13:24', health: 'ok',
      lang: 'python', file: { name: 'S10_fixture_match.py', size: '5.0 KB' },
      files: [ { ver: 'v1.5.6', name: 'S10_fixture_match.py', size: '5.0 KB', by: 'lucky', at: '09-15 09:10', note: '按拍照角度自动建议治具型号' } ],
      code: [
        '# -*- coding: utf-8 -*-  治具匹配 S10',
        'def main(photos_dir, out_csv):',
        '    for sn, angles in group_by_sn(photos_dir):',
        '        fixture = suggest(angles)              # 按角度集合匹配治具 UFO/UFP 系列',
        '        yield {"sn": sn, "fixture": fixture, "ok": len(angles) >= 2}',
        '    return {status: "ok", data: 190, diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/photos/2026-09-17/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/photos/2026-09-17/fixture.csv' } ], scheduleIds: [] },
    { id: 'S11', name: 'Auto-Photo 接自动化命名', owner: 'lucky', linkUsers: [],    stage: 'Photo Station', category: 'naming', tool: null,               status: 'draft',   ver: 'v0.9.2', run: 0,    lastRun: '—',  health: 'idle',
      lang: 'python', file: { name: 'S11_auto_photo.py', size: '8.3 KB' },
      files: [ { ver: 'v0.9.2', name: 'S11_auto_photo.py', size: '8.3 KB', by: 'lucky', at: '09-12 17:00', note: '接入自动拍照机台（试点）' } ],
      code: [
        '# -*- coding: utf-8 -*-  Auto-Photo 接自动化命名 S11（草稿）',
        '# TODO: 待联调自动拍照机台回传 & 命名流水线',
        'def main(stream_in, out_dir):',
        '    pass   # 草稿：接入拍照事件流后命名，避免人工二次抄录',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/photos/2026-09-17/raw/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/photos/2026-09-17/named/' } ], scheduleIds: [] },
    { id: 'S12', name: '照片自动同步脚本',      owner: 'amy',  linkUsers: [],       stage: 'Photo Review',  category: 'sync',   tool: null,               status: 'enabled', ver: 'v2.2.0', run: 402,  lastRun: '09-17 14:50', health: 'ok',
      lang: 'python', file: { name: 'S12_photo_sync.py', size: '5.8 KB' },
      files: [ { ver: 'v2.2.0', name: 'S12_photo_sync.py', size: '5.8 KB', by: 'amy', at: '09-14 10:00', note: '增量同步 + 断点续传' } ],
      code: [
        '# -*- coding: utf-8 -*-  照片自动同步 S12',
        'def main(src="/f1/camera/PHOTOS/", dst="/shared/photos/{DAY}/"):',
        '    synced = sync_incremental(src, dst)        # 增量拷贝 F1 相机目录',
        '    resume_checkpoint()                        # 断点续传',
        '    return {status: "ok", data: synced, diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/f1/camera/PHOTOS/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/photos/2026-09-17/' } ], scheduleIds: [] },
    { id: 'S13', name: '照片复核脚本',          owner: 'amy',  linkUsers: [],       stage: 'Photo Review',  category: 'excel',  tool: 'photo_checklist',  status: 'enabled', ver: 'v1.8.1', run: 401,  lastRun: '09-17 14:52', health: 'ok',
      lang: 'python', file: { name: 'S13_photo_checklist.py', size: '7.1 KB' },
      files: [ { ver: 'v1.8.1', name: 'S13_photo_checklist.py', size: '7.1 KB', by: 'amy', at: '09-16 14:00', note: '补拍照片合并到复核清单，标注来源' } ],
      code: [
        '# -*- coding: utf-8 -*-  照片复核清单 S13',
        'def main(photos_dir, out_xlsx):',
        '    checklist = build_checklist(photos_dir)   # SN × 角度格子，打勾复核',
        '    write_xlsx(out_xlsx, checklist)',
        '    return {status: "ok", data: len(checklist), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/photos/2026-09-17/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/checklist.xlsx' } ], scheduleIds: [] },
    { id: 'S14', name: '备份脚本（F1 U盘→NAS）', owner: 'amy', linkUsers: [],       stage: 'Photo Review',  category: 'backup', tool: null,               status: 'enabled', ver: 'v1.0.3', run: 389,  lastRun: '09-17 08:30', health: 'ok',
      lang: 'python', file: { name: 'S14_backup.py', size: '4.1 KB' },
      files: [ { ver: 'v1.0.3', name: 'S14_backup.py', size: '4.1 KB', by: 'amy', at: '09-08 09:00', note: '备份完整性校验（张数核对）' } ],
      code: [
        '# -*- coding: utf-8 -*-  F1 U盘 → NAS 备份 S14（每日 08:30 排程）',
        'def main(src="/f1/usb/PHOTOS/", dst="/nas/shared/backup/{DAY}/"):',
        '    copied = copy_verified(src, dst)           # 拷完按张数核对',
        '    if len(copied) != expect(DAY): raise_backup_alert()',
        '    return {status: "ok", data: len(copied), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/f1/usb/PHOTOS/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/nas/shared/backup/2026-09-17/' } ], scheduleIds: ['T04'] },
    { id: 'S15', name: '双向对比脚本',          owner: 'amy',  linkUsers: [],       stage: 'Photo Review',  category: 'excel',  tool: null,               status: 'enabled', ver: 'v1.6.0', run: 255,  lastRun: '09-17 15:10', health: 'ok',
      lang: 'python', file: { name: 'S15_dual_compare.py', size: '6.2 KB' },
      files: [ { ver: 'v1.6.0', name: 'S15_dual_compare.py', size: '6.2 KB', by: 'amy', at: '09-16 16:00', note: 'F1 硬盘 log 与 Report 双向比对' } ],
      code: [
        '# -*- coding: utf-8 -*-  双向对比 S15',
        'def main(hdd_log, out_json):',
        '    f1 = read_f1_hdd(hdd_log)                  # F1 硬盘 log',
        '    rep = read(REPORTS)',
        '    mismatch = diff(f1, rep, by="sn")          # 双向：F1 有而报告无 / 反之',
        '    return {status: "warn", data: len(f1), diff_report: len(mismatch), errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/f1/hdd/log/' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/S15 不一致清单.json' } ], scheduleIds: [] },
    { id: 'S16', name: '目检录入查重脚本',      owner: 'tammy', linkUsers: [],      stage: 'Cosmetic',      category: 'excel',  tool: 'dup_check',       status: 'enabled', ver: 'v1.2.5', run: 512,  lastRun: '09-17 10:02', health: 'ok',
      lang: 'python', file: { name: 'S16_dup_check.py', size: '3.6 KB' },
      files: [ { ver: 'v1.2.5', name: 'S16_dup_check.py', size: '3.6 KB', by: 'tammy', at: '09-11 10:00', note: '支持跨日期查重' } ],
      code: [
        '# -*- coding: utf-8 -*-  目检录入查重 S16',
        'def main(csv_in, out_csv):',
        '    data = read_csv(csv_in)',
        '    dup = data[duplicated(data, keep=False)]   # SN + 外观编号查重',
        '    dup.to_csv(out_csv, index=False)',
        '    return {status: "ok", data: len(data), diff_report: len(dup), errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/recon/2026-09-17/目检录入.csv' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/S16 查重结果.csv' } ], scheduleIds: [] },
    { id: 'S17', name: '打印脚本（生成 Travel Sheet）', owner: 'tammy', linkUsers: [], stage: 'Cosmetic', category: 'print', tool: null,               status: 'enabled', ver: 'v1.1.8', run: 248,  lastRun: '09-17 08:41', health: 'ok',
      lang: 'python', file: { name: 'S17_print_ts.py', size: '5.5 KB' },
      files: [ { ver: 'v1.1.8', name: 'S17_print_ts.py', size: '5.5 KB', by: 'tammy', at: '09-16 09:00', note: '按电子表单模板生成空白纸本' } ],
      code: [
        '# -*- coding: utf-8 -*-  打印 Travel Sheet S17',
        'def main(units_csv, out_dir):',
        '    for sn in read_csv(units_csv)["sn"]:',
        '        pdf = render_ts(sn, TEMPLATE)         # 电子表单模板派生纸表',
        '        pdf.save(join(out_dir, f"TS_{sn}.pdf"))',
        '    return {status: "ok", data: len(units), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/recon/2026-09-17/目检录入.csv' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/archive/2026-09-17/ts/' } ], scheduleIds: [] },
    { id: 'S18', name: 'Radar auto update 脚本', owner: 'kevin', linkUsers: ['lisa'], stage: 'FA',      category: 'radar',  tool: 'radar_sync',       status: 'enabled', ver: 'v3.4.0', run: 74,   lastRun: '09-17 08:12', health: 'ok',
      lang: 'python', file: { name: 'S18_radar_update.py', size: '9.0 KB' },
      files: [ { ver: 'v3.4.0', name: 'S18_radar_update.py', size: '9.0 KB', by: 'kevin', at: '09-14 17:00', note: 'CTMS 状态同步，改为两阶段校验' } ],
      code: [
        '# -*- coding: utf-8 -*-  Radar auto update S18（每日 17:00 排程）',
        'def main(api_ct="ctms://live", out="/shared/fa/{DAY}/radar_sync.csv"):',
        '    status = pull_ctms_status()               # CTMS → 客户 Radar',
        '    verify_two_phase(status)                  # 两阶段校验，防漂移',
        '    return {status: "ok", data: len(status), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'text',  def: 'CTMS API（公司自研）' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/fa/2026-09-17/radar_sync.csv' } ], scheduleIds: ['T05'] },
    { id: 'S19', name: 'FA tracker 脚本',       owner: 'kevin', linkUsers: ['lisa'], stage: 'FA',        category: 'aggregate', tool: 'fa_tracker_update', status: 'enabled', ver: 'v2.3.1', run: 61,  lastRun: '09-17 08:18', health: 'ok',
      lang: 'python', file: { name: 'S19_fa_tracker.py', size: '6.6 KB' },
      files: [ { ver: 'v2.3.1', name: 'S19_fa_tracker.py', size: '6.6 KB', by: 'kevin', at: '09-16 10:00', note: '加入库存回执校验' } ],
      code: [
        '# -*- coding: utf-8 -*-  FA tracker S19',
        'def main(in_xlsx, out_xlsx):',
        '    t = load_tracker(in_xlsx)',
        '    t.update_states(CTMS, radar)               # 合并 CTMS/Radar 最新状态',
        '    t.save(out_xlsx)',
        '    return {status: "ok", data: len(t), diff_report: 0, errors: 0}',
        '' ].join('\n'),
      params: [ { key: 'input', label: '待处理文件地址', type: 'path',  def: '/shared/fa/2026-09-17/fa_tracker.xlsx' },
                { key: 'output', label: '生成文件地址',   type: 'path',  def: '/shared/fa/2026-09-17/fa_tracker 更新.xlsx' } ], scheduleIds: [] }
  ];

  /* ---------------- Excel 工具库（计划三章，12 个） ---------------- */
  /* 工具库：hook = 该工具挂到作业定义后，Travel Sheet 提交触发的自动派发交接物（ARTIFACTS.id）；
   'check'=查重角标不派发；不填则不自动派发 */
  var EXCEL_TOOLS = [
    { key: 'report_import',       name: '报告导入',       type: '数据录入/合并', input: 'xlsx|csv',  runs: 128, owner: 'yoke',   sample: 'sample/import.xlsx', hook: 'ART_REPORT' },
    { key: 'report_aggregate',    name: '报告汇总',       type: '多表汇總',     input: 'xlsx',      runs: 156, owner: 'frank',  sample: 'sample/aggregate',  hook: 'ART_REPORT' },
    { key: 'data_reconcile',      name: '数据核对',       type: '跨表比對',     input: 'xlsx',      runs: 96,  owner: 'frank',  sample: 'sample/reconcile',   hook: 'ART_RECON' },
    { key: 'log_format',          name: 'Log 標藍加粗',   type: '格式化',       input: 'xlsx',      runs: 412, owner: 'bole',   sample: 'sample/log.xlsx' },
    { key: 'excel_to_csv',        name: 'Excel→CSV',     type: '格式轉換',     input: 'xlsx',      runs: 88,  owner: 'yoke',   sample: 'sample/log-page' },
    { key: 'recon_compare',       name: '报告 vs Recon 比對', type: '跨表比對', input: 'xlsx|csv',  runs: 64,  owner: 'f1',     sample: 'sample/recon_compare', hook: 'ART_RECON' },
    { key: 'dashboard_reconcile', name: 'Recon vs RelReport', type: '跨表比對', input: 'xlsx|dashboard.csv', runs: 31, owner: 'bole', sample: 'sample/dashboard',    hook: 'ART_RECON' },
    { key: 'radar_sync',          name: '雷达同步',       type: '抓取/更新',    input: 'radar',     runs: 74,  owner: 'kevin',  sample: '—' },
    { key: 'fa_tracker_update',   name: 'FA Tracker 更新', type: '汇总/状态',   input: 'xlsx',      runs: 61,  owner: 'kevin',  sample: 'sample/fa_tracker' },
    { key: 'photo_checklist',     name: '照片複核清單',   type: '清单比對',     input: 'xlsx',      runs: 401, owner: 'amy',    sample: 'sample/photo_checklist' },
    { key: 'dup_check',           name: '目檢查重',       type: '查重',         input: 'xlsx|csv',  runs: 512, owner: 'tammy',  sample: 'sample/dup_check',      hook: 'check' },
    { key: 'photo_naming',        name: '照片命名清單',   type: '清单生成',     input: 'csv',       runs: 190, owner: 'lucky',  sample: 'sample/naming',         hook: 'ART_PHOTO' }
  ];

  /* ---------------- 交接物登记中心（节点间数据/文件传输的唯一真源） ----------------
     kind: 'auto'=提交按工具 hook 自动写出 / 'manual'=人工传文件；via: 落到哪张表/哪个位置 */
  var ARTIFACTS = [
    { id: 'ART_FX',      name: '外观勾选/Fx 台账',          scope: 'unit', format: 'row',  kind: 'auto',   via: 'TRAVEL_SHEETS.fxIssue',  note: '外观目检勾选，下游越往越依赖' },
    { id: 'ART_PHOTO',   name: '拍照命名清单+原始照片',      scope: 'unit', format: 'jpg',  kind: 'auto',   via: 'PHOTO_REVIEWS',          note: '异常勾选才派补拍；复核参照' },
    { id: 'ART_STATION', name: '工站测试数据(Summary/Report)', scope: 'unit', format: 'xlsx', kind: 'manual', via: '共享盘工站目录',        note: 'Mini line 产出，Report/Recon 消费' },
    { id: 'ART_REPORT',  name: '当日报告台账(草稿)',        scope: 'unit', format: 'xlsx',  kind: 'auto',   via: 'REPORTS',                note: '提交自动建，报告导入直接读' },
    { id: 'ART_RECON',   name: 'Recon 数据包',              scope: 'node', format: 'json',  kind: 'auto',   via: 'RECON_PACKS',            note: '提交自动建，Tagging/分 WF 依赖' },
    { id: 'ART_DIFF',    name: '报告 vs Recon 差异清单',     scope: 'node', format: 'xlsx',  kind: 'auto',   via: 'S02 输出',               note: '差异逐条处理，Tagging 参照' },
    { id: 'ART_FA',      name: 'FA 裁决 / 投测通知',        scope: 'node', format: 'doc',   kind: 'manual', via: 'FA Tracker',             note: '分 WF 决策 → 通知下一 CP/退库' }
  ];

  /* ---------------- 交接物上传记录（人工交接物：谁、何时、把哪份文件放到哪） ----------------
     静态演示：上传只把「文件名/共享路径」写入这里，页面据此标记「已上传」。 */
  var ART_UPLOADS = [
    { id: 'UP-01', sn: 'MTL00016', def: 'tx-04', art: 'ART_STATION', file: '\\\\nas\\wxqc\\station\\Summary\\MTL00016.xlsx', by: 'frank', at: '09-16 18:25' }
  ];

  /* ---------------- 定时调度（方向③）：script 关联注册中心的脚本（双向） ---------------- */
  var SCHEDULE_TASKS = [
    { id: 'T01', name: 'CT Tracker 同步（CTMS→Radar）', system: 'CTMS',   cron: '每天 16:00',  owner: 'kevin',  tool: '—',          script: '—',      last: '09-17 16:00', next: '09-18 16:00', status: 'success', enable: true },
    { id: 'T02', name: '次日 Dashboard 对账',            system: 'Dashboard', cron: '每天 09:00', owner: 'bole',  tool: 'dashboard_reconcile', script: 'S03', last: '09-17 09:00', next: '09-18 09:00', status: 'warn', enable: true },
    { id: 'T03', name: '每日 Mini line 报告汇总',        system: '共享文件馆', cron: '每天 18:30', owner: 'frank', tool: 'report_aggregate',    script: 'S06', last: '09-17 18:30', next: '09-18 18:30', status: 'success', enable: true },
    { id: 'T04', name: 'F1 U盘照片备份→NAS',            system: 'NAS',    cron: '每天 08:30',  owner: 'amy',   tool: '—',          script: 'S14',     last: '09-17 08:30', next: '09-18 08:30', status: 'success', enable: true },
    { id: 'T05', name: 'FA Dashboard 生成通知',          system: 'Radar',  cron: '每天 17:00',  owner: 'kevin',  tool: 'radar_sync', script: 'S18',     last: '09-17 17:00', next: '09-18 17:00', status: 'success', enable: true },
    { id: 'T06', name: '补拍 30min 超时提醒核对',        system: '表单',    cron: '每 10min',    owner: 'amy',   tool: '—',          script: '—',      last: '09-17 21:52', next: '09-17 22:02', status: 'success', enable: true },
    { id: 'T07', name: 'T0 报告完成 20hr 未投 TX 提醒',  system: 'iMES',   cron: '每小时',      owner: 'f1',    tool: '—',          script: '—',      last: '09-17 21:20', next: '09-17 22:20', status: 'warn',   enable: true }
  ];

  /* ---------------- 运行日志 / 告警（方向③监控） ---------------- */
  var RUN_LOGS = [
    { time: '09-17 21:52', task: '补拍超时提醒核对',      script: '—',             user: 'amy',   action: '自动触发', result: 'ok',    detail: '比对完成，2 台补拍超时进入待跟催' },
    { time: '09-17 21:20', task: 'T0 20hr 未投 TX 提醒',  script: '—',             user: 'f1',    action: '自动触发', result: 'warn',  detail: 'SN MTL00017 尚未投 TX，已通知' },
    { time: '09-17 20:10', task: '数据核对',              script: 'S07',           user: 'frank', action: '手动运行', result: 'ok',    detail: 'SFC 数据与报告一致，0 差异' },
    { time: '09-17 19:45', task: '自动汇总报告',          script: 'S06',           user: 'frank', action: '调度触发', result: 'ok',    detail: '生成 Mini line 报告初版 12 台' },
    { time: '09-17 18:40', task: 'Log excel→csv',         script: 'S05',           user: 'yoke',  action: '手动运行', result: 'ok',    detail: '转出 3 页并上传客户雷達' },
    { time: '09-17 16:00', task: 'CT Tracker 同步',       script: '—',             user: 'kevin', action: '调度触发', result: 'ok',    detail: 'CTMS 状态同步至 Radar，30min' },
    { time: '09-17 15:10', task: '双向对比',              script: 'S15',           user: 'amy',   action: '手动运行', result: 'fail',  detail: 'F1 硬盤 log 与 Report 信息不一致' },
    { time: '09-17 14:52', task: '照片复核',              script: 'S13',           user: 'amy',   action: '手动运行', result: 'ok',    detail: '复核 8 台，无异常' },
    { time: '09-17 13:24', task: '治具匹配',              script: 'S10',           user: 'lucky', action: '手动运行', result: 'ok',    detail: 'MTL00019 治具 UFX-03 匹配通过' },
    { time: '09-17 11:12', task: '換行標藍加粗',          script: 'S04',           user: 'bole',  action: '手动运行', result: 'ok',    detail: '编辑 3 份报告 Log' },
    { time: '09-17 10:24', task: '报告导入',              script: 'S01',           user: 'yoke',  action: '手动运行', result: 'ok',    detail: '导入外观与工站 Failed 6 台' },
    { time: '09-17 09:05', task: 'Recon vs RelReport',    script: 'S03',           user: 'bole',  action: '调度触发', result: 'fail',  detail: 'Dashboard 数据未及时下载，跳过 4 台' },
    { time: '09-17 08:41', task: '打印 Travel Sheet',     script: 'S17',           user: 'tammy', action: '手动运行', result: 'ok',    detail: '生成空白纸本 MTL00011-14 备用' },
    { time: '09-17 08:30', task: 'F1 U盘备份→NAS',        script: 'S14',           user: 'amy',   action: '调度触发', result: 'ok',    detail: '拷贝 389 张照片，0 失败' },
    { time: '09-16 18:40', task: 'Log excel→csv',         script: 'S05',           user: 'yoke',  action: '手动运行', result: 'ok',    detail: '转出 2 页（TF 段）' }
  ];

  /* ---------------- 脚本运行记录（脚本注册中心详情页：按 script 过滤下钻） ----------------
     trigger: 手动 / 调度 / 自动；result: ok / warn / fail / skip；
     标准化输出 {status, data, diff_report, errors} 由页面展开控制台回放时派生 */
  var SCRIPT_RUNS = [
    { id: 'R-01', script: 'S01', t: '09-17 10:24', trigger: '手动运行', user: 'yoke',  dur: '34s',  result: 'ok',   input: '/shared/reports/2026-09-17/报告汇总.xlsx', output: '/shared/archive/2026-09-17/S01 导入结果.json', note: '导入外观与工站 Failed 6 台' },
    { id: 'R-02', script: 'S03', t: '09-17 09:05', trigger: '调度触发', user: 'bole',  dur: '22s',  result: 'skip',  input: '/shared/recon/2026-09-17/dashboard.csv', output: '/shared/archive/2026-09-17/S03 对账差异.json', note: 'Dashboard 数据未及时下载，跳过 4 台' },
    { id: 'R-03', script: 'S06', t: '09-17 19:45', trigger: '调度触发', user: 'frank', dur: '96s',  result: 'ok',   input: '/shared/reports/2026-09-17/', output: '/shared/reports/2026-09-17/Mini line 汇总.xlsx', note: '生成 Mini line 报告初版 12 台' },
    { id: 'R-04', script: 'S07', t: '09-17 20:10', trigger: '手动运行', user: 'frank', dur: '41s',  result: 'ok',   input: '/shared/reports/2026-09-17/', output: '/shared/archive/2026-09-17/S00-SFC 差异.json', note: 'SFC 数据与报告一致，0 差异' },
    { id: 'R-05', script: 'S10', t: '09-17 13:24', trigger: '手动运行', user: 'lucky', dur: '18s',  result: 'ok',   input: '/shared/photos/2026-09-17/', output: '/shared/photos/2026-09-17/fixture.csv', note: 'MTL00019 治具 UFX-03 匹配通过' },
    { id: 'R-06', script: 'S13', t: '09-17 14:52', trigger: '手动运行', user: 'amy',   dur: '27s',  result: 'ok',   input: '/shared/photos/2026-09-17/', output: '/shared/archive/2026-09-17/checklist.xlsx', note: '复核 8 台，无异常' },
    { id: 'R-07', script: 'S14', t: '09-17 08:30', trigger: '调度触发', user: 'amy',   dur: '185s', result: 'ok',   input: '/f1/usb/PHOTOS/', output: '/nas/shared/backup/2026-09-17/', note: '拷贝 389 张照片，0 失败' },
    { id: 'R-08', script: 'S15', t: '09-17 15:10', trigger: '手动运行', user: 'amy',   dur: '66s',  result: 'fail',  input: '/f1/hdd/log/', output: '/shared/archive/2026-09-17/S15 不一致清单.json', note: 'F1 硬盘 log 与 Report 信息不一致' },
    { id: 'R-09', script: 'S17', t: '09-17 08:41', trigger: '手动运行', user: 'tammy', dur: '12s',  result: 'ok',   input: '/shared/recon/2026-09-17/目检录入.csv', output: '/shared/archive/2026-09-17/ts/', note: '生成空白纸本 MTL00011-14 备用' },
    { id: 'R-10', script: 'S04', t: '09-17 11:12', trigger: '手动运行', user: 'bole',  dur: '52s',  result: 'ok',   input: '/shared/reports/2026-09-17/log_raw.xlsx', output: '/shared/archive/2026-09-17/S04 标蓝报告.xlsx', note: '编辑 3 份报告 Log' },
    { id: 'R-11', script: 'S05', t: '09-17 18:40', trigger: '手动运行', user: 'yoke',  dur: '30s',  result: 'ok',   input: '/shared/reports/2026-09-17/Log 页.xlsx', output: '/shared/archive/2026-09-17/csv/', note: '转出 3 页并上传客户雷达' },
    { id: 'R-12', script: 'S12', t: '09-17 14:50', trigger: '调度触发', user: 'amy',   dur: '200s', result: 'ok',   input: '/f1/camera/PHOTOS/', output: '/shared/photos/2026-09-17/', note: '同步相机照片 9 台' },
    { id: 'R-13', script: 'S18', t: '09-17 08:12', trigger: '调度触发', user: 'kevin', dur: '90s',  result: 'ok',   input: 'CTMS API（公司自研）', output: '/shared/fa/2026-09-17/radar_sync.csv', note: 'CTMS 状态同步至 Radar，30min' },
    { id: 'R-14', script: 'S19', t: '09-17 08:18', trigger: '调度触发', user: 'kevin', dur: '75s',  result: 'ok',   input: '/shared/fa/2026-09-17/fa_tracker.xlsx', output: '/shared/fa/2026-09-17/fa_tracker 更新.xlsx', note: 'FA Tracker 状态更新完成' }
  ];

  var ALERTS = [
    { id: 'A01', level: 'high',  text: 'SN MTL00017 T0 报告完成后 20hr 未投 TX',      owner: 'f1',   time: '09-17 21:20', status: 'open' },
    { id: 'A02', level: 'mid',   text: 'MTL00009 照片补拍超时（>30min）待跟催',        owner: 'amy',  time: '09-17 21:15', status: 'open' },
    { id: 'A03', level: 'mid',   text: 'S03 对账跳过 4 台：Dashboard 数据未下载',      owner: 'bole', time: '09-17 09:05', status: 'open' },
    { id: 'A04', level: 'low',   text: 'S15 双向对比不一致：MTL00006 Log 与 Report 信息不匹配', owner: 'amy', time: '09-17 15:10', status: 'ack' },
    { id: 'A05', level: 'mid',   text: 'MTL00020 Camera Station 显示 Fail，待复测',    owner: 'frank', time: '09-17 20:55', status: 'open' },
    { id: 'A06', level: 'low',   text: 'CT-0920-02 扫描超时（>120min 未结束）',        owner: 'kevin', time: '09-17 21:40', status: 'open' }
  ];

  /* ---------------- Travel Sheet 台账（方向①，T0/TX/TF 全状态机） ---------------- */
  var TRAVEL_SHEETS = [
    {
      id: 'TST-0001', sn: 'MTL00011', stage: 'T0', status: 'cosmetic',            station: 'Cosmetic',
      model: 'Falcon-2', phase: 'PreEVT',
      clean: false, weight: '—', fxIssue: [], photos: { normal: 0, abnormal: 0 }, reviewer: null, sign: null,
      timeline: [
        { t: '09-17 08:40', who: 'tammy', node: '线尾仓领机，刷 Summary IN' }
      ]
    },
    {
      id: 'TST-0002', sn: 'MTL00012', stage: 'T0', status: 'cosmetic',            station: 'Cosmetic',
      model: 'Falcon-2', phase: 'PreEVT',
      clean: true, weight: '612.4g', fxIssue: [], photos: { normal: 0, abnormal: 0 }, reviewer: null, sign: null,
      timeline: [
        { t: '09-17 09:12', who: 'tammy', node: '仓领取机 / 刷 Summary IN' },
        { t: '09-17 09:15', who: 'tammy', node: '清洁完成，秤重 612.4g' }
      ]
    },
    {
      id: 'TST-0003', sn: 'MTL00013', stage: 'T0', status: 'miniline',            station: 'Mini line',
      model: 'Falcon-2', phase: 'PreEVT',
      clean: true, weight: '608.1g', fxIssue: ['L-wiper 毛絮', '屏幕微划(≤0.1mm)'], photos: { normal: 2, abnormal: 1 }, reviewer: null, sign: null,
      timeline: [
        { t: '09-17 09:02', who: 'tammy', node: '清洁、秤重 608.1g' },
        { t: '09-17 09:30', who: 'lucky', node: '拍照完成，异常 1 张已打勾' },
        { t: '09-17 10:05', who: 'frank', node: '工站测试完成，Summary OUT + Report IN' }
      ]
    },
    {
      id: 'TST-0004', sn: 'MTL00014', stage: 'T0', status: 'review',              station: 'Photo Review',
      model: 'Falcon-2', phase: 'PreEVT',
      clean: true, weight: '610.9g', fxIssue: [], photos: { normal: 2, abnormal: 0 }, reviewer: 'amy', sign: null,
      timeline: [
        { t: '09-17 10:10', who: 'tammy', node: '清洁、秤重 610.9g' },
        { t: '09-17 10:45', who: 'lucky', node: '拍照完成' },
        { t: '09-17 11:10', who: 'frank', node: '工站测试完成，写入报告' },
        { t: '09-17 11:30', who: 'amy',   node: '复核无异常，待签名' }
      ]
    },
    {
      id: 'TST-0005', sn: 'MTL00015', stage: 'T0', status: 'review',              station: 'Photo Review',
      model: 'Falcon-2', phase: 'PreEVT',
      clean: true, weight: '605.3g', fxIssue: ['背盖刮伤(≤0.3mm)'], photos: { normal: 2, abnormal: 1 }, reviewer: null, sign: null,
      timeline: [
        { t: '09-17 15:40', who: 'tammy', node: '清洁、秤重 605.3g' },
        { t: '09-17 16:20', who: 'lucky', node: '拍照完成' },
        { t: '09-17 16:50', who: 'frank', node: '工站测试完成，写入报告' },
        { t: '09-17 17:05', who: 'amy',   node: '复核完成，签名' }
      ]
    },
    {
      id: 'TST-0006', sn: 'MTL00016', stage: 'TX', status: 'recon',               station: 'Report/Recon',
      model: 'Falcon-2 Pro', phase: 'EVT',
      clean: true, weight: '607.7g', fxIssue: [], photos: { normal: 2, abnormal: 0 }, reviewer: 'amy', sign: 'amy',
      timeline: [
        { t: '09-16 15:40', who: 'tammy', node: '清洁、秤重 607.7g' },
        { t: '09-16 16:20', who: 'lucky', node: '拍照完成' },
        { t: '09-16 16:50', who: 'frank', node: '工站测试完成 + Mini line 报告' },
        { t: '09-16 17:05', who: 'amy',   node: '复核签名' },
        { t: '09-16 20:00', who: 'bole',  node: '报告导入、分 WF' }
      ]
    },
    {
      id: 'TST-0007', sn: 'MTL00017', stage: 'T0', status: 'done-no-tx',          station: 'Report/Recon',
      model: 'Falcon-2', phase: 'PreEVT',
      clean: true, weight: '611.0g', fxIssue: [], photos: { normal: 2, abnormal: 0 }, reviewer: 'amy', sign: 'amy',
      timeline: [
        { t: '09-16 16:10', who: 'tammy', node: '清洁、秤重 611.0g' },
        { t: '09-16 17:20', who: 'lucky', node: '拍照完成' },
        { t: '09-16 17:50', who: 'frank', node: '工站测试完成，写入报告' },
        { t: '09-16 18:05', who: 'amy',   node: '复核签名' },
        { t: '09-16 20:00', who: 'bole',  node: '报告导入、Recon 入录' },
        { t: '09-17 21:20', who: 'agent', node: '20hr 未投 TX，自动提醒（Agent 监测）' }
      ]
    },
    {
      id: 'TST-0008', sn: 'MTL00018', stage: 'TX', status: 'testcenter',          station: 'Test Center',
      model: 'Falcon-2 Pro', phase: 'EVT',
      clean: null, weight: null, fxIssue: [], photos: { normal: 0, abnormal: 0 }, reviewer: null, sign: null,
      timeline: [
        { t: '09-17 18:00', who: 'frank', node: 'TX 段工站测试完成，Summary OUT' },
        { t: '09-17 19:00', who: 'aiden', node: '刷 Summary IN / 导入 Telecharger' },
        { t: '09-17 19:40', who: 'cody',  node: 'Charging 至 56%' },
        { t: '09-17 21:03', who: 'aiden', node: '刷 IMES & Summary' }
      ]
    },
    {
      id: 'TST-0009', sn: 'MTL00019', stage: 'T0', status: 'cosmetic',            station: 'Cosmetic',
      model: 'Falcon-2', phase: 'PreEVT',
      clean: true, weight: '609.7g', fxIssue: [], photos: { normal: 0, abnormal: 0 }, reviewer: null, sign: null,
      timeline: [
        { t: '09-17 14:20', who: 'tammy', node: '清洁、秤重 609.7g' },
        { t: '09-17 14:25', who: 'tammy', node: '目检无异常，待转发拍照' }
      ]
    },
    {
      id: 'TST-0010', sn: 'MTL00020', stage: 'TX', status: 'photo',               station: 'Photo Station',
      model: 'Falcon-2 Pro', phase: 'EVT',
      clean: true, weight: '606.0g', fxIssue: ['摄像头进尘'], photos: { normal: 2, abnormal: 1 }, reviewer: null, sign: null,
      timeline: [
        { t: '09-16 11:00', who: 'tammy', node: 'TX 段快检、秤重 606.0g' },
        { t: '09-16 11:10', who: 'lucky', node: '拍照完成' },
        { t: '09-17 13:00', who: 'grant', node: 'Auto-Photo 转自动站' }
      ]
    },
    {
      id: 'TST-0011', sn: 'MTL00021', stage: 'TF', status: 'recon',               station: 'Report/Recon',
      model: 'Falcon-3', phase: 'DVT',
      clean: true, weight: '609.2g', fxIssue: ['按键回彈異常'], photos: { normal: 2, abnormal: 1 }, reviewer: 'amy', sign: 'amy',
      timeline: [
        { t: '09-16 08:10', who: 'tammy', node: 'TF 快检、秤重 609.2g' },
        { t: '09-16 08:40', who: 'lucky', node: '拍照完成' },
        { t: '09-16 08:55', who: 'frank', node: 'TF 工站测试完成，写入报告' },
        { t: '09-16 09:05', who: 'amy',   node: '复核签名，异常已录' },
        { t: '09-16 22:00', who: 'bole',  node: 'TF 报告上传' }
      ]
    },
    {
      id: 'TST-0012', sn: 'MTL00022', stage: 'TF', status: 'done',                station: 'F1/退库',
      model: 'Falcon-3', phase: 'DVT',
      clean: true, weight: '610.3g', fxIssue: [], photos: { normal: 2, abnormal: 0 }, reviewer: 'amy', sign: 'amy',
      timeline: [
        { t: '09-15 14:30', who: 'tammy', node: 'TF 快检、秤重 610.3g' },
        { t: '09-15 15:00', who: 'lucky', node: '拍照完成' },
        { t: '09-15 15:20', who: 'frank', node: '工站测试完成，写入报告' },
        { t: '09-15 15:40', who: 'amy',   node: '复核签名' },
        { t: '09-16 09:10', who: 'bole',  node: '报告完成、入 Recon' },
        { t: '09-16 18:00', who: 'kevin', node: 'TF 完成通知退库' }
      ]
    }
  ];

  /* （外观目检问题已迁入集中字典 DICTS.fx_issue，见上方「字典中心」——一处修改多处生效） */

  /* ---------------- Mini line 工站矩阵（WorkFlow 6.2，26 站） ---------------- */
  var MINI_STATIONS = [
    { st: 'SWDL',                group: '前置流程',   owner: 'Frank',    status: 'done', note: '烧录完成' },
    { st: 'SWDL-RF',             group: '前置流程',   owner: 'Frank',    status: 'done', note: 'RF 校准' },
    { st: 'Laser Scan REL1',     group: '前置流程',   owner: 'Grant',    status: 'done', note: 'REL1 扫描' },
    { st: 'Laser Scan REL2',     group: '前置流程',   owner: 'Grant',    status: 'pass', note: 'REL2 通过' },
    { st: 'IMU',                 group: 'IMU 功能',   owner: 'Vincent',  status: 'done', note: 'IMU 基本' },
    { st: 'IMU Folded',          group: 'IMU 功能',   owner: 'Vincent',  status: 'pass', note: '折叠态通过' },
    { st: 'IMU Function',        group: 'IMU 功能',   owner: 'Jackson',  status: 'todo', note: '待执行' },
    { st: 'System Test Folded',  group: 'IMU 功能',   owner: 'Vincent',  status: 'todo', note: '待执行' },
    { st: 'Prox Test',           group: 'Prox / LED', owner: 'Jackson',  status: 'todo', note: '待执行' },
    { st: 'Prox Compliance Test', group: 'Prox / LED', owner: 'Grant',   status: 'todo', note: '合规测试' },
    { st: 'LED Compliance',      group: 'Prox / LED', owner: 'Vincent',  status: 'fail', note: '入光不均，待复测' },
    { st: 'Combo LED Cal',       group: 'Prox / LED', owner: 'Vincent',  status: 'pass', note: '校准通过' },
    { st: 'Combo LED Test',      group: 'Prox / LED', owner: 'Vincent',  status: 'todo', note: '待执行' },
    { st: 'Camera Function',     group: 'Camera 功能', owner: 'FACT21',  status: 'fail', note: 'CCAM Gridflare 异常' },
    { st: 'CCAM Gridflare',      group: 'Camera 功能', owner: 'FACT21',  status: 'todo', note: '待复测' },
    { st: 'OFC CCAM Intrinsics', group: 'Camera 功能', owner: 'Grant',   status: 'pass', note: '内参通过' },
    { st: 'OFC Extrinsics Cal',  group: 'Camera 功能', owner: 'Vader',   status: 'todo', note: '待执行' },
    { st: 'OFC RACK',            group: 'Camera 功能', owner: 'Vincent', status: 'todo', note: '待执行' },
    { st: 'SRT',                 group: 'SRT / Audio', owner: 'Jackson', status: 'pass', note: '音频通过' },
    { st: 'Cosmo',               group: 'SRT / Audio', owner: 'Jackson', status: 'todo', note: '待执行' },
    { st: 'Isengard',            group: '特殊测试',   owner: 'Grant',    status: 'pass', note: '通过' },
    { st: 'Rigel Illegal Drive', group: '特殊测试',   owner: 'Jackson',  status: 'pass', note: '通过' },
    { st: 'Rigel Illegal Polling', group: '特殊测试', owner: 'Grant',    status: 'todo', note: '待执行' },
    { st: 'Resolving Power Tester', group: '特殊测试', owner: 'Jackson', status: 'todo', note: '待执行' },
    { st: 'SWDL-RB',             group: '数据收尾',   owner: 'Grant',    status: 'todo', note: '待刷机' },
    { st: 'Log-Collection',      group: '数据收尾',   owner: 'Jackson',  status: 'todo', note: '待收集 Log' }
  ];

  /* Mini line 工站投入机台（SN 级：通过 / 失败 / 待执行），以当班 T0 批次机台为准 */
  MINI_STATIONS.forEach(function (stRow) { stRow.units = miniStationUnits(stRow); });
  function miniStationUnits(stRow) {
    var pool = TRAVEL_SHEETS.filter(function (t) { return t.stage === 'T0'; }).map(function (t) { return t.sn; });
    if (stRow.status === 'fail') {
      var out = [{ sn: 'MTL00013', status: 'fail' }]; /* MTL00013 卡 Camera 工站 / LED 待复测（MINI_BATCH.note） */
      pool.forEach(function (sn) { if (sn !== 'MTL00013') out.push({ sn: sn, status: 'pass' }); });
      return out.slice(0, 6);
    }
    if (stRow.status === 'todo') return pool.map(function (sn) { return { sn: sn, status: 'todo' }; }).slice(0, 6);
    return pool.map(function (sn) { return { sn: sn, status: 'pass' }; }).slice(0, 6);
  }

  /* 当班机台进度：一条流水线多名机台（简化展示用） */
  var MINI_BATCH = { date: '09-17', shift: '中班', onLine: 12, cn: { done: 7, pass: 4, fail: 2 }, passLine: 4, note: 'MTL00013 卡在 Camera，LED 待复测' };

  /* ---------------- CTMS 申请（WorkFlow 第 10 节） ---------------- */
  /* 申请态流：submitted(提單) → assigned(指派) → sampling(送样) → ready(扫描准备) → scanning(扫描中) → modeling(模型重构) → closed(关闭结案) */
  var CTMS_FLOW = [
    { no: 1, name: '提出申请', desc: '需求方填单' },
    { no: 2, name: '指派审核', desc: 'CT PM 指派' },
    { no: 3, name: '送样签收', desc: '过 TT 系统' },
    { no: 4, name: '扫描准备', desc: 'SOC 固定/校准' },
    { no: 5, name: '开始检测', desc: '扫描 60-120min' },
    { no: 6, name: '模型重构', desc: '结束测试/确认' },
    { no: 7, name: '关闭结案', desc: '发取样邮件' }
  ];
  var CTMS_APPLICATIONS = [
    { id: 'CT-0921-01', req: 'FX EPM',   subject: '背盖刮伤 FA 剖检', site: '背盖区域',   status: 'submitted', assignee: 'kevin', at: '09-17 09:20', note: 'F1 Disposition 指定', jump: false },
    { id: 'CT-0921-02', req: 'Wen(BCDC)', subject: 'Speaker 异物 X-Ray', site: 'Speaker',  status: 'submitted', assignee: 'kevin', at: '09-17 10:02', note: 'Test Plan 送测', jump: false },
    { id: 'CT-0920-01', req: 'Mike',     subject: 'Hinge 微裂纹',     site: '铰链区域',   status: 'scanning',  assignee: 'kevin', at: '09-17 14:10', note: '扫描中，预计 <120min', jump: true },
    { id: 'CT-0919-03', req: 'F1',       subject: 'TF 电池变形',      site: '电池仓',     status: 'modeling',  assignee: 'kevin', at: '09-17 16:00', note: '模型重构确认中', jump: false },
    { id: 'CT-0918-07', req: 'Vincent',  subject: 'Speaker magnet 位置', site: 'Speaker', status: 'closed',   assignee: 'kevin', at: '09-16 11:30', note: '已结案，客户插队经 Approval', jump: true },
    { id: 'CT-0917-02', req: 'FA Fei',   subject: 'PCB 弯曲度',       site: '主板',       status: 'closed',   assignee: 'kevin', at: '09-16 09:00', note: '报告已发', jump: false }
  ];

  /* （失败标签已迁入集中字典 DICTS.recon_tag，见上方「字典中心」） */
  var RECON_TAGGING = [
    { sn: 'MTL00013', tag: 'Test failure mode', status: 'done',   by: 'yoke', at: '09-17 10:20', note: 'L-wiper 毛絮 / 屏幕微划' },
    { sn: 'MTL00015', tag: 'Test failure mode', status: 'pending', by: 'yoke', at: '—',          note: '背盖刮伤待入' },
    { sn: 'MTL00016', tag: 'Lab REL T0',        status: 'done',   by: 'yoke', at: '09-17 09:40', note: 'TX 段 Lab 标记' },
    { sn: 'MTL00016', tag: 'Test',              status: 'pending', by: 'yoke', at: '—',          note: '待 WF 分配' },
    { sn: 'MTL00017', tag: 'Lab REL T0',        status: 'done',   by: 'yoke', at: '09-17 08:50', note: 'T0 完成' },
    { sn: 'MTL00021', tag: 'TF Test',           status: 'done',   by: 'yoke', at: '09-17 09:15', note: 'TF 检查表入录' },
    { sn: 'MTL00021', tag: 'TF Lab',            status: 'pending', by: 'yoke', at: '—',          note: '待上传雷达' },
    { sn: 'MTL00020', tag: 'Dynamic',           status: 'warn',   by: 'yoke', at: '09-17 13:05', note: 'Camera Fail，改 Dynamic 节点' },
    { sn: 'MTL00018', tag: 'Test',              status: 'pending', by: 'yoke', at: '—',          note: 'TX 测试中' }
  ];

  /* ---------------- 机台全流程事件线（SSOT，WorkFlow 0.4 状态机） ---------------- */
  var UNIT_EVENTS = [
    { sn: 'MTL00016', at: '09-16 15:40', sys: 'iMES',       ev: 'Summary IN',        who: 'tammy',   detail: 'Test Center 完成后转 Cosmetic，刷 Summary IN' },
    { sn: 'MTL00016', at: '09-16 15:55', sys: '表單',        ev: 'Travel Sheet',      who: 'tammy',   detail: 'TX 段目检，秤重 607.7g，无异常' },
    { sn: 'MTL00016', at: '09-16 16:00', sys: 'iMES',       ev: 'Summary OUT',       who: 'tammy',   detail: '目检完成，邮件通知 Mini line' },
    { sn: 'MTL00016', at: '09-16 16:20', sys: '表單',        ev: '拍照勾选',          who: 'lucky',   detail: '照片正常 2 张，命名上传共用区' },
    { sn: 'MTL00016', at: '09-16 17:05', sys: '表單',        ev: '复核签名',          who: 'amy',     detail: '复核通过，传 F1 硬盘' },
    { sn: 'MTL00016', at: '09-16 18:30', sys: '共享文件馆',   ev: 'Mini line 报告',    who: 'frank',   detail: '自动汇总报告生成初版' },
    { sn: 'MTL00016', at: '09-16 20:00', sys: 'Recon',      ev: '报告导入 + WF 分配', who: 'yoke',   detail: '报告导入，按产品信息分配 WF' },
    { sn: 'MTL00016', at: '09-16 20:20', sys: '郵件',        ev: 'WF 审核',           who: 'f1',      detail: 'F1 approve，发布投 TX 邮件' },
    { sn: 'MTL00016', at: '09-16 21:00', sys: 'Radar',      ev: '报告上传',          who: 'bole',    detail: '上传整机报告雷达（备份 5min）' },
    { sn: 'MTL00016', at: '09-17 09:00', sys: 'Recon',      ev: 'Recon Tagging',     who: 'yoke',    detail: 'Lab REL T0 标记已回写' },
    { sn: 'MTL00016', at: '09-17 09:05', sys: 'Dashboard',  ev: '次日对账',          who: 'bole',    detail: 'Dashboard Pass/Fail 与报告对比，0 差异' },
    { sn: 'MTL00016', at: '09-17 11:00', sys: 'CTMS',       ev: 'TX 申请',           who: 'frank',   detail: '依 WF 送 BCDC 需求确认' },

    { sn: 'MTL00017', at: '09-16 16:10', sys: 'iMES',       ev: 'Summary IN',        who: 'tammy',   detail: 'T0 目检开始，秤重 611.0g' },
    { sn: 'MTL00017', at: '09-16 17:20', sys: '表單',        ev: 'Travel Sheet',      who: 'lucky',   detail: '拍照完成，无异常' },
    { sn: 'MTL00017', at: '09-16 18:05', sys: '表單',        ev: '复核签名',          who: 'amy',     detail: '自动签名，传 F1 硬盘' },
    { sn: 'MTL00017', at: '09-16 20:00', sys: 'Recon',      ev: '报告导入（S01）',    who: 'yoke',   detail: '外观与工站数据导入' },
    { sn: 'MTL00017', at: '09-16 20:10', sys: 'Recon',      ev: 'Recon Tagging',     who: 'yoke',    detail: 'Lab REL T0 已回写' },
    { sn: 'MTL00017', at: '09-16 20:30', sys: '郵件',        ev: 'WF 邮件',           who: 'yoke',    detail: 'WF 分配邮件发给 F1' },
    { sn: 'MTL00017', at: '09-17 21:20', sys: '排程',        ev: 'T07 20hr 提醒',     who: 'f1',      detail: '报告完成 20hr 未投 TX，自动告警' },
    { sn: 'MTL00017', at: '09-17 21:25', sys: '郵件',        ev: '待 Disposition',    who: 'f1',      detail: '等待 F1 处置 / 送 BCDC 需求' },

    { sn: 'MTL00018', at: '09-17 19:00', sys: 'iMES',       ev: 'Summary IN',        who: 'aiden',   detail: 'TX 段接收，维护到测试记录表' },
    { sn: 'MTL00018', at: '09-17 19:15', sys: '表單',        ev: '测试记录表',        who: 'aiden',   detail: '电量 41% → Charging，导入 Telecharger' },
    { sn: 'MTL00018', at: '09-17 19:40', sys: 'Recon',      ev: '测试 T0/TX Tagging', who: 'cody',   detail: '刷 Test T0 Recon' },
    { sn: 'MTL00018', at: '09-17 21:03', sys: 'iMES',       ev: '刷 IMES & Summary', who: 'aiden',   detail: 'Summary In 确认，参数 OK' },
    { sn: 'MTL00018', at: '09-17 21:30', sys: '排程',        ev: '巡检提醒',          who: 'aiden',   detail: 'Charging 电源本周到期' },

    { sn: 'MTL00020', at: '09-17 13:00', sys: 'iMES',       ev: 'Summary IN',        who: 'grant',   detail: 'Auto-Photo 转自动站上料' },
    { sn: 'MTL00020', at: '09-17 13:05', sys: 'Recon',      ev: 'Dynamic 标记',      who: 'yoke',    detail: 'Camera Function Fail，节点改 Dynamic' },
    { sn: 'MTL00020', at: '09-17 20:55', sys: '排程',        ev: 'A05 告警',          who: 'frank',   detail: 'Camera Station 显示 Fail，待复测' }
  ];

  /* ---------------- Mini line 报告（含失败明细） ---------------- */
  var REPORTS = [
    { sn: 'MTL00011', stage: 'T0', phase: 'PreEVT', status: 'draft',    summary: '待目检录入',               fail: [],                                     owner: 'bole', importAt: '—',      recon: '—',     color: '#F4B942' },
    { sn: 'MTL00013', stage: 'T0', phase: 'PreEVT', status: 'imported', summary: '6 PASS / 1 外观Fail',      fail: ['L-wiper 毛絮', '屏幕微划'],           owner: 'yoke',  importAt: '09-17 10:24', recon: 'done',   color: '#4EC9B0' },
    { sn: 'MTL00014', stage: 'T0', phase: 'PreEVT', status: 'checked',  summary: '6 PASS / 0 Fail',          fail: [],                                     owner: 'bole',  importAt: '09-17 11:05', recon: 'done',   color: '#4EC9B0' },
    { sn: 'MTL00015', stage: 'T0', phase: 'PreEVT', status: 'uploaded', summary: '6 PASS / 1 外观Fail',      fail: ['背盖刮伤(≤0.3mm)'],                   owner: 'bole',  importAt: '09-17 17:42', recon: 'done',   color: '#4EC9B0' },
    { sn: 'MTL00016', stage: 'TX', phase: 'EVT', status: 'checked',  summary: '6 PASS / 0 Fail',          fail: [],                                     owner: 'bole',  importAt: '09-17 11:20', recon: 'done',   color: '#4EC9B0' },
    { sn: 'MTL00017', stage: 'T0', phase: 'PreEVT', status: 'checked',  summary: '6 PASS / 0 Fail（未投 TX）', fail: [],                                    owner: 'bole',  importAt: '09-16 20:00', recon: 'done',   color: '#F4B942' },
    { sn: 'MTL00020', stage: 'TX', phase: 'EVT', status: 'draft',    summary: '5 PASS / 1 Fail(Camera)',  fail: ['CCAM Gridflare'],                     owner: 'bole',  importAt: '—',      recon: '—',     color: '#FF6B6B' },
    { sn: 'MTL00021', stage: 'TF', phase: 'DVT', status: 'uploaded', summary: '6 PASS / 1 Fail(按键)',    fail: ['按键回彈異常'],                       owner: 'bole',  importAt: '09-16 22:00', recon: 'done',   color: '#4EC9B0' },
    { sn: 'MTL00022', stage: 'TF', phase: 'DVT', status: 'uploaded', summary: '6 PASS / 0 Fail',          fail: [],                                     owner: 'bole',  importAt: '09-16 09:10', recon: 'done',   color: '#4EC9B0' }
  ];

  /* ---------------- Recon 待回写数据包（Yoke 照单核对） ---------------- */
  var RECON_PACKS = [
    { pack: 'PKT-0921-01', sn: 'MTL00011', tag: 'Lab REL T0 / Test T0 failure mode', items: 7, mode: '生成自动', owner: 'yoke',   status: 'todo' },
    { pack: 'PKT-0921-02', sn: 'MTL00013', tag: 'Lab REL T0',                        items: 7, mode: '生成自动', owner: 'yoke',   status: 'todo' },
    { pack: 'PKT-0921-03', sn: 'MTL00015', tag: 'Test T0 failure mode',              items: 2, mode: '含外观Fail', owner: 'yoke', status: 'done' },
    { pack: 'PKT-0921-04', sn: 'MTL00016', tag: 'TF Test / TF Lab',                  items: 8, mode: '生成自动', owner: 'yoke',   status: 'todo' },
    { pack: 'PKT-0921-05', sn: 'MTL00020', tag: 'Dynamic 节点',                      items: 3, mode: '含异常',   owner: 'yoke',   status: 'todo' },
    { pack: 'PKT-0921-06', sn: 'MTL00021', tag: 'TF Lab 上传',                       items: 4, mode: '生成自动', owner: 'yoke',   status: 'todo' }
  ];

  /* ---------------- 照片复核任务（Amy） ----------------
     checks：三项核对（reflect=照片能否体现该问题 / missing=是否遗漏未处理 / naming=照片命名是否差错）
             取值 1=通过 0=异常 null=待核；三项全 1 才允许「复核通过」。 */
  var PHOTO_REVIEWS = [
    { sn: 'MTL00013', abnormal: 2, files: ['MTL00013_A1_FX04.jpg', 'MTL00013_A2_FX01.jpg'], status: 'review', owner: 'lucky', reviewer: 'amy', due: '09-17 21:00', note: '異常 2 張：鏡頭毛絮 + 屏幕微划', checks: { reflect: null, missing: null, naming: null } },
    { sn: 'MTL00015', abnormal: 1, files: ['MTL00015_A1_FX02.jpg'], status: 'ok',     owner: 'lucky', reviewer: 'amy', due: '09-17 17:00', note: '背蓋刮傷，與 Travel Sheet 一致', checks: { reflect: 1, missing: 1, naming: 1 } },
    { sn: 'MTL00009', abnormal: 1, files: ['MTL00009_A1.jpg'],      status: 'retake', owner: 'lucky', reviewer: 'amy', due: '09-17 21:00', note: '補拍超時，待跟催', checks: { reflect: 0, missing: 1, naming: 1 } },
    { sn: 'MTL00020', abnormal: 1, files: ['MTL00020_A1_FX05.jpg'], status: 'review', owner: 'lucky', reviewer: 'amy', due: '09-17 22:00', note: '鏡頭進塵（Auto-Photo 站）', checks: { reflect: null, missing: null, naming: null } },
    { sn: 'MTL00018', abnormal: 0, files: [],                       status: 'ok',     owner: 'lucky', reviewer: 'amy', due: '—',           note: 'TX 段无异常', checks: { reflect: 1, missing: 1, naming: 1 } }
  ];

  /* ---------------- 测试记录表（Test Center） ---------------- */
  var TEST_RECORDS = [
    { sn: 'MTL00016', stage: 'TX', phase: 'EVT', charge: '56%', telecharger: 'v2.1.0', params: 'ok',   status: 'testing',   inspector: 'aiden', gear: 'UFX-03' },
    { sn: 'MTL00018', stage: 'TX', phase: 'EVT', charge: '41%', telecharger: 'v2.1.0', params: 'ok',   status: 'charging',  inspector: 'cody',  gear: 'UFX-03' },
    { sn: 'MTL00019', stage: 'T0', phase: 'PreEVT', charge: '73%', telecharger: 'v2.0.9', params: 'warn', status: 'cal-check', inspector: 'cody',  gear: 'UFX-01' },
    { sn: 'MTL00022', stage: 'TF', phase: 'DVT', charge: '90%', telecharger: 'v2.1.0', params: 'ok',   status: 'finish',    inspector: 'aiden', gear: 'UFX-04' }
  ];

  /* 设备巡检（Env 每月 / Mech 每周） */
  var INSPECTIONS = [
    { item: 'T-Center 温湿度记录仪',  cycle: 'Env / 每月', last: '09-05', next: '10-05', status: 'ok',   inspector: 'aiden' },
    { item: 'Hinge Torque 治具',      cycle: 'Mech / 每周', last: '09-12', next: '09-19', status: 'ok',   inspector: 'cody' },
    { item: 'Charging 電源(A/B)',     cycle: 'Mech / 每周', last: '09-12', next: '09-19', status: 'due',   inspector: 'aiden' },
    { item: 'UV 色差儀',              cycle: 'Mech / 每周', last: '09-12', next: '09-19', status: 'ok',   inspector: 'cody' },
    { item: 'Keyence 显微镜头',       cycle: 'Env / 每月', last: '09-03', next: '10-03', status: 'ok',   inspector: 'aiden' }
  ];

  /* ---------------- FA Tracker（Kevin/Lisa，字段来自 WorkFlow 9.2） ---------------- */
  var FA_TRACKER = [
    { radar: 'RAD-240917-01', sn: 'MTL00015', fail: '背盖刮伤',   status: '细分',    fa: 'Lisa',  days: 2,  daysSinceUpdate: 0, tearDown: 'N', rtv: '—',     location: 'WH-L4',  next: '外观剖检' },
    { radar: 'RAD-240917-02', sn: 'MTL00016', fail: 'Hinge Torque', status: 'FA 分析', fa: 'Mike', days: 3,  daysSinceUpdate: 1, tearDown: 'Y', rtv: 'N/A',   location: 'FA 拆机台', next: '拆機確認 hinge' },
    { radar: 'RAD-240916-08', sn: 'MTL00009', fail: '摄像头进尘', status: '投测待确认', fa: 'Fei',  days: 5,  daysSinceUpdate: 1, tearDown: 'Y', rtv: 'N/A',   location: 'Test Center', next: '通知 Test Center 繼續投測' },
    { radar: 'RAD-240916-03', sn: 'MTL00006', fail: 'Log 不一致',  status: '確認中',  fa: 'Xiaoyue', days: 2, daysSinceUpdate: 0, tearDown: 'N', rtv: '—',     location: 'Photo Review', next: '比對 Report 信息' },
    { radar: 'RAD-240915-04', sn: 'MTL00020', fail: 'Camera 進塵', status: 'FA 分析', fa: 'Yang', days: 4,  daysSinceUpdate: 0, tearDown: 'Y', rtv: 'N/A',   location: 'FA 拆机台', next: '拆機後續測' },
    { radar: 'RAD-240914-02', sn: 'MTL00022', fail: '—',          status: '退庫',    fa: 'Lisa',  days: 6,  daysSinceUpdate: 2, tearDown: 'N', rtv: '已退庫', location: 'WH',        next: 'TF 完成' }
  ];

  /* ---------------- WF 审核（F1） ---------------- */
  var WF_APPROVALS = [
    { wf: 'WF-0921-01', stage: 'T0', desc: 'MTL00012-15 分配（Yoke 提交）', owner: 'yoke',  time: '09-17 17:50', status: 'approve' },
    { wf: 'WF-0921-02', stage: 'T0', desc: 'MTL00017 送 BCDC 需求確認',    owner: 'bole',  time: '09-17 18:20', status: 'pending' },
    { wf: 'WF-0921-03', stage: 'TX', desc: 'MTL00020 Dynamic 節點復測分配', owner: 'frank', time: '09-17 21:00', status: 'pending' },
    { wf: 'WF-0919-04', stage: 'TF', desc: 'MTL00022 退庫 Disposition',     owner: 'kevin', time: '09-16 17:10', status: 'approve' }
  ];

  /* ---------------- 机台基础信息区（表单表头 SSOT） ----------------
     每张「机台表单」顶部固定带出这些机台基础信息，由台账自动带出、禁手工输入。
     键值解析在 app.js machineBasicValue()：新增基础字段只需在此加一行 label；
     FORM_TEMPLATES[].header=true 的模板会在纸表版式上方渲染这一表头区。 */
  var MACHINE_BASIC = [
    { key: 'sn',      label: '机台 SN' },
    { key: 'model',   label: '机型' },
    { key: 'phase',   label: '产品阶段' },
    { key: 'stage',   label: '测试阶段' },
    { key: 'station', label: '站别' },
    { key: 'shift',   label: '班别' },
    { key: 'date',    label: '日期' }
  ];

  /* ---------------- 产品阶段（NPI build 序列，产品沿此推进） ----------------
     与「测试阶段 STAGES: T0/TX/TF」是两条独立轴：一个产品阶段内可跑多轮测试批次。 */
  var PRODUCT_PHASES = ['P1', 'P2', 'PreEVT', 'EVT', 'DVT', 'PVT'];

  /* ---------------- 机台主数据（SSOT：SN 唯一，基础信息 + 入账状态） ----------------
     字段对齐 MACHINE_BASIC（sn/model/phase/stage/station/shift/date）+ product/status。
     status: pending(入账预览待确认) | confirmed(已确认入库)。
     机台可跨批次复用（同一 SN 出现在多个 TEST_BATCHES），
     批次的「一次测试记录」在 BATCH_MACHINES，不在此重复。 */
  var MACHINES = [
    { sn: 'MTL00011', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Cosmetic',      shift: '中班', date: '09-17', status: 'confirmed' },
    { sn: 'MTL00012', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Cosmetic',      shift: '中班', date: '09-17', status: 'confirmed' },
    { sn: 'MTL00013', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Mini line',     shift: '中班', date: '09-17', status: 'confirmed' },
    { sn: 'MTL00014', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Photo Review',  shift: '中班', date: '09-17', status: 'confirmed' },
    { sn: 'MTL00015', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Photo Review',  shift: '中班', date: '09-17', status: 'confirmed' },
    { sn: 'MTL00016', model: 'Falcon-2 Pro', phase: 'EVT', product: 'Project Nova', stage: 'TX', station: 'Report/Recon',  shift: '中班', date: '09-16', status: 'confirmed' },
    { sn: 'MTL00017', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Report/Recon',  shift: '中班', date: '09-16', status: 'confirmed' },
    { sn: 'MTL00018', model: 'Falcon-2 Pro', phase: 'EVT', product: 'Project Nova', stage: 'TX', station: 'Test Center',   shift: '中班', date: '09-17', status: 'confirmed' },
    { sn: 'MTL00019', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Cosmetic',      shift: '中班', date: '09-17', status: 'confirmed' },
    { sn: 'MTL00020', model: 'Falcon-2 Pro', phase: 'EVT', product: 'Project Nova', stage: 'TX', station: 'Photo Station', shift: '中班', date: '09-16', status: 'confirmed' },
    { sn: 'MTL00021', model: 'Falcon-3',     phase: 'DVT', product: 'Project Nova', stage: 'TF', station: 'Report/Recon',  shift: '中班', date: '09-16', status: 'confirmed' },
    { sn: 'MTL00022', model: 'Falcon-3',     phase: 'DVT', product: 'Project Nova', stage: 'TF', station: 'F1/退库',       shift: '中班', date: '09-16', status: 'confirmed' }
  ];

  /* ---------------- 测试批次（归档单位：一次「选一批机台做测试」的活动） ----------------
     range：本批测试范围 T0 / T0+TX / TX；machineCount：该批机台数（演示缩放）。
     机台清单在 BATCH_MACHINES（批次×机台），跨批复用 = 同一 SN 多行、不同 runType。 */
  var TEST_BATCHES = [
    { id: 'B-0917-01', product: 'Project Nova', phase: 'PreEVT', date: '09-17', range: 'T0+TX',
      machineCount: 100, status: '进行中', conclusion: '—', from: '09-17 08:00', to: '—', owner: 'yoke' },
    { id: 'B-0921-02', product: 'Project Nova', phase: 'PreEVT', date: '09-21', range: 'T0',
      machineCount: 150, status: '进行中', conclusion: '—', from: '09-21 08:00', to: '—', owner: 'yoke' }
  ];

  /* ---------------- 批次 × 机台（一行 = 某批某台机的一次测试记录） ----------------
     runType：fresh(本批新选) / retest(复测·重跑同阶段) / continue(续测·承接上批阶段)
     stage/status/conclusion：这台机在这一批的阶段 / 状态 / 结论。 */
  var BATCH_MACHINES = [
    { batchId: 'B-0917-01', sn: 'MTL00011', runType: 'fresh',    stage: 'T0', status: 'cosmetic',    conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00012', runType: 'fresh',    stage: 'T0', status: 'cosmetic',    conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00013', runType: 'fresh',    stage: 'T0', status: 'miniline',    conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00014', runType: 'fresh',    stage: 'T0', status: 'review',      conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00015', runType: 'fresh',    stage: 'T0', status: 'review',      conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00016', runType: 'fresh',    stage: 'TX', status: 'recon',       conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00017', runType: 'fresh',    stage: 'T0', status: 'done-no-tx',  conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00018', runType: 'fresh',    stage: 'TX', status: 'testcenter',  conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00019', runType: 'fresh',    stage: 'T0', status: 'cosmetic',    conclusion: '—' },
    { batchId: 'B-0917-01', sn: 'MTL00020', runType: 'fresh',    stage: 'TX', status: 'photo',       conclusion: '—' },
    { batchId: 'B-0921-02', sn: 'MTL00011', runType: 'retest',   stage: 'T0', status: 'cosmetic',    conclusion: '—' },
    { batchId: 'B-0921-02', sn: 'MTL00016', runType: 'continue', stage: 'TX', status: 'recon',       conclusion: '—' }
  ];

  /* ---------------- 取数源（Excel / API / TT / 设备 统一入口） ----------------
     type：excel | api | tt | device；target：machines(机台入账) | stations(工站比对) | device(设备控制)
     status:'reserved' 表示预留（后续接入真实接口），先占位。 */
  var DATA_SOURCES = [
    { id: 'ds-report-excel',   name: 'Report 机台 Excel 入账',  type: 'excel',  target: 'machines',
      desc: '上传机台基础信息 Excel，解析后预览确认入库（SN 为主键，自动去重/标复测）',
      params: [ { key: 'path', label: '共享盘路径', type: 'path', def: '/shared/reports/机台入账.xlsx' },
                { key: 'sheet', label: '工作表', type: 'text', def: 'Machines' } ] },
    { id: 'ds-miniline-excel', name: 'Mini line 工站 Excel',    type: 'excel',  target: 'stations',
      desc: '上传工站测试结果 Excel（Mini line 只做站点比对，不分析测试数据）',
      params: [ { key: 'path', label: '共享盘路径', type: 'path', def: '/shared/stations/工站结果.xlsx' } ] },
    { id: 'ds-miniline-api',   name: 'Mini line 工站 API',      type: 'api',    target: 'stations', status: 'reserved',
      endpoint: 'https://mini-line.internal/api/stations', method: 'GET', auth: 'token',
      desc: '预留：程序按配置调用 API 查看机台在站点的测试数据（只比对站点与规划是否一致）',
      params: [ { key: 'sn', label: 'SN 参数', type: 'text', def: '{sn}' } ] },
    { id: 'ds-tt-in',          name: 'TT 系统入账',             type: 'api',    target: 'machines', status: 'reserved',
      endpoint: 'https://tt.internal/api/inbound', method: 'POST', auth: 'token',
      desc: '预留：TT 系统入账后拉取机台清单（替代手动上传 Excel）' },
    { id: 'ds-tc-env',         name: 'TestCenter 温湿度设备 API', type: 'device', target: 'device', status: 'reserved',
      endpoint: 'https://tc-env.internal/api/v1', method: 'RPC', auth: 'key',
      desc: '预留：温湿度设备远程操作（设温/设湿/启停循环）' }
  ];

  /* ---------------- 设备连接中心（TestCenter 远程操作） ----------------
     capabilities：该设备支持的动作（前端按钮按此渲染）；
     reading：当前读数（温湿度/电压）；running：是否运行中；runSeconds：累计运行秒数（前端计时递增）；
     targetTemp/targetHum：设定目标温湿度；runDuration：设定运行时长（秒）；stopAt：设定停止时间。 */
  var DEVICES = [
    { id: 'dv-tc-env',   name: 'T-Center 温湿度箱', type: 'env',   location: 'Test Center · Env 室', endpoint: 'https://tc-env.internal/api/v1',
      capabilities: ['setTemp', 'setHum', 'setRunDuration', 'startRun', 'stopRun'], status: 'online',
      reading: { temp: 25.0, hum: 60.0 }, running: true, runSeconds: 0, targetTemp: 25, targetHum: 60, runDuration: 7200, stopAt: '—' },
    { id: 'dv-tc-cycle', name: '温湿度循环箱',      type: 'cycle', location: 'Test Center · Cycle 室', endpoint: 'https://tc-cycle.internal/api/v1',
      capabilities: ['setTemp', 'setHum', 'setRunDuration', 'startRun', 'stopRun'], status: 'online',
      reading: { temp: 22.0, hum: 55.0 }, running: false, runSeconds: 0, targetTemp: 40, targetHum: 90, runDuration: 3600, stopAt: '—' },
    { id: 'dv-charge',   name: 'Charging 电源(A/B)', type: 'power', location: 'Test Center · 充电架', endpoint: 'https://charge.internal/api/v1',
      capabilities: ['setOn', 'setOff'], status: 'offline',
      reading: { volt: 5.0 }, running: false, runSeconds: 0, targetTemp: null, targetHum: null, runDuration: 0, stopAt: '—' }
  ];

  /* ---------------- 设备操作留痕（远程控制每次写一条） ---------------- */
  var DEVICE_LOGS = [
    { at: '09-17 08:00', dev: 'dv-tc-env', act: '启动运行', by: 'aiden', note: '温湿度循环启动（7200s / 25.0℃ / 60.0%）' }
  ];

  /* ---------------- 电子表单模板管理（管理员） ---------------- */
  /* fields[]：电子档填写表格的结构真源——「新增字段 / 调整表格结构」都在这里改，
     保存后版本自动升，Travel Sheet 等表格结构跟随此配置（静态演示，内存生效）。
     header=true：纸表版式顶部额外渲染「机台基础信息区」表头（字段见 MACHINE_BASIC，台账带出） */
  var FORM_TEMPLATES = [
    { key: 'travel_sheet', name: 'Travel Sheet（T0）', stage: 'T0', nodes: 5, owner: ['tammy','lucky','amy','bole'], version: 'v1.5.0', status: 'active', header: true, nodeIds: ['t0-01', 't0-02'],
      fields: [
        { label: '清洁',       type: '勾选', w: 3, h: 1 },
        { label: '各部位外观', type: '勾选', w: 6, h: 1, required: true },
        { label: '色差ΔE',     type: '数字', w: 3, h: 1, required: true },
        { label: '4PT 强度',   type: '数字', w: 4, h: 1 },
        { label: '镜片检查',   type: '勾选', w: 4, h: 1 },
        { label: '照片勾选',   type: '勾选', w: 4, h: 1 },
        { label: '外观照片',   type: '照片', w: 6, h: 2 },
        { label: '测试结论',   type: '文本域', w: 12, h: 2, required: true },
        { label: '复核签名',   type: '签名', w: 6, h: 2, required: true },
        { label: '电子签名',   type: '签名', w: 6, h: 2, required: true }
      ] },
    { key: 'test_record',  name: '测试记录表',       stage: 'T0', nodes: 7, owner: ['aiden','cody'], version: 'v1.2.1', status: 'active', nodeIds: ['tx-01', 'tf-01'],
      fields: [
        { label: '机台SN',   type: '文本', w: 4, h: 1, required: true },
        { label: '站别',     type: '文本', w: 4, h: 1, required: true },
        { label: '测试时间', type: '日期', w: 4, h: 1, required: true },
        { label: '测试项',   type: '文本', w: 8, h: 1, required: true },
        { label: '判定',     type: '勾选', w: 4, h: 1, required: true },
        { label: '实测值',   type: '数字', w: 4, h: 1, required: true },
        { label: '上限/下限', type: '数字', w: 4, h: 1 },
        { label: '单位',     type: '文本', w: 4, h: 1 },
        { label: '测试员',   type: '签名', w: 6, h: 2, required: true },
        { label: '复核',     type: '签名', w: 6, h: 2, required: true }
      ] },
    { key: 'inspection',   name: '设备巡检/Audit',   stage: '—',  nodes: 1, owner: ['aiden','cody'], version: 'v1.0.0', status: 'draft',
      fields: [
        { label: '设备',     type: '文本', w: 4, h: 1, required: true },
        { label: '位置',     type: '文本', w: 4, h: 1, required: true },
        { label: '下次校验', type: '日期', w: 4, h: 1, required: true },
        { label: '巡检项',   type: '文本', w: 8, h: 1, required: true },
        { label: '判定',     type: '勾选', w: 4, h: 1, required: true },
        { label: '责任人',   type: '文本', w: 6, h: 1 },
        { label: '复核人',   type: '文本', w: 6, h: 1 },
        { label: '备注',     type: '文本域', w: 12, h: 2 }
      ] },
    { key: 'ctms_form',    name: 'CT Scan 申请单',   stage: '—',  nodes: 7, owner: ['kevin'], version: 'v0.8.0', status: 'active',
      fields: [
        { label: '申请单号',   type: '文本', w: 4, h: 1, required: true },
        { label: '需求方',     type: '文本', w: 4, h: 1, required: true },
        { label: '紧急度',     type: '下拉', w: 4, h: 1 },
        { label: '机台SN',     type: '文本', w: 4, h: 1, required: true },
        { label: '送样方式',   type: '下拉', w: 4, h: 1 },
        { label: '期望完成',   type: '日期', w: 4, h: 1 },
        { label: '送测目的',   type: '文本域', w: 8, h: 2, required: true },
        { label: '扫描参数',   type: '文本域', w: 4, h: 2 },
        { label: 'SOC 固定',   type: '勾选', w: 6, h: 1, required: true },
        { label: '样照',       type: '勾选', w: 6, h: 1 },
        { label: '指派负责人', type: '文本', w: 6, h: 1, required: true },
        { label: '电子签名',   type: '签名', w: 6, h: 2, required: true }
      ] },
    { key: 'report_sheet_cosmetic', name: '报告纸 · Cosmetic 版', station: 'Cosmetic', stage: '—', nodes: 1, owner: ['bole', 'tammy'], version: 'v1.0.0', status: 'active', header: true, cat: 'report', nodeIds: ['t0-01', 'tx-02', 'tf-02'],
      fields: [
        { label: '外观问题',   type: '多选下拉', dict: 'fx_issue',        w: 6, h: 1, required: true },
        { label: '测试结论',   type: '多选下拉', dict: 'test_conclusion', w: 6, h: 1, required: true },
        { label: '测试备注',   type: '文本域',   w: 12, h: 2 },
        { label: '测试员签名', type: '签名',     w: 6, h: 2, required: true },
        { label: '复核签名',   type: '签名',     w: 6, h: 2, required: true }
      ] },
    { key: 'report_sheet_miniline', name: '报告纸 · Mini line 版', station: 'Mini line', stage: '—', nodes: 1, owner: ['frank'], version: 'v1.2.0', status: 'active', header: true, cat: 'report', nodeIds: ['t0-03', 'tx-04', 'tf-04'],
      fields: [
        { label: '测试结论',   type: '多选下拉', dict: 'test_conclusion', w: 6, h: 1, required: true },
        { label: '工站判定',   type: '文本域',   w: 6, h: 2, required: true },
        { label: '测试员签名', type: '签名',     w: 6, h: 2, required: true },
        { label: '复核签名',   type: '签名',     w: 6, h: 2, required: true }
      ] },
    { key: 'report_sheet_testcenter', name: '报告纸 · Test Center 版', station: 'Test Center', stage: '—', nodes: 1, owner: ['aiden', 'cody'], version: 'v1.0.0', status: 'active', header: true, cat: 'report', nodeIds: ['t0-08', 'tx-01', 'tf-01'],
      fields: [
        { label: '环境测试项', type: '多选下拉', dict: 'env_item',        w: 4, h: 1 },
        { label: '机械测试项', type: '多选下拉', dict: 'mech_item',       w: 4, h: 1 },
        { label: '测试结论',   type: '多选下拉', dict: 'test_conclusion', w: 4, h: 1, required: true },
        { label: '测试备注',   type: '文本域',   w: 12, h: 2 },
        { label: '测试员签名', type: '签名',     w: 6, h: 2, required: true },
        { label: '复核签名',   type: '签名',     w: 6, h: 2, required: true }
      ] }
  ];

  /* 报告纸运行数据：每台机一份（上传 Excel 后自动带出基础数据 + 多选下拉栏位已填值） */
  var REPORT_SHEETS = [
    { sn: 'MTL00011', model: 'A20X Pro', product: 'Project Nova', phase: 'PreEVT', stage: 'T0', station: 'Cosmetic',     values: { fx_issue: ['FX-02'], test_conclusion: ['pass'], env_item: ['temp'], mech_item: [] } },
    { sn: 'MTL00013', model: 'A20X Pro', product: 'Project Nova', phase: 'PreEVT', stage: 'T0', station: 'Mini line',    values: { fx_issue: [],        test_conclusion: [],        env_item: [],        mech_item: [] } },
    { sn: 'MTL00018', model: 'A20X Pro', product: 'Project Nova', phase: 'EVT', stage: 'TX', station: 'Test Center',  values: { fx_issue: [],        test_conclusion: ['pass'], env_item: ['temp', 'hum'], mech_item: ['drop'] } }
  ];

  /* Travel Sheet 环节流（由 STATION_DEFS 派生——SSOT 改一处，流程/台账/stepper 全部自动更正） */
  var TS_NODES = [];

  /* 工具运行历史（用户侧跑工具） */
  var TOOL_RUNS = [
    { tool: 'report_import',        at: '09-17 10:24', by: 'yoke',  status: 'ok',   sn: 6,   out: '{status:ok, diff_report:0}' },
    { tool: 'recon_compare',        at: '09-17 09:02', by: 'yoke',   status: 'ok',   sn: 12,  out: '0 差异' },
    { tool: 'dashboard_reconcile',  at: '09-17 09:05', by: 'bole',  status: 'fail', sn: 4,   out: 'Dashboard 数据未下载，跳过' },
    { tool: 'dup_check',            at: '09-17 10:02', by: 'tammy', status: 'ok',   sn: 6,   out: '无重复 SN' },
    { tool: 'report_aggregate',     at: '09-17 19:45', by: 'frank', status: 'ok',   sn: 12,  out: '初版 12 台' },
    { tool: 'data_reconcile',       at: '09-17 20:10', by: 'frank', status: 'ok',   sn: 12,  out: '0 差异' },
    { tool: 'photo_checklist',      at: '09-17 14:52', by: 'amy',   status: 'ok',   sn: 8,   out: '8 台无异常' },
    { tool: 'radar_sync',           at: '09-17 08:12', by: 'kevin', status: 'ok',   sn: 0,   out: '4 个文件下载' },
    { tool: 'photo_naming',         at: '09-17 16:21', by: 'lucky', status: 'ok',   sn: 2,   out: '命名清单已生成' },
    { tool: 'log_format',           at: '09-17 11:12', by: 'bole',  status: 'ok',   sn: 3,   out: '3 份 Log 编辑' }
  ];

  /* 通知 / 待办（to = 接收人 id；通知中心按「当前责任人」路由：
     归 to 本人或其请假代理人可见，管理员看全部） */
  var NOTIFICATIONS = [
    { type: 'alert',  level: 'high', text: 'SN MTL00017 20hr 未投 TX',             to: 'f1',    at: '09-17 21:20', read: false },
    { type: 'alert',  level: 'mid',  text: 'MTL00009 补拍超时待跟催',              to: 'frank', at: '09-17 21:15', read: false },
    { type: 'todo',   text: 'WF-0921-02 待你审核',                                 to: 'f1',    at: '09-17 18:20', read: false },
    { type: 'info',   text: 'CT Tracker 已同步（16:00 排程）',                     to: 'kevin', at: '09-17 16:00', read: true },
    { type: 'alert',  level: 'mid',  text: 'MTL00020 Camera 站 Fail 待复测',       to: 'frank', at: '09-17 20:55', read: false },
    { type: 'info',   text: 'S14 备份已完成（389 台）',                            to: 'amy',   at: '09-17 08:32', read: true },
    { type: 'alert',  level: 'low',  text: 'CT-0920-02 扫描超时',                  to: 'kevin', at: '09-17 21:40', read: false },
    { type: 'alert',  level: 'low',  text: 'S03 对账跳过 4 台：Dashboard 数据未下载', to: 'bole', at: '09-17 09:05', read: false },
    { type: 'todo',   text: 'Recon 数据包 PKT-0921-02 待照单核对',                 to: 'yoke',  at: '09-17 09:40', read: false }
  ];

  /* ---------------- 测试阶段城（大名城）：T0 / TX / TF ---------------- */
  /* 一台机台按 WorkFlow §0.1 依次走过 T0 → TX → TF 三个测试阶段，
     每个「阶段城」包含各自的作业小节点。阶段城只作为聚合容器，
     其小节点定义在下放 STATION_DEFS（唯一的 SSOT）。 */
  var STAGES = [
    { id: 'T0', name: 'T0 首次入测', tag: '基线', desc: '入库后首次全面外观 + 基线测试', seq: 'T0 → 投 TX',
      tt: ['首次测试 TT 1.7 天', 'Cosmetic TT 2 小时', 'Mini line TT 2.2 天'] },
    { id: 'TX', name: 'TX 分段测试', tag: '分段', desc: '各 Function DRI 依 WF 分配执行分段测试，逐 CP 循环', seq: 'TX → 下一 CP 或 TF',
      tt: ['测试本體最長 20 小时', 'Cosmetic TT 1.5 小时', 'Mini line TT 2.2 天'] },
    { id: 'TF', name: 'TF 完测退库', tag: '收尾', desc: 'Last CP 测试完成，全流程循环收尾退库', seq: 'TF → 退库',
      tt: ['Cosmetic TT 2 小时', 'Mini line TT 2.2 天'] }
  ];

  /* ---------------- 站点作业定义（SSOT：一处定义，多处派生） ---------------- */
  /* 电子化文档的核心：每个阶段城下的每项作业内容/岗位/负责人/时限只有这一份。
     修改入口在「作业设定中心」，保存后新版本立即生效，下方派生的
     流程排配表 / Travel Sheet 环节流 / 台账卡片全部自动更正——不用多处手工同步。
     字段：id / stage(所属阶段城)/ flow(所属流程)/ name(节点)/ action(做什么)/ role(岗位)/
     owner(默认负责人 id)/ dur(时限)/ ver(版本号)/ status(eff|draft)/
     effectiveFrom(生效日期)/ changedBy(最近修改人)/ changes[](变更历史)/
     exec(执行方式 manual|semi|auto)/ scripts[](挂接脚本 S 号)/ tools[](挂接工具 Key，仅引用不复制) */
  var STATION_DEFS = [
    /* ================= T0 首次入测（8 个小节点） ================= */
    { id: 't0-01', stage: 'T0', flow: 'T0 首次入测', name: '外观目检', action: '清洁 → 秤重 → 勾选 → 色差 → 签名',       role: 'cosmetic',   owner: 'tammy', dur: '≤ 15 min',  ver: 'v2.1', status: 'eff',     effectiveFrom: '09-12',  changedBy: 'f1',    changes: [{ t: '09-12', who: 'f1',    what: '新增「色差」勾选项，SOP 21-03' }, { t: '09-01', who: 'f1',    what: '时长上限 20→15 min' }], exec: 'semi', scripts: ['S16', 'S17'], tools: ['dup_check'], inputs: [], outputs: ['ART_FX'] },
    { id: 't0-02', stage: 'T0', flow: 'T0 首次入测', name: '拍照打勾', action: '拍照 + 治具匹配（S10）',                  role: 'photo',      owner: 'lucky', dur: '≤ 20 min',  ver: 'v2.0', status: 'eff',     effectiveFrom: '08-30',  changedBy: 'bole',  changes: [{ t: '08-30', who: 'bole',  what: '并入治具匹配校验' }], exec: 'semi', scripts: ['S10'], tools: ['photo_naming'], inputs: ['ART_FX'], outputs: ['ART_PHOTO'] },
    { id: 't0-03', stage: 'T0', flow: 'T0 首次入测', name: 'Mini line 工站', action: '工站测试 → Summary OUT + Report IN，判 T0 结果', role: 'miniline', owner: 'frank', dur: '批排程 12hr', ver: 'v1.0', status: 'eff',     effectiveFrom: '06-20',  changedBy: 'frank', changes: [{ t: '06-20', who: 'frank', what: '首版下发，对应 WorkFlow §6' }], exec: 'semi', scripts: ['S06', 'S07'], tools: ['report_aggregate', 'data_reconcile'], inputs: [], outputs: ['ART_STATION', 'ART_REPORT', 'ART_RECON'] },
    { id: 't0-04', stage: 'T0', flow: 'T0 首次入测', name: '照片复核', action: '对照 TS 勾选复核，通过签名',              role: 'review',     owner: 'amy',   dur: '1.5hr/批',  ver: 'v1.2', status: 'eff',     effectiveFrom: '08-20',  changedBy: 'amy',   changes: [{ t: '08-20', who: 'amy',   what: '复核通过需签名留痕' }], exec: 'auto', scripts: ['S13'], tools: ['photo_checklist'], inputs: ['ART_PHOTO'], outputs: [] },
    { id: 't0-05', stage: 'T0', flow: 'T0 首次入测', name: 'Report/Recon', action: 'SYS 资料导入 + 报告/Recon 对比 + 上传', role: 'report',    owner: 'bole',  dur: '3 hr',      ver: 'v1.0', status: 'eff',     effectiveFrom: '08-15',  changedBy: 'bole',  changes: [{ t: '08-15', who: 'bole',  what: '首版下发' }], exec: 'auto', scripts: ['S01', 'S02'], tools: ['report_import', 'recon_compare'], inputs: ['ART_FX', 'ART_STATION', 'ART_PHOTO'], outputs: ['ART_REPORT', 'ART_RECON', 'ART_DIFF'] },
    { id: 't0-06', stage: 'T0', flow: 'T0 首次入测', name: '分 WF · BCDC', action: '分 WF → F1 批复 → 送 BCDC / 补拍 / 色差', role: 'report',    owner: 'yoke',  dur: '20 min',    ver: 'v1.0', status: 'eff',     effectiveFrom: '08-15',  changedBy: 'yoke',  changes: [{ t: '08-15', who: 'yoke',  what: '首版下发，New add P1' }], inputs: ['ART_REPORT', 'ART_RECON', 'ART_DIFF'], outputs: ['ART_FA'] },
    { id: 't0-07', stage: 'T0', flow: 'T0 首次入测', name: 'Recon Tagging', action: '刷 Lab REL T0 + Test T0 failure mode', role: 'report',    owner: 'yoke',  dur: '2 min/机',  ver: 'v1.0', status: 'eff',     effectiveFrom: '08-15',  changedBy: 'yoke',  changes: [{ t: '08-15', who: 'yoke',  what: '首版下发' }], inputs: ['ART_RECON', 'ART_DIFF'], outputs: [] },
    { id: 't0-08', stage: 'T0', flow: 'T0 首次入测', name: 'Test Center 基线', action: 'Charging → Rootloader → 设备自检 → 记录', role: 'testcenter', owner: 'aiden', dur: '90 min',    ver: 'v1.0', status: 'eff',     effectiveFrom: '08-15',  changedBy: 'aiden', changes: [{ t: '08-15', who: 'aiden', what: '首版下发' }], exec: 'semi', scripts: ['S08'], inputs: [], outputs: [] },

    /* ================= TX 分段测试（7 个小节点） ================= */
    { id: 'tx-01', stage: 'TX', flow: 'TX 分段测试', name: 'Test Center 分段', action: 'Summary IN → 刷 Test Tagging → SYS Weight → CP 测试 → 量测 → OUT', role: 'testcenter', owner: 'aiden', dur: '≤ 20hr/CP', ver: 'v1.0', status: 'eff', effectiveFrom: '08-15', changedBy: 'aiden', changes: [{ t: '08-15', who: 'aiden', what: '首版下发' }], exec: 'semi', scripts: ['S08'], inputs: ['ART_FA'], outputs: [] },
    { id: 'tx-02', stage: 'TX', flow: 'TX 分段测试', name: '外观快检', action: '现场快检 + CTL Drop 检 EFI Diag → 目检勾选', role: 'cosmetic',   owner: 'tammy', dur: '≤ 1.5hr',   ver: 'v1.0', status: 'eff', effectiveFrom: '08-15', changedBy: 'tammy', changes: [{ t: '08-15', who: 'tammy', what: '首版下发，对应 WorkFlow §7.2' }], exec: 'semi', scripts: ['S16'], tools: ['dup_check'], inputs: [], outputs: ['ART_FX'] },
    { id: 'tx-03', stage: 'TX', flow: 'TX 分段测试', name: '拍照打勾', action: '手动 / Auto-Photo 拍照命名',             role: 'photo',      owner: 'lucky', dur: '—',         ver: 'v1.0', status: 'eff', effectiveFrom: '06-20', changedBy: 'lucky', changes: [{ t: '06-20', who: 'lucky', what: '首版下发' }], exec: 'auto', scripts: ['S09', 'S11'], tools: ['photo_naming'], inputs: ['ART_FX'], outputs: ['ART_PHOTO'] },
    { id: 'tx-04', stage: 'TX', flow: 'TX 分段测试', name: 'Mini line 工站', action: '工站测试 → Summary OUT + Report IN', role: 'miniline',   owner: 'frank', dur: '批排程',     ver: 'v1.0', status: 'eff', effectiveFrom: '06-20', changedBy: 'frank', changes: [{ t: '06-20', who: 'frank', what: '首版下发' }], exec: 'semi', scripts: ['S06', 'S07'], tools: ['report_aggregate', 'data_reconcile'], inputs: [], outputs: ['ART_STATION', 'ART_REPORT', 'ART_RECON'] },
    { id: 'tx-05', stage: 'TX', flow: 'TX 分段测试', name: '照片复核', action: '对照勾选复核，通过签名',                 role: 'review',     owner: 'amy',   dur: '—',         ver: 'v1.0', status: 'eff', effectiveFrom: '08-20', changedBy: 'amy',   changes: [{ t: '08-20', who: 'amy', what: '复核通过需签名留痕' }], exec: 'auto', scripts: ['S13', 'S15'], tools: ['photo_checklist'], inputs: ['ART_PHOTO'], outputs: [] },
    { id: 'tx-06', stage: 'TX', flow: 'TX 分段测试', name: 'Report/Recon', action: '整机资料导入 + Dashboard 对账（S03）', role: 'report',     owner: 'bole',  dur: '30 min/日', ver: 'v1.1', status: 'eff',     effectiveFrom: '09-17',        changedBy: 'bole',  changes: [{ t: '09-17', who: 'bole', what: '对账差异按 2026 下季版式分组输出' }, { t: '08-15', who: 'bole', what: '首版下发' }], exec: 'auto', scripts: ['S03'], tools: ['dashboard_reconcile'], inputs: ['ART_FX', 'ART_STATION', 'ART_PHOTO'], outputs: ['ART_REPORT', 'ART_RECON'] },
    { id: 'tx-07', stage: 'TX', flow: 'TX 分段测试', name: 'FA / Disposition', action: 'F1 COF/FA 裁决 → 通知下一 CP 或 TF', role: 'fa',        owner: 'kevin', dur: '20 hr',     ver: 'v1.0', status: 'eff', effectiveFrom: '09-10', changedBy: 'kevin', changes: [{ t: '09-10', who: 'kevin', what: '投测邮件通知 Test Center（防漏投產）' }], exec: 'semi', scripts: ['S19'], tools: ['fa_tracker_update'], inputs: ['ART_REPORT', 'ART_RECON'], outputs: ['ART_FA'] },

    /* ================= TF 完测退库（7 个小节点） ================= */
    { id: 'tf-01', stage: 'TF', flow: 'TF 完测退库', name: 'Test Center 完测', action: 'Last CP 完成 → 量测 → 刷 TF Tagging', role: 'testcenter', owner: 'aiden', dur: '—',       ver: 'v1.0', status: 'eff', effectiveFrom: '08-15', changedBy: 'aiden', changes: [{ t: '08-15', who: 'aiden', what: '首版下发' }], exec: 'semi', scripts: ['S08'], inputs: ['ART_FA'], outputs: [] },
    { id: 'tf-02', stage: 'TF', flow: 'TF 完测退库', name: '外观快检', action: 'TF 快检 → 目检勾选',                      role: 'cosmetic',   owner: 'tammy', dur: '≤ 2 hr',   ver: 'v1.0', status: 'eff', effectiveFrom: '08-15', changedBy: 'tammy', changes: [{ t: '08-15', who: 'tammy', what: '首版下发' }], exec: 'semi', scripts: ['S16'], tools: ['dup_check'], inputs: [], outputs: ['ART_FX'] },
    { id: 'tf-03', stage: 'TF', flow: 'TF 完测退库', name: '拍照打勾', action: '拍照命名（S09）',                        role: 'photo',      owner: 'lucky', dur: '—',       ver: 'v1.0', status: 'eff', effectiveFrom: '06-20', changedBy: 'lucky', changes: [{ t: '06-20', who: 'lucky', what: '首版下发' }], exec: 'auto', scripts: ['S09'], tools: ['photo_naming'], inputs: ['ART_FX'], outputs: ['ART_PHOTO'] },
    { id: 'tf-04', stage: 'TF', flow: 'TF 完测退库', name: 'Mini line 工站', action: '工站测试 → Summary OUT + Report IN', role: 'miniline',   owner: 'frank', dur: '批排程',   ver: 'v1.0', status: 'eff', effectiveFrom: '06-20', changedBy: 'frank', changes: [{ t: '06-20', who: 'frank', what: '首版下发' }], exec: 'semi', scripts: ['S06', 'S07'], tools: ['report_aggregate', 'data_reconcile'], inputs: [], outputs: ['ART_STATION', 'ART_REPORT', 'ART_RECON'] },
    { id: 'tf-05', stage: 'TF', flow: 'TF 完测退库', name: '照片复核', action: '对照勾选复核，通过签名',                   role: 'review',     owner: 'amy',   dur: '—',       ver: 'v1.0', status: 'eff', effectiveFrom: '08-20', changedBy: 'amy',   changes: [{ t: '08-20', who: 'amy', what: '复核通过需签名留痕' }], exec: 'auto', scripts: ['S13', 'S15'], tools: ['photo_checklist'], inputs: ['ART_PHOTO'], outputs: [] },
    { id: 'tf-06', stage: 'TF', flow: 'TF 完测退库', name: 'Report/Recon', action: 'TF 报告上传文件馆 + 雷達備份',         role: 'report',     owner: 'bole',  dur: '—',       ver: 'v1.0', status: 'eff', effectiveFrom: '08-15', changedBy: 'bole',  changes: [{ t: '08-15', who: 'bole', what: '首版下发' }], exec: 'auto', scripts: ['S01', 'S04'], tools: ['report_import'], inputs: ['ART_FX', 'ART_STATION', 'ART_PHOTO'], outputs: ['ART_REPORT', 'ART_RECON'] },
    { id: 'tf-07', stage: 'TF', flow: 'TF 完测退库', name: 'FA · 退库', action: '雷达同步 → 通知退库 → 签 TF 同意书',       role: 'fa',         owner: 'kevin', dur: '≤ 排程',  ver: 'v1.3', status: 'eff', effectiveFrom: '09-10', changedBy: 'kevin', changes: [{ t: '09-10', who: 'kevin', what: '退库需签 TF 同意书' }], exec: 'auto', scripts: ['S18'], tools: ['radar_sync'], inputs: ['ART_REPORT', 'ART_RECON'], outputs: [] }
  ];

  /* 任务点（tasks[]）与子节点细分（subNodes[]）：附在节点定义上，一处修改多处派生。
     · tasks[]：节点要执行的任务点（取自 DICTS.task_type），编辑入口在「作业定义中心」；
     · subNodes[]：节点可再拆分的子节点（各有任务 + 负责人），仅对应负责人本人可见。 */
  var TASK_SEEDS = {
    cosmetic:   ['upload', 'process', 'confirm'],
    photo:      ['upload', 'confirm'],
    review:     ['audit'],
    report:     ['upload', 'analyze', 'process', 'confirm'],
    miniline:   ['upload', 'analyze', 'process'],
    testcenter: ['upload', 'analyze', 'process'],
    fa:         ['confirm', 'audit']
  };
  var SUB_NODE_SEEDS = {
    't0-01': [ { id: 't0-01a', name: '检测外观', task: 'process', owner: 'tammy', dur: '≤ 8 min' },
               { id: 't0-01b', name: '拍照',     task: 'upload',  owner: 'lucky', dur: '≤ 5 min' },
               { id: 't0-01c', name: '核对',     task: 'confirm', owner: 'amy',   dur: '≤ 3 min' } ],
    'tx-01': [ { id: 'tx-01a', name: '环境测试', task: 'analyze', owner: 'aiden', dur: '—' },
               { id: 'tx-01b', name: '机械测试', task: 'analyze', owner: 'cody',  dur: '—' } ]
  };
  /* Mini line 工站节点（t0-03 / tx-04 / tf-04）没有显式子节点种子时，自动补一套「工站测试作业」子节点，
     与 Cosmetic（外观目检 → 拍照 → 核对）形成明显区分：Scan IN → 工站测试 → Scan OUT 判定。 */
  function minilineSubSeeds(d) {
    return [
      { id: d.id + 'a', name: 'Summary IN 扫描', task: 'upload',  owner: d.owner, dur: '≤ 5 min' },
      { id: d.id + 'b', name: '工站测试',        task: 'analyze', owner: d.owner, dur: '批排程' },
      { id: d.id + 'c', name: 'Summary OUT 判定', task: 'confirm', owner: d.owner, dur: '≤ 5 min' }
    ];
  }
  STATION_DEFS.forEach(function (d) {
    d.tasks = (TASK_SEEDS[d.role] || ['process']).slice();
    var seeds = SUB_NODE_SEEDS[d.id];
    if (!seeds && d.role === 'miniline') seeds = minilineSubSeeds(d);
    d.subNodes = (seeds || []).map(function (s) {
      return { id: s.id, name: s.name, task: s.task, owner: s.owner, dur: s.dur, status: 'eff' };
    });
  });

  /* 批次流转 + 设备挂接 + Mini line 规划工站（附在节点定义上，一处修改多处派生）
     · advance：unit(单台流转·处理一台流转一台) / batch(整批流转·该节点全部机台完成才放行)
       整批节点 = Mini line(t0-03/tx-04/tf-04) + Report/Recon(t0-05/tx-06/tf-06)，其余单台。
     · devices：TestCenter 节点挂接的远程操作设备（DEVICES.id，预留）。
     · miniPlan：Mini line 节点规划的工站清单（站点比对基准），替换原先硬编码在视图里的 8 步。 */
  var MINI_PLAN = ['SWDL', 'SWDL-RF', 'Laser Scan REL1', 'Laser Scan REL2', 'Camera Function', 'SRT', 'Isengard', 'SWDL-RB', 'Log-Collection'];
  var BATCH_ADVANCE_NODES = ['t0-03', 'tx-04', 'tf-04', 't0-05', 'tx-06', 'tf-06'];
  STATION_DEFS.forEach(function (d) {
    d.advance = BATCH_ADVANCE_NODES.indexOf(d.id) >= 0 ? 'batch' : 'unit';
    if (d.role === 'testcenter') d.devices = ['dv-tc-env'];
    if (d.role === 'miniline') d.miniPlan = MINI_PLAN.slice();
  });


  /* 流程模板（可编排）：节点 = 仅引用 STATION_DEFS 的 id（不复制内容）。
     字段：key(标识)/ name(流程名)/ nodes[](有序引用)/ ver(模板版本)/
     status(eff|draft)/ releasedVer(最近发布版本)/ effectiveFrom(最近生效)/ changedBy/changes[]。
     改模板 = 版本递增 + 转草稿 → 确认「发布流程」；在跑的流程实例钉在启动时的版本，不受调整影响。 */
  var FLOW_TEMPLATES = [
    { key: 't0', name: 'T0 首次入测', nodes: ['t0-01','t0-02','t0-03','t0-04','t0-05','t0-06','t0-07','t0-08'], ver: 'v1.0', status: 'eff', releasedVer: 'v1.0', effectiveFrom: '09-12', changedBy: 'f1', changes: [{ t: '09-12', who: 'f1', what: '首版发布（对应 T0 阶段基线）' }] },
    { key: 'tx', name: 'TX 分段测试', nodes: ['tx-01','tx-02','tx-03','tx-04','tx-05','tx-06','tx-07'],         ver: 'v1.0', status: 'eff', releasedVer: 'v1.0', effectiveFrom: '08-15', changedBy: 'f1', changes: [{ t: '08-15', who: 'f1', what: '首版发布（对应 TX 阶段基线）' }] },
    { key: 'tf', name: 'TF 完测退库', nodes: ['tf-01','tf-02','tf-03','tf-04','tf-05','tf-06','tf-07'],         ver: 'v1.0', status: 'eff', releasedVer: 'v1.0', effectiveFrom: '08-15', changedBy: 'f1', changes: [{ t: '08-15', who: 'f1', what: '首版发布（对应 TF 阶段基线）' }] }
  ];

  /* 流程实例：启动时钉住模板版本；current = 模板内当前节点 id，推进后自动改派下一个节点负责人。
     负责人工作台读它做「我的任务 + 节点位置」路由（维护在 myTasks）。 */
  var FLOW_INSTANCES = [
    { id: 'FI-001', tpl: 't0', tplVer: 'v1.0', subject: '批号 T0-0918-01 · 4 台', current: 't0-04', status: 'running', startedBy: 'f1',    startedAt: '09-18 09:00', note: '' },
    { id: 'FI-002', tpl: 't0', tplVer: 'v1.0', subject: '批号 T0-0918-02 · 8 台', current: 't0-03', status: 'running', startedBy: 'frank', startedAt: '09-18 09:20', note: '' },
    { id: 'FI-003', tpl: 'tx', tplVer: 'v1.0', subject: '夜班 TX 批次 · 12 台',   current: 'tx-01', status: 'running', startedBy: 'frank', startedAt: '09-17 22:30', note: '' },
    { id: 'FI-004', tpl: 'tf', tplVer: 'v1.0', subject: '批号 TF-0917-01 · 3 台', current: 'tf-07', status: 'running', startedBy: 'kevin', startedAt: '09-17 14:00', note: '' },
    { id: 'FI-005', tpl: 't0', tplVer: 'v1.0', subject: '批号 T0-0916-01 · 2 台', current: 't0-08', status: 'done',   startedBy: 'aiden', startedAt: '09-16 10:00', note: '全流程闭环' }
  ];

  /* 派生出「流程排配」视图消费的节点组（SSOT 一处改动 → rebuildDefs 重新派生，全部下游自动更正）
    * 注意：WORKFLOW_FLOWS / TS_NODES 均「原地重建」，保持 global.LAB 持有的引用即时一致 */
  function rebuildDefs() {
    var byId = {};
    STATION_DEFS.forEach(function (d) { byId[d.id] = d; });
    var next = FLOW_TEMPLATES.map(function (t) {
      return {
        key: t.key,
        flow: t.name,
        ver: t.ver,
        status: t.status,
        releasedVer: t.releasedVer,
        nodes: t.nodes.map(function (id) { return byId[id]; })
          .filter(function (x) { return x && x.ver && x.status !== 'obsolete'; })
      };
    });
    WORKFLOW_FLOWS.length = 0;
    next.forEach(function (f) { WORKFLOW_FLOWS.push(f); });
    TS_NODES.length = 0;
    WORKFLOW_FLOWS[0].nodes.slice(0, 5).forEach(function (d, i) {
      TS_NODES.push({ node: i + 1, name: d.name, role: d.owner, action: d.action });
    });
  }
  var WORKFLOW_FLOWS = [];
  var TS_NODES = [];
  rebuildDefs();

  /* 已下发快照：模拟「纸质/旧册已印发出门」—— Agent 用它核对 SSOT 是否漂移 */
  var DEF_SNAPSHOT = [
    { id: 't0-01', ver: 'v2.1', effectiveFrom: '09-12' },
    { id: 't0-02', ver: 'v2.0', effectiveFrom: '08-30' },
    { id: 't0-03', ver: 'v1.0', effectiveFrom: '06-20' },
    { id: 't0-04', ver: 'v1.2', effectiveFrom: '08-20' },
    { id: 't0-05', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 't0-06', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 't0-07', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 't0-08', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 'tx-01', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 'tx-02', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 'tx-03', ver: 'v1.0', effectiveFrom: '06-20' },
    { id: 'tx-04', ver: 'v1.0', effectiveFrom: '06-20' },
    { id: 'tx-05', ver: 'v1.0', effectiveFrom: '08-20' },
    { id: 'tx-06', ver: 'v1.1', effectiveFrom: '09-17' },
    { id: 'tx-07', ver: 'v1.0', effectiveFrom: '09-10' },
    { id: 'tf-01', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 'tf-02', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 'tf-03', ver: 'v1.0', effectiveFrom: '06-20' },
    { id: 'tf-04', ver: 'v1.0', effectiveFrom: '06-20' },
    { id: 'tf-05', ver: 'v1.0', effectiveFrom: '08-20' },
    { id: 'tf-06', ver: 'v1.0', effectiveFrom: '08-15' },
    { id: 'tf-07', ver: 'v1.3', effectiveFrom: '09-10' }
  ];

  /* ---------------- 阶段城运行监控（运行监控页顶部视图） ---------------- */
  /* 轮次：每座阶段城当前第几轮 / 今日共几轮（TX 逐 CP 循环计轮） */
  var STAGE_RUNS = [
    { stage: 'T0', round: 2, rounds: 3, at: '09-17 中班 · 第 2 轮', onLine: 6,  note: 'MTL00013 卡 Mini line Camera，LED 待复测' },
    { stage: 'TX', round: 3, rounds: 5, at: '09-17 夜班 · CP-3',   onLine: 3,  note: 'MTL00016 待 Dashboard 对账' },
    { stage: 'TF', round: 1, rounds: 2, at: '09-16 完测批次',      onLine: 2,  note: 'MTL00022 已退库' }
  ];

  /* 阶段城内机台 status 的推进次序（决定某节点是否已被某台机走完；TX/TF 先 Test Center 再外观/拍照…） */
  var STAGE_STATUS_ORDER = {
    T0: ['cosmetic', 'photo', 'miniline', 'review', 'recon', 'testcenter', 'done-no-tx', 'done'],
    TX: ['testcenter', 'cosmetic', 'photo', 'miniline', 'review', 'recon', 'done-no-tx', 'done'],
    TF: ['testcenter', 'cosmetic', 'photo', 'miniline', 'review', 'recon', 'done-no-tx', 'done']
  };

  /* 节点 role → 代表 status，把节点排进对应阶段城的流转顺序 */
  var ROLE_TO_STATUS = { cosmetic: 'cosmetic', photo: 'photo', miniline: 'miniline', review: 'review', report: 'recon', testcenter: 'testcenter', fa: 'recon' };

  /* 各阶段城小节点 → 机台结果：pass(已通过) / fail(失败·红色) / run(进行中) / todo(待执行)
     种子扩数量后由 buildSeed() 复算，避免只覆盖最初的 12 台样例。 */
  var STAGE_NODE_UNITS = {};
  function rebuildStageNodeUnits(d) {
    d = d || LAB;
    d.STAGE_NODE_UNITS = {};
    d.STATION_DEFS.forEach(function (def) {
      var order = d.STAGE_STATUS_ORDER[def.stage] || [];
      var pos = order.indexOf(ROLE_TO_STATUS[def.role]);
      var out = { pass: [], fail: [], run: [], todo: [] };
      d.TRAVEL_SHEETS.forEach(function (t) {
        if (t.stage !== def.stage) return;
        /* 失败判定：外观/拍照节点勾到问题 = fail；Mini line 由失败标签 / Dynamic 节点 = fail（待回写不算） */
        var isFail =
          (def.role === 'cosmetic' && t.fxIssue.length > 0) ||
          (def.role === 'miniline' && d.RECON_TAGGING.some(function (r) { return r.sn === t.sn && (r.tag === 'Test failure mode' || r.tag === 'Dynamic') && r.status !== 'pending'; }));
        if (isFail) { out.fail.push(t.sn); return; }
        var rank = order.indexOf(t.status);
        if (rank < 0) { out.todo.push(t.sn); return; }
        if (rank > pos) out.pass.push(t.sn);
        else if (rank === pos) out.run.push(t.sn);
        else out.todo.push(t.sn);
      });
      d.STAGE_NODE_UNITS[def.id] = out;
    });
  }

  /* ---------------- 请假与委托（负责人请假 → 节点改派代理人） ---------------- */
  var LEAVES = [
    { who: 'lucky', from: '09-18', to: '09-19', reason: '事假', scope: 'Travel Sheet·拍照打勾', deputy: 'amy', status: 'ended' },
    { who: 'kevin', from: '09-17', to: '09-17', reason: '外出培训', scope: 'Travel Sheet·FA 分析', deputy: 'lisa', status: 'active' },
    { who: 'amy',   from: '09-20', to: '09-20', reason: '年假', scope: 'Travel Sheet·照片复核', deputy: 'bole', status: 'upcoming' },
    { who: 'frank', from: '09-15', to: '09-16', reason: '病假', scope: 'Mini line·前置流程', deputy: 'Grant', status: 'ended' }
  ];

  /* ---------------- Lab Agent 处置单（Agent 介入点：卡点/核对/草稿，写操作留人工确认） ---------------- */
  var AGENT_CASES = [
    { id: 'AG-01', kind: '卡点',   target: 'MTL00017 T0 报告完成 20hr 未投 TX',  age: '20hr', cause: 'WF-0921-02 送 BCDC 需求确认，待客户（F1）批复', owner: 'f1', act: '已向客户跟催；客户批复后自动续流程 → 投 TX', status: 'watch', at: '09-17 21:20' },
    { id: 'AG-02', kind: '卡点',   target: 'MTL00009 补拍超时 >30min',           age: '45min', cause: 'Mini line 站别 Camera 尚未完成补拍',  owner: 'frank', act: '已通知 Frank 跟催站别，30min 后复查', status: 'watch', at: '09-17 21:15' },
    { id: 'AG-03', kind: '卡点',   target: 'CT-0920-02 扫描超时 >120min',        age: '130min', cause: 'CTMS 扫描未结束，TT 系统无回执',      owner: 'kevin', act: '已告警 CT PM：重扫或结案（Agent 不代操作）', status: 'watch', at: '09-17 21:40' },
    { id: 'AG-04', kind: '核对',   target: 'S03 对账跳过 4 台（Dashboard 未下载）', age: '—', cause: 'Dashboard 数据为客户系统仅读，下载失败', owner: 'bole', act: '已完成只读核对并量化差异；下载待人工确认', status: 'done', at: '09-17 09:05' },
    { id: 'AG-05', kind: '核对',   target: 'SFC vs 报告 数据一致性',             age: '—', cause: 'S07 自动核对通过，0 差异',              owner: 'frank', act: '核对通过，结果并入中班汇总草稿', status: 'done', at: '09-17 20:10' },
    { id: 'AG-06', kind: '草稿',   target: '中班汇总报告（Mini line）初版',       age: '—', cause: '汇总 12 台数据生成初版',                owner: 'frank', act: '已起草初版；待各 Function 确认后出终版', status: 'draft', at: '09-17 18:30' }
  ];

  /* ---------------- 退回单（两段式：发起待确认 → 目标节点确认后机台回目标重做） ---------------- */
  /* from = 发起环节 status；to = 退回目标环节 status；
     status: pending(待确认) → confirmed(已确认，机台已拨回 to 重做) → done(重做完成已快速归位 from)；
     rejected = 目标暂不同意。终态机台（done / done-no-tx）冻结，不可发起退回 */
  var RETURNS = [
    { id: 'RT-1', sn: 'MTL00015', from: 'review', to: 'cosmetic', reason: '背盖刮伤未勾选（外观漏记录），回源补录', by: 'amy', at: '09-17 21:55', status: 'pending' }
  ];

  /* ---------------- 更正单（历史不覆盖：保留旧值划线，追加更正事件；终态冻结） ---------------- */
  /* oldv → newv 为更正前后值；下游派生物（报告 / Recon 数据包）标记 recheck 待重核 */
  var CORRECTIONS = [
    { id: 'CORR-1', sn: 'MTL00016', oldv: '重量 607.5g', newv: '重量 607.7g', reason: 'S14 备份后复核称重修正', who: 'bole', at: '09-17 08:32' }
  ];

  /* Agent 行动审计日志（谁/何时/做什么/结果） */
  var AGENT_LOG = [
    { t: '09-17 21:20', who: 'agent', act: '监测到 MTL00017 卡点 20hr → 跟催 F1',           res: 'ok' },
    { t: '09-17 21:15', who: 'agent', act: 'MTL00009 补拍超时 → 通知 Frank 跟催站别',      res: 'ok' },
    { t: '09-17 21:40', who: 'agent', act: 'CT-0920-02 扫描超时 → 告警 CT PM',             res: 'ok' },
    { t: '09-17 09:05', who: 'agent', act: 'S03 跳过原因定位：Dashboard 数据未下载（仅读）', res: 'info' },
    { t: '09-17 20:10', who: 'agent', act: 'SFC vs 报告核对通过（0 差异），并入汇总草稿',   res: 'ok' }
  ];

  /* 汇总指标（用于登录后工作台，部分由上述数组动态计算：运行次数/待办数为保证一致性由页面实时统计） */
  var KPI = {
    todayUnits: 12,        // 今日在册机台（TRAVEL_SHEETS 全量）
    inProgress: 8,         // 流程进行中（非 done/done-no-tx）
    reconTodo: 5,          // Recon 待回写数据包
    alertsOpen: 4,         // 未处理告警
    scriptsOk: 17,         // 脚本正常
    scriptsWarn: 2,        // 脚本告警/失败
    scheduleDue: 1,        // 今日到期巡检
    runToday: 38,          // 今日工具运行次数
    ctOpen: 4,             // CTMS 进行中申请
    miniFail: 2,           // Mini line 当班 Fail 站
    taggingPending: 5      // Recon Tagging 待回写
  };

  /* 与台账/清单实时对齐，避免静态值与上方数组不一致 */
  function syncKPI(d) {
    d = d || LAB;
    d.KPI.todayUnits = d.TRAVEL_SHEETS.length;
    d.KPI.inProgress = d.TRAVEL_SHEETS.filter(function (t) { return t.status !== 'done' && t.status !== 'done-no-tx'; }).length;
    d.KPI.reconTodo = d.RECON_PACKS.filter(function (p) { return p.status !== 'done'; }).length;
    d.KPI.alertsOpen = d.ALERTS.filter(function (a) { return a.status === 'open'; }).length;
    d.KPI.scriptsOk = d.SCRIPTS.filter(function (s) { return s.health === 'ok'; }).length;
    d.KPI.scriptsWarn = d.SCRIPTS.filter(function (s) { return s.health !== 'ok'; }).length;
    d.KPI.scheduleDue = d.INSPECTIONS.filter(function (i) { return i.status === 'due'; }).length;
    d.KPI.runToday = d.TOOL_RUNS.length;
    d.KPI.ctOpen = d.CTMS_APPLICATIONS.filter(function (c) { return c.status !== 'closed'; }).length;
    d.KPI.miniFail = d.MINI_STATIONS.filter(function (m) { return m.status === 'fail'; }).length;
    d.KPI.taggingPending = d.RECON_TAGGING.filter(function (r) { return r.status === 'pending'; }).length;
  }

  /* 把数据挂到种子对象（浏览器 window.LAB / 服务端 module.exports） */
  var LAB = {
    USERS: USERS,
    SESSION: SESSION,
    POSTS: POSTS,
    MENUS: MENUS,
    ROLES: ROLES,
    ORGS: ORGS,
    SCRIPTS: SCRIPTS,
    SCRIPT_RUNS: SCRIPT_RUNS,
    EXCEL_TOOLS: EXCEL_TOOLS,
    SCHEDULE_TASKS: SCHEDULE_TASKS,
    RUN_LOGS: RUN_LOGS,
    ALERTS: ALERTS,
    TRAVEL_SHEETS: TRAVEL_SHEETS,
    DICTS: DICTS,
    REPORT_SHEETS: REPORT_SHEETS,
    MINI_STATIONS: MINI_STATIONS,
    MINI_BATCH: MINI_BATCH,
    CTMS_FLOW: CTMS_FLOW,
    CTMS_APPLICATIONS: CTMS_APPLICATIONS,
    RECON_TAGGING: RECON_TAGGING,
    UNIT_EVENTS: UNIT_EVENTS,
    REPORTS: REPORTS,
    RECON_PACKS: RECON_PACKS,
    PHOTO_REVIEWS: PHOTO_REVIEWS,
    TEST_RECORDS: TEST_RECORDS,
    INSPECTIONS: INSPECTIONS,
    FA_TRACKER: FA_TRACKER,
    WF_APPROVALS: WF_APPROVALS,
    FORM_TEMPLATES: FORM_TEMPLATES,
    MACHINE_BASIC: MACHINE_BASIC,
    MACHINES: MACHINES,
    TEST_BATCHES: TEST_BATCHES,
    BATCH_MACHINES: BATCH_MACHINES,
    DATA_SOURCES: DATA_SOURCES,
    DEVICES: DEVICES,
    DEVICE_LOGS: DEVICE_LOGS,
    TS_NODES: TS_NODES,
    STAGES: STAGES,
    PRODUCT_PHASES: PRODUCT_PHASES,
    WORKFLOW_FLOWS: WORKFLOW_FLOWS,
    STATION_DEFS: STATION_DEFS,
    ARTIFACTS: ARTIFACTS,
    ART_UPLOADS: ART_UPLOADS,
    DEF_SNAPSHOT: DEF_SNAPSHOT,
    FLOW_TEMPLATES: FLOW_TEMPLATES,
    FLOW_INSTANCES: FLOW_INSTANCES,
    STAGE_RUNS: STAGE_RUNS,
    STAGE_NODE_UNITS: STAGE_NODE_UNITS,
    STAGE_STATUS_ORDER: STAGE_STATUS_ORDER,
    LEAVES: LEAVES,
    AGENT_CASES: AGENT_CASES,
    AGENT_LOG: AGENT_LOG,
    RETURNS: RETURNS,
    CORRECTIONS: CORRECTIONS,
    TOOL_RUNS: TOOL_RUNS,
    NOTIFICATIONS: NOTIFICATIONS,
    KPI: KPI
  };

  /* ===================================================== * 演示数据规模生成器（机台 700 台 / 设备 28 台）
   * buildSeed() 只在服务端首次生成 demo.json / 一键重置时调用：原地扩充 LAB 内各数组（保持引用一致），
   * 生成结果确定（伪随机固定种子），同一仓库每次重置得到的演示数据一致。
   * ============================================================ */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function pad4(n) { n = String(n); while (n.length < 4) n = '0' + n; return n; }
  function pad5(n) { n = String(n); while (n.length < 5) n = '0' + n; return n; }
  /* 确定性伪随机：给定 (序号, 盐) 永远同一个值，保证重置可复现 */
  function rand(i, salt) {
    var x = ((i * 2654435761 + salt * 40503) >>> 0);
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x) >>> 0;
    return x / 4294967296;
  }
  function pick(arr, i, salt) { return arr[Math.floor(rand(i, salt) * arr.length)]; }

  var MODEL_SEED = [
    { model: 'Falcon-2',     phase: 'PreEVT' },
    { model: 'Falcon-2 Pro', phase: 'EVT'    },
    { model: 'Falcon-3',     phase: 'DVT'    }
  ];
  var STATION_POOL = {
    'T0': ['Cosmetic', 'Photo Review', 'Mini line', 'Report/Recon', 'Test Center'],
    'TX': ['Test Center', 'Photo Station', 'Report/Recon', 'Cosmetic'],
    'TF': ['Report/Recon', 'F1/退库']
  };
  var SHIFT_POOL = ['早班', '中班', '夜班'];

  /* 机台台账 700 台：保留 MTL00011~00022 样例作叙事锚点，其余按型号 × 阶段 × 站点 × 班别分布生成 */
  function genMachines(total) {
    var existing = MACHINES.map(function (m) { return m.sn; });
    var modelByStage = { 'T0': 'Falcon-2', 'TX': 'Falcon-2 Pro', 'TF': 'Falcon-3' };
    var phaseOf = { 'Falcon-2': 'PreEVT', 'Falcon-2 Pro': 'EVT', 'Falcon-3': 'DVT' };
    for (var i = 1; i <= total; i++) {
      var sn = 'MTL' + pad5(i);
      if (existing.indexOf(sn) >= 0) continue;
      var r = rand(i, 11);
      var stage = r < 0.48 ? 'T0' : (r < 0.80 ? 'TX' : 'TF');
      var model = modelByStage[stage];
      var pool = STATION_POOL[stage];
      MACHINES.push({
        sn: sn, model: model, phase: phaseOf[model], product: 'Project Nova',
        stage: stage, station: pool[i % pool.length],
        shift: SHIFT_POOL[i % 3], date: '09-' + pad2(15 + (i % 3)),
        status: 'confirmed'
      });
    }
    return MACHINES;
  }

  /* 各阶段 × 状态 → 站点（与 TRAVEL_SHEETS 现有样例口径一致） */
  var SHEET_STATION = {
    'T0': { cosmetic: 'Cosmetic', photo: 'Photo Review', miniline: 'Mini line', review: 'Photo Review', recon: 'Report/Recon', testcenter: 'Test Center', 'done-no-tx': 'Report/Recon', done: 'F1/退库' },
    'TX': { testcenter: 'Test Center', cosmetic: 'Cosmetic', photo: 'Photo Station', miniline: 'Mini line', review: 'Photo Station', recon: 'Report/Recon', done: 'F1/退库', 'done-no-tx': 'Report/Recon' },
    'TF': { testcenter: 'Test Center', cosmetic: 'Cosmetic', photo: 'Photo Station', miniline: 'Mini line', review: 'Photo Station', recon: 'Report/Recon', done: 'F1/退库', 'done-no-tx': 'Report/Recon' }
  };
  var STATUS_CN_SEED = { cosmetic: '外观目检', photo: '拍照打勾', miniline: 'Mini line 工站', review: '照片复核', recon: 'Report/Recon', testcenter: 'Test Center', done: '已退库', 'done-no-tx': '已完成·待投TX' };
  function defIdOf(stage, role) {
    return STATION_DEFS.filter(function (d) { return d.stage === stage && d.role === role && d.status !== 'obsolete'; })[0];
  }

  /* 台账扩充：机台 700 台对应用例一致的流转子集（含各环节在建机台 + 少量终态样例）。
     · 已到 report/recon 环节的机台已在早期环节上传过人工交接物（ART_STATION 等），
       否则「节点严格执行」放行检查会在演示里卡死、无路可走。 */
  function genTravelSheets() {
    var used = {};
    TRAVEL_SHEETS.forEach(function (t) { used[t.sn] = 1; });
    var plan = [
      ['T0', 'cosmetic', 6],  ['T0', 'photo', 4],  ['T0', 'miniline', 3], ['T0', 'review', 3], ['T0', 'recon', 2], ['T0', 'testcenter', 1],
      ['TX', 'testcenter', 3], ['TX', 'cosmetic', 2], ['TX', 'photo', 2], ['TX', 'miniline', 2], ['TX', 'review', 2], ['TX', 'recon', 2], ['TX', 'done-no-tx', 1],
      ['TF', 'testcenter', 2], ['TF', 'cosmetic', 1], ['TF', 'photo', 1], ['TF', 'miniline', 1], ['TF', 'review', 1], ['TF', 'recon', 1], ['TF', 'done', 2]
    ];
    var seqId = 100;
    plan.forEach(function (row) {
      var stage = row[0], status = row[1], count = row[2];
      var cands = MACHINES.filter(function (m) { return m.stage === stage && !used[m.sn]; });
      for (var k = 0; k < count && k < cands.length; k++) {
        var m = cands[k];
        used[m.sn] = 1;
        seqId++;
        var sh = {
          id: 'TST-' + pad4(seqId), sn: m.sn, stage: stage, status: status,
          station: SHEET_STATION[stage][status],
          model: m.model, phase: m.phase,
          clean: false, weight: '—', fxIssue: [], photos: { normal: 0, abnormal: 0 }, reviewer: null, sign: null,
          timeline: [{ t: m.date + ' 08:40', who: 'f1', node: '系统入账 · ' + STATUS_CN_SEED[status] }]
        };
        /* 人工交接物补登记：报告/Recon 环节需上游「工站数据」已上传；TX 起始 Test Center 环节需 FA 裁决已落 */
        if (status === 'recon') {
          var ml = defIdOf(stage, 'miniline');
          if (ml) ART_UPLOADS.push({ id: 'UP-' + pad4(ART_UPLOADS.length + 1), sn: m.sn, def: ml.id, art: 'ART_STATION', file: '\\\\nas\\wxqc\\station\\Summary\\' + m.sn + '.xlsx', by: 'frank', at: m.date + ' 17:30' });
        }
        if (stage === 'TX' && status === 'testcenter') {
          ART_UPLOADS.push({ id: 'UP-' + pad4(ART_UPLOADS.length + 1), sn: m.sn, def: defIdOf('TX', 'fa').id, art: 'ART_FA', file: '\\\\nas\\wxqc\\fa\\' + m.sn + '.doc', by: 'kevin', at: m.date + ' 21:10' });
        }
        TRAVEL_SHEETS.push(sh);
      }
    });
    return TRAVEL_SHEETS;
  }

  /* 批次 × 机台扩充：把生成的在建机台补充进进行中批次（T0 进 B-0921-02，T0/TX 进 B-0917-01），
     批次 machineCount 按实际行数回写，口径与实际清单一致。 */
  function genBatchRows() {
    var c0917 = BATCH_MACHINES.filter(function (r) { return r.batchId === 'B-0917-01'; }).length;
    var c0921 = BATCH_MACHINES.filter(function (r) { return r.batchId === 'B-0921-02'; }).length;
    TRAVEL_SHEETS.forEach(function (t) {
      var n = parseInt(t.sn.replace('MTL', ''), 10);
      if (n <= 22) return;
      if (BATCH_MACHINES.some(function (r) { return r.sn === t.sn; })) return;
      if (t.stage === 'T0' && c0921 < 26) { BATCH_MACHINES.push({ batchId: 'B-0921-02', sn: t.sn, runType: 'fresh', stage: 'T0', status: t.status, conclusion: '—' }); c0921++; return; }
      if ((t.stage === 'T0' || t.stage === 'TX') && c0917 < 30) { BATCH_MACHINES.push({ batchId: 'B-0917-01', sn: t.sn, runType: 'fresh', stage: t.stage, status: t.status, conclusion: '—' }); c0917++; }
    });
    TEST_BATCHES.forEach(function (b) {
      b.machineCount = BATCH_MACHINES.filter(function (r) { return r.batchId === b.id; }).length;
    });
  }

  /* 设备看板 28 台：保留 3 台样例，另按类分布补 25 台（温湿度箱 / 循环箱 / 电源），在线·离线·运行中混合 */
  var DEVICE_KIND = [
    { type: 'env',   n: 10, base: 'T-Center 温湿度箱', loc: 'Env 室',   endpoint: 'env'   },
    { type: 'cycle', n: 8,  base: '温湿度循环箱',     loc: 'Cycle 室', endpoint: 'cycle' },
    { type: 'power', n: 7,  base: 'Charging 电源',    loc: '充电架',   endpoint: 'charge' }
  ];
  var LETTER = ['A','B','C','D','E','F','G','H','I','J'];
  function genDevices(total) {
    var idx = DEVICES.length + 1;
    DEVICE_KIND.forEach(function (g) {
      for (var i = 0; i < g.n && DEVICES.length < total; i++) {
        var online = !(idx % 7 === 0);
        var running = online && g.type !== 'power' && (idx % 3 === 0);
        var d = {
          id: 'dv-' + g.endpoint + '-' + pad2(idx),
          name: g.base + ' ' + LETTER[i],
          type: g.type, location: 'Test Center · ' + g.loc + ' ' + LETTER[i],
          endpoint: 'https://' + g.endpoint + '-' + pad2(idx) + '.internal/api/v1',
          capabilities: g.type === 'power'
            ? ['setOn', 'setOff']
            : ['setTemp', 'setHum', 'setRunDuration', 'startRun', 'stopRun'],
          status: online ? 'online' : 'offline',
          reading: g.type === 'power' ? { volt: 5.0 } : { temp: +(15 + rand(idx, 21) * 30).toFixed(1), hum: +(35 + rand(idx, 22) * 45).toFixed(1) },
          running: running, runSeconds: running ? (idx * 137) % 86400 : 0,
          targetTemp: g.type === 'power' ? null : pick([25, 40, 60, 85], idx, 23),
          targetHum: g.type === 'power' ? null : pick([55, 60, 90, 95], idx, 24),
          runDuration: g.type === 'power' ? 0 : pick([1800, 3600, 7200, 14400], idx, 25),
          stopAt: '—'
        };
        DEVICES.push(d);
        idx++;
      }
    });
    return DEVICES;
  }

  /* 演示样例（MTL00011~00022）补人工交接物登记：R2 放行校验要求「当前节点的 manual 输入/输出」需已在
     ART_UPLOADS 登记。典型场景：TX/TF 机台在 Test Center 环节需 ART_FA 单、报告/工站环节需 ART_STATION 单，
     否则演示走到报告/Recon 会被门闩卡死。这里把历史已上传补齐（真实生产里是上游 Upload 记录）。 */
  function genDemoUploads() {
    TRAVEL_SHEETS.forEach(function (t) {
      var n = parseInt(t.sn.replace('MTL', ''), 10);
      if (!(n >= 11 && n <= 22)) return;
      var stage = t.stage;
      var minilineDef = defIdOf(stage, 'miniline');
      if (!minilineDef) return;
      var exists = function (art, def) { return ART_UPLOADS.some(function (u) { return u.sn === t.sn && u.art === art && (!def || u.def === def); }); };
      if (stage !== 'T0' && !exists('ART_FA')) {
        var faDef = defIdOf(stage, 'fa');
        ART_UPLOADS.push({ id: 'UP-' + pad4(ART_UPLOADS.length + 1), sn: t.sn, def: faDef ? faDef.id : 't0-06', art: 'ART_FA', file: '\\\\nas\\wxqc\\fa\\' + t.sn + '.doc', by: 'kevin', at: '09-01 09:11' });
      }
      if ((stage === 'T0' && (t.status === 'recon' || t.status === 'testcenter' || t.status === 'miniline')) ||
          (stage !== 'T0' && !exists('ART_STATION'))) {
        if (!exists('ART_STATION')) {
          ART_UPLOADS.push({ id: 'UP-' + pad4(ART_UPLOADS.length + 1), sn: t.sn, def: minilineDef.id, art: 'ART_STATION', file: '\\\\nas\\wxqc\\station\\Summary\\' + t.sn + '.xlsx', by: 'frank', at: '09-01 17:31' });
        }
      }
    });
  }

  /* 一键生成演示规模：机台 700 / 台账流转子集 / 批次行 / 设备 28，随后复算派生指标与阶段城结果。
     返回值 = LAB 本体（服务端写 demo.json / 一键重置用）。 */
  function buildSeed() {
    genDemoUploads();
    genMachines(700);
    genTravelSheets();
    genBatchRows();
    genDevices(28);
    syncKPI();
    rebuildStageNodeUnits();
    return LAB;
  }

  /* 模块加载即保持基础派生一致（KPI / 阶段城结果），使导出对象始终可用 */
  syncKPI();
  rebuildStageNodeUnits();

  /* 服务端生成 / 重置统一入口 */
  LAB.buildSeed = buildSeed;

  /* 种子导出：浏览器挂 window.LAB；Node（服务端）module.exports，供首次生成 / 重置演示数据 */
  if (typeof window !== 'undefined') { window.LAB = LAB; return; }
  module.exports = LAB;

})(typeof window !== 'undefined' ? window : null);