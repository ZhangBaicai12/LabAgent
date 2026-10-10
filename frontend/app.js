/* ===================================================== * app.js — DQE 实验室 Agent 前端 静态演示（路由 + 视图 + 交互）
 * 权限模型：管理员(admin) / 用户(按岗位进入各自工作台)
 * 视图切换：顶栏身份切换器 + 登录页选择，二者同步驱动侧边栏与数据
 * ============================================================ */
(function (global) {
  'use strict';

  var L = null; /* 数据层：启动时由持久层 /api/data 载入（startApp），不再内联引用 mock 文件 */

  /* ---------------- 工具函数 ---------------- */

  /* HTML 转义 */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 根据 id 找用户 */
  function userById(id) {
    var u = L.USERS.filter(function (x) { return x.id === id; })[0];
    return u || L.USERS[L.USERS.length - 1];
  }

  function userName(id) { return userById(id).name; }

  /* 角色中文名 / 角色站别 / 岗位名称：由数据层 ROLES/POSTS 注册中心派生（数据驱动 RBAC，唯一真源在 data.js） */
  var ROLE_CN = {};
  var ROLE_STATION = {};
  var POST_CN = {};
  function roleById(id) {
    return (L.ROLES || []).filter(function (r) { return r.id === id; })[0] || null;
  }
  function rebuildRoles() {
    ROLE_CN = {};
    ROLE_STATION = {};
    POST_CN = {};
    (L.ROLES || []).forEach(function (r) {
      ROLE_CN[r.id] = r.name;
      ROLE_STATION[r.id] = r.station;
    });
    (L.POSTS || []).forEach(function (p) {
      POST_CN[p.code] = p.name;
    });
  }

  /* ---------------- 用户多角色 / 多岗位派生（对齐 RuoYi sys_user ↔ role/post 多对多） ----------------
     USERS 已改为 roleIds[]/postIds[]：权限取所有角色并集，岗位仅作展示与归组。
     primaryRole = roleIds[0]（首个角色为主岗位，驱动作业站别与 jobLabel 等存量单键逻辑）。 */
  function roleIdsOf(u) { return (u && u.roleIds) || []; }
  function primaryRole(u) { return roleIdsOf(u)[0] || null; }
  function hasRole(u, r) { return roleIdsOf(u).indexOf(r) >= 0; }
  function roleNameOf(u) {
    var r = primaryRole(u);
    return r ? (ROLE_CN[r] || r) : '';
  }
  function roleStationOf(u) { var r = primaryRole(u); return r ? (ROLE_STATION[r] || '') : ''; }
  function postNamesOf(u) { return (u.postIds || []).map(function (p) { return POST_CN[p] || p; }).join(' / '); }

  /* ---------------- 菜单树派生（对齐 RuoYi sys_menu M/C/F） ----------------
     MENUS 为扁平数组 + parent 构成树：
       M=目录（侧边栏折叠分组）、C=菜单（路由页，key=路由）、F=按钮（权限字符 perms）。
     menuTree()      → M→C 树（侧边栏用，F 不入）；
     menuTreeFull()  → M→C→F 全树（角色授权勾选用）；
     menuNode(key)   → 单节点查找。 */
  function menuNode(key) {
    return (L.MENUS || []).filter(function (m) { return m.key === key; })[0] || null;
  }
  function menuChildren(parentKey, withF) {
    return (L.MENUS || []).filter(function (m) {
      return m.parent === parentKey && (withF || m.type !== 'F');
    }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
  }
  /* 菜单树级联：子孙 key 集 / 祖先 key 链（角色授权勾选级联用） */
  function menuDescendants(key) {
    var out = [];
    menuChildren(key, true).forEach(function (k) {
      out.push(k.key);
      out = out.concat(menuDescendants(k.key));
    });
    return out;
  }
  function menuAncestors(key) {
    var out = [];
    var n = menuNode(key);
    while (n && n.parent) { out.push(n.parent); n = menuNode(n.parent); }
    return out;
  }
  function menuTree(withF) {
    var roots = (L.MENUS || []).filter(function (m) { return !m.parent; })
      .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    function build(m) {
      var kids = menuChildren(m.key, withF);
      if (!kids.length) return m;
      return Object.assign({}, m, { children: kids.map(build) });
    }
    return roots.map(build);
  }
  function menuTreeFull() { return menuTree(true); }
  /* 用户所有 active 角色 menus 的并集（含 '*' = 全部） */
  function userMenuKeys(u) {
    var out = [];
    roleIdsOf(u).forEach(function (rid) {
      var r = roleById(rid);
      if (!r || r.status !== 'active') return;
      (r.menus || []).forEach(function (k) {
        if (out.indexOf(k) < 0) out.push(k);
      });
    });
    return out;
  }
  /* 角色集授权可见的 M/C 菜单（侧边栏/工作台快捷入口用），按 MENUS 注册顺序输出 */
  function authorizedMenus(roleIds) {
    var keys = [];
    roleIds.forEach(function (rid) {
      var r = roleById(rid);
      if (!r || r.status !== 'active') return;
      if ((r.menus || []).indexOf('*') >= 0) { keys = ['*']; return; }
      (r.menus || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    });
    if (keys.indexOf('*') >= 0) {
      return (L.MENUS || []).filter(function (m) { return m.type === 'C'; });
    }
    return (L.MENUS || []).filter(function (m) {
      return m.type === 'C' && keys.indexOf(m.key) >= 0;
    });
  }
  /* 角色集授权的侧边栏树（M→C）：仅保留有可见 C 子节点的目录；顶级 C 保留 */
  function authorizedMenuTree(roleIds) {
    var keys = [];
    roleIds.forEach(function (rid) {
      var r = roleById(rid);
      if (!r || r.status !== 'active') return;
      if ((r.menus || []).indexOf('*') >= 0) { keys = ['*']; return; }
      (r.menus || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    });
    function ok(key) { return keys.indexOf('*') >= 0 || keys.indexOf(key) >= 0; }
    return menuTree().map(function (n) {
      if (n.type === 'C') return ok(n.key) ? n : null;
      var kids = (n.children || []).filter(function (c) { return ok(c.key); });
      return kids.length ? Object.assign({}, n, { children: kids }) : null;
    }).filter(Boolean);
  }
  /* 数据权限取值 -> 中文（RuoYi data_scope） */
  function dataScopeLabel(s) {
    return { '1': '全部数据', '2': '自定义部门', '3': '本部门', '4': '本部门及以下', '5': '仅本人' }[s] || s;
  }

  /* ---------------- SVG 图标 ---------------- */
  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    clipboard: '<path d="M9 3h6v3H9z"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 11h6M9 15h6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    camera: '<path d="M3 8l3.5-2h4l3.5 2H21v11H3z"/><circle cx="12" cy="13" r="3.4"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h.01M12 12h.01M17 12h.01"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    scale: '<path d="M12 3v18M7 21h10M12 7l-4 7 4-2 4 2z"/><path d="M3 6h18"/>',
    package: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    flask: '<path d="M10 3v5L4 19a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 19L14 8V3"/><path d="M8 3h8M9 13h6"/>',
    tool: '<path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6 6.4 21l5.7-5.7a4.5 4.5 0 0 0 5.6-6l-3.1 3.1-2.8-.6-.6-2.8z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v-4M12 15V7M17 15v-6"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pulse: '<path d="M3 12h4l2.5-7 4 14 2.5-7h5"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.5a3.2 3.2 0 0 1 0 5M17.5 20a6.5 6.5 0 0 0-2.8-5.4"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.6-3.6"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6"/><path d="M20 4v7h-7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    doc: '<path d="M8 8h8M8 12h8M8 16h5"/><rect x="4" y="3" width="16" height="18" rx="2"/>',
    filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    tag: '<path d="M3 3h8.5L21 12.5 12.5 21 3 11.5z"/><circle cx="8" cy="8" r="1.5"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    folder: '<path d="M4 4h6l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    chevRight: '<path d="M9 6l6 6-6 6"/>',
    bot: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 7V4M9 4h6"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M2 13h2M20 13h2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };

  function icon(name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------------- 集中字典（一处修改，多处生效） ---------------- */
  function dictById(id) {
    return (L.DICTS || []).filter(function (d) { return d.id === id; })[0] || null;
  }
  function dictOpts(id) {
    var d = dictById(id);
    return d ? d.options : [];
  }
  function taskLabel(key) {
    var o = dictOpts('task_type').filter(function (x) { return x.key === key; })[0];
    return o ? o.label : key;
  }
  /* 节点任务点 chips（由 DICTS.task_type 生成） */
  function taskChipsHtml(d) {
    if (!d || !(d.tasks || []).length) return '<span class="small faint">未配置任务</span>';
    return (d.tasks || []).map(function (k) {
      return '<span class="task-chip">' + esc(taskLabel(k)) + '</span>';
    }).join('');
  }
  /* 子节点可见性：仅负责人本人（含委托代理），管理员 / F1 审核员可见全部 */
  function subVisible(sub) {
    if (!sub) return false;
    if (state.mode === 'admin') return true;
    var cu = currentUser();
    if (cu && (hasRole(cu, 'reviewer') || hasRole(cu, 'admin'))) return true;
    return effId(sub.owner) === state.userId;
  }
  /* 作业类型标注：区分 Cosmetic（外观作业）与 Mini line（工站测试作业）等，Travel Sheet 按此呈现不同作业视图 */
  function roleJobLabel(role) {
    return { cosmetic: '外观作业', photo: '拍照作业', review: '复核作业', report: '报告作业',
      miniline: '工站测试作业', testcenter: '环境 / 机械测试', fa: '退库作业' }[role] || '作业';
  }

  /* ---------------- 全局状态 ---------------- */
  /* 身份存 localStorage：刷新后保留所选角色（演示态无后端会话） */
  var SESSION_KEY = 'lab.session';

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && s.mode === 'admin') { L.SESSION.mode = 'admin'; return; }
      if (s && s.mode === 'user' && userById(s.userId)) {
        L.SESSION.mode = 'user';
        L.SESSION.userId = s.userId;
      }
    } catch (err) {}
  }

  function saveSession() {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ mode: state.mode, userId: state.userId })); } catch (err) {}
  }

  var state = { mode: 'user', userId: 'bole' }; /* 会话状态：startApp() 载入数据后初始化（L.SESSION + localStorage） */

  /* ---------------- 数据持久化（R1）：任何数据改动 → 防抖全量快照 → POST /api/save ---------------- */
  var DIRTY = false;           /* 有待保存的改动 */
  var DIRTY_SUPPRESS = 0;      /* 设备计时器等高频变化期间的抑制计数（退出时统一落盘） */
  var SAVE_EL = null;          /* 顶栏保存状态指示元素（renderTopbar 时挂上） */
  var SAVE_T = null;
  var SAVE_UI = 'saved';       /* saved | pending | error */
  var SAVE_LAST_NOTE = '';
  function setSaveUI(s) {
    SAVE_UI = s;
    if (!SAVE_EL) return;
    SAVE_EL.textContent = s === 'saved' ? '已保存' : (s === 'pending' ? '保存中…' : '保存失败，稍后重试');
    SAVE_EL.className = 'save-chip ' + s;
  }
  function commit() {
    DIRTY = true;
    if (DIRTY_SUPPRESS) return;          /* 抑制期只置脏，退出路由 / 卸载时统一落盘 */
    if (SAVE_T) clearTimeout(SAVE_T);
    SAVE_T = setTimeout(saveNow, 300);   /* 300ms 防抖：批量操作只写盘一次 */
  }
  function saveNow() {
    if (!DIRTY) return;
    if (DIRTY_SUPPRESS) return;
    DIRTY = false;
    setSaveUI('pending');
    var payload = JSON.stringify(L);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lab.agent.data', payload);
        setSaveUI('saved');
        return;
      }
    } catch (err) {}
    if (typeof fetch === 'function') {
      fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
        .then(function (r) {
          if (!r.ok) { DIRTY = true; setSaveUI('error'); return; }
          setSaveUI('saved');
        })
        .catch(function () { DIRTY = true; setSaveUI('error'); });
    } else {
      setSaveUI('saved');
    }
  }
  function flushNow() {                     /* 路由切换 / 页面卸载前强制落盘（含抑制期的改动） */
    if (!DIRTY) return;
    if (SAVE_T) { clearTimeout(SAVE_T); SAVE_T = null; }
    if (DIRTY_SUPPRESS) {
      var raw = JSON.stringify(L);
      try {
        if (typeof localStorage !== 'undefined') { localStorage.setItem('lab.agent.data', raw); return; }
        if (typeof fetch === 'function') fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw, keepalive: true });
      } catch (err) {}
    } else {
      saveNow();
    }
  }

  /* 深度代理：把载入的演示数据包裹成「改动即上报」的监控层。
     数组 push/splice/下标写入、对象属性赋值、delete 都会触发 commit()；
     JSON.stringify 走 get 透传，保存全量快照正常。 */
  function proxify(obj, onMutate, seen) {
    if (obj === null || typeof obj !== 'object') return obj;
    seen = seen || new WeakMap();
    if (seen.has(obj)) return seen.get(obj);
    if (typeof obj === 'function') return obj;   /* 函数不代理（如 app 侧注入的 rebuildDefs） */
    var prox = new Proxy(obj, {
      get: function (t, k) {
        var v = Reflect.get(t, k);
        if (v === null || typeof v !== 'object' || typeof v === 'function') return v;
        return proxify(v, onMutate, seen);
      },
      set: function (t, k, v) {
        var r = Reflect.set(t, k, v);
        if (r) onMutate();
        return r;
      },
      deleteProperty: function (t, k) {
        var r = Reflect.deleteProperty(t, k);
        if (r) onMutate();
        return r;
      }
    });
    seen.set(obj, prox);
    return prox;
  }

  /* app 侧 rebuildDefs：SEED 里的版本在 JSON 序列化中丢失（函数不参与存档），
     浏览器端用同一逻辑基于 L 原地重建 WORKFLOW_FLOWS / TS_NODES（引用即时一致）。 */
  function rebuildDefs() {
    var byId = {};
    L.STATION_DEFS.forEach(function (d) { byId[d.id] = d; });
    var next = (L.FLOW_TEMPLATES || []).map(function (t) {
      return {
        key: t.key, flow: t.name, ver: t.ver, status: t.status, releasedVer: t.releasedVer,
        nodes: (t.nodes || []).map(function (id) { return byId[id]; })
          .filter(function (x) { return x && x.ver && x.status !== 'obsolete'; })
      };
    });
    L.WORKFLOW_FLOWS.length = 0;
    next.forEach(function (f) { L.WORKFLOW_FLOWS.push(f); });
    L.TS_NODES.length = 0;
    var first = L.WORKFLOW_FLOWS[0];
    if (!first) return;
    first.nodes.slice(0, 5).forEach(function (d, i) {
      L.TS_NODES.push({ node: i + 1, name: d.name, role: d.owner, action: d.action });
    });
  }

  /* 启动：从持久层载入数据 → 重建角色/权限/会话 → 深度代理挂脏标记 → 初始化界面 */
  function startApp(data) {
    try {
      if (typeof localStorage !== 'undefined') {
        var cached = localStorage.getItem('lab.agent.data');
        if (cached) {
          try {
            var c = JSON.parse(cached);
            if (c) {
              data = c;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    data.rebuildDefs = rebuildDefs;      /* 运行时注入（函数不入档，刷新后重新挂） */
    L = proxify(data, commit);
    rebuildRoles();
    rebuildAcl();
    loadSession();
    state.mode = L.SESSION.mode;
    state.userId = L.SESSION.userId;
    init();
  }
  var HUB_COLLAPSED = {}; /* 阶段城墙折叠状态（key=阶段城 ID，跨重绘保留） */

  function currentUser() { return userById(state.userId); }

  /* ---------------- 登录页 ---------------- */
  /* 登录页分组：由 ROLES.group 派生（admin 单独以「系统账号」呈现，不在此分组内；停用角色不显示） */
  function loginGroups() {
    var order = ['一线作业', '测试与质量', '客户', '平台'];
    var map = {};
    (L.ROLES || []).forEach(function (r) {
      if (r.id === 'admin' || r.status !== 'active') return;
      var g = r.group || '未分组';
      (map[g] = map[g] || []).push(r.id);
    });
    return Object.keys(map).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      return ia - ib;
    }).map(function (g) { return { label: g, roles: map[g] }; });
  }

  function viewLogin() {
    var who = function (u) {
      var r = roleNameOf(u);
      return '<div class="check-card" data-login data-uid="' + u.id + '">' +
        '<div class="box">' + icon('check') + '</div>' +
        '<div><div class="cname">' + esc(u.name) + '</div>' +
        '<div class="ccode">' + esc(r) + ' · ' + esc(u.dept) + '</div></div></div>';
    };
    var groups = loginGroups().map(function (g) {
      var cards = g.roles.map(function (r) {
        return L.USERS.filter(function (u) { return hasRole(u, r) && u.status !== 'disabled'; }).map(who).join('');
      }).join('');
      return '<div class="card"><div class="card-head"><h3>' + esc(g.label) + '</h3>' +
        '<div class="meta">以岗位身份进入对应工作台</div></div>' +
        '<div class="check-grid">' + cards + '</div></div>';
    }).join('');

    return '<div class="page">' +
      '<div class="page-head"><div><h2>身份选择（数据与页面切换）</h2>' +
      '<div class="sub">演示：选择不同身份后，侧边栏菜单、工作台数据与可用工具都会随之切换</div></div></div>' +
      '<div class="grid-2">' +
      '<div>' + groups +
      '<div class="sep">系统账号</div>' +
      '<div class="card"><div class="check-grid">' +
      '<div class="check-card" data-login data-uid="' + userById('admin').id + '">' +
      '<div class="box">' + icon('shield') + '</div>' +
      '<div><div class="cname">平台管理员</div><div class="ccode">Admin · 管理控制台</div></div></div>' +
      '</div></div>' +
      '</div>' +
      '<div class="sticky-col"><div class="card"><div class="card-head"><h3>为什么要切换身份？</h3></div>' +
      '<ul class="timeline">' +
      '<li><div class="wn">用户视图：按岗位进工作台</div><div class="act dim">Tammy 填 Travel Sheet、Lucky 拍照打勾、Amy 复核、Bole 对账……每个人只看到自己的待办与工具。</div></li>' +
      '<li><div class="wn">管理员视图：监管三方向</div><div class="act dim">脚本注册中心、Excel 工具库、定时调度、运行监控、表单模板、成员权限，一个界面管全部。</div></li>' +
      '<li><div class="wn">切换入口</div><div class="act dim">登录页选择，或顶栏右侧「身份」下拉随时切换（本演示已保留当前岗位）。</div></li>' +
      '</ul></div></div>' +
      '</div></div>';
  }

  /* ---------------- 工作台（用户通用） ---------------- */

  /* 待办行渲染（mine / queue / alert 三类均可共用） */
  function todoRowHtml(t, isQueue) {
    var depBadge = t.dep ? '<span class="tag-chip bad">代理</span>' : '';
    var queueTag = isQueue ? '<span class="tag-chip on">同岗可接手 · 只读</span>' : '';
    return '<div class="todo-row"><div class="t-ico">' + icon(t.ico) + '</div>' +
      '<div class="t-body"><div class="t-title">' + esc(t.title) + '</div>' +
      '<div class="t-sub">' + esc(t.sub) + '</div></div>' +
      '<div class="meta small dim"' + (isQueue ? ' style="text-align:right"' : '') + '>' +
      depBadge + queueTag + '<br>' + esc(t.meta) + '</div></div>';
  }

  function viewDashboard() {
    var u = currentUser();
    var tasks = myTasks(u.id);
    var kpiArr = [
      { label: '我的待办', value: tasks.mine.length, foot: '按当前责任人聚合', color: '' },
      { label: '告警/卡点', value: tasks.alert.length, foot: '需处置（通知 ≤10min）', color: tasks.alert.length ? 'isRed' : 'isTeal' },
      { label: '同岗可接手', value: tasks.queue.length, foot: '岗位公共队列', color: 'isBlue' },
      { label: '我的机台', value: myMachines(u.id).length, foot: '经手 / 当前负责', color: '' }
    ];
    var kpiHtml = kpiArr.map(function (k) {
      return '<div class="kpi ' + k.color + '"><div class="k-label">' + k.label + '</div>' +
        '<div class="k-value">' + k.value + '</div><div class="k-foot">' + k.foot + '</div></div>';
    }).join('');

    var quick = authorizedMenus(roleIdsOf(u));
    var quickBtns = quick.map(function (m) {
      return '<a class="btn btn-ghost" href="#/' + m.key + '">' + icon(m.icon) + esc(m.name) + '</a>';
    }).join('');

    var mineHtml = tasks.mine.map(function (t) { return todoRowHtml(t); }).join('') ||
      '<div class="small dim" style="padding:10px 2px">当前无指派给你的任务，可看右侧「同岗可接手」。</div>';
    var queueHtml = tasks.queue.map(function (t) { return todoRowHtml(t, true); }).join('') ||
      '<div class="small dim" style="padding:10px 2px">本岗位无他人遗留任务。</div>';
    var alertHtml = tasks.alert.map(function (t) { return todoRowHtml(t); }).join('');

    /* 退回待确认（两段式）：目标环节责任人接收后机台才拨回重做 */
    var retHtml = tasks.ret.map(function (r) {
      return '<div class="todo-row"><div class="t-ico">' + icon('arrow') + '</div>' +
        '<div class="t-body"><div class="t-title">' + esc(r.title) + '</div>' +
        '<div class="t-sub">' + esc(r.sub) + '</div></div>' +
        '<div class="meta small dim" style="text-align:right">' +
        '<span style="display:inline-flex;gap:6px;white-space:nowrap">' +
        '<button class="btn btn-xs btn-primary" data-return-ok data-id="' + esc(r.id) + '">确认接收</button>' +
        '<button class="btn btn-xs btn-ghost" data-return-no data-id="' + esc(r.id) + '">暂不同意</button></span>' +
        '<br>' + esc(r.meta) + '</div></div>';
    }).join('');

    /* 我的机台管线（仅「当前节点归我负责」的机台；全量在「机台流程」页） */
    var mms = myMachines(u.id).filter(function (ts) { return sheetOwner(ts) === u.id; })
      .sort(function (a, b) {
        return STATUS_STAGE[a.status] - STATUS_STAGE[b.status];
      });
    var pipeRows = mms.map(function (ts) {
      var bh = sheetOwner(ts) === u.id && ts.status !== 'done-no-tx' ? 'on' : (ts.status === 'done-no-tx' ? 'bad' : 'info');
      return '<div class="card mt-4"><div class="card-head"><h3>' + esc(ts.sn) +
        ' <span class="tag-chip">' + esc(ts.stage) + '</span>' +
        '<span class="badge-pill ' + bh + '">' + esc(statusCN(ts.status)) + '</span></h3>' +
        '<div class="meta">当前责任人：' + esc(whoName(sheetOwner(ts))) +
        (sheetOwner(ts) === u.id ? ' · <b class="t-accent">我</b>' : '') + '</div></div>' +
        flowBar(ts) + '</div>';
    }).join('');

    return '<div class="page">' +
      '<div class="page-head"><div><h2>' + esc(u.name) + ' · 工作台</h2>' +
      '<div class="sub">' + esc(postNamesOf(u)) + ' / ' + esc(u.dept) + '　—　任务按「当前责任人」归属，请假委托自动改派；同岗他人任务为只读队列，不得越权操作</div></div>' +
      '<div class="acts"><a class="btn" href="#/login">' + icon('users') + '切换身份</a>' +
      '<button class="btn btn-primary" data-goto-admin>' + icon('shield') + '进入管理员视图</button></div></div>' +

      '<div class="kpi-row">' + kpiHtml + '</div>' +

      '<div class="grid-2">' +
      '<div class="card"><div class="card-head"><h3>我的待办</h3><div class="meta">' + tasks.mine.length + ' 项 · 按人聚合</div></div>' +
      mineHtml +
      (retHtml ? '<div class="sep">退回待确认（目标环节接收）</div>' + retHtml : '') +
      (alertHtml ? '<div class="sep">告警 / 卡点</div>' + alertHtml : '') +
      '</div>' +
      '<div class="sticky-col">' +
      '<div class="card"><div class="card-head"><h3>同岗可接手</h3><div class="meta">只读 · ' + tasks.queue.length + ' 项（原责任人转交/委托后才入你的待办）</div></div>' +
      queueHtml + '</div>' +
      '<div class="card mt-4"><div class="card-head"><h3>快捷入口</h3></div><div style="display:flex;flex-direction:column;gap:8px">' + quickBtns + '</div></div>' +
      '</div></div>' +

      (mms.length ? '<div class="card mt-4"><div class="card-head"><h3>当前归我负责的机台 · 全流程管线</h3>' +
        '<div class="meta">进仓 → 目检 → 拍照 → 复核 → Mini line → 报告 → Test Center → 退库；<a href="#/travel-sheet" style="color:var(--accent)">进入节点作业 →</a></div></div>' + pipeRows + '</div>' : '') +
      '</div>';
  }

  function statusOfCtms(s) {
    var m = {
      submitted: '待签收', assigned: '指派中', sampling: '送样中',
      ready: '就绪', scanning: '扫描中', modeling: '模型重构', closed: '结案'
    };
    return m[s] || s;
  }

  /* ---------------- 方向①：Travel Sheet 数据驱动（Tammy） ---------------- */
  var FORM_STATE = { sn: 'MTL00011', fx: [], signed: false, notes: [], stationOnly: false, stageF: 'all' };

  /* Mini line 工站 Excel 导入（模拟）：{ sn: { file, at, stations[] } }
     —— 在节点作业 Mini line 页「上传 Excel」后写入，解析出的工站结果同步流到报告纸（#/report）。 */
  var MINI_IMPORT = {};


  /* 台账当前记录（从 TRAVEL_SHEETS 读取，保证页面与数据同步） */
  function tsCurrent() {
    return L.TRAVEL_SHEETS.filter(function (x) { return x.sn === FORM_STATE.sn; })[0] || L.TRAVEL_SHEETS[0];
  }

  /* --------- 提交后自动派发（配置驱动）：以工具库 hook 字段（EXCEL_TOOLS）为唯一真源 ---------
   *   作业定义挂接的工具，其 hook = 提交后自动写出的「交接物」（ARTIFACTS.id，如报告台账 / Recon 数据包 /
   *   拍照任务）；'check'（目检查重）只打角标不派发。交接物登记与节点 inputs/outputs 一起，构成
   *   作业设定中心的节点间传输链路（见 validateArtifacts）。 */
  /* 终态（已完测 / 待客户退库）没有对应的作业节点，不再参与定位与提交派发 */
  function isTerminalStatus(s) { return s === 'done' || s === 'done-no-tx'; }

  /* 环节定位：stage + status → 该阶段生效节点定义（按 role 匹配 SSOT 字段，不按节点名关键词） */
  function defForStageStatus(stage, status, needVer) {
    var r = STATUS_ROLE[status];
    if (!r) return null;
    var pool = L.STATION_DEFS.filter(function (d) {
      return d.stage === stage && d.role === r && d.status === 'eff' && (!needVer || d.ver);
    });
    return pool[0] || null;
  }

  /* 本机该阶段当前环节对应的作业定义 */
  function defForSubmit(ts) {
    if (isTerminalStatus(ts.status)) return null;
    return defForStageStatus(ts.stage, ts.status, true);
  }

  /* ---------------- R2 节点严格执行：推进序 / 放行校验 / 整批门闩 ----------------
     推进序不再由手工表 TS_NEXT 决定，改为按 STATION_DEFS 内已发布节点顺序派生：
     T0  = 外观→拍照→工站→复核→报告/Recon→TestCenter→完成（投 TX）
     TX/TF = TestCenter→外观→拍照→工站→复核→报告/Recon→完成（退库）
     status→role 与 STATION_DEFS 顺序均为 SSOT，改定义即改流程。 */
  var STAGE_SEQ = null;
  function stageSeqOf(stage) {
    if (!STAGE_SEQ) {
      STAGE_SEQ = {};
      var roleToStatus = {};
      Object.keys(STATUS_ROLE).forEach(function (s) { roleToStatus[STATUS_ROLE[s]] = s; });
      var m = {};
      L.STATION_DEFS.forEach(function (d) {
        if (d.status !== 'eff' || !d.ver) return;
        var s = roleToStatus[d.role];
        if (!s || isTerminalStatus(s)) return;
        (m[d.stage] = m[d.stage] || []).push(s);
      });
      Object.keys(m).forEach(function (k) {
        var u = [];
        m[k].forEach(function (s) { if (u[u.length - 1] !== s) u.push(s); });
        m[k] = u;
      });
      STAGE_SEQ = m;
    }
    return STAGE_SEQ[stage] || [];
  }
  /* 本机状态的下一个流转步骤：状态不在本阶段预设序 → null（严格不自动推进） */
  function nextTsStep(ts) {
    if (isTerminalStatus(ts.status)) return null;
    var seq = stageSeqOf(ts.stage);
    var i = seq.indexOf(ts.status);
    if (i < 0) return null;
    if (i === seq.length - 1)
      return { next: 'done', tip: '完成 · ' + (ts.stage === 'T0' ? '待投 TX' : '待退库') + '（终态）' };
    var to = seq[i + 1];
    var label = statusCN(to);
    var ownerD = L.STATION_DEFS.filter(function (x) { return x.role === STATUS_ROLE[to] && x.status === 'eff' && x.owner; })[0];
    return { next: to, tip: label + ' → ' + (ownerD ? whoName(ownerD.owner) : '下一环节') };
  }
  function nextTsHint(ts) {
    var n = nextTsStep(ts);
    return n ? n.tip : (isTerminalStatus(ts.status) ? '本机已到终态' : '待客户批复（20hr 阈值监测中）');
  }

  /* 节点任务清单（R2 检查表）：勾选进度按 机台×节点 停在 TS 数据里，刷新/持久化不丢 */
  function tsChecklist(ts, defId) {
    if (!ts.nodeDone) ts.nodeDone = {};
    if (!ts.nodeDone[defId]) ts.nodeDone[defId] = [];
    return ts.nodeDone[defId];
  }
  function tsTaskDone(ts, def, task) {
    return tsChecklist(ts, def.id).indexOf(task) >= 0;
  }
  function taskLabel(task) {
    var m = { upload: '上传/登记数据', process: '处理核对', confirm: '确认签署', analyze: '分析复核', audit: '目视复核' };
    return m[task] || task;
  }

  /* 节点放行缺失检（提交时阻塞用）：检查表未勾满 + 人工类交接物未登记。auto 产物不阻塞（由上交工具自动写）。 */
  function nodeReleaseMissing(ts, d) {
    var missing = [];
    if (!d) return missing;
    var tasks = d.tasks || [];
    if (tasks.length) {
      var done = tsChecklist(ts, d.id);
      tasks.filter(function (t) { return done.indexOf(t) < 0; })
        .forEach(function (t) { missing.push('检查表未勾选：' + taskLabel(t)); });
    }
    (d.inputs || []).forEach(function (a) {
      var ai = artInfo(a);
      if (ai && ai.kind === 'manual' && !uploadFor(ts.sn, a)) missing.push('上游交接物缺失：' + ai.name);
    });
    (d.outputs || []).forEach(function (a) {
      var ai = artInfo(a);
      if (ai && ai.kind === 'manual' && !uploadFor(ts.sn, a, d.id)) missing.push('本节点交接物未上传：' + ai.name);
    });
    return missing;
  }

  /* 整批门闩：判断持机台是否受批次次序约束。批内同阶段在制机台的进度差 ≥1 个环节时，
     leader 会永远踩在批门终点等尾巴——这里把「批内落后机台」列出来并冻结提交（等齐子批再走）。 */
  var BATCH_ADVANCE_NODES = ['t0-03', 'tx-04', 'tf-04', 't0-05', 'tx-06', 'tf-06'];
  function batchGateBlock(ts, d) {
    if (!d || BATCH_ADVANCE_NODES.indexOf(d.id) < 0) return [];
    var rows = machineBatches(ts.sn);
    if (!rows.length) return [];
    var lag = [];
    rows.forEach(function (row) {
      batchMachinesOf(row.batchId).forEach(function (r) {
        if (r.sn === ts.sn) return;
        var twin = L.TRAVEL_SHEETS.filter(function (t) { return t.sn === r.sn; })[0];
        if (!twin || twin.stage !== ts.stage) return;
        var a = stageSeqOf(ts.stage);
        var ia = a.indexOf(ts.status), ib = a.indexOf(twin.status);
        if (ia >= 0 && ib >= 0 && ib < ia) lag.push({ sn: r.sn, at: twin.status, isPair: true });
      });
    });
    if (!lag.length) return [];
    var uniq = [], seen = {};
    lag.forEach(function (x) { if (!seen[x.sn]) { seen[x.sn] = 1; uniq.push(x); } });
    return uniq;
  }
  /* 该定义挂接工具 → 自动派发的交接物清单（去重；'check' 不入列） */
  function submitHooks(ts) {
    return defHooks(defForSubmit(ts));
  }
  /* 定义按挂接工具解析出的派发交接物清单（rely on tool.hook → ARTIFACTS.id） */
  function defHooks(d) {
    var seen = {}, out = [];
    if (d) (d.tools || []).forEach(function (t) {
      var tool = L.EXCEL_TOOLS.filter(function (x) { return x.key === t; })[0];
      var h = tool && tool.hook;
      if (h && h !== 'check' && !seen[h]) { seen[h] = 1; out.push(h); }
    });
    return out;
  }
  /* 交接物元数据（登记中心） */
  function artInfo(aid) {
    return L.ARTIFACTS.filter(function (a) { return a.id === aid; })[0];
  }
  /* 链条位置（阶段顺序优先，城内按数组顺序）：用于判定「产出节点是否在其消费节点上游」 */
  function chainPos(d) {
    var si = L.STAGES.map(function (s) { return s.id; }).indexOf(d.stage);
    return (si < 0 ? 99 : si) * 100 + L.STATION_DEFS.indexOf(d);
  }
  /* 交接物链路校验（纯函数）：
     error = 引用了未登记 / 没人产出 / 产出在其后（跨链、错序）的交接物；
     warn  = 出版物无下游消费（孤儿） / 挂接工具自动写出但未声明为该节点 outputs */
  function validateArtifacts() {
    var errs = [], warns = [];
    L.STATION_DEFS.forEach(function (d) {
      (d.inputs || []).forEach(function (a) {
        if (!artInfo(a)) { errs.push({ id: d.id, what: '引用未登记的交接物 ' + a, lvl: 'err' }); return; }
        var producers = L.STATION_DEFS.filter(function (p) { return p !== d && (p.outputs || []).indexOf(a) >= 0; });
        if (!producers.length) { errs.push({ id: d.id, what: '依赖 ' + a + '，但没有任何节点产出它', lvl: 'err' }); return; }
        if (!producers.some(function (p) { return chainPos(p) < chainPos(d); }))
          errs.push({ id: d.id, what: '依赖 ' + a + '，但其产出节点不在本节点上游（跨链 / 错序）', lvl: 'err' });
      });
      (d.outputs || []).forEach(function (a) {
        if (!artInfo(a)) return;
        if (!L.STATION_DEFS.some(function (c) { return c !== d && (c.inputs || []).indexOf(a) >= 0; }))
          warns.push({ id: d.id, what: '产出 ' + a + ' 全链无人消费（孤儿产物）', lvl: 'warn' });
      });
      defHooks(d).forEach(function (a) {
        if ((d.outputs || []).indexOf(a) < 0)
          warns.push({ id: d.id, what: '挂接工具会自动写出 ' + a + '，但未声明为该节点 outputs', lvl: 'warn' });
      });
    });
    return { errs: errs, warns: warns };
  }
  /* 页面顶部交接物链路摘要行 */
  function artCheckLine() {
    var v = validateArtifacts();
    if (v.errs.length) return '<span class="tag-chip warn">交接断链 ' + v.errs.length + ' 处</span> <span class="small dim">见节点行红色提示，或点「交接物链路校验」看明细</span>';
    var out = '<span class="tag-chip ok">交接物链路完整</span>';
    if (v.warns.length) out += ' <span class="tag-chip warn">' + v.warns.length + ' 条提示</span> <span class="small dim">点「交接物链路校验」查看明细</span>';
    return out;
  }

  /* ---------------- 交接物 · 单机流转态（Travel Sheet 页面用） ----------------
     人工交接物（manual）的「上传」只把 文件名/共享盘路径 记录进 ART_UPLOADS，
     页面据此标记已上传；查看链接跳到对应数据页。 */
  function uploadFor(sn, aid, defId) {
    return L.ART_UPLOADS.filter(function (u) {
      return u.sn === sn && u.art === aid && (!defId || u.def === defId);
    })[0];
  }
  function artVw(aid) {
    var m = { ART_FX: 'travel-sheet', ART_PHOTO: 'photo-review', ART_STATION: 'travel-sheet',
              ART_REPORT: 'report', ART_RECON: 'report', ART_DIFF: 'report', ART_FA: 'travel-sheet' };
    return m[aid] ? '#/' + m[aid] : '#/dashboard';
  }
  /* 当前机台进度下，该交接物数据是否已生成/已上传 */
  function artSnapshot(ts, aid) {
    var sn = ts.sn;
    if (aid === 'ART_FX')
      return (ts.fxIssue.length || ts.timeline.length)
        ? { done: true, label: '已随提交记录' } : { done: false, label: '待目检提交' };
    if (aid === 'ART_REPORT')
      return L.REPORTS.some(function (r) { return r.sn === sn; })
        ? { done: true, label: '报告台账已生成' } : { done: false, label: '待报告节点提交生成' };
    if (aid === 'ART_RECON')
      return L.RECON_PACKS.some(function (p) { return p.sn === sn; })
        ? { done: true, label: 'Recon 数据包已建' } : { done: false, label: '待报告/Recon 提交生成' };
    if (aid === 'ART_PHOTO')
      return L.PHOTO_REVIEWS.some(function (p) { return p.sn === sn; })
        ? { done: true, label: '照片命名/复核已录' } : { done: false, label: '待拍照/复核提交' };
    if (aid === 'ART_DIFF') {
      var both = L.REPORTS.some(function (r) { return r.sn === sn; }) &&
                 L.RECON_PACKS.some(function (p) { return p.sn === sn; });
      return both ? { done: true, label: '差异清单已出（S02）' } : { done: false, label: '待报告/Recon 齐后输出' };
    }
    if (aid === 'ART_STATION' || aid === 'ART_FA') {
      var up = uploadFor(sn, aid);
      return up ? { done: true, label: '已上传 · ' + up.file }
                : { done: false, label: '待上传共享盘目录' };
    }
    return { done: false, label: '待确认' };
  }
  /* 本节点交接物卡（Travel Sheet 右栏）：上游依赖 + 本节点产出，状态实时对齐数据 */
  function nodeArtCard(ts) {
    var d = defForSubmit(ts);
    if (!d) return '<div class="small dim">本环节作业定义未配置交接物（inputs/outputs 空或未发布）。</div>';
    var inR = (d.inputs || []).map(function (a) {
      var ai = artInfo(a);
      var prods = L.STATION_DEFS.filter(function (p) { return p !== d && p.status === 'eff' && (p.outputs || []).indexOf(a) >= 0 && chainPos(p) < chainPos(d); });
      var st = artSnapshot(ts, a);
      var src = prods.length ? prodUrl(prods[prods.length - 1]) : '上游';
      return '<div class="art-row">' +
        '<div class="t-ico">' + icon('folder') + '</div>' +
        '<div class="t-body"><div class="t-title">' + esc((ai && ai.name) || a) +
        ' <span class="faint small mono">' + src + '</span></div>' +
        '<div class="t-sub small">' + esc((ai && ai.format) || '') + ' · ' +
        (ai && ai.kind === 'manual' ? '人工传共享盘' : '提交自动写出') + '</div></div>' +
        '<span class="badge-pill ' + (st.done ? 'ok' : 'warn') + '">' + (st.done ? '已就绪' : '未就绪') + '</span>' +
        '<a class="btn btn-xs btn-ghost" href="' + artVw(a) + '">' + icon('eye') + '查看</a></div>';
    }).join('');
    var outR = (d.outputs || []).map(function (a) {
      var ai = artInfo(a);
      var st = artSnapshot(ts, a);
      var manual = !!(ai && ai.kind === 'manual');
      var up = uploadFor(ts.sn, a);
      var ctrl = manual
        ? '<div class="art-upload">' + (up
            ? '<span class="badge-pill ok">已上传</span><span class="small mono faint">' + esc(up.file) + '</span>'
            : '<input type="text" data-art-upload-file data-a="' + a + '" placeholder="共享盘路径 / 文件名">' +
              '<button type="button" class="btn btn-xs btn-primary" data-art-upload data-a="' + a + '">' + icon('upload') + '上传</button>') +
          '</div>'
        : '<a class="btn btn-xs btn-ghost" href="' + artVw(a) + '">' + icon('eye') +
          (st.done ? '查看已生成' : '提交后自动生成') + '</a>';
      return '<div class="art-row">' +
        '<div class="t-ico">' + icon('upload') + '</div>' +
        '<div class="t-body"><div class="t-title">' + esc((ai && ai.name) || a) +
        ' <span class="faint small">' + (manual ? '人工传文件' : '提交自动写出') + '</span></div>' +
        '<div class="t-sub small">' + esc(ai ? (ai.format + ' · ' + (ai.via || '')) : '') + '</div></div>' +
        '<span class="badge-pill ' + (st.done ? 'ok' : (manual ? 'warn' : 'dim')) + '">' +
        (manual ? (st.done ? '已上传' : '待上传') : (st.done ? '已生成' : '待提交')) + '</span>' + ctrl + '</div>';
    }).join('');
    return '<div class="card-sub small dim">' + esc(d.id + ' ' + d.name) + ' · 作业中心声明的节点间交接物</div>' +
      ((d.inputs || []).length
        ? '<div class="small faint mt-4" style="margin:8px 0 4px">← 上游依赖（验收后自动带入）</div>' + inR : '') +
      ((d.outputs || []).length
        ? '<div class="small faint mt-4" style="margin:12px 0 4px">→ 本节点产出（auto 提交自动写出；manual 上传共享盘）</div>' + outR : '') +
      '<div class="small faint mt-4">交接物与方向在作业设定中心统一声明；auto 产物由挂接工具自动写，manual 产物经上方小窗上报。</div>';
  }
  /* 上游产出来源提示：优先显示最近的同链路人工/自动产出节点 */
  function prodUrl(p) { return p ? p.id + ' ' + p.name : '上游'; }

  /* Travel Sheet 电子表单：动态记录区（演示「填写时新增内容」） */
  var NOTE_ITEMS = ['重量复称', '色差复测', '外观补录', '照片补拍', '其他备注'];
  function notesListHtml() {
    if (!FORM_STATE.notes.length) return '<div class="faint small">尚未新增内容行。选补充项 + 填内容 → 「添加一行」，结构跟随电子表单模板。</div>';
    return FORM_STATE.notes.map(function (n, i) {
      return '<div class="todo-row" style="margin-bottom:6px"><div class="t-ico">' + icon('plus') + '</div>' +
        '<div class="t-body"><div class="t-title">' + esc(n.item) + ' <span class="faint mono small">' + esc(n.t) + '</span></div>' +
        '<div class="t-sub small" style="white-space:pre-wrap">' + esc(n.txt) + '</div></div>' +
        '<button type="button" class="btn btn-xs btn-ghost" data-note-del data-i="' + i + '">撤销</button></div>';
    }).join('');
  }

  /* 台账状态 -> 中文说明 */
  function statusCN(s) {
    var m = {
      cosmetic: '外观目检', photo: '拍照打勾', miniline: 'Mini line 工站', review: '照片复核',
      recon: '报告/Recon', testcenter: 'Test Center',
      'done-no-tx': '已完成·待投TX', 'done': '已完成·退库'
    };
    return m[s] || s;
  }

  /* 取显示名：用户表中存在则用人名，否则原样（外部合作人员如 grant） */
  function whoName(id) {
    if (!id || id === '—') return '—';
    var u = L.USERS.filter(function (x) { return x.id === id; })[0];
    return u ? u.name : String(id);
  }

  /* 当前用户所属站别（由 ROLES[].station 派生）；用于「仅本站点」筛选 */
  function stationOfUser() {
    return roleStationOf(currentUser());
  }
  /* 台账池：全部站点 / 仅查看当前站点需要处理的数据 */
  function tsSheets() {
    if (!FORM_STATE.stationOnly) return L.TRAVEL_SHEETS;
    var st = stationOfUser();
    return L.TRAVEL_SHEETS.filter(function (t) { return t.station === st; });
  }
  /* Travel Sheet 页内再叠加阶段筛选（全部 / T0 / TX / TF，各自工作节点不同） */
  function tsSheetsFor(stageF) {
    var base = tsSheets();
    return stageF === 'all' ? base : base.filter(function (t) { return t.stage === stageF; });
  }
  /* 阶段筛选（下拉选择）：全部 / T0 / TX / TF，带该阶段台账数 */
  function tsStageSeg() {
    var counts = { 'T0': 0, 'TX': 0, 'TF': 0 };
    L.TRAVEL_SHEETS.forEach(function (t) { if (counts[t.stage] != null) counts[t.stage]++; });
    return '<label class="ts-tray">阶段<select data-ts-stage-mode>' +
      '<option value="all"' + (FORM_STATE.stageF === 'all' ? ' selected' : '') + '>全部</option>' +
      ['T0', 'TX', 'TF'].map(function (s) {
        return '<option value="' + s + '"' + (FORM_STATE.stageF === s ? ' selected' : '') + '>' + s + '（' + counts[s] + '）</option>';
      }).join('') +
      '</select></label>';
  }
  /* 该阶段的作业节点（来自 STATION_DEFS SSOT，仅生效定义参与业务；草稿不驱动环节/派发） */
  function tsStageDefs(stage) {
    return L.STATION_DEFS.filter(function (d) { return d.stage === stage && d.status === 'eff'; });
  }
  /* 台账状态 -> 该阶段节点序号（按 role 定位 SSOT 节点定义；终态取末节点） */
  function tsStageDefIndex(stage, status) {
    var defs = tsStageDefs(stage);
    if (!defs.length) return 0;
    if (isTerminalStatus(status)) return defs.length - 1;
    var d = defForStageStatus(stage, status, true);
    var i = d ? defs.indexOf(d) : -1;
    return i < 0 ? 0 : i;
  }
  /* 流程环节条：按当前机台所处阶段渲染对应工作节点，当前节点高亮 */
  function tsFlowNodes(stage, status) {
    var defs = tsStageDefs(stage);
    if (!defs.length) return '<div class="flow-node faint">该阶段暂无节点定义</div>';
    var cur = tsStageDefIndex(stage, status);
    return defs.map(function (d, i) {
      var cls = i < cur ? 'done' : (i === cur ? 'current' : '');
      return '<div class="flow-node ' + cls + '" title="' + esc(d.action || '') + ' · ' + esc(d.dur || '') + '"><span class="fn">' + (i + 1) + '</span>' +
        esc(d.name) + '<span class="faint">·' + esc(whoName(effId(d.owner))) + '</span></div>';
    }).join('<div class="flow-arrow"></div>');
  }
  /* 站点筛选（下拉选择）：全部站点 / 仅本站点，带队列数 */
  function tsStationSeg() {
    var st = stationOfUser();
    var myCount = L.TRAVEL_SHEETS.filter(function (t) { return t.station === st; }).length;
    var label = st ? '仅本站点 · ' + st + '（' + myCount + ' 台）' : '仅本站点';
    return '<label class="ts-tray">站点<select data-ts-station-mode>' +
      '<option value="0"' + (!FORM_STATE.stationOnly ? ' selected' : '') + '>全部站点</option>' +
      '<option value="1"' + (FORM_STATE.stationOnly ? ' selected' : '') + '>' + esc(label) + '</option>' +
      '</select></label>';
  }

  /* =====================================================   * 按人任务 + 全流程管线（人为主、角色兜底）
   * 任务归属 = 默认负责人（可被请假委托改派）；同岗其他人看到公共队列（可接手）
   * ============================================================ */

  /* Travel Sheet 状态 -> 所属岗位（节点的 role 是唯一真源，此处只做 status→role 归并） */
  var STATUS_ROLE = {
    cosmetic: 'cosmetic', photo: 'photo', miniline: 'miniline', review: 'review',
    recon: 'report', 'done-no-tx': 'reviewer', testcenter: 'testcenter', done: 'fa'
  };
  /* 无作业节点的状态（客户退库由客户批复，没有对应节点定义）保留显式兜底负责人 */
  var OWNER_FALLBACK = { 'done-no-tx': 'f1' };

  /* status -> 节点默认负责人：实时派生自 STATION_DEFS（SSOT），不再另存一份负责人表。
     改了节点 owner 后台账归属 / 待办分桶立即跟随，不需要同步第二处数据。 */
  function statusOwner(status) {
    var fb = OWNER_FALLBACK[status];
    if (fb) return fb;
    var role = STATUS_ROLE[status];
    if (!role) return null;
    var d = L.STATION_DEFS.filter(function (x) { return x.role === role && x.status === 'eff' && x.owner; })[0];
    return d ? d.owner : null;
  }

  /* 机台从进仓到出仓的流程管线（阶段 = Travel Sheet 状态 / UNIT_EVENTS 映射），顺序对齐 T0 阶段城小节点 t0-01..t0-08 */
  var PIPELINE = [
    { key: 'wh-in',     label: '仓库领机' },
    { key: 'cosmetic',  label: '外观目检' },
    { key: 'photo',     label: '拍照' },
    { key: 'miniline',  label: 'Mini line 工站' },
    { key: 'review',    label: '照片复核' },
    { key: 'report',    label: '报告/Recon' },
    { key: 'testcenter',label: 'Test Center' },
    { key: 'fa',        label: 'FA/CTMS' },
    { key: 'wh-out',    label: '退库' }
  ];
  /* 状态 -> 管线阶段下标 */
  var STATUS_STAGE = {
    cosmetic: 1, photo: 2, miniline: 3, review: 4,
    recon: 5, 'done-no-tx': 5, testcenter: 6, done: 8
  };

  function roleOf(id) {
    var u = L.USERS.filter(function (x) { return x.id === id; })[0];
    return u ? roleIdsOf(u) : [];
  }
  /* 有效责任人：默认负责人若有生效请假则取其代理人（复用 flow 委托路由） */
  function effId(id) { return nodeOwner({ owner: id }).id; }
  /* Travel Sheet 当前节点的有效责任人 */
  function sheetOwner(ts) { return effId(statusOwner(ts.status) || 'bole'); }

  /* 我的机台：当前节点归我，或我曾经手（时间线/签名/复核） */
  function myMachines(uid) {
    return L.TRAVEL_SHEETS.filter(function (ts) {
      if (sheetOwner(ts) === uid) return true;
      if (ts.sign === uid || ts.reviewer === uid) return true;
      return (ts.timeline || []).some(function (e) { return e.who === uid; });
    });
  }

  /* 统一任务聚合：kinds = mine（我的待办）/ queue（同岗可接手）/ alert（告警卡点） */
  function myTasks(uid) {
    var me = userById(uid);
    var myRoles = roleIdsOf(me);
    var out = { mine: [], queue: [], alert: [], ret: [] };

    function push(kind, ico, title, sub, meta, dep) {
      out[kind].push({ ico: ico, title: title, sub: sub, meta: meta, dep: dep });
    }
    /* 按「负责人字段」分发：归我 -> mine；同岗他人 -> queue；外部协作人不参与个人任务 */
    function pushByOwner(ow, role, ico, title, sub, meta, bucket) {
      if (!ow || roleOf(ow).length === 0) return;        /* 外部协作人（grant/mike…）跳过 */
      var eff = effId(ow);
      if (eff === uid) push(bucket || 'mine', ico, title, sub, meta, eff !== ow);
      else if (roleOf(ow).some(function (r) { return myRoles.indexOf(r) >= 0; })) push('queue', ico, title, sub, meta, eff !== ow);
    }
    function repLabel(s) { return { draft: '待导入', imported: '待核对', checked: '可上传' }[s] || s; }

    /* ① Travel Sheet：已进仓未退库的机台，按当前节点负责人 */
    L.TRAVEL_SHEETS.forEach(function (ts) {
      if (ts.status === 'done') return;
      var st = ts.status;
      pushByOwner(statusOwner(st), STATUS_ROLE[st],
        st === 'done-no-tx' ? 'check' : 'clipboard',
        statusCN(st) + '　' + ts.sn,
        ts.stage + ' · ' + nextTsHint(ts),
        st === 'done-no-tx' ? '待批复' : '流程中');
    });

    /* ② 当日报告（report 岗位分工：Bole 对账/编辑，Yoke 导入） */
    L.REPORTS.forEach(function (r) {
      if (r.status === 'uploaded') return;
      pushByOwner(r.owner, 'report', 'file',
        '当日报告　' + r.sn, r.stage + ' · ' + r.phase + ' · ' + repLabel(r.status), '待处理');
    });

    /* ③ Recon 数据包（照单核对，2min/包） */
    L.RECON_PACKS.forEach(function (p) {
      if (p.status === 'done') return;
      pushByOwner(p.owner, 'report', 'package',
        'Recon 回写数据包　' + p.pack, p.sn + ' · ' + p.tag + ' · 照单核对 2min', '待核对');
    });

    /* ④ Recon Tagging 待回写 */
    L.RECON_TAGGING.forEach(function (r) {
      if (r.status !== 'pending') return;
      pushByOwner(r.by, 'report', 'tag',
        'Recon Tagging　' + r.sn, r.tag + ' · ' + r.note, '待回写');
    });

    /* ⑤ 照片复核（reviewer = 复核负责人）+ 补拍跟催 */
    L.PHOTO_REVIEWS.forEach(function (p) {
      if (p.status === 'ok') return;
      pushByOwner(p.reviewer, 'review', 'scan',
        p.status === 'retake' ? '补拍跟催　' + p.sn : '照片复核　' + p.sn,
        p.status === 'retake' ? p.note + ' · 超时待跟催' : (p.files.join(', ') + ' · ' + p.note),
        p.due);
    });

    /* ⑥ 测试记录 / 设备巡检（inspector 已按个人） */
    L.TEST_RECORDS.forEach(function (r) {
      if (r.status === 'finish') return;
      pushByOwner(r.inspector, 'testcenter', 'flask',
        '在线路测　' + r.sn, r.stage + ' · ' + r.phase + ' · ' + (r.status === 'testing' ? '测试中' : '充电中 ' + r.charge), r.status === 'testing' ? '测试中' : '充电中');
    });
    L.INSPECTIONS.forEach(function (r) {
      if (r.status !== 'due') return;
      pushByOwner(r.inspector, 'testcenter', 'tool',
        '设备巡检　' + r.item, r.cycle + ' · 下次 ' + r.next, '到期');
    });

    /* ⑦ FA Tracker / CTMS（assignee 已按个人） */
    L.FA_TRACKER.forEach(function (r) {
      if (r.status === '退庫') return;
      pushByOwner(r.fa, 'fa', 'chart',
        'FA 分析　' + r.sn + '（' + r.radar + '）', r.fail + ' · ' + r.status, r.days + ' 天');
    });
    L.CTMS_APPLICATIONS.forEach(function (c) {
      if (c.status === 'closed') return;
      pushByOwner(c.assignee, 'fa', 'clock',
        'CTMS 申请　' + c.id, c.subject + '（' + statusOfCtms(c.status) + '）', '指派 ' + whoName(c.assignee));
    });

    /* ⑧ WF 待批复（审批人 = reviewer 岗位，与提交人无关） */
    L.WF_APPROVALS.forEach(function (w) {
      if (w.status === 'pending') {
        pushByOwner('f1', 'reviewer', 'check',
          '批复 WF-' + w.wf, w.desc, w.time + ' 提交');
      }
    });

    /* ⑨ 退回待确认（两段式第一程）：目标环节「当前责任人」确认接收后才拨回机台）
       机台此时仍停在发起环节（from），目标人只看到「待确认」而非机台任务 */
    L.RETURNS.forEach(function (rt) {
      if (rt.status !== 'pending') return;
      var st = L.TRAVEL_SHEETS.filter(function (t) { return t.sn === rt.sn; })[0];
      if (!st || frozenTS(st)) return;
      if (effId(statusOwner(rt.to) || 'bole') !== uid) return;
      push('ret', 'arrow', '退回待确认 · ' + rt.sn,
        statusCN(rt.from) + ' 发起退回 ' + statusCN(rt.to) + '：' + (rt.reason || ''),
        whoName(rt.by) + ' · ' + rt.at);
      out.ret[out.ret.length - 1].id = rt.id;
    });

    /* ⑨ 告警 / Agent 卡点（owner 已按个人） */
    L.ALERTS.forEach(function (a) {
      if (a.status !== 'open') return;
      pushByOwner(a.owner, null, 'bell',
        '告警　' + a.id, a.text, a.time, 'alert');
    });
    L.AGENT_CASES.forEach(function (c) {
      if (c.status !== 'watch') return;
      pushByOwner(c.owner, null, 'pulse',
        '卡点监测　' + c.id, c.target + ' · ' + c.cause, c.age, 'alert');
    });

    /* ⑩ 流程实例：启动后按当前节点负责人自动路由；节点位置 / 流程名 / 模板版本实时展示 */
    L.FLOW_INSTANCES.forEach(function (ins) {
      if (ins.status !== 'running') return;
      var t = flowTplById(ins.tpl);
      if (!t) return;
      var i = t.nodes.indexOf(ins.current);
      if (i < 0) return;
      var nd = tplNodeDef(t, ins.current);
      if (!nd) return;
      pushByOwner(nd.owner, nd.role, 'layers',
        '流程实例　' + ins.id,
        ins.subject + ' · 当前节点「' + nd.name + '」',
        t.name + ' v' + ins.tplVer + ' · 第 ' + (i + 1) + '/' + t.nodes.length + ' 步', 'mine');
    });

    return out;
  }

  /* =====================================================   * 权限：双层校验（页面路由 ACL + 任务归属）
   * 任何用户：
   *   1) 只能打开自己「有效岗位集」允许的页面（角色不足 → 越权页拦截）
   *   2) 页内动作按钮按「当前责任人」二次校验，不是你的任务不可操作
   * 有效岗位集 = 本人岗位 + 正在代管的岗位（请假委托生效时）
   * ============================================================ */
  /* 页面 ACL 基础项：'all' = 所有登录身份可访问；其余页面由 ROLES[].menus 反向推导（菜单 key → 允许角色集）。
     详情页（machine-doc/batch-detail/photo-review）跟随父菜单，同样置 'all'，页内操作按钮另有归属/权限校验。 */
  var PAGE_ACL = {
    'login': 'all', 'dashboard': 'all', 'travel-sheet': 'all', 'report': 'all',
    'my-scripts': 'all',
    'machines': 'all', 'machine-doc': 'all', 'batches': 'all', 'batch-detail': 'all',
    'photo-review': 'all'
  };
  function rebuildAcl() {
    PAGE_ACL = {
      'login': 'all', 'dashboard': 'all', 'travel-sheet': 'all', 'report': 'all',
      'my-scripts': 'all',
      'machines': 'all', 'machine-doc': 'all', 'batches': 'all', 'batch-detail': 'all',
      'photo-review': 'all'
    };
    /* 仅 C 型菜单反向生成页面授权（F 按钮 / M 目录不进入页面路由） */
    (L.MENUS || []).forEach(function (m) {
      if (m.type !== 'C') return;
      if (PAGE_ACL[m.key] === 'all') return;           /* 全员页保持不变 */
      (L.ROLES || []).forEach(function (r) {
        if (r.status !== 'active') return;             /* 停用角色不参与页面授权 */
        var keys = r.menus || [];
        if (keys.indexOf('*') >= 0 || keys.indexOf(m.key) >= 0) {
          (PAGE_ACL[m.key] = PAGE_ACL[m.key] || []).push(r.id);
        }
      });
    });
    Object.keys(PAGE_ACL).forEach(function (k) {       /* 去重 */
      if (Array.isArray(PAGE_ACL[k])) {
        var seen = {};
        PAGE_ACL[k] = PAGE_ACL[k].filter(function (x) { return seen[x] ? false : (seen[x] = true); });
      }
    });
  }

  /* 有效岗位集 = 本人所有角色 + 生效请假中由我代管者的角色（取并集） */
  function effRoles(uid) {
    var u = userById(uid);
    var roles = roleIdsOf(u).slice();
    L.LEAVES.forEach(function (l) {
      if (l.status === 'active' && l.deputy === uid) {
        var ow = userById(l.who);
        roleIdsOf(ow).forEach(function (r) { if (roles.indexOf(r) < 0) roles.push(r); });
      }
    });
    return roles;
  }

  /* 页面可访问：管理员 0 限制；用户必须命中页面 ACL（有效岗位集） */
  function canView(route) {
    if (route === 'login') return true;
    if (state.mode === 'admin') return true;
    var allow = PAGE_ACL[route];
    if (!allow) return false;
    if (allow === 'all') return true;
    var roles = effRoles(state.userId);
    return allow.some(function (r) { return roles.indexOf(r) >= 0; });
  }

  /* 任务归属：有效责任人（含代理）是否本人 */
  function isMine(ownerId) {
    return effId(ownerId) === state.userId;
  }
  /* 操作级校验：不是当前责任人的任务直接拦截（管理员除外） */
  function assertCan(ownerId, act) {
    if (state.mode === 'admin') return true;
    if (isMine(ownerId)) return true;
    toast('无权操作：' + act + ' 归属他人，待原责任人转交/委托后才能操作', 'bad');
    return false;
  }

  /* 按钮级权限（perms）：admin 恒真；否则看有效角色集的 menus 是否含该权限字符（'*' = 全部）。
     与 assertCan（任务归属层）正交：canAction 管「角色有没有这个按钮」，assertCan 管「任务是不是你的」。 */
  function canAction(key) {
    if (state.mode === 'admin') return true;
    var roles = effRoles(state.userId);
    return roles.some(function (rid) {
      var r = roleById(rid);
      if (!r || r.status !== 'active') return false;
      var keys = r.menus || [];
      return keys.indexOf('*') >= 0 || keys.indexOf(key) >= 0;
    });
  }

  /* 越权拦截页（控制台提示：身份切换仅演示用） */
  function viewNoAccess() {
    var u = userById(state.userId);
    return '<div class="page"><div class="page-head"><div><h2>无权访问（403）</h2>' +
      '<div class="sub">当前身份：' + esc(u.name) + '（' + esc(roleNameOf(u)) + '）· 无该页面权限</div></div>' +
      '<div class="acts"><a class="btn btn-primary" href="#/dashboard">返回工作台</a></div></div>' +
      '<div class="card"><div class="card-head"><h3>越权拦截说明</h3></div>' +
      '<div class="small dim" style="line-height:2">页面访问按「有效岗位集」校验：非本岗页面直接拦截；' +
      '页内每个操作按钮还会按「当前责任人」二次校验，不是你的任务不进你的待办，也不会显示操作入口。<br>' +
      '顶栏的身份切换仅用于演示交互，生产环境对应账号登录鉴权。</div></div></div>';
  }

  /* 流程管线行：一行机台的 9 段颜色（done / current / 未到） */
  function flowBar(ts) {
    var cur = STATUS_STAGE[ts.status];
    var nodes = PIPELINE.map(function (p, i) {
      var cls = i < cur ? 'done' : (i === cur ? 'current' : '');
      return '<div class="flow-node ' + cls + '" title="' + esc(p.label) + '">' +
        '<span class="fn">' + (i + 1) + '</span><span>' + esc(p.label) + '</span></div>';
    }).join('<div class="flow-arrow"></div>');
    return '<div class="flow-bar">' + nodes + '</div>';
  }

  /* 下一环节不再手工维护：见 R2 的 nextTsStep()（按 STATION_DEFS 顺序派生推进序）
     TS_NEXT 已废弃移除，流程由作业定义中心一处配置。 */

  /* 退回目标候选：当前 status 可退回的已过往环节（近 → 远；终态冻结不在此列） */
  var TS_BACK = {
    photo: ['cosmetic'],
    miniline: ['photo', 'cosmetic'],
    review: ['miniline', 'photo', 'cosmetic'],
    recon: ['review', 'miniline', 'photo', 'cosmetic'],
    testcenter: ['photo', 'cosmetic']
  };

  /* 终态已冻结：已投 TX / 已退库，不再支持退回与更正 */
  function frozenTS(ts) { return ts.status === 'done' || ts.status === 'done-no-tx'; }

  /* 该机台当前生效的「已确认退回」记录：目标节点重做完成后提交时据此快速归位发起节点 */
  function returnFor(sn) {
    var arr = L.RETURNS.filter(function (r) { return r.sn === sn && r.status === 'confirmed'; });
    return arr[arr.length - 1] || null;
  }

  /* 机台最近一条进行中的退回单（pending / confirmed），用于流程环节角标提示 */
  function returnInfo(sn) {
    var arr = L.RETURNS.filter(function (r) { return r.sn === sn && (r.status === 'pending' || r.status === 'confirmed'); });
    return arr[arr.length - 1] || null;
  }

  /* Travel Sheet 各环节操作步骤（外观=勾选表单，拍照/工站/复核/报告=流程步骤清单） */
  function stageSteps(ts, fxCards) {
    if (ts.status === 'photo') {
      return '<div class="card mt-4"><div class="card-head"><h3>① 拍摄与命名（S09 脚本）</h3><div class="meta">Photo Station · 单机约 45min</div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('camera') + '</div>' +
        '<div class="t-body"><div class="t-title">命名规则：SN_角度_序号.jpg</div><div class="t-sub">S10 治具匹配脚本通过 · 上传 ' + esc('///共用/Photo Station/2026-09-17/') + '</div></div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('check') + '</div>' +
        '<div class="t-body"><div class="t-title">Travel Sheet 照片勾选（打勾即留痕）</div><div class="t-sub">正常 A/B 面已拍；异常照需打勾，拍不到用 Keyence 补拍</div></div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('arrow') + '</div>' +
        '<div class="t-body"><div class="t-title">Summary OUT → 邮件通知 Mini line</div><div class="t-sub">下一环节：Frank（Mini line 工站）</div></div></div></div>';
    }
    if (ts.status === 'miniline') {
      var miniFlow = ['扫 iMES & Summary IN（待扫进货架）', 'Charging', 'SWDL', 'SWDL-RF', 'Laser Scan REL1', 'Laser Scan REL2', '工站测试（详见下方批次结果）', '扫 iMES & Summary OUT', '判定 T0 结果 → 通知 WF 分配'];
      var flowRows = miniFlow.map(function (s, i) {
        return '<div class="todo-row"><div class="t-ico">' + icon(i === miniFlow.length - 1 ? 'arrow' : 'flask') + '</div>' +
          '<div class="t-body"><div class="t-title">' + (i + 1) + '. ' + esc(s) + '</div></div>' +
          '<span class="badge-pill ok">' + (i === 0 ? '已过' : '进行/待过') + '</span></div>';
      }).join('');
      var fails = L.MINI_STATIONS.filter(function (m) { return m.status === 'fail'; });
      var failRows = fails.map(function (m) {
        return '<div class="todo-row"><div class="t-ico">' + icon('x') + '</div>' +
          '<div class="t-body"><div class="t-title">' + esc(m.st) + '（' + esc(m.group) + '）</div><div class="t-sub">负责人 ' + esc(m.owner) + ' · ' + esc(m.note || '') + '</div></div>' +
          '<span class="badge-pill warn">FAIL</span></div>';
      }).join('');
      return '<div class="card mt-4"><div class="card-head"><h3>① Mini line 工站流程</h3><div class="meta">Frank · 各站批处理合计约 12hr</div></div>' + flowRows + '</div>' +
        '<div class="card mt-4"><div class="card-head"><h3>② 当班批次工站结果（26 站矩阵）</h3>' +
        '<div class="meta">' + (fails.length ? fails.length + ' 站失败待处理' : '本批全部通过') + '</div></div>' +
        (fails.length ? failRows : '<div class="todo-row"><div class="t-ico">' + icon('check') + '</div>' +
          '<div class="t-body"><div class="t-title">本批 26 工站全部通过</div></div></div>') + '</div>';
    }
    if (ts.status === 'review') {
      return '<div class="card mt-4"><div class="card-head"><h3>照片复核</h3><div class="meta">Amy · 1.5hr/批</div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('scan') + '</div>' +
        '<div class="t-body"><div class="t-title">① 对照异常勾选清单逐张复核照片</div><div class="t-sub">遗漏/不清晰 → Summary 查机台位置 → 货架取机补拍（30min 内完成）</div></div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('check') + '</div>' +
        '<div class="t-body"><div class="t-title">② 复核通过 → 签名并标记传 F1 硬盘</div><div class="t-sub">下一环节：Bole/Yoke（报告/Recon）</div></div></div>' +
        '<div class="acts" style="margin-top:12px;justify-content:flex-start"><a class="btn btn-primary" href="#/photo-review">' + icon('scan') + '进入复核清单（三项核对）</a></div></div>';
    }
    if (ts.status === 'recon') {
      return '<div class="card mt-4"><div class="card-head"><h3>报告 / Recon 流程</h3><div class="meta">出 T0 报告约 3hr</div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('file') + '</div>' +
        '<div class="t-body"><div class="t-title">1. 报告导入脚本 S01（Yoke）</div><div class="t-sub">录入 SN / Test / CP / Failure Mode / Mini line Failed，减少手工疏漏</div></div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('scale') + '</div>' +
        '<div class="t-body"><div class="t-title">2. 报告 vs Recon 数据比对（Bole）</div><div class="t-sub">F1 运行对比脚本 → Bole 检查一致性，更新已完成机台的 Recon 日期</div></div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('doc') + '</div>' +
        '<div class="t-body"><div class="t-title">3. 换行标蓝加粗脚本编辑 Log（Bole）</div><div class="t-sub">格式化报告 Log 便于客户阅读</div></div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('upload') + '</div>' +
        '<div class="t-body"><div class="t-title">4. 上传文件馆 + 整机报告雷达备份</div><div class="t-sub">报告 + 照片 + System Report 上传，备查与发布</div></div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('bell') + '</div>' +
        '<div class="t-body"><div class="t-title">5. 分 WF → 邮件告知 F1 批复</div><div class="t-sub">F1 于「WF 审核」页批准后投产；下一环节：终态/退库</div></div></div></div>';
    }
    if (ts.status === 'testcenter') {
      return '<div class="card mt-4"><div class="card-head"><h3>Test Center（TX 段）</h3><div class="meta">Aiden / Cody</div></div>' +
        '<div class="todo-row"><div class="t-ico">' + icon('flask') + '</div>' +
        '<div class="t-body"><div class="t-title">按 WF 分段测试（Charging / SWDL / 各 Function DRI）</div><div class="t-sub">完成后转报告/Recon，进入下一阶段循环</div></div></div></div>';
    }
    if (ts.status === 'done' || ts.status === 'done-no-tx') {
      return '<div class="card mt-4"><div class="card-head"><h3>终态</h3><div class="meta">' + (ts.status === 'done-no-tx' ? '已完成本阶段 · 待投下一阶段' : 'F1 已批复 · 已退库') + '</div></div>' +
        '<div class="small dim" style="padding:10px 2px">报告导入 / 分 WF / 上传雷达已完成，无待办步骤；一阶段循环走完 → 下一阶段，TF 退库收尾。</div></div>';
    }
    /* cosmetic：清洁秤重 → 外观勾选 → 色差 */
    return '<div class="card mt-4"><div class="card-head"><h3>① 清洁与秤重</h3><div class="meta">' + (ts.clean ? '<span class="badge-pill ok">已完成</span>' : '<span class="badge-pill warn">待完成</span>') + '</div></div>' +
      '<div class="form-grid">' +
      '<div class="field"><label>清洁完成？</label><input type="text" value="' + (ts.clean ? '已完成' : '待清洁') + '" disabled></div>' +
      '<div class="field"><label>机台重量</label><input type="text" value="' + esc(ts.weight || '—') + '"><div class="hint">与 SYS Weight 基准比对，±0.5g 内提示正常</div></div>' +
      '</div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>② 外观目检（勾选问题部位，模仿纸本版式）</h3>' +
      '<div class="meta">选中即记为 Failure</div></div>' +
      '<div class="check-grid">' + fxCards + '</div>' +
      '<div style="margin-top:14px;padding:10px 12px;border:1px dashed var(--line);border-radius:var(--radius-sm)" class="small dim">' +
      '已勾选：<span class="mono" id="fx-count" style="color:var(--accent)">' + FORM_STATE.fx.length + ' 项</span>　·　' +
      (FORM_STATE.fx.length ? FORM_STATE.fx.join(' / ') : '无外观问题 → 自动进入无异常路径') + '</div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>③ 色差量测</h3></div>' +
      '<div class="form-grid"><div class="field"><label>ΔE 结果</label><input type="text" value="0.38（Pass）"><div class="hint">超过 0.7 自动标记色差异常</div></div>' +
      '<div class="field"><label>4PT / 镜片目检</label><input type="text" value="PASS（镜片无 crack）"></div></div></div>';
  }

  function subNodeItemHtml(sub) {
    var eff = effId(sub.owner);
    var delegated = eff !== sub.owner;
    return '<div class="sub-node"><span class="task-chip">' + esc(taskLabel(sub.task)) + '</span>' +
      '<span class="sub-name">' + esc(sub.name) + '</span>' +
      '<span class="sub-owner faint">' + esc(whoName(sub.owner)) + (delegated ? ' → 代管 ' + esc(whoName(eff)) : '') + '</span></div>';
  }
  /* 本节点任务点 + 仅本人可见的子节点清单（管理员 / F1 可见全部）；按作业类型区分外观 / 工站 / 测试 */
  function nodeTaskPanelHtml(ts) {
    var d = defForSubmit(ts);
    if (!d) return '';
    var job = roleJobLabel(d.role);
    var subs = (d.subNodes || []).filter(subVisible);
    /* R2 检查表：本节点声明任务的逐项勾选（机台×节点 留存，放行必需项） */
    var checks = '';
    var dTasks = d.tasks || [];
    if (dTasks.length) {
      var doneN = tsChecklist(ts, d.id).length;
      checks = '<div class="ts-checkbox"><div class="ch-head">' +
        '<span>节点检查表 · <b>' + doneN + '/' + dTasks.length + '</b> 项</span>' +
        '<span class="small dim">全部勾选后方可「提交并流转」</span></div>' +
        dTasks.map(function (t) {
          var on = tsTaskDone(ts, d, t);
          return '<div class="ch-row' + (on ? ' on' : '') + '" data-ts-check data-def="' + d.id + '" data-task="' + t + '">' +
            '<span class="box">' + icon('check') + '</span><span>' + esc(taskLabel(t)) + '</span></div>';
        }).join('') + '</div>';
    }
    var miss = nodeReleaseMissing(ts, d);
    var relStatus = miss.length
      ? '<span class="tag-chip warn">未放行 · ' + miss.length + ' 项缺失</span> <span class="small dim">' + esc(miss[0]) + (miss[1] ? ' / ' + esc(miss[1]) : '') + '</span>'
      : '<span class="tag-chip ok">已放行 · 可提交</span>';
    return '<div class="card mt-4"><div class="card-head"><h3>本节点任务点 · ' + esc(d.name) + '</h3>' +
      '<div class="meta">' + relStatus + '</div></div>' +
      '<div class="card-head sub"><div class="meta">' +
      '<span class="tag-chip">' + esc(job) + '</span> 任务类型来自「字典中心」；子节点仅对应负责人本人可见（管理员 / F1 审核员可见全部）</div></div>' +
      '<div class="task-chips">' + taskChipsHtml(d) + '</div>' +
      checks +
      (subs.length ? '<div class="sub-list mt-4">' + subs.map(subNodeItemHtml).join('') + '</div>' : '') +
      '</div>';
  }

  /* =====================================================   * 照片模型 + 表单两态（Phase D）
   * 照片：photos[]（角度/文件/正常·异常/缩略图占位）→ 点击 lightbox 放大。
   * 表单两态：翻页（填写态·默认，按节点分区）/ 拼接（总览态·一键展开全部节点字段）。
   * ============================================================ */
  var FORM_MODE = 'paged'; /* paged(翻页·填写态) | joined(拼接·总览态) */

  function templateForNode(nodeId) {
    return (L.FORM_TEMPLATES || []).filter(function (t) { return (t.nodeIds || []).indexOf(nodeId) >= 0; })[0] || null;
  }
  /* 拼接总览：按当前阶段城节点顺序，把各节点绑定的表单字段全部展开（只读） */
  function stageFormJoinedHtml(stage) {
    var nodes = stageNodes(stage);
    var cards = nodes.map(function (d) {
      var t = templateForNode(d.id);
      var fields = t ? (t.fields || []) : [];
      var fHtml = fields.map(function (f) {
        return '<span class="jf-item"><i>' + esc(f.label) + '</i><b>' + esc(f.type || '文本') + '</b>' + (f.required ? '<em class="req">*</em>' : '') + '</span>';
      }).join('');
      return '<div class="card"><div class="card-head"><h3>' + esc(d.name) + ' <span class="mono small">' + esc(d.id) + '</span></h3>' +
        '<div class="meta">' + (t ? esc(t.name) + ' · ' + fields.length + ' 字段' : '未绑定表单模板') + '</div></div>' +
        '<div class="jf-grid">' + (fHtml || '<span class="faint small">未绑定表单模板</span>') + '</div></div>';
    }).join('');
    return '<div class="card mt-4"><div class="card-head"><h3>拼接总览 · ' + esc(stage) + ' 全节点表单</h3>' +
      '<div class="meta">翻页=按节点分区填写 · 拼接=一键展开全部节点字段（只读总览，字段来自 FORM_TEMPLATES.nodeIds）</div></div>' + cards + '</div>';
  }
  function formModeToggleHtml() {
    return '<div class="form-mode-toggle"><span class="small dim">表单视图</span>' +
      '<button class="btn btn-xs' + (FORM_MODE === 'paged' ? ' btn-primary' : ' btn-ghost') + '" data-form-mode data-mode="paged">翻页（填写）</button>' +
      '<button class="btn btn-xs' + (FORM_MODE === 'joined' ? ' btn-primary' : ' btn-ghost') + '" data-form-mode data-mode="joined">拼接（总览）</button></div>';
  }

  /* 照片模型：角度 + 文件 + normal/abnormal + 缩略图占位（无真实图片，用占位图演示） */
  function photoShotsFor(sn) {
    return [
      { tag: '正常 A 面', file: (sn || 'MTL00018') + '_N1.jpg', angle: 'A 面', state: 'normal', auto: true },
      { tag: '正常 B 面', file: (sn || 'MTL00018') + '_N2.jpg', angle: 'B 面', state: 'normal', auto: true },
      { tag: '异常 1（镜头进尘）', file: (sn || 'MTL00018') + '_A1.jpg', angle: '镜头特写', state: 'abnormal', auto: false }
    ];
  }
  function photoThumbHtml(p) {
    return '<div class="photo-thumb' + (p.state === 'abnormal' ? ' abnormal' : '') + '" data-photo-view data-file="' + esc(p.file) + '" data-tag="' + esc(p.tag) + '" data-angle="' + esc(p.angle || '') + '" data-state="' + esc(p.state || 'normal') + '">' +
      '<div class="pt-img">' + icon('camera') + '<span class="pt-angle">' + esc(p.angle || p.tag) + '</span></div>' +
      '<div class="pt-name mono">' + esc(p.file) + '</div>' +
      '<div class="pt-state">' + (p.state === 'abnormal' ? '<span class="badge-pill bad">异常照</span>' : '<span class="badge-pill ok">正常照</span>') + '</div></div>';
  }
  function openLightbox(el) {
    var file = el.getAttribute('data-file');
    var tag = el.getAttribute('data-tag');
    var angle = el.getAttribute('data-angle');
    var state = el.getAttribute('data-state');
    var mask = document.createElement('div');
    mask.className = 'lightbox-mask';
    mask.innerHTML = '<div class="lightbox"><div class="lb-top"><span class="mono">' + esc(file) + '</span>' +
      '<button class="m-close" data-lb-close>×</button></div>' +
      '<div class="lb-img">' + icon('camera') + '<div class="lb-angle">' + esc(angle || tag) + '</div></div>' +
      '<div class="lb-meta">' + esc(tag) + ' · ' + (state === 'abnormal' ? '<span class="badge-pill bad">异常照</span>' : '<span class="badge-pill ok">正常照</span>') + ' · 缩略图为占位图（静态演示，无真实照片）</div></div>';
    document.body.appendChild(mask);
    var close = function () { mask.remove(); };
    mask.querySelector('[data-lb-close]').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
  }

  /* Mini line Travel Sheet：只记录「该机台做了哪些工站 + 结果」，不记录清洁/重量/外观/色差/签名 */
  function miniRecordFor(sn) {
    return (L.MINI_STATIONS || []).map(function (m) {
      var u = (m.units || []).filter(function (x) { return x.sn === sn; })[0];
      var st = u ? u.status : (m.status === 'todo' ? 'todo' : 'pass');
      return { st: m.st, group: m.group, owner: m.owner, status: st, note: m.note };
    });
  }
  function miniUnitBadge(st) {
    if (st === 'fail') return '<span class="badge-pill bad">FAIL</span>';
    if (st === 'pass' || st === 'done') return '<span class="badge-pill ok">通过</span>';
    return '<span class="badge-pill gray">待测</span>';
  }
  function miniImportFor(sn) { return MINI_IMPORT[sn] || null; }
  /* 取数源（Mini line 工站数据）：Excel / API 统一入口，来源读 DATA_SOURCES（SSOT） */
  var MINI_SRC = 'excel';
  function miniSourceOptions() {
    return (L.DATA_SOURCES || []).filter(function (d) { return d.target === 'stations'; }).map(function (d) {
      return '<option value="' + esc(d.type) + '"' + (MINI_SRC === d.type ? ' selected' : '') + '>' + esc(d.name) + '</option>';
    }).join('');
  }
  function miniSourceName() {
    var d = (L.DATA_SOURCES || []).filter(function (x) { return x.target === 'stations' && x.type === MINI_SRC; })[0];
    return d ? d.name : MINI_SRC;
  }
  /* 规划工站清单：Mini line 节点 miniPlan（SSOT 挂在节点定义上，站点比对基准） */
  function miniPlanFor(stage) {
    var d = L.STATION_DEFS.filter(function (x) { return x.stage === stage && x.role === 'miniline' && x.status === 'eff'; })[0];
    return (d && d.miniPlan) || [];
  }
  /* 站点比对：规划站(miniPlan) vs 实测站(MINI_IMPORT.stations)，只比对一致性，不分析测试数据 */
  function miniCompareHtml(ts) {
    var imp = miniImportFor(ts.sn);
    if (!imp) return '';
    var plan = miniPlanFor(ts.stage);
    if (!plan.length) return '';
    var actual = (imp.stations || []).map(function (r) { return r.st; });
    var miss = plan.filter(function (p) { return actual.indexOf(p) < 0; });
    var extra = actual.filter(function (a) { return plan.indexOf(a) < 0; });
    var rows = plan.map(function (p) {
      var hit = actual.indexOf(p) >= 0;
      return '<tr><td class="mono">' + esc(p) + '</td><td>' +
        (hit ? '<span class="badge-pill ok">一致</span>' : '<span class="badge-pill bad">缺失</span>') + '</td></tr>';
    }).join('');
    var extraRows = extra.map(function (e) {
      return '<tr><td class="mono">' + esc(e) + '</td><td><span class="badge-pill warn">多余（不在规划）</span></td></tr>';
    }).join('');
    var summary = (miss.length || extra.length)
      ? '<div class="fp-mini-fails" style="margin-top:8px">比对差异：缺失 <b>' + miss.length + '</b> · 多余 <b>' + extra.length + '</b>（只做站点比对，不分析测试数据）</div>'
      : '<div class="small dim" style="margin-top:8px">规划站与实测站完全一致 ✓（只做站点比对，不分析测试数据）</div>';
    return '<div class="card mt-4"><div class="card-head"><h3>③ 站点比对（规划 vs 实测）</h3>' +
      '<div class="meta">取数源：' + esc(miniSourceName()) + ' · 只比对站点是否与规划一致</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>规划工站</th><th>比对结果</th></tr></thead>' +
      '<tbody>' + rows + extraRows + '</tbody></table></div>' + summary + '</div>';
  }
  function miniSheetBody(ts) {
    var imp = miniImportFor(ts.sn);
    /* 上传前：不展示任何工站数据，只给空态提示；上传后再渲染工站清单与结果 */
    if (!imp) {
      return '<div class="card mt-4"><div class="card-head"><h3>工站测试记录 · ' + esc(ts.sn) + '</h3>' +
        '<div class="meta">Mini line 只记录「该机台做了哪些工站 + 结果」，清洁 / 重量 / 外观 / 色差 / 签名由 Cosmetic 环节记录</div></div>' +
        '<div class="empty-state">' + icon('upload') +
        '<div class="e-title">尚未上传 Excel，暂无工站测试数据</div>' +
        '<div class="e-sub">点击右上角「上传 Excel（模拟）」导入该机台的工站测试结果；导入后这里展示工站清单与通过 / 失败 / 待测明细，并同步到报告纸（#/report）。</div>' +
        '</div></div>';
    }
    var rows = imp.stations || miniRecordFor(ts.sn);
    var pass = rows.filter(function (r) { return r.status === 'pass' || r.status === 'done'; }).length;
    var fail = rows.filter(function (r) { return r.status === 'fail'; }).length;
    var todo = rows.length - pass - fail;
    var trs = rows.map(function (r) {
      return '<tr><td class="mono">' + esc(r.st) + '</td>' +
        '<td><span class="tag-chip">' + esc(r.group) + '</span></td>' +
        '<td>' + esc(r.owner) + '</td>' +
        '<td>' + miniUnitBadge(r.status) + '</td>' +
        '<td class="small dim">' + esc(r.note) + '</td></tr>';
    }).join('');
    return '<div class="kpi-row mt-4">' +
      '<div class="kpi"><div class="k-label">工站总数</div><div class="k-value">' + rows.length + '</div><div class="k-foot">' + esc(ts.sn) + '</div></div>' +
      '<div class="kpi isTeal"><div class="k-label">已通过</div><div class="k-value">' + pass + '</div></div>' +
      '<div class="kpi isRed"><div class="k-label">失败</div><div class="k-value">' + fail + '</div></div>' +
      '<div class="kpi"><div class="k-label">待测</div><div class="k-value">' + todo + '</div></div>' +
      '</div>' +
      '<div class="card mt-4"><div class="card-head"><h3>工站测试记录 · ' + esc(ts.sn) + '</h3>' +
      '<div class="meta"><span class="badge-pill ok">已从 ' + esc(miniSourceName()) + ' 导入</span> ' + esc(imp.file) + ' · ' + esc(imp.at) + '　·　结果已同步至报告纸（#/report）</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>工站</th><th>组</th><th>负责人</th><th>结果</th><th>备注</th></tr></thead>' +
      '<tbody>' + trs + '</tbody></table></div></div>' +
      miniCompareHtml(ts);
  }

  function viewTravelSheet() {
    var sheets = tsSheetsFor(FORM_STATE.stageF);
    if (!sheets.length) sheets = tsSheets();
    var curTs = sheets.filter(function (x) { return x.sn === FORM_STATE.sn; })[0] || sheets[0];
    if (FORM_STATE.stationOnly && !sheets.length) {
      return '<div class="page">' +
        '<div class="page-head"><div><h2>Travel Sheet 电子表单（数据驱动）</h2>' +
        '<div class="sub">本站点「' + esc(stationOfUser()) + '」暂无需要处理的数据</div></div>' +
        '<div class="acts">' + tsStationSeg() + '</div></div>' +
        '<div class="card"><div class="small dim">当前站点待处理清单为空；如非本岗位作业，可切回「全部站点」查看整条链路。</div></div></div>';
    }
    var ts = curTs;
    if (ts) FORM_STATE.sn = ts.sn;

    /* 当前环节作业定义：Mini line 节点走「工站测试记录」专用界面，其余走电子表单 */
    var curDef = defForSubmit(ts);
    var isMini = !!(curDef && curDef.role === 'miniline');

    /* 预填外观勾选：台账 fxIssue(label) 映射回勾选卡 code */
    FORM_STATE.fx = (ts.fxIssue || []).map(function (label) {
      var m = dictOpts('fx_issue').filter(function (f) { return label.indexOf(f.label) >= 0; })[0];
      return m ? m.key : null;
    }).filter(function (x) { return !!x; });
    FORM_STATE.signed = false;

    var fxCards = dictOpts('fx_issue').map(function (f) {
      var on = FORM_STATE.fx.indexOf(f.key) >= 0;
      return '<div class="check-card' + (on ? ' checked' : '') + '" data-fx data-code="' + f.key + '">' +
        '<div class="box">' + icon('check') + '</div>' +
        '<div><div class="cname">' + esc(f.label) + '</div><div class="ccode">' + f.key + ' · ' + esc(f.part) + '</div></div></div>';
    }).join('');

    /* 节点条：按机台所处阶段（T0/TX/TF）渲染各自工作节点，当前环节高亮 */
    var nodes = tsFlowNodes(ts.stage, ts.status);

    var lastUp = ts.timeline[ts.timeline.length - 1];

    /* 提交后自动派发交接物：按当前机台节点「作业设定中心」挂接的工具 hook（= 交接物 id）动态列出 */
    var dspHooks = submitHooks(tsCurrent());
    var dspRows = [];
    if (dspHooks.indexOf('ART_RECON') >= 0) dspRows.push(['package', 'Recon 待回写数据包', 'Yoke 照单核对，2min/机']);
    if (dspHooks.indexOf('ART_REPORT') >= 0) dspRows.push(['file', '报告导入脚输入', 'report_import 直接读取']);
    if (dspHooks.indexOf('ART_PHOTO') >= 0) dspRows.push(['camera', '拍照 / 色差任务', '异常勾选 → 拍照补拍自动派发']);

    return '<div class="page">' +
      '<div class="page-head"><div><h2>' + (isMini ? 'Travel Sheet · Mini line 工站测试记录' : 'Travel Sheet 电子表单（数据驱动）') + '</h2>' +
      '<div class="sub">' + (isMini
        ? esc(ts.stage) + ' · Mini line 只记录「该机台做了哪些工站 + 结果」，不记录清洁 / 重量 / 外观 / 色差 / 签名（属 Cosmetic）'
        : esc(ts.stage) + ' 各环节共用：台账下拉 / 扫码带出机台 → 当前环节负责人签名 → 「提交并流转」按顺序推进下一环节（流程节点 = ' + esc(ts.stage) + ' 阶段城小节点，随所选机台阶段切换）') + '</div></div>' +
      '<div class="acts">' + tsStageSeg() + tsStationSeg() + '<label class="ts-tray">台账<select data-ts-select>' + sheets.map(function (t) {
        return '<option value="' + t.sn + '"' + (t.sn === FORM_STATE.sn ? ' selected' : '') + '>' +
          t.sn + ' · ' + t.stage + ' · ' + statusCN(t.status) + '</option>';
      }).join('') + '</select></label>' +
      '<button class="btn btn-ghost" data-scan-sn>' + icon('scan') + '模拟扫码</button>' +
      (!isMini ? formModeToggleHtml() : '') +
      (isMini ? '<label class="ts-tray">取数源<select data-mini-source>' + miniSourceOptions() + '</select></label>' +
        '<button class="btn btn-ghost" data-mini-upload>' + icon('upload') + (MINI_SRC === 'api' ? 'API 拉取' : '上传 Excel') + '（模拟）</button>' : '') +
      (isMine(sheetOwner(ts))
        ? (frozenTS(ts)
            ? '<span class="small dim" style="align-self:center">终态已冻结：已出报告 / 退库，不支持退回与更正</span>'
            : (TS_BACK[ts.status] || []).length
              ? '<button class="btn btn-ghost" data-reject-ts>' + icon('arrow') + '退回</button>' +
                '<button class="btn btn-primary" data-submit-ts>' + icon('check') + '提交并流转</button>'
              : '<button class="btn btn-primary" data-submit-ts>' + icon('check') + '提交并流转</button>')
        : '<span class="small dim" style="align-self:center">当前责任人：' + esc(whoName(sheetOwner(ts))) + '，不可代替提交</span>') +
      '</div></div>' +

      '<div class="card"><div class="card-head"><h3>流程环节 · ' + esc(ts.stage) + '</h3><div class="meta">' +
      nextTsHint(ts) +
      (returnInfo(ts.sn) ? ' <span class="tag-chip on">退回流程中 → ' + esc(statusCN(returnInfo(ts.sn).to)) + '</span>' : '') +
      '</div></div>' +
      '<div class="flow-bar">' + nodes + '</div></div>' +

      nodeTaskPanelHtml(ts) +

      (isMini
        ? miniSheetBody(ts) +
          '<div class="card mt-4"><div class="card-head"><h3>电子签名（替代纸本签名字段）</h3><div class="meta">Mini line 工站负责人：' + esc(whoName(sheetOwner(ts))) + '　·　导入并核对工站测试结果后签名确认</div></div>' +
          '<div class="sign-pad' + (FORM_STATE.signed ? ' signed' : '') + '" data-sign>点击此处完成 ' + esc(whoName(currentUser().id)) + ' 签名</div>' +
          '<div class="mono small dim" style="margin-top:10px" id="sign-info">' +
          (FORM_STATE.signed ? '已签名：' + esc(whoName(currentUser().id)) + ' · ' + dateNow() : '未签名，提交前需完成') + '</div></div>' +
          '<div class="card mt-4"><div class="card-head"><h3>本节点交接物</h3><div class="meta">由作业设定中心声明 · 状态实时对齐数据</div></div>' +
          nodeArtCard(ts) + '</div>'
        : (FORM_MODE === 'joined'
            ? stageFormJoinedHtml(ts.stage)
            : '<div class="grid-2">' +
      '<div>' +
      '<div class="card"><div class="card-head"><h3>机台基础信息（台账带出）</h3><div class="meta">禁手工输入 · 字段来自「机台基础信息区」SSOT</div></div>' +
      '<div class="fp-basic-wrap">' + basicHeaderHtml(basicItemsFor(ts), '台账带出 · 禁手工') + '</div>' +
      '<div class="form-grid" style="margin-top:14px">' +
      '<div class="field"><label>SN（本表单台账）</label><input type="text" id="ts-sn" value="' + esc(FORM_STATE.sn) + '" data-ts-sn disabled></div>' +
      '<div class="field"><label>上一环节记录</label><input type="text" value="' + (lastUp ? esc(lastUp.t + ' ' + whoName(lastUp.who) + ' · ' + lastUp.node) : '—') + '" disabled></div>' +
      '<div class="field"><label>当前环节负责人</label><input type="text" value="' + esc(whoName(sheetOwner(ts))) + '" disabled></div>' +
      '<div class="field"><label>清洁 / 重量</label><input type="text" value="' + (ts.clean == null ? '—' : (ts.clean ? '已清洁' : '未清洁')) + ' · ' + (ts.weight || '—') + '" disabled></div>' +
      '</div></div>' +

      stageSteps(ts, fxCards) +

      '<div class="card mt-4"><div class="card-head"><h3>动态记录区（新增内容演示）</h3><div class="meta">填写时按需新增内容行；表格版式跟随「电子表单模板」字段配置</div></div>' +
      '<div class="form-grid">' +
      '<div class="field"><label>补充项</label><select data-note-item>' + NOTE_ITEMS.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>内容</label><input type="text" data-note-txt placeholder="如：R 向 5 点色差 ΔE 1.8，复测通过"></div>' +
      '</div>' +
      '<div class="mt-4" style="display:flex;align-items:center;gap:12px">' +
      '<button class="btn btn-primary" data-note-add>' + icon('plus') + '添加一行</button>' +
      '<span class="small faint">提交前可随时增删内容行，随电子表单一并归档</span></div>' +
      '<div id="note-list" class="mt-4">' + notesListHtml() + '</div></div>' +
      '</div>' +

      '<div class="sticky-col">' +
      '<div class="card"><div class="card-head"><h3>④ 电子签名（替代纸本签名字段）</h3><div class="meta">当前环节负责人：' + esc(lastUp ? whoName(lastUp.who) : whoName(currentUser().id)) + '</div></div>' +
      '<div class="sign-pad' + (FORM_STATE.signed ? ' signed' : '') + '" data-sign>等宽布局：外观问题区 / 照片勾选区 / 签名区 —— 点击此处完成 ' + esc(whoName(currentUser().id)) + ' 签名</div>' +
      '<div class="mono small dim" style="margin-top:10px" id="sign-info">' +
      (FORM_STATE.signed ? '已签名：' + esc(whoName(currentUser().id)) + ' · ' + dateNow() : '未签名，提交前需完成') + '</div>' +
      '</div>' +

      '<div class="card mt-4"><div class="card-head"><h3>提交后自动派发</h3>' +
      (dspHooks.length ? '<div class="meta">按本节点作业定义挂接脚本/工具</div>' : '') + '</div>' +
      (dspRows.length
        ? dspRows.map(function (r) {
            return '<div class="todo-row" style="margin-bottom:6px"><div class="t-ico">' + icon(r[0]) + '</div>' +
              '<div class="t-body"><div class="t-title">' + r[1] + '</div><div class="t-sub">' + r[2] + '</div></div>' +
              '<span class="badge-pill accent">自动</span></div>';
          }).join('')
        : '<div class="small dim">本节点未挂自动派发脚本/工具，提交后走人工环节。</div>') +
      '</div>' +

      '<div class="card mt-4"><div class="card-head"><h3>本节点交接物</h3><div class="meta">由作业设定中心声明 · 状态实时对齐数据</div></div>' +
      nodeArtCard(ts) + '</div>' +

      '<div class="card mt-4"><div class="card-head"><h3>线下兜底</h3></div>' +
      '<div class="small dim">断网 / 系统故障时可打印空白纸本，恢复后按 SN 补录入，不丢机台。</div></div>' +
      '</div></div>')) +
      '</div>';
  }

  /* 登录卡片：点击任一身份即切换进入对应视图 */
  function bindLoginCards() {
    var cards = document.querySelectorAll('[data-login]');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        setRole(this.getAttribute('data-uid'));
      });
    }
  }

  /* ---------------- 方向①：照片复核（Amy）· 三项核对 ---------------- */
  function chkChip(key, label, val, editable, sn) {
    var stateTxt = val === 1 ? '通过' : (val === 0 ? '异常' : '待核');
    var cls = val === 1 ? 'c-ok' : (val === 0 ? 'c-bad' : 'c-none');
    if (!editable) {
      return '<span class="chk-chip ' + cls + '">' + esc(label) + ' · ' + stateTxt + '</span>';
    }
    return '<button class="chk-chip ' + cls + '" data-check3 data-sn="' + esc(sn) + '" data-key="' + key + '" title="点击切换 通过/异常">' + esc(label) + ' · ' + stateTxt + '</button>';
  }
  function viewPhotoReview() {
    var rows = L.PHOTO_REVIEWS.map(function (p) {
      var stClass = p.status === 'ok' ? 'on' : (p.status === 'retake' ? 'bad' : 'accent');
      var stTxt = p.status === 'ok' ? '已复核' : (p.status === 'retake' ? '待补拍/改名' : '待复核');
      var checks = p.checks || { reflect: null, missing: null, naming: null };
      var canEdit = p.status === 'review' && isMine(p.reviewer);
      var checkHtml = '<div class="check3">' +
        chkChip('reflect', '照片能体现问题', checks.reflect, canEdit, p.sn) +
        chkChip('missing', '无遗漏未处理', checks.missing, canEdit, p.sn) +
        chkChip('naming', '命名无差错', checks.naming, canEdit, p.sn) +
        '</div>';
      var btn;
      if (p.status === 'review') {
        if (canEdit) {
          var allOk = checks.reflect === 1 && checks.missing === 1 && checks.naming === 1;
          btn = '<button class="btn btn-xs btn-primary" data-approve-photo data-owner="' + p.reviewer + '" data-sn="' + p.sn + '"' + (allOk ? '' : ' disabled title="三项核对未全部通过，无法复核通过"') + '>复核通过</button>' +
            ' <button class="btn btn-xs btn-ghost" data-reject-photo data-sn="' + p.sn + '">退回补拍</button>';
        } else {
          btn = '<span class="small dim">当前责任人 ' + esc(whoName(effId(p.reviewer))) + '</span>';
        }
      } else {
        btn = '<span class="faint">—</span>';
      }
      return '<tr><td class="mono">' + p.sn + '</td><td class="mono small">' + p.files.join(', ') + '</td>' +
        '<td class="small dim">' + esc(p.note) + '</td>' +
        '<td>' + checkHtml + '</td>' +
        '<td class="mono">' + p.due + '</td>' +
        '<td><span class="badge-pill ' + stClass + '">' + stTxt + '</span></td>' +
        '<td style="white-space:nowrap">' + btn + '</td></tr>';
    }).join('');

    return pageShell('照片复核', 'Amy · 三项核对：照片能否体现问题 / 是否遗漏 / 命名是否差错', '') +
      '<div class="card"><div class="card-head"><h3>复核清单</h3><div class="meta">三项全「通过」才可复核通过 → 签名 &amp; 传 F1 硬盘</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>SN</th><th>照片文件</th><th>备注</th><th>三项核对</th><th>时限</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="small dim mt-4" style="margin-top:14px">' +
      '核对项：① 照片能否体现该问题（reflect）② 是否遗漏未处理（missing）③ 照片命名是否差错（naming）；<br>' +
      '任一项「异常」→ 退回补拍/改名（retake）；三项全过 → 复核通过签名，传 F1 硬盘。' +
      '</div></div>';
  }

  function viewMyScripts() {
    var u = currentUser();
    var mine = L.SCRIPTS.filter(function (s) { return isScriptMine(s); });
    var rows = mine.map(function (s) {
      var runA = canRunScript(s)
        ? '<button class="btn btn-xs" data-script-run data-id="' + s.id + '">' + icon('play') + '运行</button>'
        : '<span class="small dim">' + (s.status === 'draft' ? '草稿' : '—') + '</span>';
      return '<tr><td class="mono">' + s.id + '</td><td>' + esc(s.name) + '</td>' +
        '<td>' + st(s.status) + ' ' + (s.status === 'enabled' ? '启用' : '草稿') + '</td>' +
        '<td class="mono">' + s.ver + '</td><td class="mono right">' + s.run + '</td>' +
        '<td class="mono">' + s.lastRun + '</td>' +
        '<td>' + hp(s.health) + '</td>' +
        '<td style="white-space:nowrap">' + runA + ' <button class="btn btn-xs btn-ghost" data-edit-code data-id="' + s.id + '" data-owner="' + s.owner + '">' + icon('code') + '编辑</button></td></tr>';
    }).join('');

    var myRuns = L.SCRIPT_RUNS.filter(function (r) { return r.user === state.userId; }).slice(0, 6);
    var runRows = myRuns.map(function (r) {
      return '<tr><td class="mono">' + esc(r.t) + '</td><td class="mono">' + esc(r.script) + '</td>' +
        '<td>' + esc(triggerLabel(r.trigger)) + '</td><td>' + runBadge(r) + '</td>' +
        '<td class="dim small">' + esc(r.note || (r.input + ' → ' + r.output)) + '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="dim">暂无运行记录。</td></tr>';

    return pageShell('我的脚本', esc(u.name) + ' · 注册中心中的所属脚本（方向③）', '') +
      '<div class="card"><div class="card-head"><h3>授权脚本</h3><div class="meta">' + mine.length + ' 个 · 统一 Git 版本 · Owner / 协作人可运行</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>ID</th><th>名称</th><th>状态</th><th>版本</th><th>运行</th><th>上次</th><th>健康</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>我最近的运行</h3><div class="meta">最近 6 条 · 每次运行留痕 输入/输出/结果</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>时间</th><th>脚本</th><th>触发</th><th>结果</th><th>说明</th></tr></thead>' +
      '<tbody>' + runRows + '</tbody></table></div></div>';
  }

  /* ---- 管理员视图（方向②③监管面） ---- */
  function viewAdminDashboard() {
    var totalNodes = L.STATION_DEFS.length;
    var subCount = L.STATION_DEFS.reduce(function (s, d) { return s + (d.subNodes ? d.subNodes.length : 0); }, 0);
    var totalDicts = (L.DICTS || []).length;
    var totalOpts = (L.DICTS || []).reduce(function (s, d) { return s + d.options.length; }, 0);
    var msFields = (L.FORM_TEMPLATES || []).filter(function (t) { return t.cat === 'report'; }).reduce(function (s, t) {
      return s + (t.fields || []).filter(function (f) { return f.type === '多选下拉'; }).length;
    }, 0);
    var sheets = (L.REPORT_SHEETS || []).length;
    return pageShell('平台总览', '聚焦两大核心能力：自定义工作节点 + 报告纸。所有下拉数据统一来自「字典中心」（一处修改，多处生效）',
      '<a class="btn btn-primary" href="#/defs">' + icon('clipboard') + '作业定义中心</a>' +
      '<a class="btn btn-ghost" href="#/dicts">' + icon('list') + '字典中心</a>') +
      '<div class="kpi-row">' +
      '<div class="kpi"><div class="k-label">作业节点</div><div class="k-value">' + totalNodes + '</div><div class="k-foot">T0 / TX / TF 阶段城</div></div>' +
      '<div class="kpi isBlue"><div class="k-label">子节点细分</div><div class="k-value">' + subCount + '</div><div class="k-foot">仅负责人本人可见</div></div>' +
      '<div class="kpi isTeal"><div class="k-label">字典 / 选项</div><div class="k-value">' + totalDicts + '<small> / ' + totalOpts + '</small></div><div class="k-foot">一处修改多处生效</div></div>' +
      '<div class="kpi"><div class="k-label">报告纸多选栏位</div><div class="k-value">' + msFields + '</div><div class="k-foot">' + sheets + ' 台机报告纸数据</div></div>' +
      '</div>' +
      '<div class="card mt-4"><div class="card-head"><h3>配置主线（推荐顺序）</h3><div class="meta">一处定义 → 多处派生，0 手工同步</div></div>' +
      '<div class="stepper">' +
      '<div class="step-item"><div class="no">01</div><div class="nm">字典中心</div><div class="act">任务类型 / 外观问题 / 测试结论 等选项统一维护</div></div>' +
      '<div class="step-item"><div class="no">02</div><div class="nm">作业定义中心</div><div class="act">节点勾选任务点 + 子节点细分（各有负责人）</div></div>' +
      '<div class="step-item"><div class="no">03</div><div class="nm">流程排配</div><div class="act">节点序 + 负责人绑定 + 请假委托</div></div>' +
      '<div class="step-item"><div class="no">04</div><div class="nm">报告纸模板</div><div class="act">栏位配置，多选下拉引用字典</div></div>' +
      '</div></div>' +
      '<div class="grid-2 mt-4">' +
      '<div class="card"><div class="card-head"><h3>运行演示</h3></div><div class="small dim" style="padding:10px 2px;line-height:2">' +
      '· 操作员：<a href="#/travel-sheet" style="color:var(--accent)">节点作业</a>（任务点 + 仅本人可见的子节点）<br>' +
      '· 报告纸：<a href="#/report" style="color:var(--accent)">上传 Excel 生成</a>（多选下拉来自字典）</div></div>' +
      '<div class="card"><div class="card-head"><h3>子节点可见性</h3></div><div class="small dim" style="padding:10px 2px;line-height:2">' +
      '子节点仅对应负责人本人（或委托代理）可见；管理员 / F1 审核员可见全部。示例：外观目检拆「检测外观(Tammy) / 拍照(Lucky) / 核对(Amy)」。</div></div>' +
      '</div></div>';
  }

  function st(s) { /* 状态色：状态文本 -> badge 前缀 */
    var map = { enabled: 'ok', disabled: 'off', draft: 'warn', success: 'ok', fail: 'bad', warn: 'warn' };
    return '<span class="badge-pill ' + (map[s] || 'gray') + '">' + esc(s) + '</span>';
  }
  function hp(h) { return h === 'ok' ? '<span class="badge-pill ok">正常</span>' : '<span class="badge-pill warn">空闲</span>'; }
  function nameBadge(id) { return id === '—' ? '<span class="faint mono">—</span>' : '<span class="tag">' + esc(userName(id)) + '</span>'; }

  /* ---------------- 脚本注册中心：帮助函数 ---------------- */
  function scriptById(id) {
    return L.SCRIPTS.filter(function (x) { return x.id === id; })[0] || null;
  }
  function scriptVerNext(v) {
    var m = /v(\d+)\.(\d+)\.(\d+)/.exec(v || 'v1.0.0');
    if (!m) return 'v1.1.0';
    return 'v' + m[1] + '.' + (parseInt(m[2], 10) + 1) + '.' + m[3];
  }
  function catLabel(c) {
    var m = { excel: 'Excel', convert: '转换', aggregate: '汇总', system: '系统', naming: '命名', sync: '同步', backup: '备份', radar: '雷达', print: '打印' };
    return m[c] || c || '—';
  }
  function isScriptMine(s) {
    if (state.mode === 'admin') return true;
    if (s.owner === state.userId) return true;
    return (s.linkUsers || []).indexOf(state.userId) >= 0;
  }
  function canRunScript(s) { return s.status === 'enabled' && isScriptMine(s); }
  function triggerLabel(t) { return t === '自动触发' ? '自动' : t === '调度触发' ? '调度' : '手动'; }
  function runBadge(r) {
    return r.result === 'ok' ? '<span class="badge-pill ok">成功</span>'
      : r.result === 'warn' ? '<span class="badge-pill warn">需关注</span>'
      : r.result === 'skip' ? '<span class="badge-pill off">跳过</span>'
      : '<span class="badge-pill bad">失败</span>';
  }
  function hpBadge(s) {
    if (s.health === 'ok') return '<span class="badge-pill ok">正常</span>';
    if (s.health === 'warn' || s.health === 'fail') return '<span class="badge-pill warn">' + (s.health === 'fail' ? '失败' : '需关注') + '</span>';
    return '<span class="badge-pill gray">空闲</span>';
  }
  function runConsoleLines(r) {
    var stt = { ok: '"ok"', warn: '"warn"', skip: '"skip"', fail: '"fail"' }[r.result] || '"ok"';
    return [
      '$ run ' + r.script + (r.trigger === '调度触发' ? ' --via scheduler' : ''),
      '> 读取标准输入：' + (r.input || '—'),
      '> 输出目标：' + (r.output || '—'),
      '> 执行中…（' + (r.dur || '—') + '）',
      '> 完成：{status:' + stt + ', data: N 台, diff_report: D, errors: E}'
    ];
  }
  function scriptFilterState() { return { stage: '', cat: '', health: '', q: '' }; }
  var scriptFilter = scriptFilterState();
  function infoRow(k, v) {
    return '<div class="info-li"><div class="i-k">' + esc(k) + '</div><div class="i-v">' + v + '</div></div>';
  }

  /* ---------------- 脚本详情子页（注册中心下钻） ---------------- */
  function viewScriptDetail() {
    var id = (/\?id=([\w-]+)/.exec(location.hash) || [])[1];
    var s = scriptById(id);
    if (!s) {
      return pageShell('脚本详情', '未找到脚本 ' + esc(id || '—'), '<a class="btn btn-ghost" href="#/admin-scripts">' + icon('arrow') + '返回注册中心</a>') +
        '<div class="card"><div class="small dim">脚本不存在，可能已被移除。</div></div>';
    }
    var runs = L.SCRIPT_RUNS.filter(function (r) { return r.script === s.id; });
    var runBtn = canRunScript(s)
      ? '<button class="btn btn-primary" data-script-run data-id="' + s.id + '">' + icon('play') + '运行脚本</button>'
      : '<span class="btn btn-primary" style="opacity:.5;cursor:not-allowed">' + (s.status === 'draft' ? '草稿未发布' : '无权运行') + '</span>';
    return pageShell('脚本 · ' + esc(s.name),
      '<span class="mono">' + esc(s.id) + '</span> · ' + esc(catLabel(s.category)) + ' · 责任人 ' + esc(userName(s.owner)) +
      (s.tool ? ' · 工具 <code>' + esc(s.tool) + '</code>' : '') + ' · 统一 Git 版本管理', 
      '<a class="btn btn-ghost" href="#/admin-scripts">' + icon('arrow') + '返回注册中心</a>' + runBtn) +
      scriptMetaCard(s) +
      '<div class="grid-pair">' + scriptFileCard(s) + scriptCodeCard(s) + '</div>' +
      scriptParamsCard(s) +
      scriptSchedCard(s) +
      scriptRunsCard(s, runs);
  }

  function scriptMetaCard(s) {
    var links = (s.linkUsers || []).length
      ? s.linkUsers.map(function (u) { return nameBadge(u); }).join(' ')
      : '<span class="faint small">—</span>';
    return '<div class="card"><div class="card-head"><h3>基本信息</h3><div class="meta">' + esc(s.id) + ' · 注册中心条目</div></div>' +
      '<div class="info-grid">' +
      infoRow('脚本 ID', '<span class="mono">' + esc(s.id) + '</span>') +
      infoRow('环节', esc(s.stage || '—')) +
      infoRow('类别', catLabel(s.category)) +
      infoRow('绑定工具', s.tool ? '<code>' + esc(s.tool) + '</code>' : '<span class="faint">—</span>') +
      infoRow('责任人', esc(userName(s.owner))) +
      infoRow('协作人', links) +
      infoRow('当前版本', '<span class="mono">' + esc(s.ver) + '</span> · ' + (s.files || []).length + ' 个版本') +
      infoRow('状态', st(s.status)) +
      infoRow('健康', hpBadge(s)) +
      infoRow('累计运行', '<span class="mono right">' + s.run + '</span> 次') +
      infoRow('上次运行', s.lastRun || '—') +
      '</div></div>';
  }

  function scriptFileCard(s) {
    var cur = s.file || {};
    var files = (s.files || []).map(function (f, i) {
      return '<div class="ver-li' + (i === 0 ? ' current' : '') + '">' +
        '<div class="ver-h"><span class="mono">' + esc(f.ver) + '</span>' + (i === 0 ? ' <span class="badge-pill ok">当前</span>' : ' <span class="badge-pill gray">历史</span>') + '</div>' +
        '<div class="dim small">' + esc(f.name) + ' · ' + esc(f.size) + ' · ' + esc(f.by ? userName(f.by) : '—') + ' · ' + esc(f.at) + '</div>' +
        (f.note ? '<div class="dim small">' + esc(f.note) + '</div>' : '') + '</div>';
    }).join('') || '<div class="small dim">暂无版本记录。</div>';
    var btns = '<div class="acts" style="margin-top:12px">' +
      '<button class="btn btn-primary" data-upload-ver data-id="' + s.id + '" data-owner="' + s.owner + '">' + icon('upload') + '上传新版本</button>' +
      '<button class="btn btn-xs btn-ghost" data-edit-code data-id="' + s.id + '" data-owner="' + s.owner + '">' + icon('code') + '编辑内容</button>' +
      '<button class="btn btn-xs btn-ghost" data-rollback data-id="' + s.id + '">' + icon('refresh') + '回滚</button>' +
      '<button class="btn btn-xs btn-ghost" data-dl-script data-id="' + s.id + '">' + icon('file') + '下载</button></div>';
    return '<div class="card"><div class="card-head"><h3>脚本文件与版本</h3><div class="meta">' + esc(s.lang || 'python') + ' · 只增不改 · 新上传即新版本</div></div>' +
      '<div class="ver-cur"><div class="ver-name">' + icon('file') + esc(cur.name || '—') + '</div>' +
      '<div class="dim small">' + (cur.size || '—') + ' · 当前版本 ' + esc(s.ver) + ' · 上传/保存后自动生成新版本，历史可回滚</div></div>' +
      '<div class="ver-list">' + files + '</div>' + btns + '</div>';
  }

  function scriptCodeCard(s) {
    return '<div class="card"><div class="card-head"><h3>代码内容</h3><div class="meta">' + esc((s.file && s.file.name) || s.id + '.py') + ' · Python</div></div>' +
      '<pre class="code-area">' + esc(s.code || '# 暂无代码') + '</pre>' +
      '<div class="acts" style="margin-top:12px">' +
      '<button class="btn btn-ghost" data-edit-code data-id="' + s.id + '" data-owner="' + s.owner + '">' + icon('code') + '打开编辑器</button>' +
      '<button class="btn btn-xs btn-ghost" data-check-syntax data-id="' + s.id + '">语法检查</button></div></div>';
  }

  function scriptParamsCard(s) {
    var rows = (s.params || []).map(function (p) {
      var typeLabel = { path: '文件路径', text: '文本', date: '日期', select: '下拉' }[p.type] || p.type;
      return '<tr><td class="mono">' + esc(p.key) + '</td><td>' + esc(p.label) + '</td>' +
        '<td>' + esc(typeLabel) + '</td><td class="mono">' + esc(String(p.def)) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="dim">暂无参数。</td></tr>';
    return '<div class="card"><div class="card-head"><h3>运行参数模板</h3><div class="meta">运行模态按此生成表单 · 路径运行前可改</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>参数 key</th><th>名称</th><th>类型</th><th>默认值</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="acts" style="margin-top:12px"><button class="btn btn-xs btn-ghost" data-add-param data-id="' + s.id + '">' + icon('plus') + '添加参数</button></div></div>';
  }

  function scriptSchedCard(s) {
    var list = L.SCHEDULE_TASKS.filter(function (t) { return t.script === s.id; });
    var rows = list.map(function (t) {
      var sc = t.status === 'warn' ? ['warn', '需关注'] : ['ok', '成功'];
      return '<tr><td class="mono">' + t.id + '</td><td>' + esc(t.name) + '</td>' +
        '<td class="mono">' + esc(t.cron) + '</td><td>' + esc(userName(t.owner)) + '</td>' +
        '<td class="mono">' + esc(t.last) + '</td><td class="mono">' + esc(t.next) + '</td>' +
        '<td><span class="badge-pill ' + sc[0] + '">' + sc[1] + '</span></td>' +
        '<td><label class="switch"><input type="checkbox" data-sched-toggle data-id="' + t.id + '"' + (t.enable ? ' checked' : '') + '><span></span></label></td></tr>';
    }).join('');
    return '<div class="card"><div class="card-head"><h3>定时任务</h3><div class="meta">' + list.length + ' 个排程绑定 · 与「定时调度」互通</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>ID</th><th>任务</th><th>排程</th><th>Owner</th><th>上次</th><th>下次</th><th>结果</th><th>启用</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="8" class="dim">尚未绑定定时任务，可在运行模态「存为定时任务」。</td></tr>') + '</tbody></table></div>' +
      '<div class="acts" style="margin-top:12px"><button class="btn btn-primary" data-add-sched data-script="' + s.id + '" data-owner="' + s.owner + '">' + icon('clock') + '新建排程</button></div></div>';
  }

  function scriptRunsCard(s, runs) {
    var rows = runs.slice(0, 20).map(function (r) {
      return '<tr><td class="mono">' + esc(r.t) + '</td><td>' + esc(triggerLabel(r.trigger)) + '</td><td>' + esc(userName(r.user)) + '</td>' +
        '<td class="mono">' + esc(r.dur || '—') + '</td><td>' + runBadge(r) + '</td>' +
        '<td class="small mono"><span class="faint">' + esc(r.input || '—') + '</span> <span class="faint">→</span> <span class="faint">' + esc(r.output || '—') + '</span></td>' +
        '<td><button class="btn btn-xs btn-ghost" data-run-detail data-id="' + r.id + '">' + icon('eye') + '详情</button></td></tr>';
    }).join('') || '<tr><td colspan="7" class="dim">暂无运行记录。</td></tr>';
    return '<div class="card"><div class="card-head"><h3>运行记录</h3><div class="meta">' + runs.length + ' 条 · 统一 3 种触发方式（手动 / 调度 / 自动）</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>时间</th><th>触发</th><th>执行人</th><th>时长</th><th>结果</th><th>输入 → 输出</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>';
  }

  function pageShell(t, sub, acts) {
    return '<div class="page"><div class="page-head"><div><h2>' + esc(t) + '</h2>' +
      '<div class="sub">' + sub + '</div></div><div class="acts">' + (acts || '') + '</div></div>';
  }

  function stepper(total, cur, labels) {
    var items = [];
    for (var i = 1; i <= total; i++) {
      var cls = i === cur ? 'current' : (i < cur ? 'done' : '');
      items.push('<div class="step-item ' + cls + '"><div class="no">' + (i < cur ? '✓' : '0' + i) + '</div>' +
        '<div class="nm">' + esc(labels[i - 1][0]) + '</div><div class="act">' + esc(labels[i - 1][1]) + '</div></div>');
    }
    return '<div class="stepper">' + items.join('') + '</div>';
  }

  function viewAdminScripts() {
    var f = scriptFilter;
    var list = L.SCRIPTS.filter(function (s) {
      if (f.stage && s.stage !== f.stage) return false;
      if (f.cat && catLabel(s.category) !== f.cat) return false;
      if (f.health) {
        if (f.health === 'warn') { if (s.health !== 'warn' && s.health !== 'fail') return false; }
        else if (s.health !== f.health) return false;
      }
      if (f.q && s.id.indexOf(f.q.toUpperCase()) < 0 && s.name.indexOf(f.q) < 0) return false;
      return true;
    });
    var rows = list.map(function (s) {
      var runBtn = canRunScript(s)
        ? '<button class="btn btn-xs" data-script-run data-id="' + s.id + '">' + icon('play') + '运行</button>'
        : '<span class="small dim">' + (s.status === 'draft' ? '草稿' : '无权') + '</span>';
      return '<tr><td class="mono"><a href="#/admin-script-detail?id=' + s.id + '">' + esc(s.id) + '</a></td><td>' + esc(s.name) + '</td>' +
        '<td>' + esc(s.stage) + '</td>' +
        '<td><span class="badge-pill gray">' + esc(catLabel(s.category)) + '</span></td>' +
        '<td class="mono">' + esc(s.lang || '—') + '</td>' +
        '<td>' + esc(userName(s.owner)) + '</td><td class="mono">' + s.ver + '</td>' +
        '<td>' + st(s.status) + '</td><td>' + hp(s.health) + '</td>' +
        '<td class="mono right">' + s.run + '</td><td class="mono">' + (s.lastRun || '—') + '</td>' +
        '<td style="white-space:nowrap"><a class="btn btn-xs btn-ghost" href="#/admin-script-detail?id=' + s.id + '">' + icon('eye') + '详情</a> ' +
        runBtn + ' <button class="btn btn-xs btn-ghost" data-upload-ver data-id="' + s.id + '" data-owner="' + s.owner + '">' + icon('upload') + '</button></td></tr>';
    }).join('');

    var runToday = 0;
    L.RUN_LOGS.forEach(function (r) { if (r.script !== '—' && /09-17/.test(r.time)) runToday++; });
    var drafts = L.SCRIPTS.filter(function (s) { return s.status === 'draft'; }).length;
    var op = function (sel, arr) {
      return arr.map(function (v) { return '<option' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('');
    };
    var stageOpts = ['', 'Report/Recon', 'Report', 'Mini line', 'Test Center', 'Photo Station', 'Photo Review', 'Cosmetic', 'FA'];
    var catOpts = ['', 'Excel', '转换', '汇总', '系统', '命名', '同步', '备份', '雷达', '打印'];
    var healthOpts = ['', 'ok', 'warn', 'idle'];

    return pageShell('脚本注册中心', '19 個腳本 100% 入库 · 统一 Git + 责任人（方向③）', '<button class="btn btn-primary" data-add-script>' + icon('plus') + '新增脚本</button>') +
      '<div class="kpi-row">' +
      '<div class="kpi"><div class="k-label">注册脚本</div><div class="k-value">' + L.SCRIPTS.length + '</div><div class="k-foot">19/19 已注册</div></div>' +
      '<div class="kpi isTeal"><div class="k-label">运行记录</div><div class="k-value">' + L.SCRIPT_RUNS.length + '</div><div class="k-foot">统一 3 种触发</div></div>' +
      '<div class="kpi"><div class="k-label">今日运行</div><div class="k-value">' + runToday + '</div><div class="k-foot">脚本执行次数</div></div>' +
      '<div class="kpi isRed"><div class="k-label">草稿</div><div class="k-value">' + drafts + '</div><div class="k-foot">' + (drafts === 0 ? '全部已发布' : '待联调发布') + '</div></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><h3>筛选</h3><div class="meta">点击 ID / 详情进入脚本管理页</div></div>' +
      '<div class="filter-row">' +
      '<div class="f-item"><label>环节</label><select data-f-stage>' + op(f.stage, stageOpts) + '</select></div>' +
      '<div class="f-item"><label>类别</label><select data-f-cat>' + op(f.cat, catOpts) + '</select></div>' +
      '<div class="f-item"><label>健康</label><select data-f-health>' + op(f.health, healthOpts) + '</select></div>' +
      '<div class="f-item grow"><input type="search" placeholder="按 ID / 名称过滤（回车）" value="' + esc(f.q || '') + '" data-f-q></div>' +
      '</div></div>' +
      '<div class="card"><div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>ID</th><th>名称</th><th>环节</th><th>类别</th><th>语言</th><th>Owner</th><th>版本</th><th>状态</th><th>健康</th><th class="right">运行</th><th>上次</th><th>操作</th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="12" class="dim">无匹配脚本。</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>脚本工具化说明</h3></div>' +
      '<div class="small dim" style="line-height:2">' +
      '· 每个脚本 = 文件（版本历史）+ 内容（代码编辑器）+ 运行参数模板（路径/日期/模式），上传与保存都只增不改生成新版本<br>' +
      '· 手动运行 / 定时运行 / Agent 自动触发三类调用统一走同一条运行记录流水（输入 → 输出 → 结果）<br>' +
      '· 版本与运行历史全部留痕，呼应痛点 3「脚本统一注册、版本、输入输出格式统一管理」</div></div>';
  }

  function viewAdminForms() {
    var rows = L.FORM_TEMPLATES.map(function (f) {
      var stages = f.stage;
      return '<tr><td class="mono">' + f.key + '</td><td>' + esc(f.name) + (f.header ? ' <span class="badge-pill accent">含基础信息</span>' : '') + '</td>' +
        '<td>' + esc(stages) + '</td><td class="mono right">' + (f.fields ? f.fields.length : 0) + '</td><td class="mono right">' + f.nodes + '</td>' +
        '<td>' + f.owner.map(function (o) { return nameBadge(o); }).join(' ') + '</td>' +
        '<td class="mono">' + f.version + '</td>' +
        '<td>' + (f.status === 'active' ? '<span class="badge-pill ok">启用</span>' : '<span class="badge-pill warn">草稿</span>') + '</td>' +
        '<td style="white-space:nowrap"><button class="btn btn-xs" data-preview-form data-key="' + f.key + '">' + icon('eye') + '预览</button> ' +
        '<button class="btn btn-xs btn-ghost" data-edit-form data-key="' + f.key + '">配置字段</button></td></tr>';
    }).join('');

    /* 当前启用模板的纸表预览（快速看版式，无需进编辑） */
    var activeTpl = (L.FORM_TEMPLATES.filter(function (t) { return t.key === 'travel_sheet'; })[0]) || L.FORM_TEMPLATES[0] || null;
    var paper = activeTpl ? fdPreviewHtml(activeTpl.fields, activeTpl.name, activeTpl.key + ' · ' + activeTpl.version, activeTpl.header) : '<div class="faint small">暂无模板</div>';

    return pageShell('电子表单模板', '方向① · 纸表式电子表单设计器：像日常纸质表单一样定义格子（宽/高/类型/必填都可自定义），「配置字段」实时预览、「预览」查看纸表版式', '<button class="btn btn-primary" data-add-form>' + icon('plus') + '新建模板</button>') +
      '<div class="card"><div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>Key</th><th>模板</th><th>阶段</th><th>字段</th><th>环节</th><th>授权人</th><th>版本</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>' + (activeTpl ? '纸表版式预览 · ' + esc(activeTpl.name) : '纸表版式预览') + '</h3>' +
      '<div class="meta">由字段格子派生；编辑后保存自动按新版本重排</div></div>' + paper + '</div>' +
      '<div class="card mt-4"><div class="card-head"><h3>Travel Sheet 环节流</h3><div class="meta">模仿纸本版式，一次录入多环节复用</div></div>' +
      '<div class="stepper">' + L.TS_NODES.map(function (n) {
        return '<div class="step-item"><div class="no">0' + n.node + '</div><div class="nm">' + esc(n.name) + '</div>' +
          '<div class="act">' + esc(userName(n.role)) + ' · ' + esc(n.action) + '</div></div>';
      }).join('') + '</div></div>';
  }

  /* 权限范围（由 ROLES 派生：菜单入口 + 按钮权限字符 + 数据权限 + 该角色成员负责的脚本工具，读数据不写死） */
  function roleScope(role) {
    var r = roleById(role);
    if (!r) return '';
    var keys = r.menus || [];
    var menuLabels = [], perms = [];
    (L.MENUS || []).forEach(function (m) {
      if (keys.indexOf('*') >= 0 || keys.indexOf(m.key) >= 0) {
        if (m.type === 'F') perms.push(m.name);
        else if (m.type === 'C') menuLabels.push(m.name);
      }
    });
    var uids = L.USERS.filter(function (u) { return hasRole(u, role); }).map(function (u) { return u.id; });
    var tools = [];
    (L.SCRIPTS || []).forEach(function (s) {
      if (uids.indexOf(s.owner) >= 0 && s.tool && tools.indexOf(s.tool) < 0) tools.push(s.tool);
    });
    var scope = '｜数据权限：' + dataScopeLabel(r.dataScope);
    if (keys.indexOf('*') >= 0) return '全部菜单 / 全部按钮权限' + scope;
    return menuLabels.join(' · ') +
      (perms.length ? '｜按钮：' + perms.join(' / ') : '') +
      (tools.length ? ' · ' + tools.join(' / ') : '') + scope;
  }

  /* ---------------- 组织架构：部门树 + 成员分页 ---------------- */
  var MEMBER_ORG = 'all';     /* 当前选中部门节点（'all' = 全部成员） */
  var MEMBER_PAGE = 1;        /* 当前页码 */
  var MEMBER_PAGE_SIZE = 5;   /* 每页条数 */

  function findOrg(id) {
    var found = null;
    (function walk(nodes) {
      (nodes || []).forEach(function (n) {
        if (n.id === id) found = n;
        else if (!found) walk(n.children);
      });
    })(L.ORGS || []);
    return found;
  }
  /* 部门及其所有子部门的 id 集合（用于点击父节点过滤到整棵子树） */
  function orgSubtreeIds(id) {
    var n = findOrg(id);
    if (!n) return [id];
    var out = [];
    (function collect(x) { out.push(x.id); (x.children || []).forEach(collect); })(n);
    return out;
  }
  function membersForOrg() {
    if (MEMBER_ORG === 'all') return L.USERS.slice();
    var ids = orgSubtreeIds(MEMBER_ORG);
    return L.USERS.filter(function (u) { return ids.indexOf(u.orgId) >= 0; });
  }
  function memberPageSlice() {
    var list = membersForOrg();
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE));
    if (MEMBER_PAGE > pages) MEMBER_PAGE = pages;
    var start = (MEMBER_PAGE - 1) * MEMBER_PAGE_SIZE;
    return { list: list.slice(start, start + MEMBER_PAGE_SIZE), total: total, pages: pages };
  }
  function orgTreeHtml() {
    var items = ['<div class="org-node' + (MEMBER_ORG === 'all' ? ' on' : '') + '" data-org="all"><span class="org-ico">' + icon('users') + '</span>全部成员</div>'];
    (L.ORGS || []).forEach(function (n) {
      var hasKids = n.children && n.children.length;
      if (hasKids) {
        items.push('<div class="org-node group' + (MEMBER_ORG === n.id ? ' on' : '') + '" data-org="' + n.id + '"><span class="org-caret">▾</span><span class="org-ico">' + icon('archive') + '</span>' + esc(n.name) + '</div>');
        n.children.forEach(function (c) {
          items.push('<div class="org-node leaf' + (MEMBER_ORG === c.id ? ' on' : '') + '" data-org="' + c.id + '"><span class="org-ico">' + icon('users') + '</span>' + esc(c.name) + '</div>');
        });
      } else {
        items.push('<div class="org-node leaf' + (MEMBER_ORG === n.id ? ' on' : '') + '" data-org="' + n.id + '"><span class="org-ico">' + icon('users') + '</span>' + esc(n.name) + '</div>');
      }
    });
    return items.join('');
  }

  function viewAdminMembers() {
    var slice = memberPageSlice();
    var roleCount = Object.keys(ROLE_CN).length;
    var rows = slice.list.map(function (u) {
      var stBadge = u.status === 'disabled' ? '<span class="badge-pill off">停用</span>' : '<span class="badge-pill ok">在职</span>';
      var roleCells = roleIdsOf(u).map(function (rid) {
        return rid === 'admin' ? '<span class="badge-pill accent">管理员</span>'
          : '<span class="badge-pill info">' + esc(ROLE_CN[rid] || rid) + '</span>';
      }).join(' ');
      return '<tr><td class="mono">' + esc(u.id) + '</td><td>' + esc(u.name) + '</td>' +
        '<td>' + roleCells + '</td>' +
        '<td>' + esc(postNamesOf(u)) + '</td>' +
        '<td>' + esc(u.dept) + '</td>' +
        '<td class="mono small">' + esc(u.phone || '—') + '</td>' +
        '<td class="mono small">' + esc(u.email || '—') + '</td>' +
        '<td>' + stBadge + '</td>' +
        '<td style="white-space:nowrap">' +
        '<button class="btn btn-xs btn-primary" data-member-switch data-uid="' + u.id + '" title="以该身份进入工作台，验证页面路由 ACL">进入</button> ' +
        '<button class="btn btn-xs btn-ghost" data-edit-member data-uid="' + u.id + '">编辑</button></td></tr>';
    }).join('');

    var pageOpts = [5, 10].map(function (n) {
      return '<option value="' + n + '"' + (MEMBER_PAGE_SIZE === n ? ' selected' : '') + '>' + n + ' 条/页</option>';
    }).join('');
    var pager = '<div class="pager">' +
      '<span class="small dim">共 ' + slice.total + ' 人 · ' + slice.pages + ' 页</span>' +
      '<div class="pager-acts">' +
      '<select data-member-size>' + pageOpts + '</select>' +
      '<button class="btn btn-xs btn-ghost" data-member-prev' + (MEMBER_PAGE <= 1 ? ' disabled' : '') + '>上一页</button>' +
      '<span class="mono">' + MEMBER_PAGE + ' / ' + slice.pages + '</span>' +
      '<button class="btn btn-xs btn-ghost" data-member-next' + (MEMBER_PAGE >= slice.pages ? ' disabled' : '') + '>下一页</button>' +
      '</div></div>';

    return pageShell('用户管理', '部门树 + 成员分页 · 点击左侧部门节点过滤成员（父节点含子部门）',
      '<button class="btn btn-primary" data-add-member>' + icon('plus') + '添加成员</button>') +
      '<div class="kpi-row">' +
      '<div class="kpi"><div class="k-label">成员总数</div><div class="k-value">' + L.USERS.length + '</div><div class="k-foot">含客户账号</div></div>' +
      '<div class="kpi isTeal"><div class="k-label">角色</div><div class="k-value">' + roleCount + '</div><div class="k-foot">数据驱动 RBAC</div></div>' +
      '<div class="kpi isBlue"><div class="k-label">当前部门成员</div><div class="k-value">' + slice.total + '</div><div class="k-foot">' + (MEMBER_ORG === 'all' ? '全部' : esc((findOrg(MEMBER_ORG) || {}).name || MEMBER_ORG)) + '</div></div>' +
      '<div class="kpi"><div class="k-label">生效委托</div><div class="k-value">' + L.LEAVES.filter(function (l) { return l.status === 'active'; }).length + '</div><div class="k-foot">节点待办改派代理人</div></div>' +
      '</div>' +
      '<div class="org-layout">' +
      '<div class="card org-tree"><div class="card-head"><h3>' + icon('users') + ' 部门</h3></div>' + orgTreeHtml() + '</div>' +
      '<div class="card org-main"><div class="card-head"><h3>成员清单</h3><div class="meta">点击左侧部门过滤 · 支持翻页</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>账号</th><th>姓名</th><th>角色</th><th>岗位</th><th>部门</th><th>电话</th><th>邮箱</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' + pager + '</div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>权限模型</h3></div>' +
      '<div class="rule-list">' +
      '<div>① 页面路由 ACL：只能打开自己「有效岗位集」允许的页面（PAGE_ACL 由角色菜单反向推导），角色不足 → 403。</div>' +
      '<div>② 按钮级权限：页内操作按钮按角色勾选的 F 型菜单（权限字符 perms）控制，与「任务归属」二次校验正交。</div>' +
      '<div>③ 委托改派：登记请假后，待办 / 通知路由到「当前责任人（代理人）」，审计保留实际执行人。</div>' +
      '<div>④ 编辑成员 = 改 L.USERS 一份数据，侧边栏 / 工作台 / 登录卡片 / 权限校验即时同步，无需逐处改。</div>' +
      '</div></div>';
  }

  /* ---------------- 角色管理（数据驱动 RBAC 配置） ---------------- */
  function viewAdminRoles() {
    var cards = L.ROLES.map(function (r) {
      var memberCount = L.USERS.filter(function (u) { return hasRole(u, r.id); }).length;
      var keys = r.menus || [];
      var menuLabels = [], permLabels = [];
      (L.MENUS || []).forEach(function (m) {
        if (keys.indexOf('*') >= 0 || keys.indexOf(m.key) >= 0) {
          if (m.type === 'F') permLabels.push(m.name);
          else if (m.type === 'C') menuLabels.push(m.name);
        }
      });
      if (keys.indexOf('*') >= 0) menuLabels = ['全部菜单'];
      var scopeBadge = r.dataScope === '1' ? '<span class="badge-pill accent">全部数据</span>'
        : '<span class="badge-pill info">' + esc(dataScopeLabel(r.dataScope)) + '</span>';
      return '<div class="card"><div class="card-head"><h3>' + esc(r.name) + '</h3>' +
        (r.status === 'disabled' ? '<span class="badge-pill off">已停用</span>' : '<span class="badge-pill ok">启用</span>') + '</div>' +
        '<div class="info-grid">' +
        infoRow('角色 ID', '<span class="mono">' + esc(r.id) + '</span>') +
        infoRow('负责站点', esc(r.station)) +
        infoRow('分组', esc(r.group)) +
        infoRow('成员数', '<b>' + memberCount + '</b> 人') +
        infoRow('数据权限', scopeBadge) +
        infoRow('可见菜单', '<span class="small">' + esc(menuLabels.join(' / ')) + '</span>') +
        infoRow('按钮权限', '<span class="small">' + esc(permLabels.join(' / ') || '—') + '</span>') +
        '</div>' +
        '<div class="acts" style="margin-top:12px;justify-content:flex-start">' +
        '<button class="btn btn-xs btn-primary" data-edit-role data-id="' + esc(r.id) + '">配置</button> ' +
        '<button class="btn btn-xs btn-ghost" data-toggle-role data-id="' + esc(r.id) + '">' + (r.status === 'disabled' ? '启用' : '停用') + '</button></div></div>';
    }).join('');

    return pageShell('角色管理', '数据驱动 RBAC · 角色可配置菜单树（M/C/F）/ 数据权限 / 站点 / 成员，保存即时生效',
      '<button class="btn btn-primary" data-add-role>' + icon('plus') + '新增角色</button>') +
      '<div class="grid-2 mt-4">' + cards + '</div>' +
      '<div class="card mt-4"><div class="card-head"><h3>权限模型</h3></div><div class="rule-list">' +
      '<div>菜单权限 = 角色勾选 MENUS 树（M 目录 / C 菜单 / F 按钮），C 决定侧边栏入口，F 决定页内操作按钮。</div>' +
      '<div>数据权限 = dataScope（全部 / 自定义部门 / 本部门及以下 / 仅本人），用于过滤可见业务数据范围。</div>' +
      '<div>停用角色后，其成员登录卡片隐藏、页面/按钮授权失效（内置管理员角色不可停用）。</div>' +
      '</div></div>';
  }

  /* 菜单树勾选（角色授权）：M/C/F 三级 + 类型徽标 + 权限字符；'*' 角色全选展示 */
  function menuTreeChecksHtml(selected) {
    var allOn = selected.indexOf('*') >= 0;
    function node(m) {
      var kids = menuChildren(m.key, true);
      var on = allOn || selected.indexOf(m.key) >= 0;
      var typeTag = { M: '目录', C: '菜单', F: '按钮' }[m.type] || m.type;
      return '<div class="mt-node mt-' + m.type.toLowerCase() + '">' +
        '<label class="chk"><input type="checkbox" data-rmenu value="' + esc(m.key) + '" data-parent="' + esc(m.parent || '') + '"' + (on ? ' checked' : '') + '>' +
        '<span class="mt-name">' + esc(m.name) + '</span>' +
        '<span class="mt-badge ' + m.type.toLowerCase() + '">' + typeTag + '</span>' +
        (m.perms ? '<span class="mt-perms mono">' + esc(m.perms) + '</span>' : '') +
        '</label>' + (kids.length ? '<div class="mt-kids">' + kids.map(node).join('') + '</div>' : '') + '</div>';
    }
    return menuTreeFull().map(node).join('');
  }

  function roleModalBody(rid) {
    var r = rid ? roleById(rid) : null;
    var isNew = !r;
    r = r || { id: '', name: '', station: 'Cosmetic', group: '一线作业', menus: [], dataScope: '1', deptIds: [], sort: 0, status: 'active' };
    var menuChecks = menuTreeChecksHtml(r.menus || []);
    var stationOpts = ['Cosmetic', 'Photo Station', 'Photo Review', 'Mini line', 'Report/Recon', 'Test Center', 'FA', 'F1/退库', '系统平台'].map(function (s) {
      return '<option value="' + s + '"' + (r.station === s ? ' selected' : '') + '>' + esc(s) + '</option>';
    }).join('');
    var scopeOpts = [
      ['1', '全部数据'], ['2', '自定义部门'], ['3', '本部门'], ['4', '本部门及以下'], ['5', '仅本人']
    ].map(function (o) {
      return '<option value="' + o[0] + '"' + (r.dataScope === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
    var deptChecks = orgDeptChecks(r.deptIds || []);
    return '<div class="form-grid">' +
      '<div class="field"><label>角色名称</label><input type="text" value="' + esc(r.name) + '" placeholder="如 外观目检" data-r-name></div>' +
      '<div class="field"><label>角色 ID</label><input type="text" value="' + esc(r.id) + '" placeholder="如 cosmetic" data-r-id' + (isNew ? '' : ' disabled') + '></div>' +
      '<div class="field"><label>负责站点</label><select data-r-station>' + stationOpts + '</select></div>' +
      '<div class="field"><label>分组</label><select data-r-group>' + ['一线作业', '测试与质量', '客户', '平台'].map(function (g) { return '<option value="' + g + '"' + (r.group === g ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>排序</label><input type="number" value="' + (r.sort || 0) + '" data-r-sort></div>' +
      '<div class="field"><label>数据权限</label><select data-r-scope>' + scopeOpts + '</select></div>' +
      '<div class="field full" data-dept-field' + (r.dataScope === '2' ? '' : ' style="display:none"') + '><label>自定义部门（dataScope=自定义时生效）</label><div class="chk-grid">' + deptChecks + '</div></div>' +
      '<div class="field full"><label>菜单权限（M 目录 / C 菜单 / F 按钮，勾选级联）</label><div class="menu-tree">' + menuChecks + '</div></div>' +
      '<div class="field full"><div class="hint">成员指派：在「用户管理」页编辑成员的「角色」即可加入本角色。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存角色</button></div></div>';
  }

  function saveRoleForm(mask, rid) {
    var q = function (sel) { return (mask.querySelector(sel) || {}).value; };
    var name = String(q('[data-r-name]') || '').trim();
    var id = String(q('[data-r-id]') || '').trim();
    var station = q('[data-r-station]') || '';
    var group = q('[data-r-group]') || '一线作业';
    var dataScope = q('[data-r-scope]') || '1';
    var sort = parseInt(q('[data-r-sort]') || '0', 10) || 0;
    var checkedVals = function (sel) {
      var out = [];
      var els = mask.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) if (els[i].checked) out.push(els[i].value);
      return out;
    };
    var menus = checkedVals('[data-rmenu]');
    var deptIds = checkedVals('[data-rdept]');
    if (!name) { toast('请输入角色名称', 'bad'); return; }
    var existing = rid ? roleById(rid) : null;
    if (existing) {
      existing.name = name; existing.station = station; existing.group = group;
      existing.menus = menus; existing.dataScope = dataScope; existing.deptIds = deptIds; existing.sort = sort;
      toast('已保存角色 ' + name + '（菜单 ' + menus.length + ' / 数据权限 ' + dataScopeLabel(dataScope) + '）', 'ok');
    } else {
      if (!id) { toast('请输入角色 ID', 'bad'); return; }
      if (roleById(id)) { toast('角色 ' + id + ' 已存在', 'bad'); return; }
      L.ROLES.push({ id: id, name: name, station: station, group: group, status: 'active', dataScope: dataScope, deptIds: deptIds, sort: sort, menus: menus });
      toast('已新增角色 ' + name + '（' + id + '）', 'ok');
    }
    rebuildRoles();
    rebuildAcl();
    mask.remove();
    renderTopbar();
    renderSidebar();
    renderPageOnly('admin-roles');
  }

  function toggleRoleStatus(rid) {
    var r = roleById(rid);
    if (!r) return;
    if (r.id === 'admin') { toast('内置管理员角色不可停用', 'bad'); return; }
    r.status = r.status === 'disabled' ? 'active' : 'disabled';
    rebuildRoles();
    rebuildAcl();
    toast('角色 ' + r.name + ' 已' + (r.status === 'disabled' ? '停用' : '启用'), 'ok');
    renderSidebar();
    renderPageOnly('admin-roles');
  }

  /* ---------------- 岗位管理（sys_post） ---------------- */
  function postModalBody(code) {
    var p = code ? (L.POSTS.filter(function (x) { return x.code === code; })[0] || null) : null;
    var isNew = !p;
    p = p || { code: '', name: '', sort: L.POSTS.length + 1, status: 'active' };
    var statusOpts = ['active', 'disabled'].map(function (s) {
      return '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + (s === 'active' ? '启用' : '停用') + '</option>';
    }).join('');
    return '<div class="form-grid">' +
      '<div class="field"><label>岗位编码</label><input type="text" value="' + esc(p.code) + '" placeholder="如 cosmetic-inspector" data-p-code' + (isNew ? '' : ' disabled') + '></div>' +
      '<div class="field"><label>岗位名称</label><input type="text" value="' + esc(p.name) + '" placeholder="如 外观目检" data-p-name></div>' +
      '<div class="field"><label>排序</label><input type="number" value="' + (p.sort || 0) + '" data-p-sort></div>' +
      '<div class="field"><label>状态</label><select data-p-status>' + statusOpts + '</select></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存岗位</button></div></div>';
  }
  function savePostForm(mask, code) {
    var q = function (s) { return (mask.querySelector(s) || {}).value; };
    var pcode = String(q('[data-p-code]') || '').trim();
    var name = String(q('[data-p-name]') || '').trim();
    var sort = parseInt(q('[data-p-sort]') || '0', 10) || 0;
    var status = q('[data-p-status]') || 'active';
    if (!pcode || !name) { toast('请填写岗位编码与名称', 'bad'); return; }
    var existing = code ? (L.POSTS.filter(function (x) { return x.code === code; })[0] || null) : null;
    if (existing) {
      existing.name = name; existing.sort = sort; existing.status = status;
      toast('已更新岗位 ' + name, 'ok');
    } else {
      if (L.POSTS.some(function (x) { return x.code === pcode; })) { toast('岗位编码 ' + pcode + ' 已存在', 'bad'); return; }
      L.POSTS.push({ code: pcode, name: name, sort: sort, status: status });
      toast('已新增岗位 ' + name + '（' + pcode + '）', 'ok');
    }
    rebuildRoles();
    mask.remove();
    renderPageOnly('admin-posts');
  }
  function togglePostStatus(code) {
    var p = L.POSTS.filter(function (x) { return x.code === code; })[0];
    if (!p) return;
    p.status = p.status === 'disabled' ? 'active' : 'disabled';
    toast('岗位 ' + p.name + ' 已' + (p.status === 'disabled' ? '停用' : '启用'), 'ok');
    renderPageOnly('admin-posts');
  }
  function viewAdminPosts() {
    var rows = L.POSTS.slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }).map(function (p) {
      var memberCount = L.USERS.filter(function (u) { return (u.postIds || []).indexOf(p.code) >= 0; }).length;
      return '<tr><td class="mono">' + esc(p.code) + '</td><td>' + esc(p.name) + '</td>' +
        '<td class="right mono">' + p.sort + '</td><td class="right">' + memberCount + '</td>' +
        '<td>' + (p.status === 'disabled' ? '<span class="badge-pill off">停用</span>' : '<span class="badge-pill ok">启用</span>') + '</td>' +
        '<td style="white-space:nowrap"><button class="btn btn-xs btn-ghost" data-edit-post data-code="' + esc(p.code) + '">编辑</button> ' +
        '<button class="btn btn-xs btn-ghost" data-toggle-post data-code="' + esc(p.code) + '">' + (p.status === 'disabled' ? '启用' : '停用') + '</button></td></tr>';
    }).join('');
    return pageShell('岗位管理', '对齐 RuoYi sys_post：岗位编码 / 名称 / 排序 / 状态；岗位与角色 N:1 分离',
      '<button class="btn btn-primary" data-add-post>' + icon('plus') + '新增岗位</button>') +
      '<div class="card mt-4"><div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>岗位编码</th><th>岗位名称</th><th>排序</th><th>人数</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>岗位 → 角色（N:1）</h3></div><div class="rule-list">' +
      '<div>report-recon / recon-entry 同属 report 角色，miniline-report / station-equip 同属 miniline 角色。</div>' +
      '<div>岗位只决定「干什么活」的显示分组，权限一律由角色（roleIds）决定，二者解耦。</div></div></div>';
  }

  /* ---------------- 部门管理（sys_dept） ---------------- */
  function deptModalBody(pid, editId) {
    var editing = editId ? findOrg(editId) : null;
    var name = editing ? editing.name : '';
    var leader = editing ? (editing.leader || '') : '';
    var phone = editing ? (editing.phone || '') : '';
    var email = editing ? (editing.email || '') : '';
    var parent = pid ? findOrg(pid) : null;
    var hint = editing ? '编辑部门显示字段与负责人。' : (parent ? '在「' + parent.name + '」下新增子部门。' : '新增顶级部门。');
    return '<div class="form-grid">' +
      '<div class="field full"><label>部门名称</label><input type="text" value="' + esc(name) + '" placeholder="如 拍照组" data-d-name></div>' +
      '<div class="field"><label>负责人</label><input type="text" value="' + esc(leader) + '" placeholder="如 Lucky" data-d-leader></div>' +
      '<div class="field"><label>电话</label><input type="text" value="' + esc(phone) + '" placeholder="手机 / 分机" data-d-phone></div>' +
      '<div class="field"><label>邮箱</label><input type="text" value="' + esc(email) + '" placeholder="name@dqelab.com" data-d-email></div>' +
      '<div class="field"><label>排序</label><input type="number" value="' + (editing ? (editing.orderNum || 0) : 0) + '" data-d-sort></div>' +
      '<div class="field full"><div class="hint">' + hint + '</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存部门</button></div></div>';
  }
  function saveDeptForm(mask, pid, editId) {
    var q = function (s) { return (mask.querySelector(s) || {}).value; };
    var name = String(q('[data-d-name]') || '').trim();
    var leader = String(q('[data-d-leader]') || '').trim() || '—';
    var phone = String(q('[data-d-phone]') || '').trim() || '—';
    var email = String(q('[data-d-email]') || '').trim() || '—';
    var sort = parseInt(q('[data-d-sort]') || '0', 10) || 0;
    if (!name) { toast('请输入部门名称', 'bad'); return; }
    if (editId) {
      var n = findOrg(editId);
      if (n) { n.name = name; n.leader = leader; n.phone = phone; n.email = email; n.orderNum = sort; }
      toast('已更新部门 ' + name, 'ok');
    } else {
      var target = pid ? findOrg(pid) : null;
      var node = { id: 'dept-' + String(Date.now()).slice(-6), name: name, orderNum: sort, leader: leader, phone: phone, email: email, status: 'active' };
      if (target) { target.children = target.children || []; target.children.push(node); }
      else L.ORGS.push(node);
      toast('已新增部门 ' + name, 'ok');
    }
    mask.remove();
    renderPageOnly('admin-depts');
  }
  function toggleDeptStatus(id) {
    var n = findOrg(id);
    if (!n) return;
    n.status = n.status === 'disabled' ? 'active' : 'disabled';
    toast('部门 ' + n.name + ' 已' + (n.status === 'disabled' ? '停用' : '启用'), 'ok');
    renderPageOnly('admin-depts');
  }
  function deptRows(nodes, depth) {
    var rows = '';
    (nodes || []).forEach(function (n) {
      var kids = n.children && n.children.length;
      rows += '<tr>' +
        '<td style="padding-left:' + (12 + depth * 22) + 'px">' + icon(kids ? 'folder' : 'users') + ' ' + esc(n.name) +
        (kids ? ' <span class="badge-pill info">' + n.children.length + ' 子部门</span>' : '') + '</td>' +
        '<td>' + esc(n.leader || '—') + '</td>' +
        '<td class="mono small">' + esc(n.phone || '—') + '</td>' +
        '<td class="mono small">' + esc(n.email || '—') + '</td>' +
        '<td>' + (n.status === 'disabled' ? '<span class="badge-pill off">停用</span>' : '<span class="badge-pill ok">启用</span>') + '</td>' +
        '<td style="white-space:nowrap">' +
        '<button class="btn btn-xs btn-ghost" data-dept-add data-id="' + esc(n.id) + '">加子部门</button> ' +
        '<button class="btn btn-xs btn-ghost" data-dept-edit data-id="' + esc(n.id) + '">编辑</button> ' +
        '<button class="btn btn-xs btn-ghost" data-dept-toggle data-id="' + esc(n.id) + '">' + (n.status === 'disabled' ? '启用' : '停用') + '</button>' +
        '</td></tr>';
      if (kids) rows += deptRows(n.children, depth + 1);
    });
    return rows;
  }
  function viewAdminDepts() {
    return pageShell('部门管理', '对齐 RuoYi sys_dept：层级树 + 负责人 / 联系方式 / 排序 / 状态',
      '<button class="btn btn-primary" data-dept-add-top>' + icon('plus') + '新增顶级部门</button>') +
      '<div class="card mt-4"><div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>部门</th><th>负责人</th><th>电话</th><th>邮箱</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + deptRows(L.ORGS, 0) + '</tbody></table></div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>说明</h3></div><div class="rule-list">' +
      '<div>人员通过 USERS[].orgId 挂到部门，父节点过滤会含整棵子树（用户管理页左侧部门树复用）。</div>' +
      '<div>停用部门仅作标记，不影响其下成员账号状态（成员状态在用户管理页维护）。</div></div></div>';
  }

  /* ---------------- 菜单管理（sys_menu M/C/F） ---------------- */
  function menuTypeBadge(m) {
    var map = { M: ['目录', 'info'], C: ['菜单', 'ok'], F: ['按钮', 'accent'] };
    var t = map[m.type] || [m.type, 'info'];
    return '<span class="badge-pill ' + t[1] + '">' + t[0] + '</span>';
  }
  function menuModalBody(opt) {
    /* opt: { mode:'add'|'edit', type, parent, key } */
    var editing = opt.mode === 'edit' ? menuNode(opt.key) : null;
    var m = editing || { type: opt.type, parent: opt.parent, name: '', icon: 'list', perms: '', sort: 0, status: 'active' };
    var typeSel = '<select data-mn-type>' +
      ['M', 'C', 'F'].map(function (t) { return '<option value="' + t + '"' + (m.type === t ? ' selected' : '') + '>' + ({ M: '目录', C: '菜单', F: '按钮' }[t]) + '</option>'; }).join('') + '</select>';
    var parentSel = (m.type === 'C' || m.type === 'F')
      ? '<select data-mn-parent>' + '<option value="">（顶级）</option>' +
        (L.MENUS || []).filter(function (x) { return m.type === 'F' ? x.type === 'C' : x.type === 'M'; }).map(function (x) {
          return '<option value="' + x.key + '"' + (m.parent === x.key ? ' selected' : '') + '>' + esc(x.name) + '</option>';
        }).join('') + '</select>'
      : '';
    var statusOpts = ['active', 'disabled'].map(function (s) {
      return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + (s === 'active' ? '启用' : '停用') + '</option>';
    }).join('');
    return '<div class="form-grid">' +
      '<div class="field"><label>类型</label>' + (opt.mode === 'add' ? typeSel : '<input type="text" value="' + ({ M: '目录', C: '菜单', F: '按钮' }[m.type]) + '" disabled>') + '</div>' +
      '<div class="field"><label>名称</label><input type="text" value="' + esc(m.name) + '" placeholder="如 字典中心" data-mn-name></div>' +
      '<div class="field"><label>菜单 Key / 路由</label><input type="text" value="' + esc(m.key) + '" placeholder="如 dicts" data-mn-key' + (opt.mode === 'edit' ? ' disabled' : '') + '></div>' +
      (parentSel ? '<div class="field"><label>父级</label>' + parentSel + '</div>' : '') +
      (m.type !== 'F' ? '<div class="field"><label>图标</label><input type="text" value="' + esc(m.icon || '') + '" placeholder="如 list / folder / users" data-mn-icon></div>' : '') +
      (m.type === 'F' ? '<div class="field"><label>权限字符 perms</label><input type="text" value="' + esc(m.perms || '') + '" placeholder="如 system:dict:edit" data-mn-perms></div>' : '') +
      '<div class="field"><label>排序</label><input type="number" value="' + (m.sort || 0) + '" data-mn-sort></div>' +
      '<div class="field"><label>状态</label><select data-mn-status>' + statusOpts + '</select></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存菜单</button></div></div>';
  }
  function saveMenuForm(mask, opt) {
    var q = function (s) { return (mask.querySelector(s) || {}).value; };
    var name = String(q('[data-mn-name]') || '').trim();
    var key = String(q('[data-mn-key]') || '').trim();
    var type = opt.mode === 'add' ? (q('[data-mn-type]') || 'M') : (menuNode(opt.key) || {}).type;
    var parent = q('[data-mn-parent]') || null;
    var icon = q('[data-mn-icon]') || 'list';
    var perms = q('[data-mn-perms]') || '';
    var sort = parseInt(q('[data-mn-sort]') || '0', 10) || 0;
    var status = q('[data-mn-status]') || 'active';
    if (!name) { toast('请输入菜单名称', 'bad'); return; }
    if (opt.mode === 'edit') {
      var m = menuNode(opt.key);
      if (m) {
        m.name = name; m.sort = sort; m.status = status;
        if (m.type === 'F') m.perms = perms || m.perms;
        else m.icon = icon || m.icon;
        toast('已更新菜单 ' + name, 'ok');
      }
    } else {
      if (!key) { toast('请输入菜单 Key', 'bad'); return; }
      if (menuNode(key)) { toast('菜单 Key ' + key + ' 已存在', 'bad'); return; }
      var node = { key: key, type: type, name: name, parent: parent, icon: icon, sort: sort, status: status };
      if (type === 'F') node.perms = perms || key;
      L.MENUS.push(node);
      toast('已新增菜单 ' + name + '（' + key + '）', 'ok');
    }
    rebuildAcl();
    mask.remove();
    renderSidebar();
    renderPageOnly('admin-menus');
  }
  function deleteMenu(key) {
    var m = menuNode(key);
    if (!m) return;
    if (m.type === 'C') { toast('菜单（C）为路由页，不可删除，仅可编辑显示字段', 'bad'); return; }
    var idx = L.MENUS.indexOf(m);
    if (idx >= 0) L.MENUS.splice(idx, 1);
    rebuildAcl();
    toast('已删除菜单 ' + m.name, 'ok');
    renderSidebar();
    renderPageOnly('admin-menus');
  }
  function menuRows(nodes, depth) {
    var rows = '';
    (nodes || []).forEach(function (m) {
      var kids = m.children && m.children.length;
      rows += '<tr>' +
        '<td style="padding-left:' + (12 + depth * 22) + 'px">' + icon(m.icon || 'list') + ' ' + esc(m.name) + '</td>' +
        '<td>' + menuTypeBadge(m) + '</td>' +
        '<td class="mono">' + esc(m.key) + '</td>' +
        '<td class="mono small">' + esc(m.perms || (m.type === 'F' ? m.key : '—')) + '</td>' +
        '<td class="right mono">' + m.sort + '</td>' +
        '<td>' + (m.status === 'disabled' ? '<span class="badge-pill off">停用</span>' : '<span class="badge-pill ok">启用</span>') + '</td>' +
        '<td style="white-space:nowrap">' +
        (m.type === 'C' ? '<button class="btn btn-xs btn-ghost" data-menu-add data-parent="' + esc(m.key) + '" data-mtype="F">加按钮</button> ' : '') +
        '<button class="btn btn-xs btn-ghost" data-menu-edit data-id="' + esc(m.key) + '">编辑</button> ' +
        (m.type !== 'C' ? '<button class="btn btn-xs btn-ghost" data-menu-del data-id="' + esc(m.key) + '">删除</button>' : '') +
        '</td></tr>';
      if (kids) rows += menuRows(m.children, depth + 1);
    });
    return rows;
  }
  function viewAdminMenus() {
    return pageShell('菜单管理', '对齐 RuoYi sys_menu：M 目录 / C 菜单 / F 按钮（权限字符 perms）树形管理',
      '<button class="btn btn-primary" data-menu-add-top>' + icon('plus') + '新增目录</button>') +
      '<div class="card mt-4"><div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>名称</th><th>类型</th><th>Key / 路由</th><th>权限字符</th><th>排序</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + menuRows(menuTreeFull(), 0) + '</tbody></table></div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>说明</h3></div><div class="rule-list">' +
      '<div>C 型菜单 key = 路由（决定页面 ACL），不可增删，仅可改显示字段与排序 / 状态。</div>' +
      '<div>F 型按钮的 perms 供 canAction 做按钮级校验；M 目录只作侧边栏折叠分组。</div></div></div>';
  }

  /* ---------------- 流程排配 + 请假委托 ---------------- */
  /* 当前在职负责人：若有 active 请假记录，则该节点的实际负责人为其代理人 */
  function activeLeave(who) {
    return L.LEAVES.filter(function (l) { return l.who === who && l.status === 'active'; })[0] || null;
  }
  function nodeOwner(node) {
    var lv = activeLeave(node.owner);
    return lv ? { id: lv.deputy, leave: lv } : { id: node.owner, leave: null };
  }

  function viewWorkflowConfig() {
    /* 委托看板 */
    var lvRows = L.LEAVES.map(function (l) {
      var st = l.status === 'active' ? '<span class="badge-pill bad">请假中</span>' :
        l.status === 'upcoming' ? '<span class="badge-pill warn">预告</span>' : '<span class="badge-pill gray">已结束</span>';
      var act = l.status === 'active' ?
        '<button class="btn btn-xs btn-ghost" data-leave-end data-who="' + esc(l.who) + '">结束请假</button>' : '<span class="faint">—</span>';
      return '<tr><td>' + esc(whoName(l.who)) + '</td><td class="mono">' + l.from + ' → ' + l.to + '</td>' +
        '<td>' + esc(l.reason) + '</td><td>' + esc(l.scope) + '</td>' +
        '<td><span class="badge-pill info">' + esc(whoName(l.deputy)) + '</span></td><td>' + st + '</td><td>' + act + '</td></tr>';
    }).join('');

    /* 三张流程的节点排配表 */
    var flows = L.WORKFLOW_FLOWS.map(function (f) {
      var rows = f.nodes.map(function (n) {
        var eff = nodeOwner(n);
        var badge = eff.leave ?
          '<span class="tag-chip bad">请假 → ' + esc(whoName(eff.id)) + ' 代理</span>' :
          '<span class="tag-chip on">在岗</span>';
        return '<tr><td>' + esc(n.name) + '</td><td class="faint">' + esc(n.action) + '</td>' +
          '<td>' + esc(ROLE_CN[n.role] || n.role) + '</td>' +
          '<td>' + esc(whoName(n.owner)) + '</td>' +
          '<td><b>' + esc(whoName(eff.id)) + '</b> ' + badge + '</td>' +
          '<td class="mono">' + n.dur + '</td></tr>';
      }).join('');
      return '<div class="card mt-4"><div class="card-head"><h3>' + esc(f.flow) + '</h3>' +
        '<div class="meta">节点 → 职责 → 岗位 → 负责人 · <span class="tag-chip">模板 ' + esc(f.ver) + '</span>' + (f.status === 'draft' ? ' <span class="tag-chip warn">草稿调整</span>' : '') + '</div></div>' +
        '<div class="tbl-wrap"><table class="data"><thead><tr><th>节点</th><th>做什么</th><th>岗位</th><th>默认负责人</th><th>当前责任人</th><th>时限</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div></div>';
    }).join('');

    return pageShell('流程排配 · 请假委托', '谁负责哪个节点，请假自动改派代理人（按角色排配 / 按人解析 / 委托留痕）',
      '<button class="btn btn-primary" data-leave-add>' + icon('plus') + '登记请假</button>') +
      '<div class="card"><div class="card-head"><h3>委托看板</h3>' +
      '<div class="meta">负责人请假 → 节点待办自动改派；委托记录单独留痕，审计事件里保留实际执行人</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>请假人</th><th>区间</th><th>原因</th><th>委托范围</th><th>代理人</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + lvRows + '</tbody></table></div></div>' + flows +
      '<div class="card mt-4"><div class="card-head"><h3>委托规则</h3></div>' +
      '<div class="rule-list"><div>① 排配绑定岗位角色，同时指定默认负责人 —— 排配表可复用，不因人改动流程定义。</div>' +
      '<div>② 请假时登记代理人，节点实际负责人 = 默认负责人有生效请假则取代理人。</div>' +
      '<div>③ 委托范围受限：只能委托本人可负责的节点，防止越权签名 / 审批。</div>' +
      '<div>④ 待办 / 通知 / 告警路由按「当前责任人」计算；实际执行人写入审计（谁 / 何时 / 做什么）。</div></div></div>';
  }

  /* ---------------- 作业设定中心（SSOT：一处定义，多处派生） ---------------- */
  function defVerNext(def) {
    var m = /v(\d+)\.(\d+)/.exec(def.ver || 'v0.0');
    if (!m) return 'v0.1';
    var ma = parseInt(m[1], 10), mi = parseInt(m[2], 10);
    return 'v' + ma + '.' + (mi + 1);
  }

  /* 编辑站点定义：仅改 SSOT 一处，保存后 rebuildDefs() 派生全链路自动更正 */
  function saveStationDef(defId, patch, who, note) {
    var def = L.STATION_DEFS.filter(function (x) { return x.id === defId; })[0];
    if (!def) return false;
    var oldVer = def.ver;
    def.ver = defVerNext(def);
    def.status = 'draft';              /* 新版本先作草稿，确认后才正式生效（effectiveFrom 空） */
    def.effectiveFrom = '—';
    def.changedBy = who;
    def.changes.unshift({ t: '09-17', who: who, what: note || '定义修订' });
    ['action', 'role', 'owner', 'dur', 'name', 'exec', 'scripts', 'tools', 'inputs', 'outputs', 'tasks', 'subNodes'].forEach(function (k) {
      if (patch[k] !== undefined) def[k] = patch[k];
    });
    L.rebuildDefs();                   /* 一处变更 → 流程排配 / stepper / 台账自动更正 */
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '修订定义 ' + defId + '：' + oldVer + '→' + def.ver + '（' + (note || '') + ')', res: 'info' });
    return def;
  }

  /* 新增站点定义：写入 SSOT 新草稿（不直接下发），全链路派生 */
  function addStationDefPatch(patch, who, note) {
    var stage = patch.stage || 'T0';
    var st = L.STAGES.filter(function (s) { return s.id === stage; })[0] || L.STAGES[0];
    var pre = String(st.id).toLowerCase();
    var n = 1, id;
    do { id = pre + '-' + ('0' + n).slice(-2); n++; } while (L.STATION_DEFS.some(function (x) { return x.id === id; }));
    var def = {
      id: id, stage: st.id, flow: st.name, name: patch.name, action: patch.action, role: patch.role,
      owner: patch.owner, dur: patch.dur || '—', ver: 'v0.1', status: 'draft',
      exec: patch.exec || 'manual', scripts: patch.scripts || [], tools: patch.tools || [],
      inputs: patch.inputs || [], outputs: patch.outputs || [],
      tasks: patch.tasks || ['process'], subNodes: patch.subNodes || [],
      effectiveFrom: '—', changedBy: who, changes: [{ t: '09-18', who: who, what: note || '新建定义' }]
    };
    L.STATION_DEFS.push(def);
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '新增定义 ' + id + '：' + patch.name + '（草稿，待发布）', res: 'info' });
    return def;
  }

  /* 发布下发：draft → eff，写已下发快照（对应旧册重印） */
  function publishStationDef(defId, who) {
    var def = L.STATION_DEFS.filter(function (x) { return x.id === defId; })[0];
    if (!def || def.status === 'eff') return false;
    def.status = 'eff';
    def.effectiveFrom = '09-18';
    L.DEF_SNAPSHOT.push({ id: def.id, ver: def.ver, effectiveFrom: '09-18' });
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '发布定义 ' + defId + '：' + def.ver + ' 生效（写快照、重印）', res: 'ok' });
    return def;
  }

  /* ================= 流程模板：可编排 + 版本化（引用节点，不复制内容） ================= */
  function flowTplById(key) {
    return L.FLOW_TEMPLATES.filter(function (t) { return t.key === key; })[0];
  }
  function tplNodeDef(tpl, defId) {
    return L.STATION_DEFS.filter(function (d) { return d.id === defId; })[0];
  }
  function tplNodeByIdx(tpl, idx) { return tplNodeDef(tpl, tpl.nodes[idx]); }

  /* 调整流程：改引用列表/顺序 = 新版本草稿（不改节点内容），发布后才生效；在跑实例不受影响 */
  function editFlowTpl(key, mut, who, note) {
    var tpl = flowTplById(key);
    if (!tpl) return null;
    var old = tpl.ver;
    mut(tpl);
    tpl.ver = defVerNext(tpl);
    tpl.status = 'draft';
    tpl.changedBy = who;
    tpl.changes.unshift({ t: dateNow(), who: who, what: note || '流程调整' });
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '调整流程 ' + tpl.name + '：' + old + '→' + tpl.ver + '（' + (note || '') + '）', res: 'info' });
    return tpl;
  }

  /* 发布流程：草稿 → 生效，记录新发布版本（后续实例按此版本启动） */
  function publishFlowTpl(key, who) {
    var tpl = flowTplById(key);
    if (!tpl || tpl.status !== 'draft') return false;
    tpl.status = 'eff';
    tpl.releasedVer = tpl.ver;
    tpl.effectiveFrom = '09-18';
    tpl.changedBy = who;
    tpl.changes.unshift({ t: dateNow(), who: who, what: '流程发布 v' + tpl.ver });
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '发布流程 ' + tpl.name + ' v' + tpl.ver, res: 'ok' });
    return tpl;
  }

  /* 启动流程：生成实例，钉住模板版本，首节点下发给对应负责人 */
  function flowInstNextId() {
    var max = 0;
    L.FLOW_INSTANCES.forEach(function (i) {
      var m = /FI-(\d+)$/.exec(i.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'FI-' + ('00' + (max + 1)).slice(-3);
  }
  function startFlowInstance(key, who, subject) {
    var tpl = flowTplById(key);
    if (!tpl || !tpl.nodes.length) return null;
    var first = tpl.nodes[0];
    var ins = {
      id: flowInstNextId(), tpl: tpl.key, tplVer: tpl.ver,
      subject: subject || tpl.name + ' 新批次',
      current: first, status: 'running', startedBy: who, startedAt: dateNow(), note: ''
    };
    L.FLOW_INSTANCES.unshift(ins);
    var nd = tplNodeDef(tpl, first);
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '启动流程 ' + tpl.name + ' v' + tpl.ver + ' → ' + ins.id + '「' + nd.name + '」负责人 ' + whoName(nd.owner), res: 'ok' });
    return ins;
  }

  /* 推进流程实例：当前节点完成 → 路由到下一节点负责人；末节点则闭环 */
  function advanceFlowInstance(id, who) {
    var ins = L.FLOW_INSTANCES.filter(function (x) { return x.id === id; })[0];
    if (!ins || ins.status !== 'running') return false;
    var tpl = flowTplById(ins.tpl);
    var i = tpl.nodes.indexOf(ins.current);
    if (i < 0) {
      ins.status = 'done';
      ins.note = '当前节点已从模板移除，实例钉版本归档';
      L.AGENT_LOG.push({ t: dateNow(), who: who, act: '流程实例 ' + ins.id + '：当前节点已移除，钉版本归档', res: 'info' });
    } else if (i >= tpl.nodes.length - 1) {
      ins.status = 'done';
      ins.note = '已闭环';
      L.AGENT_LOG.push({ t: dateNow(), who: who, act: '流程实例 ' + ins.id + ' 到达末节点，闭环', res: 'ok' });
    } else {
      var from = tplNodeByIdx(tpl, i);
      var to = tplNodeByIdx(tpl, i + 1);
      ins.current = tpl.nodes[i + 1];
      L.AGENT_LOG.push({ t: dateNow(), who: who, act: '流程实例 ' + ins.id + '：' + from.name + ' → ' + to.name + '（负责人 ' + whoName(to.owner) + '）', res: 'ok' });
    }
    return ins;
  }

  /* 删除小节点：原地移除保持 SSOT 引用一致；同步下线已下发快照（若在册），审计留痕 */
  function deleteStationDef(defId, who) {
    var idx = -1;
    L.STATION_DEFS.forEach(function (d, i) { if (d.id === defId) idx = i; });
    if (idx < 0) return false;
    var def = L.STATION_DEFS[idx];
    var isEff = def.status === 'eff';
    L.STATION_DEFS.splice(idx, 1);
    var hadSnap = L.DEF_SNAPSHOT.some(function (s) { return s.id === defId; });
    for (var i = L.DEF_SNAPSHOT.length - 1; i >= 0; i--) {
      if (L.DEF_SNAPSHOT[i].id === defId) L.DEF_SNAPSHOT.splice(i, 1);
    }
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '下线小节点 ' + defId + ' ' + def.name + '（' + (isEff ? '已生效，旧册重印收回' : '草稿，安全丢弃') + (hadSnap ? '；快照同步下线' : '') + '）', res: isEff ? 'warn' : 'info' });
    return true;
  }

  /* 阶段城内拖拽换序：原地重排 STATION_DEFS（同城节点在数组中本为连续段），一处改动全链路派生。
     before=true 表示放到 target 之前，否则放到 target 之后 */
  function reorderStationDef(dragId, targetId, before, who) {
    var drag = null, target = null;
    L.STATION_DEFS.forEach(function (d) {
      if (d.id === dragId) drag = d;
      if (d.id === targetId) target = d;
    });
    if (!drag || !target || dragId === targetId || drag.stage !== target.stage) return false;
    var di = L.STATION_DEFS.indexOf(drag);
    L.STATION_DEFS.splice(di, 1);
    var ti = L.STATION_DEFS.indexOf(target);
    L.STATION_DEFS.splice(before ? ti : ti + 1, 0, drag);
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '调整小节点顺序 ' + dragId + ' ' + drag.name + '（' + drag.stage + ' 城内换序）', res: 'info' });
    return true;
  }

  /* 删除阶段城：整座城连同其小节点一并下线（定义 / 快照 / 排配 / 环节流 / 台账自动缩编）。
     至少保留一座城（否则新增小节点与排配派生失去容器）。成功返回 true，失败返回 {err} */
  function deleteStageCity(stageId, who) {
    var st = L.STAGES.filter(function (s) { return s.id === stageId; })[0];
    if (!st) return { err: '阶段城不存在' };
    if (L.STAGES.length <= 1) return { err: '至少保留一座阶段城，不能全部下线' };
    var ids = L.STATION_DEFS.filter(function (d) { return d.stage === stageId; });
    var effN = ids.filter(function (d) { return d.status === 'eff'; }).length;
    for (var i = L.STATION_DEFS.length - 1; i >= 0; i--) {
      if (L.STATION_DEFS[i].stage === stageId) L.STATION_DEFS.splice(i, 1);
    }
    ids.forEach(function (d) {
      for (var j = L.DEF_SNAPSHOT.length - 1; j >= 0; j--) {
        if (L.DEF_SNAPSHOT[j].id === d.id) L.DEF_SNAPSHOT.splice(j, 1);
      }
    });
    for (var k = L.STAGES.length - 1; k >= 0; k--) {
      if (L.STAGES[k].id === stageId) L.STAGES.splice(k, 1);
    }
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '下线阶段城 ' + stageId + ' ' + st.name + '（连带 ' + ids.length + ' 个小节点，含已生效 ' + effN + ' 个）', res: 'warn' });
    return true;
  }

  /* 新增小节点弹窗（可指定预设阶段城；写入该城 SSOT 草稿，保存即派生） */
  function defAddModal(stageId) {
    var users = L.USERS.map(function (u) { return u.id; }).concat(['Vincent', 'Grant', 'Jackson']);
    var stageOpts = L.STAGES.map(function (s) {
      return '<option' + (s.id === stageId ? ' selected' : '') + ' value="' + s.id + '">' + esc(s.name) + '</option>';
    }).join('');
    var stage = stageId || 'T0';
    var stageName = (L.STAGES.filter(function (s) { return s.id === stage; })[0] || L.STAGES[0]).name;
    var taskOpts = dictOpts('task_type').map(function (o) { return { val: o.key, label: o.label }; });
    modal('新增小节点 → ' + stageName + '（写入阶段城 SSOT）',
      '<div class="form-grid">' +
      '<div class="field"><label>所属阶段城</label><select data-def-stage>' + stageOpts + '</select></div>' +
      '<div class="field"><label>岗位</label><select data-def-role>' + Object.keys(ROLE_CN).map(function (r) { return '<option value="' + r + '">' + esc(ROLE_CN[r]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>小节点名（新增内容）</label><input type="text" value="去胶 / UV 固化" data-def-name></div>' +
      '<div class="field full"><label>做什么（动作）</label><input type="text" value="基板去胶 → UV 固化 → 目检" data-def-action></div>' +
      '<div class="field full"><label>任务点（下拉多选 · 数据来自「字典中心 → 任务类型」）</label>' + multiSelHtml('tasks', ['process'], taskOpts) + '</div>' +
      '<div class="field"><label>负责人</label><select data-def-owner>' + users.map(function (u) { return '<option' + (u === 'tammy' ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>时限</label><input type="text" value="≤ 10 min" data-def-dur></div>' +
      execFieldsHtml() +
      subNodesHtml(null) +
      '<div class="field full"><label>变更说明</label><input type="text" value="新作业，SOP 21-05" data-def-note></div>' +
      '<div class="field full"><div class="hint">保存后作为该阶段城内 v0.1 草稿（不直接下发），流程排配 / Travel Sheet 环节流 / 台账自动派生；点「发布下发」确认后才写入快照生效。执行资源挂接后可在表格中点击 S 号 / 工具 Key 直达详情。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">新增并派生</button></div></div>',
      function (mask) {
        var stSel = mask.querySelector('[data-def-stage]') || {};
        var goStage = stSel.value || stage;
        var patch = {
          stage: goStage,
          name: (mask.querySelector('[data-def-name]') || {}).value || '新节点',
          action: (mask.querySelector('[data-def-action]') || {}).value || '',
          role: (mask.querySelector('[data-def-role]') || {}).value || 'cosmetic',
          owner: (mask.querySelector('[data-def-owner]') || {}).value || 'tammy',
          dur: (mask.querySelector('[data-def-dur]') || {}).value || '—',
exec: (mask.querySelector('[data-def-exec]') || {}).value || 'manual',
          scripts: selectedRefs(mask, 'scripts'),
          tools: selectedRefs(mask, 'tools'),
          inputs: selectedRefs(mask, 'inputs'),
          outputs: selectedRefs(mask, 'outputs'),
          tasks: selectedRefs(mask, 'tasks'),
          subNodes: readSubNodes(mask)
        };
        var note = (mask.querySelector('[data-def-note]') || {}).value || '新建定义';
        var nd = addStationDefPatch(patch, currentUser().id, note);
        mask.remove();
        toast('已新增 ' + nd.id + ' ' + nd.name + '（v0.1 草稿，归入「' + goStage + '」阶段城），全链路已派生', 'ok');
        renderPageOnly('defs');
      });
  }

  /* 新增阶段城弹窗：再建一座城（如 TZ），内部小节点前缀按城 ID 自动生成 */
  function stageAddModal() {
    var sids = L.STAGES.map(function (s) { return s.id; }).join('、');
    modal('新增阶段城（再建一座城容纳新阶段小节点）',
      '<div class="form-grid">' +
      '<div class="field"><label>阶段城 ID</label><input type="text" value="TZ" data-sg-id></div>' +
      '<div class="field"><label>标签 tag</label><input type="text" value="追加" data-sg-tag></div>' +
      '<div class="field full"><label>名称</label><input type="text" value="TZ 追加测试" data-sg-name></div>' +
      '<div class="field full"><label>描述</label><input type="text" value="针对新增 RFI 项目的追加测试" data-sg-desc></div>' +
      '<div class="field full"><label>流转（顺序提示）</label><input type="text" value="TZ → 退库" data-sg-seq></div>' +
      '<div class="field full"><label>TT 时限 chips（逗号分隔）</label><input type="text" value="新增 TT 8 小时, Cosmetic TT 1 小时" data-sg-tt></div>' +
      '<div class="field full"><div class="hint">现有阶段城：' + esc(sids) + '。新增后即可在该城点「新增小节点」写入作业定义，ID 前缀自动按城生成。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">新增阶段城</button></div></div>',
      function (mask) {
        var st = addStageCity({
          id: (mask.querySelector('[data-sg-id]') || {}).value,
          name: (mask.querySelector('[data-sg-name]') || {}).value,
          tag: (mask.querySelector('[data-sg-tag]') || {}).value,
          desc: (mask.querySelector('[data-sg-desc]') || {}).value,
          seq: (mask.querySelector('[data-sg-seq]') || {}).value,
          tt: String((mask.querySelector('[data-sg-tt]') || {}).value || '').split(/[，,]/).map(function (t) { return t.trim(); }).filter(Boolean)
        }, currentUser().id);
        if (st.err) { toast(st.err, 'bad'); return; }
        mask.remove();
        toast('已新增阶段城「' + st.id + '」，可在其中新增小节点', 'ok');
        renderPageOnly('defs');
      });
  }

  /* 新增阶段城核心：除校验 + 写入 STAGES + 审计（ID 需唯一大写字母/数字；成功返回城对象，失败返回 {err}） */
  function addStageCity(patch, who) {
    var id = String(patch.id || '').trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]{0,3}$/.test(id)) return { err: '阶段城 ID 需为 1-4 位大写字母/数字' };
    if (L.STAGES.some(function (s) { return s.id === id; })) return { err: '阶段城 ' + id + ' 已存在' };
    var st = {
      id: id,
      name: patch.name || id,
      tag: patch.tag || '追加',
      desc: patch.desc || '',
      seq: patch.seq || (id + ' → 退库'),
      tt: Array.isArray(patch.tt) ? patch.tt : []
    };
    L.STAGES.push(st);
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '新增阶段城 ' + id + '：' + st.name, res: 'ok' });
    return st;
  }

  /* 修改阶段城核心：改名称时同步城里所有小节点的 flow 字段（rebuildDefs 按 STAGES 名称分组，否则排配会丢）。
     成功返回更新后的城对象，失败返回 {err} */
  function updateStageCity(stageId, patch, who) {
    var st = L.STAGES.filter(function (s) { return s.id === stageId; })[0];
    if (!st) return { err: '阶段城不存在' };
    var name = String(patch.name || '').trim();
    if (!name) return { err: '名称不能为空' };
    if (name !== st.name) {
      L.STATION_DEFS.forEach(function (d) { if (d.stage === st.id) d.flow = name; });
    }
    st.name = name;
    st.tag = String(patch.tag || '').trim() || st.tag;
    st.desc = String(patch.desc || '').trim();
    st.seq = String(patch.seq || '').trim() || st.seq;
    st.tt = Array.isArray(patch.tt) ? patch.tt : st.tt;
    L.rebuildDefs();
    L.AGENT_LOG.push({ t: dateNow(), who: who, act: '修改阶段城 ' + st.id + '：' + st.name, res: 'info' });
    return st;
  }

  /* 编辑阶段城弹窗：名称 / 标签 / 描述 / 流转 / TT chips（ID 作为节点编号前缀不可改） */
  function stageEditModal(stageId) {
    var st = L.STAGES.filter(function (s) { return s.id === stageId; })[0];
    if (!st) return;
    modal('编辑阶段城 ' + st.id,
      '<div class="form-grid">' +
      '<div class="field"><label>阶段城 ID</label><input type="text" value="' + esc(st.id) + '" disabled></div>' +
      '<div class="field"><label>标签 tag</label><input type="text" value="' + esc(st.tag) + '" data-sg-tag></div>' +
      '<div class="field full"><label>名称</label><input type="text" value="' + esc(st.name) + '" data-sg-name></div>' +
      '<div class="field full"><label>描述</label><input type="text" value="' + esc(st.desc) + '" data-sg-desc></div>' +
      '<div class="field full"><label>流转（顺序提示）</label><input type="text" value="' + esc(st.seq) + '" data-sg-seq></div>' +
      '<div class="field full"><label>TT 时限 chips（逗号分隔）</label><input type="text" value="' + esc(st.tt.join(', ')) + '" data-sg-tt></div>' +
      '<div class="field full"><div class="hint">改名称会同步更新城内全部小节点的 flow 字段（排配 / Travel Sheet 环节流 / 台账随之派生更正）；ID 是节点编号前缀，锁定不可改。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存并派生</button></div></div>',
      function (mask) {
        var up = updateStageCity(stageId, {
          name: (mask.querySelector('[data-sg-name]') || {}).value,
          tag: (mask.querySelector('[data-sg-tag]') || {}).value,
          desc: (mask.querySelector('[data-sg-desc]') || {}).value,
          seq: (mask.querySelector('[data-sg-seq]') || {}).value,
          tt: String((mask.querySelector('[data-sg-tt]') || {}).value || '').split(/[，,]/).map(function (t) { return t.trim(); }).filter(Boolean)
        }, currentUser().id);
        if (up.err) { toast(up.err, 'bad'); return; }
        mask.remove();
        toast('已修改阶段城 ' + stageId + '：' + up.name + '，全链路已派生更正', 'ok');
        renderPageOnly('defs');
      });
  }

  /* ---------------- 作业设定中心：节点执行资源（脚本 / 工具，仅引用不复制） ---------------- */
  var EXEC_CN = { manual: '人工', semi: '半自动', auto: '自动' };
  /* 节点执行资源芯片：执行方式 + 挂接脚本（跳脚本详情）+ 挂接工具（跳运行页） */
  function execChips(d) {
    var out = [];
    var ex = d.exec && EXEC_CN[d.exec] ? d.exec : 'manual';
    if (ex !== 'manual') out.push('<span class="tag-chip exec-' + ex + '">' + EXEC_CN[ex] + '</span>');
    (d.scripts || []).forEach(function (sid) {
      var s = L.SCRIPTS.filter(function (x) { return x.id === sid; })[0];
      out.push(s
        ? '<span class="tag-chip" title="' + esc(s.name) + '">' + esc(sid) + '</span>'
        : '<span class="tag-chip dim">' + esc(sid) + '?</span>');
    });
    (d.tools || []).forEach(function (tk) {
      var t = L.EXCEL_TOOLS.filter(function (x) { return x.key === tk; })[0];
      out.push(t
        ? '<span class="tag-chip tool" title="' + esc(t.name) + '">' + esc(tk) + '</span>'
        : '<span class="tag-chip dim">' + esc(tk) + '?</span>');
    });
    return out.length ? out.join(' ') : '<span class="faint">—</span>';
  }
  /* 交接物 chip（in=浅色前置 ←，out=深色前置 →），hover 显示格式/落表/产出方式 */
  function artChip(aid, dir) {
    var a = artInfo(aid);
    if (!a) return '<span class="tag-chip dim" title="未登记的交接物">' + (dir === 'in' ? '←' : '→') + ' ' + esc(aid) + '?</span>';
    return '<span class="tag-chip art-' + dir + '" title="' + esc(a.name + ' · ' + a.format + (a.kind === 'auto' ? ' · 提交自动写出' : ' · 人工传文件') + ' · ' + a.via) + '">' +
      (dir === 'in' ? '← ' : '→ ') + esc(a.name) + '</span>';
  }
  /* 节点行「交接物」两排：上游依赖（in） + 本节点产出（out） */
  function artIoChips(d) {
    var out = [];
    (d.inputs || []).forEach(function (a) { out.push(artChip(a, 'in')); });
    (d.outputs || []).forEach(function (a) { out.push(artChip(a, 'out')); });
    return out.length ? out.join(' ') : '<span class="tag-chip art-none">无交接物</span>';
  }
  /* 每个角色「提交时应当自动产出的交接物」：缺了会导致下游静默断流（report=报告/Recon 数据，photo=拍照补拍；review 只消费不产出） */
  var ROLE_EXPECT = { photo: ['ART_PHOTO'], miniline: ['ART_REPORT', 'ART_RECON'], report: ['ART_REPORT', 'ART_RECON'] };
  /* 该定义是否会被 Travel Sheet 提交直接选中：report 角色取该阶段首个（分WF/Tagging 等后段不进提交），其余角色同名节点直接命中 */
  function isDispatchActive(d) {
    if (!d || !d.role || !ROLE_EXPECT[d.role]) return false;
    if (d.role === 'report') {
      var first = L.STATION_DEFS.filter(function (x) { return x.stage === d.stage && x.ver && x.status !== 'obsolete' && x.role === 'report'; })[0];
      return first === d;
    }
    return true;
  }
  /* 执行资源列告警：该节点会被提交选中但在「作业设定中心」未挂任何可自动派发的工具 → 提醒避免下游无输入 */
  function defWarn(d) {
    if (!isDispatchActive(d)) return '';
    var exp = ROLE_EXPECT[d.role];
    if (!exp || !exp.length) return '';
    var hs = defHooks(d);
    var any = exp.some(function (h) { return hs.indexOf(h) >= 0; });
    if (any) return '';
    var txt = exp.indexOf('ART_PHOTO') >= 0 ? '提交后无拍照/补拍自动派发' : '提交后无报告/Recon 自动派发';
    return ' <span class="tag-chip warn def-hook-warn" style="cursor:help" title="本节点会被 Travel Sheet 提交直接触发，但未挂带派发钩子的工具（hook 缺失）：提交时下游无自动输入，需人工兜底">' + txt + '</span>';
  }
  /* 编辑/新增弹窗的执行资源三字段：执行方式下拉 + 脚本/工具「下拉展开 + 复选勾选」多选（从登记中心读选项，仅引用不复制） */
  function execFieldsHtml(d) {
    var ex = d && EXEC_CN[d.exec] ? d.exec : 'manual';
    var opts = ['manual', 'semi', 'auto'].map(function (o) {
      return '<option value="' + o + '"' + (ex === o ? ' selected' : '') + '>' + EXEC_CN[o] + '</option>';
    }).join('');
    var curS = (d && d.scripts || []), curT = (d && d.tools || []), curI = (d && d.inputs || []), curO = (d && d.outputs || []);
    var sOpts = L.SCRIPTS.map(function (s) {
      return { val: s.id, label: s.id + ' · ' + s.name + (s.status === 'draft' ? '（草稿）' : '') };
    });
    var tOpts = L.EXCEL_TOOLS.map(function (t) { return { val: t.key, label: t.key + ' · ' + t.name }; });
    var aOpts = L.ARTIFACTS.map(function (a) { return { val: a.id, label: a.id + ' · ' + a.name + '（' + (a.kind === 'auto' ? '自动' : '人工传文件') + '）' }; });
    return '<div class="field"><label>执行方式</label><select data-def-exec>' + opts + '</select></div>' +
      '<div class="field full"><label>挂接脚本</label>' + multiSelHtml('scripts', curS, sOpts) + '</div>' +
      '<div class="field full"><label>挂接工具</label>' + multiSelHtml('tools', curT, tOpts) + '</div>' +
      '<div class="field full"><label>上游依赖（交接物输入）</label>' + multiSelHtml('inputs', curI, aOpts) + '</div>' +
      '<div class="field full"><label>本节点产出（交接物输出）</label>' + multiSelHtml('outputs', curO, aOpts) + '</div>';
  }
  /* 下拉多选组件：点框展开面板，勾选复选框即生效并更新芯片，芯片 × 移除，搜索框过滤，点外部收起 */
  function multiSelHtml(nameKey, cur, options) {
    var chips = cur.length
      ? cur.map(function (v) {
        var lab = '';
        for (var i = 0; i < options.length; i++) if (options[i].val === v) { lab = options[i].label; break; }
        return '<span class="sel-chip" title="' + esc(lab) + '">' + esc(v) + '<button type="button" data-ms-rm="' + esc(v) + '" aria-label="移除">×</button></span>';
      }).join('')
      : '<span class="sel-placeholder">未挂接</span>';
    var opts = options.map(function (o) {
      return '<label class="sel-opt"><input type="checkbox" data-ms-opt data-ms-val="' + esc(o.val) + '"' + (cur.indexOf(o.val) >= 0 ? ' checked' : '') + '>' + esc(o.label) + '</label>';
    }).join('');
    return '<div class="sel-multi" data-ref="' + nameKey + '">' +
      '<div class="sel-multi-box" data-ms-box>' +
      '<span class="sel-chip-wrap" data-ms-chips>' + chips + '</span>' +
      '<input class="sel-multi-search" data-ms-search placeholder="搜索…" autocomplete="off">' +
      '<span class="sel-caret">▾</span>' +
      '</div>' +
      '<div class="sel-multi-panel" data-ms-panel hidden>' + opts + '</div>' +
      '</div>';
  }
  /* 读取下拉多选当前勾选值（数组） */
  function selectedRefs(mask, nameKey) {
    var w = mask.querySelector('.sel-multi[data-ref="' + nameKey + '"]');
    var out = [];
    if (w) {
      var cbs = w.querySelectorAll('[data-ms-opt]:checked');
      for (var i = 0; i < cbs.length; i++) out.push(cbs[i].getAttribute('data-ms-val'));
    }
    return out;
  }
  /* 组件行为：绑定在 modal mask 上（委托），并注册一次全局「点外部收起」 */
  var _multiSelDocBound = false;
  function initMultiSel(root) {
    if (!root.querySelectorAll('.sel-multi').length) return;
    if (!_multiSelDocBound) {
      _multiSelDocBound = true;
      document.addEventListener('click', function (e) {
        var w = e.target.closest ? e.target.closest('.sel-multi') : null;
        for (var i = 0; i < document.querySelectorAll('.sel-multi.open').length; i++) {
          var open = document.querySelectorAll('.sel-multi.open')[i];
          if (!w || w !== open) closeMultiSel(open);
        }
      });
    }
    root.addEventListener('click', function (e) {
      var rm = e.target.closest ? e.target.closest('[data-ms-rm]') : null;
      if (rm) { removeRef(rm.closest('.sel-multi'), rm.getAttribute('data-ms-rm')); return; }
      var box = e.target.closest ? e.target.closest('[data-ms-box]') : null;
      if (box) { toggleMultiSel(box.closest('.sel-multi')); return; }
      var opt = e.target.closest ? e.target.closest('[data-ms-opt]') : null;
      if (opt) { var m = opt.closest('.sel-multi'); setTimeout(function () { syncMultiSelChips(m); }, 0); }
    });
    root.addEventListener('change', function (e) {
      var m = e.target.closest ? e.target.closest('.sel-multi') : null;
      if (m && e.target.getAttribute && e.target.getAttribute('data-ms-opt') !== null) syncMultiSelChips(m);
    });
    root.addEventListener('input', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-ms-search') !== null) {
        filterMultiSelOpts(e.target.closest('.sel-multi'), e.target.value);
      }
    });
  }
  function toggleMultiSel(w) {
    if (!w) return;
    if (w.classList.contains('open')) { closeMultiSel(w); return; }
    var roots = document.querySelectorAll('.sel-multi.open');
    for (var i = 0; i < roots.length; i++) closeMultiSel(roots[i]);
    w.classList.add('open');
    w.querySelector('[data-ms-panel]').removeAttribute('hidden');
    w.querySelector('[data-ms-search]').focus();
  }
  function closeMultiSel(w) {
    w.classList.remove('open');
    w.querySelector('[data-ms-panel]').setAttribute('hidden', 'hidden');
    var q = w.querySelector('[data-ms-search]');
    if (q && q.value) { q.value = ''; filterMultiSelOpts(w, ''); }
  }
  function filterMultiSelOpts(w, q) {
    q = (q || '').toLowerCase();
    var opts = w.querySelectorAll('.sel-opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].style.display = (opts[i].textContent.toLowerCase().indexOf(q) >= 0) ? '' : 'none';
    }
  }
  /* 依勾选状态重绘芯片（保留搜索框焦点） */
  function syncMultiSelChips(w) {
    var wrap = w.querySelector('[data-ms-chips]');
    var cbs = w.querySelectorAll('[data-ms-opt]:checked');
    var labs = {};
    w.querySelectorAll('[data-ms-opt]').forEach(function (cb) { labs[cb.getAttribute('data-ms-val')] = cb.textContent; });
    var arr = [];
    for (var i = 0; i < cbs.length; i++) arr.push(cbs[i].getAttribute('data-ms-val'));
    wrap.innerHTML = arr.length
      ? arr.map(function (v) {
        return '<span class="sel-chip" title="' + esc(labs[v] || '') + '">' + esc(v) + '<button type="button" data-ms-rm="' + esc(v) + '" aria-label="移除">×</button></span>';
      }).join('')
      : '<span class="sel-placeholder">未挂接</span>';
  }
  function removeRef(w, v) {
    var cbs = w.querySelectorAll('[data-ms-opt]');
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].getAttribute('data-ms-val') === v) cbs[i].checked = false;
    }
    syncMultiSelChips(w);
  }

  /* ================= 子节点编辑器（节点细分：各有任务 + 负责人，仅本人可见） ================= */
  function subNodeRowHtml(sub) {
    sub = sub || {};
    var taskOpts = dictOpts('task_type').map(function (o) {
      return '<option value="' + o.key + '"' + (o.key === (sub.task || 'process') ? ' selected' : '') + '>' + esc(o.label) + '</option>';
    }).join('');
    var users = L.USERS.map(function (u) { return u.id; });
    var ownerOpts = users.map(function (u) {
      return '<option value="' + u + '"' + (u === (sub.owner || 'tammy') ? ' selected' : '') + '>' + esc(u) + '</option>';
    }).join('');
    return '<div class="sub-row" data-sub-row data-sub-id="' + esc(sub.id || '') + '">' +
      '<input class="cfg-in" data-sub-name value="' + esc(sub.name || '') + '" placeholder="子节点名">' +
      '<select class="cfg-sel" data-sub-task>' + taskOpts + '</select>' +
      '<select class="cfg-sel" data-sub-owner>' + ownerOpts + '</select>' +
      '<button type="button" class="btn btn-xs btn-ghost" data-sub-del>移除</button></div>';
  }
  function subNodesHtml(def) {
    var subs = (def && def.subNodes) || [];
    return '<div class="field full"><label>子节点细分（仅对应负责人本人可见）</label>' +
      '<div class="sub-list" data-sub-list>' + (subs.length ? subs.map(function (s) { return subNodeRowHtml(s); }).join('') : '<div class="hint">暂无子节点（未细分，整节点一个任务）</div>') + '</div>' +
      '<button type="button" class="btn btn-xs" data-sub-add>+ 新增子节点</button>' +
      '<div class="hint">子节点各有任务与负责人；运行时仅对应负责人（或其委托代理）可见，管理员 / F1 审核员可见全部。</div></div>';
  }
  function readSubNodes(mask) {
    var out = [];
    var rows = mask.querySelectorAll('[data-sub-row]');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var name = String((r.querySelector('[data-sub-name]') || {}).value || '').trim();
      if (!name) continue;
      out.push({
        id: r.getAttribute('data-sub-id') || ('sub-' + Date.now() + '-' + out.length),
        name: name,
        task: (r.querySelector('[data-sub-task]') || {}).value || 'process',
        owner: (r.querySelector('[data-sub-owner]') || {}).value || 'tammy',
        dur: '—',
        status: 'eff'
      });
    }
    return out;
  }
  /* 子节点编辑器行为：全局委托（弹窗内动态增删子节点行） */
  var _subEditorBound = false;
  function bindSubNodeEditor() {
    if (_subEditorBound) return;
    _subEditorBound = true;
    document.addEventListener('click', function (e) {
      var add = e.target.closest ? e.target.closest('[data-sub-add]') : null;
      if (add) {
        var list = add.parentElement.querySelector('[data-sub-list]');
        if (list) {
          var hint = list.querySelector('.hint');
          if (hint) hint.remove();
          list.insertAdjacentHTML('beforeend', subNodeRowHtml({}));
        }
        return;
      }
      var del = e.target.closest ? e.target.closest('[data-sub-del]') : null;
      if (del) {
        var row = del.closest('[data-sub-row]');
        if (row) row.remove();
      }
    });
  }

  function viewDefs() {
    var defs = L.STATION_DEFS;
    var draft = defs.filter(function (d) { return d.status === 'draft'; }).length;
    var runningInst = L.FLOW_INSTANCES.filter(function (i) { return i.status === 'running'; }).length;

    /* 派生链路预览：改定义会漏掉哪些下游？全自动，0 处手工同步 */
    var derived = [
      ['流程模板引用', L.FLOW_TEMPLATES.reduce(function (s, t) { return s + t.nodes.length; }, 0) + ' 节点'],
      ['流程排配表', L.WORKFLOW_FLOWS.reduce(function (s, f) { return s + f.nodes.length; }, 0) + ' 节点'],
      ['Travel Sheet 环节流', L.TS_NODES.length + ' step'],
      ['Agent 处置单', L.AGENT_CASES.length + ' 单'],
      ['已下发快照核验', L.DEF_SNAPSHOT.length + ' 条']
    ];

    var tsStep = L.TS_NODES.map(function (n) {
      return '<div class="step-item"><div class="no">0' + n.node + '</div><div class="nm">' + esc(n.name) + '</div>' +
        '<div class="act">' + esc(whoName(n.role)) + ' · ' + esc(n.action) + '</div></div>';
    }).join('');

    var eff = defs.filter(function (d) { return d.status === 'eff'; }).length;

    var rows = defs.map(function (d) {
      var st = d.status === 'draft' ? '<span class="badge-pill warn">草稿待确认</span>' : '<span class="badge-pill ok">已生效</span>';
      var effTxt = d.status === 'draft' ? '—' : d.effectiveFrom;
      var note = d.changes && d.changes[0] ? esc(d.changes[0].what) : '—';
      return '<tr><td><span class="tag-chip">' + esc(d.flow) + '</span></td>' +
        '<td>' + esc(d.name) + '</td>' +
        '<td class="faint">' + esc(d.action) + '</td>' +
        '<td>' + esc(ROLE_CN[d.role] || d.role) + '</td>' +
        '<td>' + esc(whoName(d.owner)) + '</td>' +
        '<td class="mono">' + d.dur + '</td>' +
        '<td><span class="tag-chip ' + (d.status === 'draft' ? 'warn' : 'on') + '">' + d.ver + '</span></td>' +
        '<td class="mono">' + effTxt + '</td>' + '<td>' + st + '</td>' +
        '<td class="faint">' + note + '</td>' +
        '<td style="white-space:nowrap">' + (d.status === 'draft' ? '<button class="btn btn-xs btn-primary" data-def-pub data-id="' + d.id + '">发布下发</button> ' : '') +
        '<button class="btn btn-xs btn-ghost" data-def-edit data-id="' + d.id + '">编辑</button></td></tr>';
    }).join('');

    /* 小节点表格行（阶段城内共用；草稿节点带「发布下发」入口） */
    function defRow(d) {
      var st = d.status === 'draft' ? '<span class="badge-pill warn">草稿待确认</span>' : '<span class="badge-pill ok">已生效</span>';
      var effTxt = d.status === 'draft' ? '—' : d.effectiveFrom;
      var note = d.changes && d.changes[0] ? esc(d.changes[0].what) : '—';
      return '<tr draggable="true" data-def-drag data-id="' + d.id + '">' +
        '<td class="drag-h" title="拖拽调整同城小节点先后顺序">☰</td>' +
        '<td><b>' + esc(d.name) + '</b></td>' +
        '<td class="faint">' + esc(d.action) + '<div class="task-chips">' + taskChipsHtml(d) + '</div>' + (d.subNodes && d.subNodes.length ? '<div class="sub-count">' + d.subNodes.length + ' 个子节点</div>' : '') + '</td>' +
        '<td>' + esc(ROLE_CN[d.role] || d.role) + '</td>' +
        '<td>' + esc(whoName(d.owner)) + '</td>' +
        '<td class="mono">' + d.dur + '</td>' +
        '<td>' + execChips(d) + '<div class="art-io">' + artIoChips(d) + '</div>' + defWarn(d) + '</td>' +
        '<td><span class="tag-chip ' + (d.status === 'draft' ? 'warn' : 'on') + '">' + d.ver + '</span></td>' +
        '<td class="mono">' + effTxt + '</td>' + '<td>' + st + '</td>' +
        '<td class="faint">' + note + '</td>' +
        '<td style="white-space:nowrap">' + (d.status === 'draft' ? '<button class="btn btn-xs btn-primary" data-def-pub data-id="' + d.id + '">发布下发</button> ' : '') +
        '<button class="btn btn-xs btn-ghost" data-def-edit data-id="' + d.id + '">编辑</button> ' +
        '<button class="btn btn-xs btn-danger" data-def-del data-id="' + d.id + '" data-stage="' + d.stage + '">删除</button></td></tr>';
    }

    /* 阶段城（大名城）：T0/TX/TF 每座城容纳自己的作业小节点；支持折叠/展开 + 顶部模糊查询 */
    var stageHubs = L.STAGES.map(function (s) {
      var collapsed = !!HUB_COLLAPSED[s.id];
      var nodes = defs.filter(function (d) { return d.stage === s.id; });
      var tt = s.tt.map(function (t) { return '<span class="tt-chip">' + esc(t) + '</span>'; }).join('');
      /* 相邻节点箭头：若后一节点消耗前一节点产出的交接物，在箭头上标注 */
      function flowEdge(nodes, n, i) {
        var prev = nodes[i - 1];
        var share = (n.inputs || []).filter(function (a) { return (prev.outputs || []).indexOf(a) >= 0; });
        if (!share.length) return '<div class="flow-arrow"></div>';
        return '<div class="flow-arrow"><span class="art-edge">' + share.map(function (a) {
          var ai = artInfo(a);
          return '<span class="art-edge-tag" title="' + esc((ai && ai.name) || a) + '">' + esc(a) + '</span>';
        }).join(' ') + '</span></div>';
      }
      var strip = nodes.length ? nodes.map(function (n, i) {
        var cls = n.status === 'draft' ? ' current' : '';
        return (i > 0 ? flowEdge(nodes, n, i) : '') + '<div class="flow-node ' + cls + '"><span class="fn">' + (i + 1) + '</span>' +
          esc(n.name) + (n.status === 'draft' ? '<span class="faint" style="font-size:10px">·草稿</span>' : '') + '</div>';
      }).join('') : '<div class="flow-empty">暂无小节点 — 点「新增小节点」写入首个作业定义</div>';
      var body = collapsed ? '' :
        '<div class="hub-flow"><div class="flow-bar">' + strip + '</div></div>' +
        '<div class="tbl-wrap"><table class="data"><thead><tr>' +
        '<th class="drag-h"></th><th>小节点</th><th>做什么</th><th>岗位</th><th>负责人</th><th>时限</th><th>执行（脚本/工具）</th><th>版本</th><th>生效</th><th>状态</th><th>最近变更</th><th></th></tr></thead>' +
        '<tbody>' + nodes.map(defRow).join('') + '</tbody></table></div>';
      return '<div class="stage-hub' + (collapsed ? ' collapsed' : '') + '" data-search="' + esc(s.id + ' ' + s.name) + '"><div class="hub-head">' +
        '<div class="hub-id">' + esc(s.id) + '</div>' +
        '<div class="hub-meta"><div class="hub-name">' + esc(s.name) + '　<span class="meta">' + esc(s.desc) + '</span></div>' +
        '<div class="hub-tt">' + tt + ' <span class="tt-chip accent">顺序：' + esc(s.seq) + '</span></div></div>' +
        '<div class="hub-count"><b>' + nodes.length + '</b><span>个小节点</span></div>' +
        '<div class="hub-actions"><button class="btn btn-xs btn-ghost" data-def-toggle-hub="' + s.id + '" title="折叠 / 展开">' + icon(collapsed ? 'chevRight' : 'chevDown') + (collapsed ? '展开' : '折叠') + '</button> ' +
        '<button class="btn btn-xs btn-ghost" data-def-add-stage="' + s.id + '">' + icon('plus') + '新增小节点</button> ' +
        '<button class="btn btn-xs btn-ghost" data-def-edit-stage="' + s.id + '">' + icon('edit') + '编辑阶段城</button> ' +
        '<button class="btn btn-xs btn-danger" data-def-del-stage="' + s.id + '">' + icon('trash') + '删除阶段城</button></div>' +
        '</div>' + body + '</div>';
    }).join('');

    var flowHtml = L.WORKFLOW_FLOWS.map(function (f) {
      var r = f.nodes.map(function (n) {
        var st = n.status === 'draft' ? ' <span class="tag-chip warn">' + n.ver + ' 草稿</span>' : '';
        return '<tr><td>' + esc(n.name) + '</td><td class="faint">' + esc(n.action) + '</td>' +
          '<td>' + esc(whoName(n.owner)) + '</td><td class="mono">' + n.dur + '</td>' + st + '</tr>';
      }).join('');
      return '<div class="card mt-4"><div class="card-head"><h3>『' + esc(f.flow) + '』</h3><div class="meta">reading SSOT · 自动更正</div></div>' +
        '<div class="tbl-wrap"><table class="data"><thead><tr><th>节点</th><th>动作</th><th>负责人</th><th>时限</th><th>版本</th></tr></thead><tbody>' + r + '</tbody></table></div></div>';
    }).join('');

    /* 流程模板卡：可编排的有序节点引用（上移/下移/移除/添加 + 发布 + 启动） */
    var tplHtml = L.FLOW_TEMPLATES.map(function (t) {
      var statusBadge = t.status === 'draft' ?
        '<span class="badge-pill warn">草稿调整 ' + esc(t.ver) + '</span><span class="faint">（在跑实例仍按 v' + esc(t.releasedVer) + '）</span>' :
        '<span class="badge-pill ok">已发布 ' + esc(t.ver) + '</span>';
      var rowsT = t.nodes.map(function (id, idx) {
        var n = tplNodeDef(t, id);
        var verChip = n.status === 'draft' ?
          '<span class="tag-chip warn">' + n.ver + '</span>' : '<span class="tag-chip on">' + n.ver + '</span>';
        return '<tr><td class="mono">' + ('0' + (idx + 1)).slice(-2) + '</td>' +
          '<td>' + esc(n.name) + '</td>' +
          '<td class="faint">' + esc(n.action) + '</td>' +
          '<td>' + esc(ROLE_CN[n.role] || n.role) + '</td>' +
          '<td>' + esc(whoName(n.owner)) + '</td>' +
          '<td class="mono">' + n.dur + '</td>' +
          '<td>' + verChip + '</td>' +
          '<td style="white-space:nowrap">' +
          '<button class="btn btn-xs btn-ghost" data-tpl-up data-key="' + t.key + '" data-idx="' + idx + '"' + (idx === 0 ? ' disabled' : '') + '>上移</button> ' +
          '<button class="btn btn-xs btn-ghost" data-tpl-down data-key="' + t.key + '" data-idx="' + idx + '"' + (idx === t.nodes.length - 1 ? ' disabled' : '') + '>下移</button> ' +
          '<button class="btn btn-xs btn-ghost" data-tpl-del data-key="' + t.key + '" data-idx="' + idx + '">移除</button></td></tr>';
      }).join('');
      var lastChange = (t.changes && t.changes[0]) ? esc(t.changes[0].what) : '';
      return '<div class="card mt-4"><div class="card-head"><h3>' + icon('layers') + ' 流程模板 · ' + esc(t.name) + '</h3><div class="meta">' + statusBadge + '</div></div>' +
        '<div class="tbl-wrap"><table class="data"><thead><tr><th>#</th><th>节点</th><th>做什么</th><th>岗位</th><th>负责人</th><th>时限</th><th>版本</th><th>编排</th></tr></thead><tbody>' + rowsT + '</tbody></table></div>' +
        '<div class="m-foot" style="justify-content:space-between"><span class="faint">' + lastChange + ' · 节点仅引用定义 id，改模板 = 新版本草稿，发布后才生效</span>' +
        '<span style="display:flex;gap:8px">' +
        (t.status === 'draft' ? '<button class="btn btn-xs btn-primary" data-tpl-pub data-key="' + t.key + '">' + icon('check') + '发布流程</button>' : '') +
        '<button class="btn btn-xs btn-ghost" data-tpl-add data-key="' + t.key + '">' + icon('plus') + '添加节点</button>' +
        '<button class="btn btn-xs btn-primary" data-tpl-start data-key="' + t.key + '">' + icon('play') + '启动流程</button></span></div></div>';
    }).join('');

    /* 流程实例卡：启动钉版本，当前节点位置用 step-item 实时展示，推进路由下一负责人 */
    var instRows = L.FLOW_INSTANCES.slice().reverse().map(function (ins) {
      var t = flowTplById(ins.tpl);
      if (!t) return '';
      var i = t.nodes.indexOf(ins.current);
      var nd = i >= 0 ? tplNodeDef(t, ins.current) : null;
      var eff = nd ? nodeOwner(nd) : null;
      var ownerTxt = nd ?
        esc(whoName(eff.leave ? eff.id : nd.owner)) + (eff.leave ? ' <span class="tag-chip bad">代 ' + esc(whoName(nd.owner)) + '</span>' : '') : '—';
      var dots = t.nodes.map(function (id, k) {
        var cls = ins.status === 'done' ? (k <= i ? 'done' : '') : (k < i ? 'done' : k === i ? 'current' : '');
        return '<div class="step-item ' + cls + '"><div class="no">' + ('0' + (k + 1)).slice(-2) + '</div><div class="nm">' + esc(tplNodeDef(t, id).name) + '</div></div>';
      }).join('');
      var stB = ins.status === 'done' ? '<span class="badge-pill ok">已闭环</span>' : '<span class="badge-pill info">运行中</span>';
      var actB = ins.status === 'running' ?
        '<button class="btn btn-xs btn-primary" data-inst-next data-id="' + ins.id + '">' + icon('arrow') + '推进</button>' :
        '<span class="faint">—</span>';
      var posTxt = i >= 0 ?
        '第 ' + (i + 1) + ' / ' + t.nodes.length + ' 步 · 当前「' + (nd ? esc(nd.name) : '—') + '」 · ' + ownerTxt :
        '<span class="tag-chip bad">实例钉版本漂移：当前节点已不在模板中</span>';
      return '<tr><td class="mono">' + ins.id + '</td><td>' + esc(ins.subject) + '</td>' +
        '<td>' + esc(t.name) + ' <span class="tag-chip">' + esc(ins.tplVer) + '</span></td>' +
        '<td class="mono">' + ins.startedAt + '</td>' +
        '<td>' + stB + '</td><td>' + actB + '</td></tr>' +
        '<tr><td class="faint small">节点位置</td>' +
        '<td colspan="5"><div class="stepper" style="overflow-x:auto;padding-bottom:4px">' + dots + '</div>' +
        '<div class="faint small" style="margin-top:4px">' + posTxt + '</div></td></tr>';
    }).join('');

    return pageShell('作业设定中心', '按测试阶段城（T0 / TX / TF）聚合 · 唯一真源 SSOT · 每个阶段城容纳各自的作业小节点，一处定义，流程排配 / Travel Sheet / 台账全部派生自动更正',
      '<button class="btn btn-primary" data-def-add>' + icon('plus') + '新增小节点</button>' +
      '<button class="btn btn-ghost" data-def-add-stage-city>' + icon('plus') + '新增阶段城</button>' +
      '<button class="btn btn-ghost" data-def-scan>' + icon('pulse') + '定义漂移巡检</button>' +
      '<button class="btn btn-ghost" data-art-scan>' + icon('arrow') + '交接物链路校验</button>') +
      '<div class="kpi-row">' +
      '<div class="kpi row"><div class="k-label">阶段城</div><div class="k-value">' + L.STAGES.length + '</div><div class="k-foot">' + L.STAGES.map(function (g) { return g.id; }).join(' / ') + '</div></div>' +
      '<div class="kpi row"><div class="k-label">作业小节点</div><div class="k-value">' + defs.length + '</div><div class="k-foot">全部分布在阶段城内</div></div>' +
      '<div class="kpi row"><div class="k-label">已生效版本</div><div class="k-value">' + eff + '</div><div class="k-foot">确认下发</div></div>' +
      '<div class="kpi row"><div class="k-label">草稿待确认</div><div class="k-value">' + draft + '</div><div class="k-foot">未生效，不会下发</div></div></div>' +
      '<div class="defs-tools"><div class="searchbox">' + icon('search') + '<input type="text" data-def-search placeholder="模糊查询阶段城（ID / 名称，如 TZ / 分段）"></div>' +
      '<div class="faint" id="defs-search-count"></div></div>' +
      '<div class="art-check-line" id="art-check-line">' + artCheckLine() + '</div>' +
      '<div class="faint" id="defs-search-empty" style="display:none;padding:18px 2px">未命中任何阶段城，换个关键词试试。</div>' +
      '<div class="small dim" style="margin:12px 2px">阶段城从上到下即机台主循环（T0 → TX → TF）；每个城内部的小节点顺序即该阶段的站点作业流。' +
      '「新增小节点」写入所属阶段城的新草稿 → 「编辑」调整字段 → 「发布下发」确认生效，保存后新版本自动派生到下方全部视图，无需逐处改。</div>' +
      stageHubs +
      '<div class="stage-hub add"><button class="btn btn-ghost" data-def-add-stage-city>' + icon('plus') + '新增阶段城（再建一座城）</button></div>' +
      '<div class="mono faint" id="defs-console" style="min-height:60px;font-size:12px;line-height:1.6;padding:10px 12px;margin-top:14px;border:1px dashed var(--line);border-radius:var(--radius-sm);background:var(--bg-elev)">定义漂移巡检 / 交接物链路校验 输出将显示在这里…</div>' +
      '<div class="rule-row"><div>① 阶段城是只读聚合容器，业务只读 SSOT（STATION_DEFS），定义保存后 rebuildDefs() 一处派生，不产生副本。</div>' +
      '<div>② 定义版本两态：<b>eff</b> 已生效（下发） / <b>draft</b> 草稿待确认（不参与业务，防止误下发）。</div>' +
      '<div>③ Agent 用「已下发快照」比对定义漂移：定义改了、旧册还挂着 → 巡检提示重印/重审。</div>' +
      '<div>④ 每次修订写入变更历史 + AGENT_LOG 审计（谁 / 何时 / 旧版→新版）。</div>' +
      '<div>⑤ 小节点可挂「执行资源」：执行方式（人工/半自动/自动）+ 脚本（S 号）+ 工具（Key），仅引用不复制 —— 点 S 号跳脚本详情、点工具 Key 跳运行页；工具库 / 脚本注册仍为独立登记中心。</div>' +
      '<div>⑥ 小节点可声明「交接物」：上游依赖（inputs）/ 本节点产出（outputs），交接物在登记中心（ARTIFACTS）维护，工具 hook = 提交自动写出的交接物 —— 「交接物链路校验」防断链 / 孤儿产物。</div></div>';
  }

  /* 定义漂移巡检：SSOT vs 已下发快照（取该节点最后一次发布），找到「改了定义但旧册还在用」的漂移 */
  function runDefScan() {
    var drift = [];
    L.STATION_DEFS.forEach(function (d) {
      var snaps = L.DEF_SNAPSHOT.filter(function (s) { return s.id === d.id; });
      var snap = snaps[snaps.length - 1] || null;
      if (d.status === 'draft') {
        drift.push({ id: d.id, name: d.name, old: snap ? snap.ver : '—', cur: d.ver,
          why: '草稿待确认，业务仍按旧版 ' + (snap ? snap.ver : '（无已下发版本）') + ' 执行' });
      } else if (snap && snap.ver !== d.ver) {
        drift.push({ id: d.id, name: d.name, old: snap.ver, cur: d.ver, why: '已生效但快照未重发（旧册还在用）' });
      }
    });
    L.AGENT_LOG.push({ t: dateNow(), who: currentUser().name, act: '定义漂移巡检：' + (drift.length ? '发现 ' + drift.length + ' 处漂移' : '0 漂移'), res: drift.length ? 'warn' : 'ok' });
    return drift;
  }

  /* ================= 字典中心（集中管理：一处修改，多处生效） ================= */
  var REPORT_STATE = { sn: 'MTL00011', tplKey: null, parsed: false, values: {} };

  function viewDicts() {
    var cards = (L.DICTS || []).map(function (d) {
      var rows = d.options.map(function (o) {
        var extra = '';
        if (o.part) extra = ' · ' + esc(o.part);
        if (o.color) extra = ' · ' + esc(o.color);
        return '<tr><td class="mono">' + esc(o.key) + '</td><td>' + esc(o.label) + extra + '</td>' +
          '<td style="white-space:nowrap"><button class="btn btn-xs btn-ghost" data-dict-opt-edit data-id="' + d.id + '" data-key="' + esc(o.key) + '">编辑</button> ' +
          '<button class="btn btn-xs btn-danger" data-dict-opt-del data-id="' + d.id + '" data-key="' + esc(o.key) + '">删除</button></td></tr>';
      }).join('');
      var consumers = '';
      if (d.id === 'task_type') consumers = '节点任务下拉';
      else if (d.id === 'fx_issue') consumers = '报告纸多选下拉 · 目检勾选卡';
      else if (d.id === 'test_conclusion' || d.id === 'env_item' || d.id === 'mech_item') consumers = '报告纸多选下拉';
      else if (d.id === 'recon_tag') consumers = '失败标签';
      return '<div class="card mt-4"><div class="card-head"><h3>' + esc(d.name) + ' <span class="tag-chip">' + esc(d.id) + '</span></h3>' +
        '<div class="meta">' + esc(d.desc || '') + ' · 被引用处：' + consumers + '</div></div>' +
        '<div class="tbl-wrap"><table class="data"><thead><tr><th>Key</th><th>选项</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="m-foot"><button class="btn btn-xs btn-primary" data-dict-opt-add data-id="' + d.id + '">' + icon('plus') + '新增选项</button>' +
        '<span class="faint small" style="margin-left:10px">保存后所有引用「' + esc(d.name) + '」的下拉 / 多选下拉即时生效</span></div></div>';
    }).join('');
    var totalOpts = (L.DICTS || []).reduce(function (s, d) { return s + d.options.length; }, 0);
    return pageShell('字典中心', '所有下拉 / 多选下拉的统一数据源（一处修改，多处生效）：节点任务类型、报告纸多选下拉栏位、外观问题、测试结论、环境 / 机械测试项、失败标签', '') +
      '<div class="kpi-row">' +
      '<div class="kpi"><div class="k-label">字典数量</div><div class="k-value">' + (L.DICTS || []).length + '</div><div class="k-foot">集中管理</div></div>' +
      '<div class="kpi isTeal"><div class="k-label">选项总数</div><div class="k-value">' + totalOpts + '</div><div class="k-foot">多处引用即时生效</div></div>' +
      '</div>' + cards;
  }

  function dictOptionModal(dictId, key) {
    var d = dictById(dictId);
    if (!d) return;
    var o = key ? d.options.filter(function (x) { return x.key === key; })[0] : null;
    var hasPart = dictId === 'fx_issue';
    var hasColor = dictId === 'recon_tag';
    modal((o ? '编辑选项 · ' : '新增选项 · ') + d.name,
      '<div class="form-grid">' +
      '<div class="field"><label>Key</label><input type="text" value="' + esc(o ? o.key : '') + '" data-do-key ' + (o ? 'disabled' : '') + '></div>' +
      '<div class="field"><label>显示名</label><input type="text" value="' + esc(o ? o.label : '') + '" data-do-label></div>' +
      (hasPart ? '<div class="field"><label>部位</label><input type="text" value="' + esc(o && o.part ? o.part : '') + '" data-do-part></div>' : '') +
      (hasColor ? '<div class="field"><label>颜色</label><input type="text" value="' + esc(o && o.color ? o.color : 'ok') + '" data-do-color></div>' : '') +
      '<div class="field full"><div class="hint">保存后所有引用「' + esc(d.name) + '」的下拉 / 多选下拉即时生效（节点任务、报告纸、目检勾选同步更新）。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存</button></div></div>',
      function (mask) {
        var label = String((mask.querySelector('[data-do-label]') || {}).value || '').trim();
        if (!label) { toast('显示名必填', 'bad'); return; }
        var nk = String((mask.querySelector('[data-do-key]') || {}).value || '').trim();
        if (o) {
          o.label = label;
          if (hasPart) o.part = (mask.querySelector('[data-do-part]') || {}).value;
          if (hasColor) o.color = (mask.querySelector('[data-do-color]') || {}).value;
        } else {
          var opt = { key: nk || ('opt-' + (d.options.length + 1)), label: label };
          if (hasPart) opt.part = (mask.querySelector('[data-do-part]') || {}).value;
          if (hasColor) opt.color = (mask.querySelector('[data-do-color]') || {}).value;
          d.options.push(opt);
        }
        L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: (o ? '编辑' : '新增') + '字典选项 ' + d.id + '：' + label, res: 'info' });
        mask.remove();
        toast('已保存「' + d.name + '」选项，所有引用即时生效', 'ok');
        renderPageOnly('dicts');
      });
  }

  function doDictOptDel(dictId, key) {
    var d = dictById(dictId);
    if (!d) return;
    var idx = -1;
    d.options.forEach(function (o, i) { if (o.key === key) idx = i; });
    if (idx < 0) return;
    var lab = d.options[idx].label;
    d.options.splice(idx, 1);
    toast('已删除选项「' + esc(lab) + '」，所有引用即时生效', 'warn');
    renderPageOnly('dicts');
  }

  /* ================= 报告纸（上传 Excel 仅带出基础数据 + 模板按站别自动匹配 / 可调整 / 另存为固定模板） ================= */
  /* 报告纸模板 = FORM_TEMPLATES 里 cat='report' 的模板；每套模板绑定一个站点（station），按机台站别自动匹配 */
  function reportTemplates() {
    return (L.FORM_TEMPLATES || []).filter(function (t) { return t.cat === 'report' || t.key.indexOf('report') === 0; });
  }
  function reportSheetTpl() {
    var list = reportTemplates();
    if (!list.length) return null;
    var rs = reportSheetFor(REPORT_STATE.sn);
    var station = rs ? rs.station : null;
    /* 用户「另存为固定模板」后手动选中的模板优先（须与机台站别一致，避免串站） */
    if (REPORT_STATE.tplKey) {
      var hit = list.filter(function (t) { return t.key === REPORT_STATE.tplKey && (!station || t.station === station); })[0];
      if (hit) return hit;
    }
    /* 否则按机台站别自动匹配：Cosmetic / Mini line / Test Center 各自一套 */
    var byStation = station ? list.filter(function (t) { return t.station === station; })[0] : null;
    return byStation || list[0];
  }
  function reportSheetFor(sn) {
    return (L.REPORT_SHEETS || []).filter(function (r) { return r.sn === sn; })[0] || null;
  }
  function reportBasicItems(rs) {
    return [
      { label: '机台 SN', value: rs.sn },
      { label: '机型', value: rs.model },
      { label: '客户产品', value: rs.product },
      { label: '产品阶段', value: rs.phase },
      { label: '测试阶段', value: rs.stage },
      { label: '站别', value: rs.station },
      { label: '班别', value: (L.MINI_BATCH && L.MINI_BATCH.shift) || '—' },
      { label: '日期', value: dateOnly() }
    ];
  }
  function reportMsHtml(dictId, sel) {
    var opts = dictOpts(dictId);
    return '<div class="check-grid" data-rpt-ms data-dict="' + dictId + '">' + opts.map(function (o) {
      var on = (sel || []).indexOf(o.key) >= 0;
      var sub = o.part ? esc(o.part) : '';
      return '<div class="check-card' + (on ? ' checked' : '') + '" data-rpt-opt data-key="' + esc(o.key) + '">' +
        '<div class="box">' + icon('check') + '</div>' +
        '<div><div class="cname">' + esc(o.label) + '</div>' + (sub ? '<div class="ccode">' + sub + '</div>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  /* 工站测试结果区：来自 Mini line 上传的工站 Excel（MINI_IMPORT），未导入时给出提示 */
  function reportMiniSection(rs) {
    var imp = miniImportFor(rs.sn);
    if (!imp) {
      return '<div class="fp-mini-wrap isIdle"><div class="fp-mini-title">工站测试结果</div>' +
        '<div class="fp-mini-sub">待 Mini line 导入——到「节点作业」（#/travel-sheet）Mini line 环节「上传 Excel（模拟）」后，工站结果会自动带到这里。</div></div>';
    }
    var stations = imp.stations || [];
    var pass = stations.filter(function (r) { return r.status === 'pass' || r.status === 'done'; }).length;
    var fail = stations.filter(function (r) { return r.status === 'fail'; }).length;
    var fails = stations.filter(function (r) { return r.status === 'fail'; });
    return '<div class="fp-mini-wrap">' +
      '<div class="fp-mini-title">工站测试结果 · 来自 Mini line Excel</div>' +
      '<div class="fp-mini-file mono">' + esc(imp.file) + ' · ' + esc(imp.at) + '</div>' +
      '<div class="fp-mini-count">' + stations.length + ' 工站　·　通过 <b class="ok">' + pass + '</b>　·　失败 <b class="bad">' + fail + '</b></div>' +
      (fails.length ? '<div class="fp-mini-fails">失败工站：' + fails.map(function (r) { return esc(r.st); }).join(' / ') + '</div>' : '') +
      '</div>';
  }
  function reportPaperHtml(rs) {
    var tpl = reportSheetTpl();
    if (!tpl) return '<div class="small dim">未配置报告纸模板。</div>';
    var fields = (tpl.fields || []).map(function (f) {
      var req = f.required ? '<i class="fp-req">*</i>' : '';
      var body;
      if (f.type === '多选下拉') {
        var dk = f.dict || 'fx_issue';
        body = reportMsHtml(dk, REPORT_STATE.values[dk] || []);
      } else if (f.type === '下拉') {
        var dk1 = f.dict || 'fx_issue';
        body = '<div class="fp-widget">▼ ' + dictOpts(dk1).map(function (o) { return o.label; }).join(' / ') + '</div>';
      } else if (f.type === '签名') {
        body = '<div class="fp-sign">签名区</div>';
      } else if (f.type === '数字') {
        body = '<div class="fp-widget">123</div>';
      } else if (f.type === '文本域') {
        body = '<div class="fp-area">多行填写…</div>';
      } else {
        body = '<div class="fp-widget">填写</div>';
      }
      return '<div class="fp-cell" style="flex:0 0 ' + Math.round((+f.w || 2) / 12 * 100) + '%;min-height:' + (44 * (+f.h || 1)) + 'px">' +
        '<div class="fp-label">' + esc(f.label) + ' ' + req + '</div>' + body + '</div>';
    }).join('');
    return '<div class="form-paper"><div class="fp-head"><div class="fp-title">' + esc(tpl.name) + ' · ' + esc(rs.sn) + '</div>' +
      '<div class="fp-meta">' + esc(tpl.key + ' · ' + tpl.version) + '</div></div>' +
      '<div class="fp-basic-wrap">' + basicHeaderHtml(reportBasicItems(rs), 'Excel 自动带出') + '</div>' +
      reportMiniSection(rs) +
      '<div class="fp-row">' + fields + '</div></div>';
  }
  function initReportValues(rs) {
    var v = {};
    ['fx_issue', 'test_conclusion', 'env_item', 'mech_item'].forEach(function (id) {
      v[id] = ((rs.values || {})[id] || []).slice();
    });
    REPORT_STATE.values = v;
  }
  /* ---- Report 机台入账：上传 Excel → 预览确认 → 入库（MACHINES / BATCH_MACHINES / TEST_BATCHES） ---- */
  function inboundPreviewRows() {
    /* 模拟入账 Excel 解析出的机台基础信息（入账 Excel 只含基础信息，SN 为主键） */
    var rows = [
      { sn: 'MTL00023', model: 'Falcon-3',     phase: 'DVT', product: 'Project Nova', stage: 'T0', station: 'Cosmetic',     shift: '中班', date: '10-08' },
      { sn: 'MTL00024', model: 'Falcon-3',     phase: 'DVT', product: 'Project Nova', stage: 'T0', station: 'Cosmetic',     shift: '中班', date: '10-08' },
      { sn: 'MTL00011', model: 'Falcon-2',     phase: 'PreEVT', product: 'Project Nova', stage: 'T0', station: 'Cosmetic',     shift: '中班', date: '10-08' },
      { sn: 'MTL00016', model: 'Falcon-2 Pro', phase: 'EVT', product: 'Project Nova', stage: 'TX', station: 'Report/Recon', shift: '中班', date: '10-08' }
    ];
    var reuseMap = { MTL00011: 'retest', MTL00016: 'continue' };
    return rows.map(function (r) {
      var exists = (L.MACHINES || []).some(function (m) { return m.sn === r.sn; });
      return { sn: r.sn, model: r.model, phase: r.phase, product: r.product, stage: r.stage,
        station: r.station, shift: r.shift, date: r.date, runType: exists ? (reuseMap[r.sn] || 'retest') : 'fresh' };
    });
  }
  function inboundPreviewModal() {
    var rows = inboundPreviewRows();
    var trs = rows.map(function (r) {
      return '<tr><td class="mono">' + esc(r.sn) + '</td><td>' + esc(r.model) + '</td><td>' + esc(r.phase) + '</td>' +
        '<td><span class="tag-chip">' + esc(r.stage) + '</span></td><td>' + runTypeBadge(r.runType) + '</td></tr>';
    }).join('');
    var fresh = rows.filter(function (r) { return r.runType === 'fresh'; }).length;
    var reuse = rows.length - fresh;
    return '<div class="tbl-wrap" style="margin-bottom:12px"><table class="data"><thead><tr><th>SN</th><th>型号</th><th>产品阶段</th><th>测试阶段</th><th>入库类型</th></tr></thead>' +
      '<tbody>' + trs + '</tbody></table></div>' +
      '<div class="hint" style="margin-bottom:12px">共解析 <b>' + rows.length + '</b> 台：新选 <b>' + fresh + '</b> · 复用 <b>' + reuse + '</b>（复测=重跑同阶段 / 续测=承接上批阶段）。SN 为主键自动去重，检查无误后确认入库。</div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">确认入库</button></div>';
  }
  function doInboundConfirm(mask) {
    var rows = inboundPreviewRows();
    var now = new Date();
    function p2(n) { return n < 10 ? '0' + n : '' + n; }
    var n = (L.TEST_BATCHES || []).length + 1;
    var batchId = 'B-' + p2(now.getMonth() + 1) + p2(now.getDate()) + '-0' + n;
    var initStatus = { T0: 'cosmetic', TX: 'testcenter', TF: 'testcenter' };
    var added = 0, reused = 0;
    rows.forEach(function (r) {
      var exists = (L.MACHINES || []).some(function (m) { return m.sn === r.sn; });
      if (!exists) {
        L.MACHINES.push({ sn: r.sn, model: r.model, phase: r.phase, product: r.product, stage: r.stage, station: r.station, shift: r.shift, date: r.date, status: 'confirmed' });
        added++;
      } else { reused++; }
      L.BATCH_MACHINES.push({ batchId: batchId, sn: r.sn, runType: r.runType, stage: r.stage, status: initStatus[r.stage] || 'cosmetic', conclusion: '—' });
    });
    L.TEST_BATCHES.push({ id: batchId, product: rows[0].product, phase: rows[0].phase, date: p2(now.getMonth() + 1) + '-' + p2(now.getDate()), range: 'T0+TX', machineCount: rows.length, status: '进行中', conclusion: '—', from: dateNow(), to: '—', owner: currentUser().id });
    L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: '机台入账 ' + batchId + '（新选 ' + added + ' · 复用 ' + reused + '）', res: 'ok' });
    mask.remove();
    toast('入账完成：批次 ' + batchId + '（新选 ' + added + ' 台 · 复用 ' + reused + ' 台）已写入机台档案 / 测试批次', 'ok');
    renderPageOnly('report');
  }

  function viewReport() {
    var sheets = L.REPORT_SHEETS || [];
    if (!sheets.length) return pageShell('报告纸', '暂无报告纸运行数据', '') + '<div class="card"><div class="small dim">无 REPORT_SHEETS 数据。</div></div>';
    var rs = reportSheetFor(REPORT_STATE.sn) || sheets[0];
    REPORT_STATE.sn = rs.sn;
    var tpl = reportSheetTpl();
    var paper = REPORT_STATE.parsed
      ? reportPaperHtml(rs)
      : '<div class="card"><div class="small dim">请先「上传 Excel（模拟）」生成报告纸——Excel 仅带出机台（Units）基础数据，多选下拉栏位与版式由该机台站别对应的模板决定。</div></div>';
    return pageShell('报告纸（可自定义）', '上传 Excel 只带出 Units 基础数据；报告纸模板按机台站别（Cosmetic / Mini line / Test Center）自动匹配，可「调整 / 另存为固定模板」，多选下拉栏位数据来自「字典中心」（一处修改多处生效）',
      '<label class="ts-tray">机台<select data-rpt-sn>' + sheets.map(function (r) {
        return '<option value="' + r.sn + '"' + (r.sn === REPORT_STATE.sn ? ' selected' : '') + '>' + r.sn + ' · ' + r.station + '</option>';
      }).join('') + '</select></label>' +
      '<button class="btn btn-ghost" data-rpt-upload>' + icon('upload') + '上传 Excel（模拟）</button>' +
      '<button class="btn btn-ghost" data-rpt-inbound>' + icon('archive') + '机台入账预览确认</button>' +
      '<button class="btn btn-ghost" data-rpt-adjust>' + icon('edit') + '调整模板</button>' +
      '<button class="btn btn-ghost" data-rpt-saveas>' + icon('layers') + '另存为固定模板</button>' +
      (REPORT_STATE.parsed ? '<button class="btn btn-primary" data-rpt-save>' + icon('check') + '保存报告纸</button>' : '')) +
      '<div class="card"><div class="card-head"><h3>报告纸模板 · ' + esc(tpl ? tpl.name : '—') + '</h3>' +
      '<div class="meta">站别 ' + esc(rs.station) + ' 自动匹配 · 多选下拉栏位引用字典：' + (tpl ? tpl.fields.filter(function (f) { return f.type === '多选下拉'; }).map(function (f) { return f.dict; }).join(' / ') : '—') + '　·　Excel 仅带出基础信息表头，栏位版式随模板走</div></div>' + paper + '</div>';
  }

  /* 另存为固定模板：复制当前报告纸模板的字段结构，存为新模板（cat='report'），报告纸页可切换使用 */
  function saveReportTemplateModal() {
    var src = reportSheetTpl();
    if (!src) { toast('当前无报告纸模板可另存', 'bad'); return; }
    var n = (L.FORM_TEMPLATES || []).filter(function (t) { return t.cat === 'report'; }).length + 1;
    var suggest = 'report_sheet_' + n;
    modal('另存为固定模板 · 基于 ' + src.name,
      '<div class="form-grid">' +
      '<div class="field"><label>模板 Key</label><input type="text" value="' + esc(suggest) + '" data-st-key></div>' +
      '<div class="field"><label>模板名称</label><input type="text" value="' + esc(src.name + ' · 副本') + '" data-st-name></div>' +
      '<div class="field full"><div class="hint">将复制当前模板「' + esc(src.name) + '」的字段结构（' + (src.fields || []).length + ' 个字段），保存为新固定模板（继承站别 ' + esc(src.station || '—') + '）；保存后本机台切换到该模板，切到同站别机台仍可复用。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存为新模板</button></div></div>',
      function (mask) {
        var key = String((mask.querySelector('[data-st-key]') || {}).value || '').trim();
        var name = String((mask.querySelector('[data-st-name]') || {}).value || '').trim();
        if (!key || !name) { toast('Key 与名称必填', 'bad'); return; }
        if ((L.FORM_TEMPLATES || []).some(function (t) { return t.key === key; })) { toast('Key「' + esc(key) + '」已存在', 'bad'); return; }
        var copy = {
          key: key, name: name, stage: src.stage || '—', nodes: src.nodes || 1,
          station: src.station || '—',
          owner: [currentUser().id], version: 'v1.0.0', status: 'active',
          header: !!src.header, cat: 'report',
          fields: (src.fields || []).map(function (f) { return JSON.parse(JSON.stringify(f)); })
        };
        L.FORM_TEMPLATES.push(copy);
        REPORT_STATE.tplKey = key;
        L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: '另存报告纸固定模板 ' + key + '（基于 ' + src.key + '）', res: 'info' });
        mask.remove();
        toast('已另存为固定模板「' + name + '」，并已切换使用', 'ok');
        renderPageOnly('report');
      });
  }

  /* =====================================================   * 机台档案 + 电子档 + 测试批次（两头归档之一）
   * SSOT：MACHINES(机台主数据) + TEST_BATCHES(批次) + BATCH_MACHINES(批次×机台)
   * 电子档 / 批次全量均聚合派生，不另存一份。
   * ============================================================ */
  var MC_STATE = { q: '', stage: 'all', page: 1 };
  var MC_PAGE_SIZE = 5;
  var BT_STATE = { page: 1 };
  var BT_PAGE_SIZE = 5;

  function machineById(sn) {
    return (L.MACHINES || []).filter(function (m) { return m.sn === sn; })[0] || null;
  }
  function batchById(id) {
    return (L.TEST_BATCHES || []).filter(function (b) { return b.id === id; })[0] || null;
  }
  function machineBatches(sn) {
    return (L.BATCH_MACHINES || []).filter(function (r) { return r.sn === sn; });
  }
  function batchMachinesOf(batchId) {
    return (L.BATCH_MACHINES || []).filter(function (r) { return r.batchId === batchId; });
  }
  function runTypeBadge(rt) {
    var m = { fresh: ['ok', '新选'], retest: ['warn', '复测'], 'continue': ['info', '续测'] };
    var c = m[rt] || ['gray', rt || '—'];
    return '<span class="badge-pill ' + c[0] + '">' + esc(c[1]) + '</span>';
  }
  function machineStatusBadge(st) {
    return st === 'confirmed' ? '<span class="badge-pill ok">已入库</span>' : '<span class="badge-pill warn">' + esc(st || '—') + '</span>';
  }
  /* 阶段节点骨架（仅生效定义，顺序 = STATION_DEFS 数组顺序） */
  function stageNodes(stage) {
    return L.STATION_DEFS.filter(function (d) { return d.stage === stage && d.status === 'eff'; });
  }
  /* 台账状态 → 该阶段节点链的 done/current/todo 标记（电子档节点时间线） */
  function nodeStatesFor(stage, status) {
    var nodes = stageNodes(stage);
    var role = STATUS_ROLE[status];
    var cur = -1;
    if (status === 'done' || status === 'done-no-tx') {
      cur = nodes.length; /* 全部完成 */
    } else if (role) {
      nodes.forEach(function (d, i) { if (d.role === role && cur < 0) cur = i; });
    }
    if (cur < 0) cur = 0;
    return nodes.map(function (d, i) {
      return { d: d, state: i < cur ? 'done' : (i === cur ? 'cur' : 'todo') };
    });
  }
  function nodeTimeline(stage, status) {
    var rows = nodeStatesFor(stage, status);
    if (!rows.length) return '<div class="small faint">该阶段暂无节点定义。</div>';
    return rows.map(function (r) {
      var badge = r.state === 'done' ? '<span class="badge-pill ok">已完成</span>'
        : r.state === 'cur' ? '<span class="badge-pill on">当前</span>'
        : '<span class="badge-pill gray">待处理</span>';
      var adv = r.d.advance === 'batch' ? ' <span class="tag-chip">整批</span>' : '';
      return '<div class="node-li' + (r.state === 'cur' ? ' cur' : '') + '">' +
        '<span class="mono">' + esc(r.d.id) + '</span>' +
        '<b>' + esc(r.d.name) + '</b>' + adv +
        '<span class="faint">' + esc(r.d.action || '') + '</span>' +
        badge + '</div>';
    }).join('');
  }

  /* ---- 机台档案：入账机台主数据分页展示 ---- */
  function viewMachines() {
    var kw = String(MC_STATE.q || '').trim().toLowerCase();
    var list = (L.MACHINES || []).filter(function (m) {
      if (MC_STATE.stage !== 'all' && m.stage !== MC_STATE.stage) return false;
      if (kw && String(m.sn).toLowerCase().indexOf(kw) < 0 && String(m.model || '').toLowerCase().indexOf(kw) < 0) return false;
      return true;
    });
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / MC_PAGE_SIZE));
    MC_STATE.page = Math.min(Math.max(1, MC_STATE.page), pages);
    var slice = list.slice((MC_STATE.page - 1) * MC_PAGE_SIZE, MC_STATE.page * MC_PAGE_SIZE);

    var stageCount = { T0: 0, TX: 0, TF: 0 };
    (L.MACHINES || []).forEach(function (m) { if (stageCount[m.stage] != null) stageCount[m.stage]++; });
    var stageOpts = ['T0', 'TX', 'TF'].map(function (sg) {
      return '<option value="' + sg + '"' + (MC_STATE.stage === sg ? ' selected' : '') + '>' + sg + '（' + stageCount[sg] + '）</option>';
    }).join('');

    var filterBar = '<div class="card mt-4"><div class="card-head"><h3>筛选机台</h3><div class="meta">SN / 型号模糊查询 + 阶段下拉过滤</div></div>' +
      '<div class="filter-row">' +
      '<div class="f-item"><label>测试阶段</label><select data-mc-stage><option value="all"' + (MC_STATE.stage === 'all' ? ' selected' : '') + '>全部</option>' + stageOpts + '</select></div>' +
      '<div class="f-item grow"><label>机台号 / 型号</label><input type="search" placeholder="输入 SN 或型号模糊查询" value="' + esc(MC_STATE.q || '') + '" data-mc-q></div>' +
      '<div class="f-item"><button class="btn btn-primary" data-mc-search>' + icon('search') + '搜索</button></div>' +
      '<div class="f-item"><button class="btn btn-ghost" data-mc-reset>重置</button></div>' +
      '</div></div>';

    var rows = slice.map(function (m) {
      return '<tr>' +
        '<td class="mono"><a href="#/machine-doc?id=' + esc(m.sn) + '">' + esc(m.sn) + '</a></td>' +
        '<td>' + esc(m.model) + '</td><td>' + esc(m.phase) + '</td><td>' + esc(m.product) + '</td>' +
        '<td><span class="tag-chip">' + esc(m.stage) + '</span></td>' +
        '<td>' + esc(m.station) + '</td><td>' + esc(m.shift) + '</td><td class="mono">' + esc(m.date) + '</td>' +
        '<td>' + machineStatusBadge(m.status) + '</td>' +
        '<td><a class="btn btn-xs btn-ghost" href="#/machine-doc?id=' + esc(m.sn) + '">' + icon('eye') + '电子档</a></td></tr>';
    }).join('');

    var pager = '<div class="uf-pager"><span class="dim small">共 <b>' + total + '</b> 台 · 第 <b>' + MC_STATE.page + '</b> / ' + pages + ' 页 · 每页 ' + MC_PAGE_SIZE + ' 台</span>' +
      (pages > 1 ? '<span class="pgr-btns">' +
        (MC_STATE.page > 1 ? '<button class="btn btn-xs btn-ghost" data-mc-page data-page="' + (MC_STATE.page - 1) + '">上一页</button>' : '') +
        Array.from({ length: pages }).map(function (_, i) { return '<button class="btn btn-xs' + (i + 1 === MC_STATE.page ? ' btn-primary' : '') + '" data-mc-page data-page="' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('') +
        (MC_STATE.page < pages ? '<button class="btn btn-xs btn-ghost" data-mc-page data-page="' + (MC_STATE.page + 1) + '">下一页</button>' : '') +
        '</span>' : '') + '</div>';

    return pageShell('机台档案', 'Report 入账生成的机台主数据 · 点击 SN 查看电子档（' + (L.MACHINES || []).length + ' 台）', '') +
      filterBar +
      '<div class="card"><div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>SN</th><th>型号</th><th>产品阶段</th><th>客户产品</th><th>测试阶段</th><th>当前站点</th><th>班次</th><th>入账日期</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="10" class="dim">无匹配机台。</td></tr>') + '</tbody></table></div>' + pager + '</div>' +
      '<div class="small dim" style="margin:12px 0">机台档案为「入账 Excel / TT 系统」自动建档后的主数据；点击 SN 进入电子档，查看该机在各节点的操作动作与当前状态。</div>';
  }

  /* ---- 机台电子档：基础信息 + 历史批次 + 各节点状态 ---- */
  function viewMachineDoc() {
    var sn = (/\?id=([\w-]+)/.exec(location.hash) || [])[1];
    var m = machineById(sn);
    if (!m) {
      return pageShell('机台电子档', '未找到机台 ' + esc(sn || '—'), '<a class="btn btn-ghost" href="#/machines">' + icon('arrow') + '返回机台档案</a>') +
        '<div class="card"><div class="small dim">该机台不存在，可能尚未入账。</div></div>';
    }
    var hist = machineBatches(m.sn);
    var histCards = hist.map(function (r) {
      var b = batchById(r.batchId);
      return '<div class="card mt-4"><div class="card-head"><h3>' + esc(r.batchId) +
        ' <span class="tag-chip">' + esc(r.stage) + '</span> ' + runTypeBadge(r.runType) + '</h3>' +
        '<div class="meta">' + esc(b ? (b.product + ' · ' + b.phase) : '—') + ' · ' + esc((b && b.date) || '—') + ' · 当前：' + esc(statusCN(r.status)) + '</div></div>' +
        '<div class="node-strip">' + nodeTimeline(r.stage, r.status) + '</div>' +
        '<div class="small dim" style="padding:0 2px 8px">结论：' + esc(r.conclusion || '—') + '　|　整批流转节点已标「整批」</div></div>';
    }).join('');

    return pageShell('机台电子档 · ' + esc(m.sn),
      esc(m.model) + ' · ' + esc(m.product) + ' · 阶段 ' + esc(m.stage),
      '<a class="btn btn-ghost" href="#/machines">' + icon('arrow') + '返回机台档案</a>') +
      '<div class="card"><div class="card-head"><h3>基础信息</h3><div class="meta">' + esc(m.sn) + ' · 入账 ' + esc(m.date) + '</div></div>' +
      '<div class="info-grid">' +
      infoRow('机台 SN', '<span class="mono">' + esc(m.sn) + '</span>') +
      infoRow('型号', esc(m.model)) +
      infoRow('产品阶段', esc(m.phase)) +
      infoRow('客户产品', esc(m.product)) +
      infoRow('测试阶段', '<span class="tag-chip">' + esc(m.stage) + '</span>') +
      infoRow('当前站点', esc(m.station)) +
      infoRow('班次', esc(m.shift)) +
      infoRow('入账日期', '<span class="mono">' + esc(m.date) + '</span>') +
      infoRow('入库状态', machineStatusBadge(m.status)) +
      '</div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>历史测试批次</h3><div class="meta">' + hist.length + ' 批次 · 同一机台可跨批复用（复测/续测）</div></div>' +
      (histCards || '<div class="small dim" style="padding:10px 2px">暂无测试批次记录。</div>') + '</div>';
  }

  /* ---- 测试批次：每次完整数据独立存档，分页展示 ---- */
  function viewTestBatches() {
    var list = L.TEST_BATCHES || [];
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / BT_PAGE_SIZE));
    BT_STATE.page = Math.min(Math.max(1, BT_STATE.page), pages);
    var slice = list.slice((BT_STATE.page - 1) * BT_PAGE_SIZE, BT_STATE.page * BT_PAGE_SIZE);

    var rows = slice.map(function (b) {
      var statBadge = b.status === '进行中' ? '<span class="badge-pill on">进行中</span>' :
        b.status === '已完成' ? '<span class="badge-pill ok">已完成</span>' :
        '<span class="badge-pill gray">' + esc(b.status || '—') + '</span>';
      return '<tr>' +
        '<td class="mono"><a href="#/batch-detail?id=' + esc(b.id) + '">' + esc(b.id) + '</a></td>' +
        '<td>' + esc(b.product) + '</td><td>' + esc(b.phase) + '</td><td class="mono">' + esc(b.date) + '</td>' +
        '<td><span class="tag-chip">' + esc(b.range) + '</span></td>' +
        '<td class="mono right">' + b.machineCount + '</td>' +
        '<td>' + statBadge + '</td><td>' + esc(b.conclusion || '—') + '</td>' +
        '<td>' + esc(whoName(b.owner)) + '</td>' +
        '<td><a class="btn btn-xs btn-ghost" href="#/batch-detail?id=' + esc(b.id) + '">' + icon('eye') + '全量</a></td></tr>';
    }).join('');

    var pager = '<div class="uf-pager"><span class="dim small">共 <b>' + total + '</b> 批 · 第 <b>' + BT_STATE.page + '</b> / ' + pages + ' 页</span>' +
      (pages > 1 ? '<span class="pgr-btns">' +
        (BT_STATE.page > 1 ? '<button class="btn btn-xs btn-ghost" data-bt-page data-page="' + (BT_STATE.page - 1) + '">上一页</button>' : '') +
        Array.from({ length: pages }).map(function (_, i) { return '<button class="btn btn-xs' + (i + 1 === BT_STATE.page ? ' btn-primary' : '') + '" data-bt-page data-page="' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('') +
        (BT_STATE.page < pages ? '<button class="btn btn-xs btn-ghost" data-bt-page data-page="' + (BT_STATE.page + 1) + '">下一页</button>' : '') +
        '</span>' : '') + '</div>';

    return pageShell('测试批次', '每一次「选一批机台做 T0/TX/TF」的完整数据独立存档 · 分页展示', '') +
      '<div class="card"><div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>批次号</th><th>客户产品</th><th>产品阶段</th><th>日期</th><th>范围</th><th class="right">机台数</th><th>状态</th><th>结论</th><th>负责人</th><th></th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="10" class="dim">暂无测试批次。</td></tr>') + '</tbody></table></div>' + pager + '</div>' +
      '<div class="small dim" style="margin:12px 0">一次测试 = 一个批次；每批数据独立存档，后续批次可复用之前批次的机台（复测/续测，机台级标记）。</div>';
  }

  /* ---- 批次详情：该批全量机台 + 节点产物 + 导出 ---- */
  function viewBatchDetail() {
    var id = (/\?id=([\w-]+)/.exec(location.hash) || [])[1];
    var b = batchById(id);
    if (!b) {
      return pageShell('批次详情', '未找到批次 ' + esc(id || '—'), '<a class="btn btn-ghost" href="#/batches">' + icon('arrow') + '返回测试批次</a>') +
        '<div class="card"><div class="small dim">该批次不存在。</div></div>';
    }
    var ms = batchMachinesOf(b.id);
    var reuse = ms.filter(function (r) { return r.runType !== 'fresh'; });
    var mRows = ms.map(function (r) {
      return '<tr>' +
        '<td class="mono"><a href="#/machine-doc?id=' + esc(r.sn) + '">' + esc(r.sn) + '</a></td>' +
        '<td>' + runTypeBadge(r.runType) + '</td>' +
        '<td><span class="tag-chip">' + esc(r.stage) + '</span></td>' +
        '<td>' + esc(statusCN(r.status)) + '</td>' +
        '<td>' + esc(r.conclusion || '—') + '</td></tr>';
    }).join('');

    var nodeArts = (L.ARTIFACTS || []).filter(function (a) { return a.scope === 'node'; });
    var artList = nodeArts.map(function (a) {
      return '<div class="info-li"><div class="i-k">' + icon('folder') + ' ' + esc(a.name) + '</div>' +
        '<div class="i-v">' + esc(a.format || '—') + ' · ' + esc(a.note || '') + '</div></div>';
    }).join('');

    var statBadge = b.status === '进行中' ? '<span class="badge-pill on">进行中</span>' :
      b.status === '已完成' ? '<span class="badge-pill ok">已完成</span>' :
      '<span class="badge-pill gray">' + esc(b.status || '—') + '</span>';

    return pageShell('批次 · ' + esc(b.id),
      esc(b.product) + ' · ' + esc(b.phase) + ' · ' + esc(b.range) + ' · ' + b.machineCount + ' 台',
      '<button class="btn btn-primary" data-batch-export data-id="' + esc(b.id) + '">' + icon('archive') + '导出本批</button>' +
      '<a class="btn btn-ghost" href="#/batches">' + icon('arrow') + '返回</a>') +
      '<div class="card"><div class="card-head"><h3>批次信息</h3><div class="meta">' + esc(b.id) + '</div></div>' +
      '<div class="info-grid">' +
      infoRow('客户产品', esc(b.product)) +
      infoRow('产品阶段', esc(b.phase)) +
      infoRow('测试日期', '<span class="mono">' + esc(b.date) + '</span>') +
      infoRow('测试范围', '<span class="tag-chip">' + esc(b.range) + '</span>') +
      infoRow('机台数', '<span class="mono">' + b.machineCount + '</span> 台') +
      infoRow('状态', statBadge) +
      infoRow('结论', esc(b.conclusion || '—')) +
      infoRow('负责人', esc(whoName(b.owner))) +
      infoRow('起止', '<span class="mono">' + esc(b.from) + ' → ' + esc(b.to || '—') + '</span>') +
      infoRow('复用机台', reuse.length ? reuse.map(function (r) { return '<span class="mono">' + esc(r.sn) + '</span> ' + runTypeBadge(r.runType); }).join('　') : '<span class="faint">无（全部新选）</span>') +
      '</div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>该批机台清单</h3><div class="meta">' + ms.length + ' 台 · 含跨批复用（复测/续测）</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>SN</th><th>类型</th><th>阶段</th><th>当前状态</th><th>结论</th></tr></thead>' +
      '<tbody>' + (mRows || '<tr><td colspan="5" class="dim">暂无机台。</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card mt-4"><div class="card-head"><h3>该批节点产物（附件）</h3><div class="meta">scope = node · 整批流转节点结束后产生的批次级附件</div></div>' +
      '<div class="info-grid">' + artList + '</div></div>';
  }

  /* =====================================================   * 取数源 + 设备（方向：API 预留）
   * DATA_SOURCES：Excel / API / TT / 设备统一入口；DEVICES：温湿度设备远程操作预留。
   * 均 admin 专用（PAGE_ACL 不注册 = 仅管理员可见）。
   * ============================================================ */
  function dsTypeBadge(t) {
    var m = { excel: ['info', 'Excel'], api: ['accent', 'API'], device: ['gray', '设备'] };
    var c = m[t] || ['gray', t || '—'];
    return '<span class="badge-pill ' + c[0] + '">' + esc(c[1]) + '</span>';
  }
  function dsTargetCN(t) {
    var m = { machines: '机台主数据', stations: '工站数据', device: '设备' };
    return m[t] || t || '—';
  }
  function dsStatusBadge(s) {
    return s === 'reserved' ? '<span class="badge-pill warn">已预留</span>' : '<span class="badge-pill ok">已启用</span>';
  }

  function viewDataSources() {
    var rows = (L.DATA_SOURCES || []).map(function (d) {
      var addr = d.endpoint ? '<span class="mono">' + esc(d.endpoint) + '</span>' : '<span class="faint">—</span>';
      return '<tr>' +
        '<td>' + esc(d.name) + '</td>' +
        '<td>' + dsTypeBadge(d.type) + '</td>' +
        '<td>' + esc(dsTargetCN(d.target)) + '</td>' +
        '<td>' + addr + '</td>' +
        '<td>' + (d.method ? '<span class="mono">' + esc(d.method) + '</span>' : '<span class="faint">—</span>') + '</td>' +
        '<td>' + (d.auth ? '<span class="tag-chip">' + esc(d.auth) + '</span>' : '<span class="faint">—</span>') + '</td>' +
        '<td class="mono">' + (d.params || []).length + '</td>' +
        '<td>' + dsStatusBadge(d.status) + '</td>' +
        '<td><button class="btn btn-xs btn-ghost" data-ds-edit data-id="' + esc(d.id) + '">' + icon('gear') + '配置</button></td></tr>';
    }).join('');

    return pageShell('取数源配置', '数据接入统一入口 · Excel / API / TT / 设备（部分为后续接入预留）', '') +
      '<div class="card"><div class="card-head"><h3>取数源清单</h3><div class="meta">' + (L.DATA_SOURCES || []).length + ' 个 · 「已预留」= 接口/设备就绪后启用</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr>' +
      '<th>名称</th><th>类型</th><th>目标</th><th>Endpoint</th><th>方法</th><th>鉴权</th><th>参数</th><th>状态</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="small dim" style="margin:12px 0">Report 机台入账走 Excel（目标=机台主数据，预览确认后入库）；Mini line 取数走 Excel/API（目标=工站数据，只做站点比对）；TT 入账与 TestCenter 温湿度设备为预留入口。</div>';
  }

  function modalDataSource(id) {
    var d = (L.DATA_SOURCES || []).filter(function (x) { return x.id === id; })[0];
    if (!d) return '';
    var params = (d.params || []).map(function (p) {
      return '<div class="field"><label>' + esc(p.label || p.key) + '</label><input type="text" value="' + esc(p.def || '') + '" disabled></div>';
    }).join('') || '<div class="field full"><div class="hint">无参数。</div></div>';
    return '<div class="form-grid">' +
      '<div class="field"><label>名称</label><input type="text" value="' + esc(d.name) + '" data-ds-name></div>' +
      '<div class="field"><label>类型</label><input type="text" value="' + esc(d.type) + '" disabled></div>' +
      '<div class="field"><label>目标</label><input type="text" value="' + esc(dsTargetCN(d.target)) + '" disabled></div>' +
      '<div class="field"><label>鉴权</label><select data-ds-auth>' +
      ['token', 'key', 'none'].map(function (a) { return '<option' + (d.auth === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>Endpoint</label><input type="text" value="' + esc(d.endpoint || '') + '" data-ds-endpoint></div>' +
      '<div class="field full"><label>说明</label><div class="hint">' + esc(d.desc || '') + '</div></div>' +
      params +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存</button></div></div>';
  }
  function saveDataSource(mask, id) {
    var d = (L.DATA_SOURCES || []).filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    d.name = String((mask.querySelector('[data-ds-name]') || {}).value || d.name);
    d.endpoint = String((mask.querySelector('[data-ds-endpoint]') || {}).value || '');
    d.auth = (mask.querySelector('[data-ds-auth]') || {}).value || d.auth;
    L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: '更新取数源 ' + d.name + '（' + d.id + '）', res: 'info' });
    toast('取数源「' + esc(d.name) + '」已保存（静态演示）', 'ok');
    mask.remove();
    renderPageOnly('data-sources');
  }

  function capLabel(cap) {
    var m = { readTemp: '读温度', readHum: '读湿度', setTemp: '设温', setHum: '设湿',
      startCycle: '启动循环', stopCycle: '停止循环', readStatus: '读状态',
      readVolt: '读电压', setOn: '开机', setOff: '关机',
      setRunDuration: '设定运行时长', startRun: '启动', stopRun: '停止' };
    return m[cap] || cap;
  }
  function devStatusBadge(s) {
    return s === 'online' ? '<span class="badge-pill ok">在线</span>' : '<span class="badge-pill off">离线</span>';
  }
  function devTypeCN(t) {
    var m = { env: '温湿度箱', cycle: '循环箱', power: '电源' };
    return m[t] || t || '—';
  }

  function deviceById(id) {
    return (L.DEVICES || []).filter(function (d) { return d.id === id; })[0];
  }
  function devByLabel(by) {
    return by === 'system' ? '系统' : userName(by);
  }
  function devLog(dev, act, note) {
    L.DEVICE_LOGS.unshift({ at: dateNow().slice(5), dev: dev.id, act: act, by: currentUser().id, note: note });
    L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: '远程操作 ' + dev.name + ' → ' + act, res: 'info' });
  }
  function fmtDuration(sec) {
    sec = sec || 0;
    var s = sec % 60, m = Math.floor(sec / 60) % 60, h = Math.floor(sec / 3600);
    function two(n) { return n < 10 ? '0' + n : '' + n; }
    return two(h) + ':' + two(m) + ':' + two(s);
  }
  function deviceSetTemp(id) {
    var d = deviceById(id); if (!d) return;
    var v = prompt('设定目标温度（℃）', d.targetTemp != null ? d.targetTemp : '25');
    if (v == null) return;
    var n = parseFloat(v);
    if (isNaN(n)) { toast('请输入数字温度', 'bad'); return; }
    d.targetTemp = n;
    if (d.reading) d.reading.temp = n;
    devLog(d, '设定温度', n + '℃');
    toast(d.name + ' 目标温度已设为 ' + n + '℃', 'ok');
    renderPageOnly('devices');
  }
  function deviceSetHum(id) {
    var d = deviceById(id); if (!d) return;
    var v = prompt('设定目标湿度（%）', d.targetHum != null ? d.targetHum : '60');
    if (v == null) return;
    var n = parseFloat(v);
    if (isNaN(n)) { toast('请输入数字湿度', 'bad'); return; }
    d.targetHum = n;
    if (d.reading) d.reading.hum = n;
    devLog(d, '设定湿度', n + '%');
    toast(d.name + ' 目标湿度已设为 ' + n + '%', 'ok');
    renderPageOnly('devices');
  }
  function deviceSetRunDuration(id) {
    var d = deviceById(id); if (!d) return;
    var v = prompt('设定运行时长（秒）', d.runDuration || '3600');
    if (v == null) return;
    var n = parseInt(v, 10);
    if (isNaN(n) || n <= 0) { toast('请输入正整数秒数', 'bad'); return; }
    d.runDuration = n;
    devLog(d, '设定运行时长', n + 's（' + fmtDuration(n) + '）');
    toast(d.name + ' 运行时长已设为 ' + fmtDuration(n), 'ok');
    renderPageOnly('devices');
  }
  function deviceDo(id, cap) {
    var d = deviceById(id);
    if (!d) return;
    if (d.status !== 'online') { toast(d.name + ' 已离线，无法远程操作', 'bad'); return; }
    if (cap === 'setTemp') { deviceSetTemp(id); return; }
    if (cap === 'setHum') { deviceSetHum(id); return; }
    if (cap === 'setRunDuration') { deviceSetRunDuration(id); return; }
    if (cap === 'startRun') {
      d.running = true; d.runSeconds = 0; d.stopAt = '—';
      devLog(d, '启动运行', '目标 ' + d.targetTemp + '℃ / ' + d.targetHum + '% · 时长 ' + d.runDuration + 's');
      toast(d.name + ' 已启动', 'ok'); renderPageOnly('devices'); return;
    }
    if (cap === 'stopRun') {
      d.running = false; d.stopAt = dateNow().slice(5);
      devLog(d, '停止运行', '运行至 ' + fmtDuration(d.runSeconds));
      toast(d.name + ' 已停止', 'ok'); renderPageOnly('devices'); return;
    }
    if (cap === 'setOn') { d.running = true; d.stopAt = '—'; devLog(d, '开机', '电源上电'); toast(d.name + ' 已开机', 'ok'); renderPageOnly('devices'); return; }
    if (cap === 'setOff') { d.running = false; d.stopAt = dateNow().slice(5); devLog(d, '关机', '电源下电'); toast(d.name + ' 已关机', 'ok'); renderPageOnly('devices'); return; }
    devLog(d, capLabel(cap), '—');
    toast('已向 ' + d.name + ' 发送「' + capLabel(cap) + '」', 'accent');
  }
  /* 运行计时器：对运行中设备每秒递增 runSeconds，到设定时长自动停止 */
  var DEVICE_TICKER = null;
  function ensureDeviceTicker() {
    if (DEVICE_TICKER) return;
    DEVICE_TICKER = setInterval(function () {
      DIRTY_SUPPRESS++;                     /* 秒级变化：抑制 300ms 防抖写盘，仅在离开页/卸载时统一落盘 */
      var changed = false, autoStopped = false;
      try {
        (L.DEVICES || []).forEach(function (d) {
          if (d.running) {
            d.runSeconds++;
            changed = true;
            if (d.runDuration > 0 && d.runSeconds >= d.runDuration) {
              d.running = false;
              d.stopAt = dateNow().slice(5);
              autoStopped = true;
              L.DEVICE_LOGS.unshift({ at: dateNow().slice(5), dev: d.id, act: '自动停止', by: 'system', note: '运行满 ' + d.runDuration + 's 自动停止' });
            }
          }
        });
      } finally {
        DIRTY_SUPPRESS--;
      }
      if (autoStopped && getRoute() === 'devices') {
        renderPageOnly('devices');                 /* 自动停止后刷新状态徽标/停止时间/留痕 */
        return;
      }
      if (changed) {
        var els = document.querySelectorAll('[data-dev-run]');
        for (var i = 0; i < els.length; i++) {
          var dev = deviceById(els[i].getAttribute('data-dev-run'));
          if (dev) els[i].textContent = fmtDuration(dev.runSeconds);
        }
      }
    }, 1000);
  }

  function viewDevices() {
    ensureDeviceTicker();
    var canControl = canAction('system:device:control');
    var all = L.DEVICES || [];
    var onlineN = all.filter(function (d) { return d.status === 'online'; }).length;
    var runningN = all.filter(function (d) { return d.running; }).length;
    /* C 方案紧凑卡片：总数行 + 响应式平铺网格，细节字段折叠进 title 悬停 */
    var cards = all.map(function (d) {
      var online = d.status === 'online';
      var reading = d.reading || {};
      var readingHtml, detail;
      if (d.type === 'power') {
        readingHtml = '<span class="v">' + (reading.volt != null ? reading.volt.toFixed(1) + ' V' : '—') + '</span>';
        detail = '电压 ' + (reading.volt != null ? reading.volt.toFixed(1) + 'V' : '—');
      } else {
        readingHtml = '<span class="v">' + (reading.temp != null ? reading.temp.toFixed(1) + '℃' : '—') +
          ' <i>/</i> ' + (reading.hum != null ? reading.hum.toFixed(1) + '%' : '—') + '</span>';
        detail = '当前 ' + (reading.temp != null ? reading.temp.toFixed(1) + '℃' : '—') + ' / ' + (reading.hum != null ? reading.hum.toFixed(1) + '%' : '—') +
          ' · 目标 ' + (d.targetTemp != null ? d.targetTemp + '℃' : '—') + ' / ' + (d.targetHum != null ? d.targetHum + '%' : '—');
      }
      var runDetail = (d.running ? '运行中 · 已运行 ' + fmtDuration(d.runSeconds || 0) : '已停止' + (d.stopAt && d.stopAt !== '—' ? ' · 止于 ' + d.stopAt : '')) +
        (d.runDuration ? ' · 设定 ' + fmtDuration(d.runDuration) : '');
      var btns = '<span class="faint small">当前角色无「设备远程控制」权限</span>';
      if (canControl) {
        btns = (d.capabilities || []).map(function (cap) {
          return '<button class="btn btn-xs btn-ghost" data-dev-cap data-id="' + esc(d.id) + '" data-cap="' + esc(cap) + '"' + (online ? '' : ' disabled') + '>' + esc(capLabel(cap)) + '</button>';
        }).join('') || '<span class="faint small">无远程能力</span>';
      }
      var tip = d.id + ' · ' + d.name + '\n' + devTypeCN(d.type) + ' · ' + d.location + '\n' +
        (d.endpoint ? '端：' + d.endpoint : '') + '\n' + detail + '\n' + runDetail + '\n' + (d.status === 'online' ? '在线' : '离线');
      return '<div class="dev-card' + (online ? '' : ' off') + (d.running ? ' run' : '') + '" title="' + esc(tip) + '">' +
        '<div class="h"><div class="nm"><b>' + esc(d.name) + '</b><span class="mono faint">' + esc(d.id) + '</span></div>' + devStatusBadge(d.status) + '</div>' +
        '<div class="row small"><span>' + esc(devTypeCN(d.type)) + '</span><span class="faint">' + esc(d.location) + '</span></div>' +
        '<div class="fig">' + (d.type === 'power' ? '<span class="lab">电压</span>' : '<span class="lab">温 / 湿</span>') + readingHtml + '</div>' +
        '<div class="run"><span class="pill' + (d.running ? ' ok' : ' gray') + '">' + (d.running ? '运行中' : '已停止') + '</span>' +
        '<span class="mono" data-dev-run="' + esc(d.id) + '">' + fmtDuration(d.runSeconds || 0) + '</span>' +
        (d.runDuration ? '<span class="faint small">/' + fmtDuration(d.runDuration) + '</span>' : '') + '</div>' +
        '<div class="acts">' + btns + '</div></div>';
    }).join('');

    var logs = (L.DEVICE_LOGS || []).slice(0, 10).map(function (l) {
      var dev = deviceById(l.dev);
      return '<tr><td class="mono">' + esc(l.at) + '</td><td>' + esc(dev ? dev.name : l.dev) + '</td>' +
        '<td>' + esc(l.act) + '</td><td>' + esc(devByLabel(l.by)) + '</td><td class="small dim">' + esc(l.note || '') + '</td></tr>';
    }).join('');

    return pageShell('设备看板', 'TestCenter 远程温湿度设备 · 多设备状态 + 温湿度/运行时长远程控制（模拟 API）', '') +
      '<div class="dev-stats">' +
      '<div class="st v-total"><b>' + all.length + '</b><span>设备总数</span></div>' +
      '<div class="st v-on"><b>' + onlineN + '</b><span>在线</span></div>' +
      '<div class="st v-off"><b>' + (all.length - onlineN) + '</b><span>离线</span></div>' +
      '<div class="st v-run"><b>' + runningN + '</b><span>运行中</span></div>' +
      '</div>' +
      '<div class="dev-grid mt-4">' + (cards || '<div class="card"><div class="small dim">暂无设备。</div></div>') + '</div>' +
      '<div class="card mt-4"><div class="card-head"><h3>' + icon('pulse') + ' 操作留痕</h3><div class="meta">远程控制每次写一条审计</div></div>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>时间</th><th>设备</th><th>动作</th><th>操作人</th><th>备注</th></tr></thead>' +
      '<tbody>' + logs + '</tbody></table></div></div>' +
      '<div class="small dim" style="margin:12px 0">API（设温 / 设湿 / 设定运行时长 / 启动 / 停止）为模拟调用；运行中设备每秒计时，到设定时长自动停止。</div>';
  }

  /* ---------------- 路由表 ---------------- */
  var VIEWS = {
    'login': viewLogin,
    'dashboard': viewDashboard,
    'travel-sheet': viewTravelSheet,
    'report': viewReport,
    'dicts': viewDicts,
    'defs': viewDefs,
    'workflow-config': viewWorkflowConfig,
    'admin-dashboard': viewAdminDashboard,
    'admin-forms': viewAdminForms,
    'admin-scripts': viewAdminScripts,
    'admin-script-detail': viewScriptDetail,
    'admin-users': viewAdminMembers,
    'admin-roles': viewAdminRoles,
    'admin-posts': viewAdminPosts,
    'admin-depts': viewAdminDepts,
    'admin-menus': viewAdminMenus,
    'my-scripts': viewMyScripts,
    'machines': viewMachines,
    'machine-doc': viewMachineDoc,
    'batches': viewTestBatches,
    'batch-detail': viewBatchDetail,
    'data-sources': viewDataSources,
    'devices': viewDevices,
    'photo-review': viewPhotoReview
  };

  /* 当前路由 */
  function getRoute() {
    var h = location.hash || '#/dashboard';
    var m = /^#\/([\w-]+)/.exec(h);
    return m ? m[1] : 'dashboard';
  }

  function go(key) {
    location.hash = '#/' + key;
  }

  /* ---------------- 渲染：侧边栏 ---------------- */
  /* 侧边栏由 MENUS 树（M→C）派生：M 目录渲染为可折叠分组头，C 菜单渲染为导航项，
     只显示当前有效角色集授权的菜单；F 按钮不入侧边栏。 */
  /* 目录折叠状态：M 节点 key -> false 表示已折叠；缺省视为展开 */
  var NAV_OPEN = {};
  function groupIsOpen(group) { return NAV_OPEN[group] !== false; }
  var _navToggleBound = false;
  function bindNavToggle() {
    if (_navToggleBound) return;
    _navToggleBound = true;
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-nav-toggle]') : null;
      if (!t) return;
      var g = t.getAttribute('data-nav-toggle');
      NAV_OPEN[g] = groupIsOpen(g) ? false : true;
      renderSidebar();
    });
  }
  function navFor(mode) {
    if (mode === 'admin') {
      return { title: '管理员控制台', roots: authorizedMenuTree(['admin']) };
    }
    var u = currentUser();
    var roles = roleIdsOf(u);
    var disabled = roles.every(function (rid) { var r = roleById(rid); return r && r.status === 'disabled'; });
    return { title: '用户工作台 · ' + roleNameOf(u) + (disabled ? '（已停用）' : ''),
      roots: disabled ? [] : authorizedMenuTree(roles) };
  }

  function renderSidebar() {
    var nav = navFor(state.mode);
    var route = getRoute();
    var cur = ['admin-dashboard', 'dashboard'].indexOf(route) >= 0 ? route :
      (VIEWS[route] ? route : null);
    var activeKey = cur;

    var links = nav.roots.map(function (n) {
      if (n.type === 'C') {
        var a = n.key === activeKey ? ' active' : '';
        return '<a class="nav-item' + a + '" href="#/' + n.key + '">' + icon(n.icon) + '<span>' + esc(n.name) + '</span></a>';
      }
      /* M 目录：可折叠展开，含当前激活项时头部高亮 */
      var open = groupIsOpen(n.key);
      var hasActive = (n.children || []).some(function (m) { return m.key === activeKey; });
      var kids = (n.children || []).map(function (m) {
        var ka = m.key === activeKey ? ' active' : '';
        return '<a class="nav-item' + ka + '" href="#/' + m.key + '">' + icon(m.icon) + '<span>' + esc(m.name) + '</span></a>';
      }).join('');
      return '<div class="nav-group' + (open ? '' : ' closed') + '">' +
        '<div class="nav-group-head' + (hasActive ? ' active' : '') + '" data-nav-toggle="' + esc(n.key) + '">' +
        '<span class="nav-caret">' + (open ? '▾' : '▸') + '</span>' +
        '<span class="nav-group-label">' + esc(n.name) + '</span></div>' +
        '<div class="nav-sub">' + kids + '</div></div>';
    }).join('');

    var isAdmin = state.mode === 'admin';
    var u = currentUser();

    document.getElementById('sidebar').innerHTML =
      '<div class="brand"><div class="brand-mark">LAB</div>' +
      '<div><div class="brand-name">DQE · Lab Agent</div><div class="brand-sub">Rel Test 工作流</div></div></div>' +
      '<div class="nav-section-title">' + (isAdmin ? '管理员 · 监管视图' : '用户 · 作业视图') + '</div>' +
      '<div class="nav">' + links + '</div>' +
      '<div class="sidebar-foot">' +
      '<div class="mono small">' + (isAdmin ? 'Mode: ADMIN' : 'Mode: USER · ' + roleNameOf(u)) + '</div>' +
      '<div>v2.0 静态演示 · 数据为 mock</div></div>';
  }

  /* ---------------- 通知路由（复用「当前责任人」委托改派模型） ---------------- */
  /* 通知中心可见项：管理员看全部；用户只看 to（接收人）为本人或其生效请假代理人
     的通知，与 plan「待办/通知/告警路由按当前责任人计算」一致 */
  function myNotifications() {
    if (state.mode === 'admin') return L.NOTIFICATIONS;
    return L.NOTIFICATIONS.filter(function (n) {
      return nodeOwner({ owner: n.to }).id === state.userId;
    });
  }

  /* ---------------- 渲染：顶栏 ---------------- */
  function renderTopbar() {
    var u = currentUser();
    var route = getRoute();
    var labels = {
      'login': '身份选择', 'dashboard': '工作台', 'travel-sheet': '节点作业', 'report': '报告纸',
      'dicts': '字典中心', 'defs': '作业定义中心', 'workflow-config': '排配与委托',
      'admin-dashboard': '平台总览', 'admin-forms': '报告纸模板', 'admin-scripts': '脚本管理',
      'admin-script-detail': '脚本详情', 'admin-users': '用户管理', 'admin-roles': '角色管理',
      'admin-posts': '岗位管理', 'admin-depts': '部门管理', 'admin-menus': '菜单管理', 'my-scripts': '我的脚本',
      'machines': '机台档案', 'machine-doc': '机台电子档', 'batches': '测试批次', 'batch-detail': '批次详情',
      'data-sources': '取数源配置', 'devices': '设备看板', 'photo-review': '照片复核'
    };

    var opts = ['<option value="admin"' + (state.mode === 'admin' ? ' selected' : '') + '>管理员视图</option>'].concat(
      L.USERS.filter(function (x) { return !hasRole(x, 'admin'); }).map(function (x) {
        return '<option value="' + x.id + '"' + (state.userId === x.id ? ' selected' : '') + '>' + esc(x.name) + '（' + roleNameOf(x) + '）</option>';
      })
    );

    var unread = myNotifications().filter(function (n) { return !n.read; }).length;
    var modeTag = state.mode === 'admin' ? '管理员' : (roleNameOf(u) || '用户');

    document.getElementById('topbar').innerHTML =
      '<div class="crumb">DQE Lab Agent <span class="faint">/</span> <b>' + esc(labels[route] || '工作台') + '</b>' +
      (state.mode === 'admin' ? ' <span class="badge-pill accent" style="margin-left:6px">管理员视图</span>' : '') + '</div>' +
      '<div class="top-actions">' +
      '<div class="search">' + icon('search') + '<input type="search" placeholder="搜 SN / 脚本 / 工具…" data-search></div>' +
      '<button class="theme-btn" data-theme title="' + (document.body.classList.contains('theme-light') ? '切换深色主题' : '切换白色主题') + '">' +
      icon(document.body.classList.contains('theme-light') ? 'sun' : 'moon') + '</button>' +
      '<span class="save-chip ' + SAVE_UI + '" title="数据改动经保存接口写盘至 data/demo.json；刷新页面状态保持">' +
      (SAVE_UI === 'saved' ? '已保存' : (SAVE_UI === 'pending' ? '保存中…' : '保存失败，稍后重试')) + '</span>' +
      '<div class="role-switch"><span class="rs-label">身份切换</span>' +
      '<select data-role-sel>' + opts.join('') + '</select></div>' +
      '<div class="bell" data-bell>' + icon('bell') + (unread ? '<span class="dot"></span>' : '') + '</div>' +
      '<div class="self"><div class="avatar">' + esc((u.name || '?').slice(0, 2)) + '</div>' +
      '<div class="info"><div class="nm">' + esc(u.name) + '</div><div class="rl">' + esc(modeTag) + ' · ' + esc(u.dept) + '</div></div></div>' +
      '</div>';
    SAVE_EL = document.querySelector('.save-chip');
    setSaveUI(SAVE_UI);
  }

  /* ---------------- 渲染：内容区（含路由权限拦截） ---------------- */
  function renderContent() {
    var route = getRoute();
    var el = document.getElementById('content');
    if (route === 'login') { el.innerHTML = viewLogin(); bindLoginCards(); return; }
    if (!VIEWS[route]) { location.hash = '#/dashboard'; return; }
    if (!canView(route)) { el.innerHTML = viewNoAccess(); el.scrollTop = 0; return; }
    var fn = VIEWS[route] || viewDashboard;
    el.innerHTML = fn();
    el.scrollTop = 0;
    bindPage(route);
  }

  /* ---------------- 交互绑定 ---------------- */
  function bindPage(route) {
    /* 字典中心：新增 / 编辑 / 删除选项（一处修改，多处生效） */
    var dictAdd = document.querySelectorAll('[data-dict-opt-add]');
    for (var dai = 0; dai < dictAdd.length; dai++) {
      dictAdd[dai].addEventListener('click', function () { dictOptionModal(this.getAttribute('data-id'), null); });
    }
    var dictEdit = document.querySelectorAll('[data-dict-opt-edit]');
    for (var dei = 0; dei < dictEdit.length; dei++) {
      dictEdit[dei].addEventListener('click', function () { dictOptionModal(this.getAttribute('data-id'), this.getAttribute('data-key')); });
    }
    var dictDel = document.querySelectorAll('[data-dict-opt-del]');
    for (var ddi2 = 0; ddi2 < dictDel.length; ddi2++) {
      dictDel[ddi2].addEventListener('click', function () { doDictOptDel(this.getAttribute('data-id'), this.getAttribute('data-key')); });
    }
    /* 报告纸：切换机台（按站别自动匹配模板）/ 模拟上传 Excel / 多选下拉栏位 / 保存 */
    bind('[data-rpt-sn]', function () {
      REPORT_STATE.sn = this.value;
      REPORT_STATE.parsed = false;
      REPORT_STATE.values = {};
      REPORT_STATE.tplKey = null;
      renderPageOnly('report');
    });
    bind('[data-rpt-upload]', function () {
      toast('解析中：仅读取 Excel 的 Units 基础数据…', 'ok');
      var rs = reportSheetFor(REPORT_STATE.sn);
      later(400, function () {
        initReportValues(rs);
        REPORT_STATE.parsed = true;
        toast('已生成报告纸：仅带出机台基础数据，栏位版式按站别模板', 'ok');
        renderPageOnly('report');
      });
    });
    /* 机台入账：解析入账 Excel → 预览确认弹窗（去重/标复测续测）→ 确认入库 */
    bind('[data-rpt-inbound]', function () {
      toast('解析中：读取入账 Excel 的机台基础数据…', 'ok');
      later(300, function () {
        modal('机台入账预览 · 检查无误后确认入库', inboundPreviewModal(), function (mask) { doInboundConfirm(mask); });
      });
    });
    bind('[data-rpt-adjust]', function () {
      var t = reportSheetTpl();
      if (t) openFormBuilder(t.key);
    });
    bind('[data-rpt-saveas]', function () {
      saveReportTemplateModal();
    });
    var rptOpts = document.querySelectorAll('[data-rpt-opt]');
    for (var ri = 0; ri < rptOpts.length; ri++) {
      rptOpts[ri].addEventListener('click', function () {
        var w = this.closest('[data-rpt-ms]');
        var dict = w ? w.getAttribute('data-dict') : 'fx_issue';
        var key = this.getAttribute('data-key');
        var arr = REPORT_STATE.values[dict] || (REPORT_STATE.values[dict] = []);
        var i = arr.indexOf(key);
        if (i >= 0) arr.splice(i, 1); else arr.push(key);
        this.classList.toggle('checked');
      });
    }
    bind('[data-rpt-save]', function () {
      var rs = reportSheetFor(REPORT_STATE.sn);
      if (rs) rs.values = REPORT_STATE.values;
      toast('报告纸已保存（写回 ' + REPORT_STATE.sn + '）', 'ok');
    });

    /* 勾选问题卡 */
    var cards = document.querySelectorAll('[data-fx]');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var code = this.getAttribute('data-code');
        var idx = FORM_STATE.fx.indexOf(code);
        if (idx >= 0) FORM_STATE.fx.splice(idx, 1); else FORM_STATE.fx.push(code);
        this.classList.toggle('checked');
        var c = document.getElementById('fx-count');
        if (c) c.textContent = FORM_STATE.fx.length + ' 项';
      });
    }
    /* 签名 */
    var pad = document.querySelector('[data-sign]');
    if (pad) pad.addEventListener('click', function () {
      FORM_STATE.signed = true;
      this.classList.add('signed');
      var el = document.getElementById('sign-info');
      if (el) el.textContent = '已签名：' + whoName(currentUser().id) + ' · ' + dateNow();
    });
    /* 拍照打勾（责任人才可操作） */
    var shotBtns = document.querySelectorAll('[data-shot-check]');
    for (var j = 0; j < shotBtns.length; j++) {
      shotBtns[j].addEventListener('click', function () {
        if (!assertCan(statusOwner('photo'), '拍照打勾')) return;
        var row = this.closest('tr');
        if (row) {
          row.cells[3].innerHTML = '<span class="badge-pill ok">已拍</span>';
          row.cells[4].innerHTML = '<span class="badge-pill on">符合</span>';
        }
        toast('照片打勾已完成', 'accent');
      });
    }
    /* 三项核对切换（通过/异常），三项全通过才启用「复核通过」 */
    var check3 = document.querySelectorAll('[data-check3]');
    for (var c3i = 0; c3i < check3.length; c3i++) {
      check3[c3i].addEventListener('click', function () {
        var sn = this.getAttribute('data-sn');
        var key = this.getAttribute('data-key');
        var p = (L.PHOTO_REVIEWS || []).filter(function (x) { return x.sn === sn; })[0];
        if (!p) return;
        p.checks = p.checks || { reflect: null, missing: null, naming: null };
        p.checks[key] = p.checks[key] === 1 ? 0 : 1;
        renderPageOnly('photo-review');
      });
    }
    /* 退回补拍/改名（存在未通过项时） */
    var rejectBtns = document.querySelectorAll('[data-reject-photo]');
    for (var rj = 0; rj < rejectBtns.length; rj++) {
      rejectBtns[rj].addEventListener('click', function () {
        var sn = this.getAttribute('data-sn');
        var p = (L.PHOTO_REVIEWS || []).filter(function (x) { return x.sn === sn; })[0];
        if (!p) return;
        if (!assertCan(p.reviewer, '照片复核')) return;
        p.status = 'retake';
        var fails = ['reflect', 'missing', 'naming'].filter(function (k) { return p.checks[k] !== 1; });
        toast(p.sn + ' 已退回补拍/改名（' + (fails.length ? fails.join('/') : '存在问题项') + '）', 'bad');
        renderPageOnly('photo-review');
      });
    }
    /* 复核通过（仅该照片的复核责任人；三项全过才允许） */
    var appBtns = document.querySelectorAll('[data-approve-photo]');
    for (var k = 0; k < appBtns.length; k++) {
      appBtns[k].addEventListener('click', function () {
        if (!assertCan(this.getAttribute('data-owner'), '照片复核')) return;
        var sn = this.getAttribute('data-sn');
        var p = (L.PHOTO_REVIEWS || []).filter(function (x) { return x.sn === sn; })[0];
        if (p) {
          p.checks = p.checks || { reflect: null, missing: null, naming: null };
          if (!(p.checks.reflect === 1 && p.checks.missing === 1 && p.checks.naming === 1)) {
            toast('三项核对未全部通过，无法复核通过', 'bad'); return;
          }
          p.status = 'ok';
        }
        toast('复核通过，已签名并标记传 F1 硬盘', 'ok');
        renderPageOnly('photo-review');
      });
    }
    /* 脚本运行按钮（通用） */
    var runBtns = document.querySelectorAll('[data-run]');
    for (var m = 0; m < runBtns.length; m++) {
      runBtns[m].addEventListener('click', function () {
        var id = this.getAttribute('data-run');
        toast('已触发运行 ' + id + '（静态演示）', 'accent');
        var c = document.getElementById('tool-console') || document.getElementById('recon-console');
        if (c) appLog(c, '> 运行任务 ' + id + ' 完成：{status:ok, diff_report:0}', 'ok');
      });
    }
    /* 工具控制台 */
    var toolRun = document.querySelectorAll('[data-run-tool]');
    for (var n = 0; n < toolRun.length; n++) {
      toolRun[n].addEventListener('click', function () {
        var key = this.getAttribute('data-tool');
        var c = document.getElementById('tool-console');
        if (!c) return;
        c.innerHTML = '';
        setTimeout(function () {
          c.innerHTML = '<div class="ln dim">$ ' + key + ' --input ./09-17 --out diff_report</div>' +
            '<div class="ln in">> 读取标准输入：文件路径</div>' +
            '<div class="ln in">> 打开 ' + key + ' 中…</div>' +
            '<div class="ln ok">> 完成：{status:"ok", data: 5 台, diff_report: 0, errors: 0}</div>' +
            '<div class="ln">> 日志已写：谁/何时/哪些SN/结果</div>';
        }, 60);
        toast('工具 ' + key + ' 执行完成', 'ok');
      });
    }
    /* Recon 照单核对（仅数据包负责人） */
    var packBtns = document.querySelectorAll('[data-pack-check]');
    for (var p = 0; p < packBtns.length; p++) {
      packBtns[p].addEventListener('click', function () {
        if (!assertCan(this.getAttribute('data-owner'), '照单核对')) return;
        var row = this.closest('tr');
        if (row) row.cells[5].innerHTML = '<span class="badge-pill ok">已核对回写</span>';
        toast('照单核对完成（2min）', 'ok');
      });
    }
    /* 巡检完成（仅该项巡检人） */
    var insp = document.querySelectorAll('[data-inspect-done]');
    for (var q = 0; q < insp.length; q++) {
      insp[q].addEventListener('click', function () {
        if (!assertCan(this.getAttribute('data-owner'), '设备巡检')) return;
        var row = this.closest('tr');
        if (row) {
          row.cells[4].innerHTML = '<span class="badge-pill ok">正常</span>';
          row.cells[6].innerHTML = '<span class="faint">—</span>';
        }
        toast('巡检记录已提交，下次到期 10-07', 'ok');
      });
    }
    /* WF 批准（仅客户 reviewer 岗位） */
    var wf = document.querySelectorAll('[data-wf-approve]');
    for (var w = 0; w < wf.length; w++) {
      wf[w].addEventListener('click', function () {
        if (state.mode !== 'admin' && !hasRole(userById(state.userId), 'reviewer')) {
          toast('无权操作：WF 批复仅客户（F1）可执行', 'bad'); return;
        }
        var row = this.closest('tr');
        if (row) row.cells[5].innerHTML = '<span class="badge-pill ok">已批准</span>';
        this.outerHTML = '<span class="faint">—</span>';
        toast('WF-0921-02 已批准，MTL00017 可投 TX', 'ok');
      });
    }
    /* 告警处置（仅告警责任人；管理员可代为） */
    var ack = document.querySelectorAll('[data-alert-ack]');
    for (var a = 0; a < ack.length; a++) {
      ack[a].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var al = L.ALERTS.filter(function (x) { return x.id === id; })[0];
        if (al && !assertCan(al.owner, '告警处置')) return;
        for (var i = 0; i < L.ALERTS.length; i++) if (L.ALERTS[i].id === id) L.ALERTS[i].status = 'ack';
        toast('告警已处置，通知 10min 内发出责任人', 'ok');
        renderPageOnly(route);
      });
    }
    /* 打开脚本编辑（弹出模拟 modal） */
    var edt = document.querySelectorAll('[data-edit-script]');
    for (var e = 0; e < edt.length; e++) {
      edt[e].addEventListener('click', function () {
        var id = this.getAttribute('data-id') || this.getAttribute('data-tool');
        modal('编辑注册条目', modalScriptForm(id));
      });
    }
    /* 表单模板：预览纸表版式（只读） */
    bind('[data-preview-form]', function () {
      openFormPreview(this.getAttribute('data-key'));
    });
    /* 表单模板：字段构建器（新增内容 / 调整表格结构） */
    var fmo = document.querySelectorAll('[data-edit-form]');
    for (var f = 0; f < fmo.length; f++) {
      fmo[f].addEventListener('click', function () {
        openFormBuilder(this.getAttribute('data-key'));
      });
    }
    /* 新增脚本 / 排程 / 成员 / 模板 */
    bind('[data-add-script]', function () { modal('新增脚本', modalScriptForm()); });
    bind('[data-add-sched]', function () { modal('新建定时任务', modalSchedForm()); });
    bind('[data-add-member]', function () { modal('添加成员', modalMemberForm(''), saveMemberForm); });
    bind('[data-add-form]', function () { openFormBuilder(''); });
    /* 成员行：以该身份进入（验证 ACL）/ 编辑权限（预填，读 USERS） */
    var mRowBtns = document.querySelectorAll('[data-member-switch], [data-edit-member]');
    for (var mei = 0; mei < mRowBtns.length; mei++) {
      mRowBtns[mei].addEventListener('click', function () {
        var uid = this.getAttribute('data-uid');
        if (this.hasAttribute('data-member-switch')) {
          setRole(uid);
          toast('已切换为 ' + whoName(uid) + '（' + esc(roleNameOf(userById(uid))) + '）— 验证页面路由 ACL', 'ok');
          return;
        }
        modal('编辑成员权限', modalMemberForm(uid), function (mask) { saveMemberForm(mask, uid); });
      });
    }
    /* 组织架构：部门树过滤 + 分页 */
    var orgNodes = document.querySelectorAll('[data-org]');
    for (var oni = 0; oni < orgNodes.length; oni++) {
      orgNodes[oni].addEventListener('click', function () {
        MEMBER_ORG = this.getAttribute('data-org');
        MEMBER_PAGE = 1;
        renderPageOnly('admin-users');
      });
    }
    bind('[data-member-prev]', function () { MEMBER_PAGE--; renderPageOnly('admin-users'); });
    bind('[data-member-next]', function () { MEMBER_PAGE++; renderPageOnly('admin-users'); });
    var mSize = document.querySelector('[data-member-size]');
    if (mSize) mSize.addEventListener('change', function () {
      MEMBER_PAGE_SIZE = parseInt(this.value, 10) || 5;
      MEMBER_PAGE = 1;
      renderPageOnly('admin-users');
    });
    /* 角色管理：新增 / 配置 / 停用 */
    bind('[data-add-role]', function () { modal('新增角色', roleModalBody(''), function (mask) { saveRoleForm(mask, null); }); });
    var editRoleBtns = document.querySelectorAll('[data-edit-role]');
    for (var eri = 0; eri < editRoleBtns.length; eri++) {
      editRoleBtns[eri].addEventListener('click', function () {
        var rid = this.getAttribute('data-id');
        modal('配置角色', roleModalBody(rid), function (mask) { saveRoleForm(mask, rid); });
      });
    }
    var toggleRoleBtns = document.querySelectorAll('[data-toggle-role]');
    for (var tri = 0; tri < toggleRoleBtns.length; tri++) {
      toggleRoleBtns[tri].addEventListener('click', function () { toggleRoleStatus(this.getAttribute('data-id')); });
    }

    /* 岗位管理：新增 / 编辑 / 停用 */
    bind('[data-add-post]', function () { modal('新增岗位', postModalBody(''), function (mask) { savePostForm(mask, null); }); });
    var editPostBtns = document.querySelectorAll('[data-edit-post]');
    for (var epi = 0; epi < editPostBtns.length; epi++) {
      editPostBtns[epi].addEventListener('click', function () {
        var code = this.getAttribute('data-code');
        modal('编辑岗位', postModalBody(code), function (mask) { savePostForm(mask, code); });
      });
    }
    var togglePostBtns = document.querySelectorAll('[data-toggle-post]');
    for (var tpi = 0; tpi < togglePostBtns.length; tpi++) {
      togglePostBtns[tpi].addEventListener('click', function () { togglePostStatus(this.getAttribute('data-code')); });
    }

    /* 部门管理：新增 / 编辑 / 停用 */
    bind('[data-dept-add-top]', function () { modal('新增部门', deptModalBody(null, null), function (mask) { saveDeptForm(mask, null, null); }); });
    var deptAddBtns = document.querySelectorAll('[data-dept-add]');
    for (var dai2 = 0; dai2 < deptAddBtns.length; dai2++) {
      deptAddBtns[dai2].addEventListener('click', function () {
        var pid = this.getAttribute('data-id');
        modal('新增子部门', deptModalBody(pid, null), function (mask) { saveDeptForm(mask, pid, null); });
      });
    }
    var deptEditBtns = document.querySelectorAll('[data-dept-edit]');
    for (var dei = 0; dei < deptEditBtns.length; dei++) {
      deptEditBtns[dei].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        modal('编辑部门', deptModalBody(null, id), function (mask) { saveDeptForm(mask, null, id); });
      });
    }
    var deptToggleBtns = document.querySelectorAll('[data-dept-toggle]');
    for (var dti = 0; dti < deptToggleBtns.length; dti++) {
      deptToggleBtns[dti].addEventListener('click', function () { toggleDeptStatus(this.getAttribute('data-id')); });
    }

    /* 菜单管理：新增目录 / 加按钮 / 编辑 / 删除 */
    bind('[data-menu-add-top]', function () { modal('新增目录', menuModalBody({ mode: 'add', type: 'M', parent: null }), function (mask) { saveMenuForm(mask, { mode: 'add', type: 'M' }); }); });
    var menuAddBtns = document.querySelectorAll('[data-menu-add]');
    for (var mai = 0; mai < menuAddBtns.length; mai++) {
      menuAddBtns[mai].addEventListener('click', function () {
        var parent = this.getAttribute('data-parent');
        var mtype = this.getAttribute('data-mtype') || 'F';
        modal(mtype === 'F' ? '新增按钮' : '新增菜单', menuModalBody({ mode: 'add', type: mtype, parent: parent }),
          function (mask) { saveMenuForm(mask, { mode: 'add', type: mtype, parent: parent }); });
      });
    }
    var menuEditBtns = document.querySelectorAll('[data-menu-edit]');
    for (var mei = 0; mei < menuEditBtns.length; mei++) {
      menuEditBtns[mei].addEventListener('click', function () {
        var key = this.getAttribute('data-id');
        modal('编辑菜单', menuModalBody({ mode: 'edit', key: key }), function (mask) { saveMenuForm(mask, { mode: 'edit', key: key }); });
      });
    }
    var menuDelBtns = document.querySelectorAll('[data-menu-del]');
    for (var mdi = 0; mdi < menuDelBtns.length; mdi++) {
      menuDelBtns[mdi].addEventListener('click', function () { deleteMenu(this.getAttribute('data-id')); });
    }

    /* ---- 脚本注册中心：运行 / 上传 / 编辑内容 / 参数 / 回滚 / 运行记录 ---- */
    var srun = document.querySelectorAll('[data-script-run]');
    for (var sr = 0; sr < srun.length; sr++) {
      srun[sr].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!id) { toast('请先选择要运行的脚本（静态演示）', 'accent'); return; }
        openScriptRun(id);
      });
    }
    var suv = document.querySelectorAll('[data-upload-ver]');
    for (var sui = 0; sui < suv.length; sui++) {
      suv[sui].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var s = scriptById(id);
        if (!s) return;
        if (!assertCan(s.owner, '上传脚本 ' + s.id)) return;
        openMask('上传脚本 · ' + s.id, modalUploadForm(s), function (mask) { doUploadVer(mask, s); });
      });
    }
    var sed = document.querySelectorAll('[data-edit-code]');
    for (var sei = 0; sei < sed.length; sei++) {
      sed[sei].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var s = scriptById(id);
        if (!s) return;
        if (!assertCan(s.owner, '编辑脚本内容 ' + s.id)) return;
        openMask('编辑内容 · ' + s.id, modalCodeEditor(s), function (mask) { doCodeSave(mask, s); });
      });
    }
    var sap = document.querySelectorAll('[data-add-param]');
    for (var sai = 0; sai < sap.length; sai++) {
      sap[sai].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var s = scriptById(id);
        if (!s) return;
        openMask('添加运行参数 · ' + s.id, modalAddParam(s), function (mask) { doAddParam(mask, s); });
      });
    }
    var asch = document.querySelectorAll('[data-add-sched]');
    for (var asi = 0; asi < asch.length; asi++) {
      asch[asi].addEventListener('click', function () {
        var script = this.getAttribute('data-script') || '';
        openMask('新建定时任务', modalSchedForm(script || undefined), function (mask) { doSchedSave(mask); });
      });
    }
    var tg = document.querySelectorAll('[data-sched-toggle]');
    for (var tgi = 0; tgi < tg.length; tgi++) {
      tg[tgi].addEventListener('change', function () {
        var id = this.getAttribute('data-id');
        var t = L.SCHEDULE_TASKS.filter(function (x) { return x.id === id; })[0];
        if (t) { t.enable = this.checked; toast('定时任务 ' + id + (this.checked ? ' 已启用' : ' 已停用'), 'ok'); }
      });
    }
    var srd = document.querySelectorAll('[data-run-detail]');
    for (var sri = 0; sri < srd.length; sri++) {
      srd[sri].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var r = L.SCRIPT_RUNS.filter(function (x) { return x.id === id; })[0];
        if (!r) return;
        var lines = runConsoleLines(r);
        var c = lines.map(function (l, li) {
          var cls = li === lines.length - 1 ? (r.result === 'ok' ? 'ok' : r.result === 'fail' ? 'bad' : 'warn') : 'in';
          return '<div class="ln ' + cls + '">' + esc(l) + '</div>';
        }).join('');
        openMask('运行详情 · ' + r.script + ' ' + r.id,
          '<div class="form-grid">' +
          '<div class="field"><label>执行时间</label><input type="text" value="' + esc(r.t + ' · ' + triggerLabel(r.trigger) + ' · ' + userName(r.user) + ' · ' + (r.dur || '—')) + '" disabled></div>' +
          '<div class="field"><label>结果</label><input type="text" value="' + ({ ok: '成功', warn: '需关注', skip: '跳过', fail: '失败' }[r.result] || r.result) + '" disabled></div>' +
          '<div class="field full"><label>输入 → 输出（文件地址）</label><input type="text" value="' + esc((r.input || '—') + ' → ' + (r.output || '—')) + '" disabled></div>' +
          (r.note ? '<div class="field full"><label>执行说明</label><input type="text" value="' + esc(r.note) + '" disabled></div>' : '') +
          '<div class="field full"><label>标准化输出（控制台回放）</label><div class="console" style="min-height:120px">' + c + '</div></div>' +
          '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>关闭</button></div></div>');
      });
    }
    var srb = document.querySelectorAll('[data-rollback]');
    for (var sri2 = 0; sri2 < srb.length; sri2++) {
      srb[sri2].addEventListener('click', function () {
        var s = scriptById(this.getAttribute('data-id'));
        if (!s) return;
        if (!assertCan(s.owner, '回滚 ' + s.id)) return;
        if ((s.files || []).length < 2) { toast('暂无更早版本可回滚', 'bad'); return; }
        var prev = s.files[1];
        s.ver = prev.ver; s.file = { name: prev.name, size: prev.size };
        toast('已回滚到 ' + prev.ver + '（历史保留，可再次升级）', 'ok');
        renderPageOnly(getRoute());
      });
    }
    var sdl = document.querySelectorAll('[data-dl-script]');
    for (var sdi = 0; sdi < sdl.length; sdi++) {
      sdl[sdi].addEventListener('click', function () {
        toast(this.getAttribute('data-id') + ' 下载（静态演示：Git 仓库统一拉取）', 'accent');
      });
    }
    var sch = document.querySelectorAll('[data-check-syntax]');
    for (var sci = 0; sci < sch.length; sci++) {
      sch[sci].addEventListener('click', function () {
        toast(this.getAttribute('data-id') + ' 语法检查通过（Python 3 · 静态演示）', 'ok');
      });
    }

    /* ---- 脚本注册中心：筛选（环节 / 类别 / 健康 / 关键词） ---- */
    if (route === 'admin-scripts') {
      var fse = document.querySelectorAll('[data-f-stage], [data-f-cat], [data-f-health]');
      for (var fi = 0; fi < fse.length; fi++) {
        fse[fi].addEventListener('change', function () {
          try {
            scriptFilter.stage = document.querySelector('[data-f-stage]').value;
            scriptFilter.cat = document.querySelector('[data-f-cat]').value;
            scriptFilter.health = document.querySelector('[data-f-health]').value;
          } catch (err) {}
          renderPageOnly('admin-scripts');
        });
      }
      var fq = document.querySelector('[data-f-q]');
      if (fq) fq.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { scriptFilter.q = String(fq.value).trim(); renderPageOnly('admin-scripts'); }
      });
    }
    bind('[data-leave-add]', function () { modal('登记请假（委托改派）', modalLeaveForm(), doLeaveAdd); });
    var leaveEnd = document.querySelectorAll('[data-leave-end]');
    for (var lei = 0; lei < leaveEnd.length; lei++) {
      leaveEnd[lei].addEventListener('click', function () {
        var who = this.getAttribute('data-who');
        for (var li = 0; li < L.LEAVES.length; li++) {
          if (L.LEAVES[li].who === who) L.LEAVES[li].status = 'ended';
        }
        toast(whoName(who) + ' 已销假，节点恢复默认负责人', 'ok');
        renderPageOnly('workflow-config');
      });
    }
    /* Lab Agent 控制台：触发一次巡检 / 闭环处置 */
    bind('[data-agent-scan]', function () {
      var c = document.getElementById('agent-console');
      if (!c) return;
      var watch = L.AGENT_CASES.filter(function (x) { return x.status === 'watch'; }).length;
      var done = L.AGENT_CASES.filter(function (x) { return x.status === 'done'; }).length;
      var draft = L.AGENT_CASES.filter(function (x) { return x.status === 'draft'; }).length;
      c.innerHTML = '<div class="ln dim">$ lab_agent --scan --mode readonly --all</div>' +
        '<div class="ln in">> 读取数据源：台账(12) / 告警(7) / CTMS(6) / 排程(7) / Recon(6) / 排配</div>' +
        '<div class="ln in">> 检查阈值：投 TX ≥20hr · 补拍 >30min · CTMS 扫描 >120min</div>' +
        '<div class="ln in">> 读取 LEAVES → 委托改派路由（2 条生效）</div>' +
        '<div class="ln ok">> 命中 ' + watch + ' 项卡点、' + done + ' 项已闭环、' + draft + ' 份草稿</div>' +
        '<div class="ln">> 全部动作 = 只读 / 跟催；需人工确认的节点保持「草稿 / 待批准」</div>' +
        '<div class="ln ok">> 审计已写入 AGENT_LOG（谁 / 何时 / 做什么）</div>';
      L.AGENT_LOG.push({ t: '09-17 22:10', who: 'agent', act: '触发巡检：台账12/告警7/CTMS6/排程7 读流式比对', res: 'ok' });
      toast('Agent 巡检完成：' + watch + ' 项卡点见处置单', 'ok');
    });
    /* 作业设定中心：定义漂移巡检 / 编辑小节点（改 SSOT 一处 → 派生全链路更正） */
    bind('[data-def-scan]', function () {
      var c = document.getElementById('defs-console');
      if (!c) return;
      var drift = runDefScan();
      var lines = '<div class="ln dim">$ lab_agent --scan defs --mode readonly</div>' +
        '<div class="ln in">> 比对 SSOT(STATION_DEFS ' + L.STATION_DEFS.length + ') vs 已下发快照(DEF_SNAPSHOT ' + L.DEF_SNAPSHOT.length + ')</div>';
      if (drift.length) {
        lines += drift.map(function (d) {
          return '<div class="ln ' + 'warn' + '">> 漂移 ' + d.id + ' ' + d.name + '：定义 ' + d.cur + '，快照/旧册仍 ' + d.old + ' — ' + d.why + '</div>';
        }).join('') +
          '<div class="ln">> 处理建议（跟催，不代操作）：确认后重发快照 / 重印旧册再回收</div>';
        toast('发现 ' + drift.length + ' 处定义漂移，见巡检输出', 'warn');
      } else {
        lines += '<div class="ln ok">> 无漂移：SSOT 与快照一致，全部已生效</div>';
        toast('定义巡检完成：0 漂移', 'ok');
      }
      c.innerHTML = lines;
    });
    /* 作业设定中心：交接物链路校验（节点 inputs/outputs 与工具钩子一致性） */
    bind('[data-art-scan]', function () {
      var c = document.getElementById('defs-console');
      var v = validateArtifacts();
      var lines = '<div class="ln dim">$ lab_agent --scan artifacts --mode readonly</div>' +
        '<div class="ln in">> 校验 ' + L.STATION_DEFS.length + ' 个小节点的交接物链路（inputs/outputs vs EXCEL_TOOLS.hook）</div>';
      if (!v.errs.length && !v.warns.length) {
        lines += '<div class="ln ok">> 链路完整：全部引用有产出/有消费，无断链、无孤儿产物、无工具钩子漂移</div>';
        toast('交接物链路校验通过', 'ok');
      } else {
        v.errs.forEach(function (e) { lines += '<div class="ln err">> ✗ ' + e.id + '：' + e.what + '</div>'; });
        v.warns.forEach(function (w) { lines += '<div class="ln warn">> △ ' + w.id + '：' + w.what + '</div>'; });
        lines += '<div class="ln">> 处理建议：断链需在「编辑」中补挂工器具/勾选交接物；孤儿产物可补下游消费声明</div>';
        toast('交接物链路：' + v.errs.length + ' 处断链 / ' + v.warns.length + ' 条提示', v.errs.length ? 'bad' : 'warn');
      }
      var hop = document.getElementById('art-check-line');
      if (hop) hop.innerHTML = '<span class="ln ' + (v.errs.length ? 'err' : 'ok') + '">' + artCheckLine() + '</span>';
      if (c) c.innerHTML = lines;
    });
    var defEditBtns = document.querySelectorAll('[data-def-edit]');
    for (var de = 0; de < defEditBtns.length; de++) {
      defEditBtns[de].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var def = L.STATION_DEFS.filter(function (x) { return x.id === id; })[0];
        if (!def) return;
        var users = L.USERS.map(function (u) { return u.id; }).concat(['Vincent', 'Grant', 'Jackson']);
        var dur = def.dur || '—';
        var taskOpts = dictOpts('task_type').map(function (o) { return { val: o.key, label: o.label }; });
        modal('编辑定义 · ' + def.name + '（SSOT）',
          '<div class="form-grid">' +
          '<div class="field"><label>所属阶段城</label><input type="text" value="' + esc(def.stage || (def.flow || 'T0')) + '" disabled></div>' +
          '<div class="field"><label>节点 ID</label><input type="text" value="' + esc(def.id) + '" disabled></div>' +
          '<div class="field full"><label>节点名</label><input type="text" value="' + esc(def.name) + '" data-def-name></div>' +
          '<div class="field"><label>岗位</label><select data-def-role>' + Object.keys(ROLE_CN).map(function (r) { return '<option' + (r === def.role ? ' selected' : '') + ' value="' + r + '">' + esc(ROLE_CN[r]) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label>负责人</label><select data-def-owner>' + users.map(function (u) { return '<option' + (u === def.owner ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field full"><label>做什么（动作）</label><input type="text" value="' + esc(def.action) + '" data-def-action></div>' +
          '<div class="field full"><label>任务点（下拉多选 · 数据来自「字典中心 → 任务类型」）</label>' + multiSelHtml('tasks', def.tasks || [], taskOpts) + '</div>' +
          '<div class="field"><label>时限</label><input type="text" value="' + esc(dur) + '" data-def-dur></div>' +
          execFieldsHtml(def) +
          subNodesHtml(def) +
          '<div class="field"><label>变更说明</label><input type="text" value="SOP 更新" data-def-note></div>' +
          '<div class="field full"><div class="hint">当前版本 ' + def.ver + ' → 保存后自动生成 ' + defVerNext(def) + '（草稿态）。保存即派生：本页流程表 / Travel Sheet 环节流 / 台账同步更正，0 处手工同步。挂接脚本/工具仅改引用（如 S01 → S02），不复制定义。</div></div>' +
          '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存并派生</button></div></div>',
          function (mask) {
            var patch = {
              name: (mask.querySelector('[data-def-name]') || {}).value || def.name,
              role: (mask.querySelector('[data-def-role]') || {}).value || def.role,
              owner: (mask.querySelector('[data-def-owner]') || {}).value || def.owner,
              action: (mask.querySelector('[data-def-action]') || {}).value || def.action,
              dur: (mask.querySelector('[data-def-dur]') || {}).value || def.dur,
              exec: (mask.querySelector('[data-def-exec]') || {}).value || def.exec || 'manual',
              scripts: selectedRefs(mask, 'scripts'),
              tools: selectedRefs(mask, 'tools'),
              inputs: selectedRefs(mask, 'inputs'),
              outputs: selectedRefs(mask, 'outputs'),
              tasks: selectedRefs(mask, 'tasks'),
              subNodes: readSubNodes(mask)
            };
            var note = (mask.querySelector('[data-def-note]') || {}).value || 'SOP 更新';
            var nd = saveStationDef(id, patch, currentUser().id, note);
            mask.remove();
            toast('已保存 ' + (nd ? nd.ver : '') + '：全链路派生已自动更正', 'ok');
            renderPageOnly('defs');
          });
      });
    }
    /* 新增小节点：全局按钮（默认 T0）+ 每个阶段城的「新增小节点」按钮，均写入所属阶段城 SSOT 草稿 */
    bind('[data-def-add]', function () { defAddModal('T0'); });
    L.STAGES.forEach(function (s) {
      bind('[data-def-add-stage="' + s.id + '"]', function () { defAddModal(s.id); });
    });
    /* 删除小节点：草稿安全丢弃；已生效需确认（同步下线快照，对应旧册重印收回） */
    var defDelBtns = document.querySelectorAll('[data-def-del]');
    for (var ddi = 0; ddi < defDelBtns.length; ddi++) {
      defDelBtns[ddi].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var def = L.STATION_DEFS.filter(function (x) { return x.id === id; })[0];
        if (!def) return;
        var isEff = def.status === 'eff';
        var stageName = def.stage || '—';
        if (isEff) {
          modal('下线小节点 ' + def.id + '（已生效）',
            '<div class="rule-list"><div>⚠ 该小节点<b>已生效</b>（' + def.ver + '，快照在册）。删除后：定义从「' + def.stage + '」阶段城移除，<b>已下发快照同步下线</b>，流程排配 / Travel Sheet 环节流 / 台账自动缩编；旧册需重印收回。</div></div>' +
            '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-danger fill">确认下线</button></div>',
            function (mask) {
              var ok = deleteStationDef(id, currentUser().id);
              mask.remove();
              toast(ok ? '已下线 ' + id + '（' + stageName + ' 城），全链路已重新派生' : '删除失败', ok ? 'warn' : 'bad');
              renderPageOnly('defs');
            });
        } else {
          modal('丢弃草稿小节点 ' + def.id + '？',
            '<div class="rule-list"><div>草稿（' + def.ver + '）未被下发，丢弃不会影响已生效版本与快照。</div></div>' +
            '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-danger fill">丢弃</button></div>',
            function (mask) {
              var ok = deleteStationDef(id, currentUser().id);
              mask.remove();
              toast(ok ? '已丢弃草稿 ' + id + '（' + stageName + ' 城）' : '删除失败', ok ? 'ok' : 'bad');
              renderPageOnly('defs');
            });
        }
      });
    }
    /* 发布下发：草稿 → 生效，写快照 */
    var defPubBtns = document.querySelectorAll('[data-def-pub]');
    for (var pbi = 0; pbi < defPubBtns.length; pbi++) {
      defPubBtns[pbi].addEventListener('click', function () {
        var nd = publishStationDef(this.getAttribute('data-id'), currentUser().id);
        if (!nd) return;
        toast('已发布 ' + nd.id + '：' + nd.ver + ' 生效，快照 / 旧册已更新', 'ok');
        renderPageOnly('defs');
      });
    }
    /* 流程模板编排：上移 / 下移 / 移除（改动 = 新版本草稿，在跑实例钉版本不受影响） */
    var tplMoveBtns = document.querySelectorAll('[data-tpl-up], [data-tpl-down], [data-tpl-del]');
    for (var tmi = 0; tmi < tplMoveBtns.length; tmi++) {
      tplMoveBtns[tmi].addEventListener('click', function () {
        var key = this.getAttribute('data-key');
        var idx = parseInt(this.getAttribute('data-idx'), 10);
        var act = this.hasAttribute('data-tpl-up') ? 'up' : this.hasAttribute('data-tpl-down') ? 'down' : 'del';
        var tpl = flowTplById(key);
        if (!tpl || idx < 0 || idx >= tpl.nodes.length) return;
        var label = ['上移', '下移', '移除'][act === 'up' ? 0 : act === 'down' ? 1 : 2];
        editFlowTpl(key, function (t) {
          if (act === 'up' && idx > 0) {
            var a = t.nodes[idx];
            t.nodes[idx] = t.nodes[idx - 1];
            t.nodes[idx - 1] = a;
          } else if (act === 'down' && idx < t.nodes.length - 1) {
            var b = t.nodes[idx];
            t.nodes[idx] = t.nodes[idx + 1];
            t.nodes[idx + 1] = b;
          } else if (act === 'del') {
            t.nodes.splice(idx, 1);
          }
        }, currentUser().id, label + '「' + tplNodeByIdx(tpl, idx).name + '」');
        toast('流程调整：' + label + '已生效为草稿，发布后才进入新流程', 'ok');
        renderPageOnly('defs');
      });
    }
    /* 添加节点到流程模板尾部（只引用定义 id，不复制内容） */
    var tplAddBtns = document.querySelectorAll('[data-tpl-add]');
    for (var tai = 0; tai < tplAddBtns.length; tai++) {
      tplAddBtns[tai].addEventListener('click', function () {
        var key = this.getAttribute('data-key');
        var tpl = flowTplById(key);
        if (!tpl) return;
        var candidates = L.STATION_DEFS.filter(function (d) {
          return d.status !== 'draft' && tpl.nodes.indexOf(d.id) === -1;
        });
        if (!candidates.length) { toast('暂无可添加的已生效节点', 'warn'); return; }
        modal('添加节点到『' + tpl.name + '』（追加到流程尾）',
          '<div class="form-grid">' +
          '<div class="field full"><label>选择已下发节点</label><select data-tpl-pick>' +
          candidates.map(function (d) { return '<option value="' + d.id + '">' + esc(d.flow) + ' · ' + esc(d.name) + '（' + esc(d.ver) + '）</option>'; }).join('') +
          '</select></div>' +
          '<div class="field full"><div class="hint">只引用定义 id，不复制内容；确认后流程版本 +1 转草稿，发布后才对新实例生效，在跑实例不受影响。</div></div>' +
          '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">确认添加</button></div></div>',
          function (mask) {
            var pick = (mask.querySelector('[data-tpl-pick]') || {}).value || candidates[0].id;
            var n = tplNodeDef(tpl, pick);
            editFlowTpl(key, function (t) { t.nodes.push(pick); }, currentUser().id, '添加节点「' + (n ? n.name : pick) + '」');
            mask.remove();
            toast('已添加：流程版本 +1 转草稿，发布后生效', 'ok');
            renderPageOnly('defs');
          });
      });
    }
    /* 发布流程模板：草稿 → 生效（后续实例按新版本启动） */
    var tplPubBtns = document.querySelectorAll('[data-tpl-pub]');
    for (var tpi = 0; tpi < tplPubBtns.length; tpi++) {
      tplPubBtns[tpi].addEventListener('click', function () {
        var t = publishFlowTpl(this.getAttribute('data-key'), currentUser().id);
        if (!t) return;
        toast('已发布流程 ' + t.name + '：' + t.ver + '，后续实例按新版本启动', 'ok');
        renderPageOnly('defs');
      });
    }
    /* 启动流程：选模板生成实例，钉当前版本，首节点路由给对应负责人 */
    var tplStartBtns = document.querySelectorAll('[data-tpl-start]');
    for (var tsi = 0; tsi < tplStartBtns.length; tsi++) {
      tplStartBtns[tsi].addEventListener('click', function () {
        var key = this.getAttribute('data-key');
        var tpl = flowTplById(key);
        if (!tpl || !tpl.nodes.length) return;
        var first = tplNodeByIdx(tpl, 0);
        modal('启动流程 · ' + tpl.name + '（' + tpl.ver + '）',
          '<div class="form-grid">' +
          '<div class="field full"><label>对象 / 批次</label><input type="text" value="' + esc(tpl.name) + ' 新批次" data-inst-subject></div>' +
          '<div class="field full"><div class="hint">实例将钉在 ' + tpl.ver + '，首节点「' + esc(first.name) + '」下发负责人 ' + esc(whoName(first.owner)) + '；推进后自动路由到下一节点，该负责人工作台实时显示任务与节点位置。</div></div>' +
          '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">启动</button></div></div>',
          function (mask) {
            var subject = (mask.querySelector('[data-inst-subject]') || {}).value || tpl.name + ' 新批次';
            var ins = startFlowInstance(key, currentUser().id, subject);
            if (ins) toast('已启动 ' + ins.id + '：首节点已下发 ' + whoName(first.owner), 'ok');
            renderPageOnly('defs');
          });
      });
    }
    /* 推进流程实例：当前节点完成 → 路由下一节点负责人（末节点闭环） */
    var instNextBtns = document.querySelectorAll('[data-inst-next]');
    for (var ini = 0; ini < instNextBtns.length; ini++) {
      instNextBtns[ini].addEventListener('click', function () {
        var ins = advanceFlowInstance(this.getAttribute('data-id'), currentUser().id);
        if (!ins) return;
        toast(ins.status === 'done' ? '流程实例 ' + ins.id + ' 已闭环' : '流程实例 ' + ins.id + ' 已推进到下一节点', 'ok');
        renderPageOnly('defs');
      });
    }

    /* 作业设定中心：新增阶段城 + 阶段城内小节点拖拽换序（HTML5 DnD，落点=目标行上半/下半） */
    if (route === 'defs') {
      var stAddBtns = document.querySelectorAll('[data-def-add-stage-city]');
      for (var sa = 0; sa < stAddBtns.length; sa++) {
        stAddBtns[sa].addEventListener('click', stageAddModal);
      }
      /* 编辑阶段城：弹窗改名称 / 标签 / 描述 / 流转 / TT（名称变更同步城内小节点 flow） */
      var editStageBtns = document.querySelectorAll('[data-def-edit-stage]');
      for (var se = 0; se < editStageBtns.length; se++) {
        editStageBtns[se].addEventListener('click', function () {
          stageEditModal(this.getAttribute('data-def-edit-stage'));
        });
      }
      /* 折叠 / 展开阶段城：只隐藏城内 flow 条与表格，头部统计保留 */
      var toggleBtns = document.querySelectorAll('[data-def-toggle-hub]');
      for (var tb = 0; tb < toggleBtns.length; tb++) {
        toggleBtns[tb].addEventListener('click', function () {
          var sid = this.getAttribute('data-def-toggle-hub');
          HUB_COLLAPSED[sid] = !HUB_COLLAPSED[sid];
          renderPageOnly('defs');
        });
      }
      /* 顶部阶段城模糊查询：不重绘整页，直接按 data-search 过滤已渲染的城卡片（保留输入框焦点） */
      var defSearch = document.querySelector('[data-def-search]');
      if (defSearch) {
        defSearch.addEventListener('input', function () {
          var q = this.value.trim().toLowerCase();
          var hubs = document.querySelectorAll('.stage-hub[data-search]');
          var shown = 0;
          for (var hi = 0; hi < hubs.length; hi++) {
            var hay = String(hubs[hi].getAttribute('data-search') || '').toLowerCase();
            var ok = !q || hay.indexOf(q) >= 0;
            hubs[hi].style.display = ok ? '' : 'none';
            if (ok) shown++;
          }
          var countEl = document.getElementById('defs-search-count');
          if (countEl) countEl.textContent = q ? (shown + ' / ' + hubs.length + ' 座城命中') : '';
          var emptyEl = document.getElementById('defs-search-empty');
          if (emptyEl) emptyEl.style.display = q && !shown ? '' : 'none';
        });
      }
      /* 删除阶段城：确认弹窗（连带城内全部小节点下线，至少保留一座城） */
      var delStageBtns = document.querySelectorAll('[data-def-del-stage]');
      for (var ds = 0; ds < delStageBtns.length; ds++) {
        delStageBtns[ds].addEventListener('click', function () {
          var sid = this.getAttribute('data-def-del-stage');
          var st = L.STAGES.filter(function (x) { return x.id === sid; })[0];
          if (!st) return;
          var cnt = L.STATION_DEFS.filter(function (d) { return d.stage === sid; }).length;
          var effN = L.STATION_DEFS.filter(function (d) { return d.stage === sid && d.status === 'eff'; }).length;
          modal('下线阶段城 ' + sid + '（含 ' + cnt + ' 个小节点）',
            '<div class="rule-list"><div>⚠ 整座「' + esc(st.name) + '」将与其中 ' + cnt + ' 个小节点一起下线（已生效 ' + effN + ' 个，快照同步下线），流程排配 / Travel Sheet 环节流 / 台账自动缩编，旧册需重印收回。系统至少保留一座阶段城，删除后不可撤销。</div></div>' +
            '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-danger fill">确认下线阶段城</button></div>',
            function (mask) {
              var ok = deleteStageCity(sid, currentUser().id);
              mask.remove();
              if (ok === true) {
                toast('已下线阶段城 ' + sid + '，全链路已重新派生', 'warn');
                renderPageOnly('defs');
              } else {
                toast((ok && ok.err) || '删除失败', 'bad');
              }
            });
        });
      }
      var dragRows = document.querySelectorAll('tr[data-def-drag]');
      for (var dr = 0; dr < dragRows.length; dr++) {
        (function (row) {
          row.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', row.getAttribute('data-id'));
            e.dataTransfer.effectAllowed = 'move';
            row.classList.add('drag-src');
          });
          row.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            var r = row.getBoundingClientRect();
            var above = (e.clientY - r.top) < r.height / 2;
            row.classList.toggle('drop-above', above);
            row.classList.toggle('drop-below', !above);
          });
          row.addEventListener('dragleave', function () {
            row.classList.remove('drop-above', 'drop-below');
          });
          row.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var r = row.getBoundingClientRect();
            var above = (e.clientY - r.top) < r.height / 2;
            var ok = reorderStationDef(e.dataTransfer.getData('text/plain'), row.getAttribute('data-id'), above, currentUser().id);
            toast(ok ? '已调整小节点顺序，全链路已派生更正' : '仅支持同城小节点互相换序', ok ? 'ok' : 'warn');
            renderPageOnly('defs');
          });
          row.addEventListener('dragend', function () {
            row.classList.remove('drag-src', 'drop-above', 'drop-below');
          });
        })(dragRows[dr]);
      }
    }

    /* 模拟扫码：轮询本站点池内下一台未完成机台 */
    bind('[data-scan-sn]', function () {
      var pool = tsSheetsFor(FORM_STATE.stageF);
      var next = pool.filter(function (t) {
        return t.status !== 'done' && t.status !== 'done-no-tx';
      })[0] || pool[0];
      if (!next) { toast('本站点暂无待处理机台', 'accent'); return; }
      FORM_STATE.sn = next.sn;
      FORM_STATE.notes = [];
      toast('扫码成功：机台 ' + next.sn + ' 信息已带出', 'ok');
      renderPageOnly('travel-sheet');
    });
    /* Mini line 上传工站 Excel（模拟）：解析后展示工站结果，并同步到报告纸（#/report） */
    bind('[data-mini-upload]', function () {
      var ts = tsCurrent();
      if (!ts) { toast('当前无机台', 'bad'); return; }
      toast('解析中：读取 Excel 的工站测试结果…', 'ok');
      later(400, function () {
        var stations = miniRecordFor(ts.sn);
        var failN = stations.filter(function (r) { return r.status === 'fail'; }).length;
        MINI_IMPORT[ts.sn] = { file: ts.sn + '_mini_stations.xlsx', at: dateNow(), stations: stations };
        toast('已导入 ' + stations.length + ' 个工站（失败 ' + failN + ' 站），结果已同步至报告纸', 'ok');
        renderPageOnly('travel-sheet');
      }, 400);
    });
    /* 取数源切换（Excel / API 统一入口）：只影响工站数据的获取方式，站点比对逻辑不变 */
    var miniSrc = document.querySelector('[data-mini-source]');
    if (miniSrc) miniSrc.addEventListener('change', function () {
      MINI_SRC = this.value;
      toast('取数源已切换为「' + esc(miniSourceName()) + '」（Mini line 只做站点比对，不分析测试数据）', 'accent');
      renderPageOnly('travel-sheet');
    });
    /* 站点筛选（下拉选择）：全部站点 / 仅本站点待处理 */
    var tsSeg = document.querySelector('[data-ts-station-mode]');
    if (tsSeg) tsSeg.addEventListener('change', function () {
      FORM_STATE.stationOnly = this.value === '1';
      var pool = tsSheetsFor(FORM_STATE.stageF);
      if (!pool.some(function (x) { return x.sn === FORM_STATE.sn; })) {
        FORM_STATE.sn = pool.length ? pool[0].sn : '';
      }
      FORM_STATE.notes = [];
      renderPageOnly('travel-sheet');
    });
    /* 阶段筛选（下拉选择）：全部 / T0 / TX / TF，切换到对应阶段并只显示该阶段台账 */
    var tsStage = document.querySelector('[data-ts-stage-mode]');
    if (tsStage) tsStage.addEventListener('change', function () {
      FORM_STATE.stageF = this.value || 'all';
      var pool = tsSheetsFor(FORM_STATE.stageF);
      if (!pool.some(function (x) { return x.sn === FORM_STATE.sn; })) {
        FORM_STATE.sn = pool.length ? pool[0].sn : '';
      }
      FORM_STATE.notes = [];
      renderPageOnly('travel-sheet');
    });
    /* 台账下拉切换 */
    var tsSel = document.querySelector('[data-ts-select]');
    if (tsSel) tsSel.addEventListener('change', function () {
      FORM_STATE.sn = this.value;
      FORM_STATE.notes = [];
      renderPageOnly('travel-sheet');
    });
    /* 动态记录区：新增内容行（添加 / 撤销，容器委托不随重绘丢失） */
    bind('[data-note-add]', function () {
      var item = document.querySelector('[data-note-item]');
      var txt = document.querySelector('[data-note-txt]');
      var itemV = item ? item.value : '其他备注';
      var txtV = txt ? String(txt.value).trim() : '';
      if (!txtV) { toast('请输入补充内容', 'bad'); return; }
      FORM_STATE.notes.push({ item: itemV, txt: txtV, t: dateNow().slice(5) });
      var list = document.getElementById('note-list');
      if (list) list.innerHTML = notesListHtml();
      toast('已新增内容行：' + itemV + '（共 ' + FORM_STATE.notes.length + ' 行）', 'ok');
    });
    /* R2 检查表勾选：机台×节点留存，全勾是放行前提之一 */
    var tsChecks = document.querySelectorAll('[data-ts-check]');
    for (var tsc = 0; tsc < tsChecks.length; tsc++) {
      tsChecks[tsc].addEventListener('click', function () {
        var ts = tsCurrent();
        var defId = this.getAttribute('data-def');
        var def = L.STATION_DEFS.filter(function (x) { return x.id === defId; })[0];
        if (!def) return;
        var task = this.getAttribute('data-task');
        var list = tsChecklist(ts, def.id);
        var at = list.indexOf(task);
        if (at >= 0) { list.splice(at, 1); toast('已取消勾选：' + taskLabel(task), ''); }
        else { list.push(task); toast('已勾选：' + taskLabel(task), 'ok'); }
        renderPageOnly('travel-sheet');
      });
    }
    /* 人工交接物上传：把 文件名/共享盘路径 写进 ART_UPLOADS → 页面标记已上传（静态演示不上传实体文件） */
    var artUpBtns = document.querySelectorAll('[data-art-upload]');
    for (var aub = 0; aub < artUpBtns.length; aub++) {
      artUpBtns[aub].addEventListener('click', function () {
        var aid = this.getAttribute('data-a');
        var inp = document.querySelector('[data-art-upload-file][data-a="' + aid + '"]');
        var val = inp ? String(inp.value).trim() : '';
        if (!val) { toast('先填共享盘路径 / 文件名', 'bad'); return; }
        var ts = tsCurrent();
        var d = defForSubmit(ts);
        L.ART_UPLOADS.push({ id: 'UP-' + (L.ART_UPLOADS.length + 1), sn: ts.sn, def: d ? d.id : '—', art: aid, file: val, by: currentUser().id, at: dateNow() });
        toast('已上传：' + val + ' → ' + aid, 'ok');
        renderPageOnly('travel-sheet');
      });
    }
    var noteList = document.getElementById('note-list');
    if (noteList) noteList.addEventListener('click', function (e) {
      var d = e.target && e.target.closest ? e.target.closest('[data-note-del]') : null;
      if (!d) return;
      FORM_STATE.notes.splice(parseInt(d.getAttribute('data-i'), 10), 1);
      noteList.innerHTML = notesListHtml();
      toast('已撤销一行（剩 ' + FORM_STATE.notes.length + ' 行）', 'ok');
    });
    /* 提交 Travel Sheet：仅当前责任人（含代理人）可推进环节并写入事件流。
       外观目检一步录入 → 自动复用派发：Fx 落台账、Recon 数据包、当日报告草稿、照片补拍跟催 */
    /* --------- 提交后派发执行（配置驱动）：依顶层 submitHooks 决定的钩子派发下游任务 ---------
     * 一次录入，多处复用：recon/report/photo 三类钩子对应的任务各只建一次 */
    function autoDispatch(ts) {
      var fx = ts.fxIssue || [], hasFx = fx.length > 0;
      ts.fxIssue = fx;
      var hooks = submitHooks(ts), fired = [];
      if (hooks.indexOf('ART_RECON') >= 0) {
        var pk = 'PKT-' + dateNow().slice(0, 10).replace(/-/g, '').slice(4) + '-' + ts.sn.slice(-2);
        if (!L.RECON_PACKS.some(function (p) { return p.sn === ts.sn && p.status !== 'done'; })) {
          L.RECON_PACKS.push({ pack: pk, sn: ts.sn, tag: 'Lab REL T0 / Test T0 failure mode', items: Math.max(fx.length, 1), mode: hasFx ? '含外观Fail' : '生成自动', owner: 'yoke', status: 'todo' });
          fired.push('Recon 数据包');
        }
      }
      if (hooks.indexOf('ART_REPORT') >= 0) {
        if (!L.REPORTS.some(function (r) { return r.sn === ts.sn; })) {
          L.REPORTS.push({ sn: ts.sn, stage: ts.stage, phase: 'PreEVT', status: 'draft', summary: hasFx ? fx.length + ' 外观Fail' : '6 PASS / 0 Fail', fail: fx, owner: 'bole', importAt: '—', recon: '—', color: hasFx ? '#FF6B6B' : '#4EC9B0' });
          fired.push('报告导入输入');
        }
      }
      if (hooks.indexOf('ART_PHOTO') >= 0 && hasFx && !L.PHOTO_REVIEWS.some(function (p) { return p.sn === ts.sn; })) {
        L.PHOTO_REVIEWS.push({ sn: ts.sn, abnormal: fx.length, files: fx.map(function (l, i) { return ts.sn + '_A' + (i + 1) + '.jpg'; }), status: 'review', owner: 'lucky', reviewer: 'amy', due: '当天 22:00', note: fx.join('，'), checks: { reflect: null, missing: null, naming: null } });
        fired.push('拍照/色差任务 ' + fx.length + ' 项');
      }
      return { fx: fx.length, fired: fired, hooks: hooks };
    }
    bind('[data-submit-ts]', function () {
      var ts = tsCurrent();
      if (!assertCan(sheetOwner(ts), '提交 Travel Sheet')) return;
      if (!FORM_STATE.signed) { toast('请先完成电子签名（④ 签名区）', 'bad'); return; }
      if (ts.status === 'done' || ts.status === 'done-no-tx') { toast('本机已到终态，无需再提交', 'bad'); return; }
      /* 预计要提交/跳转的节点（退回完成时用重做节点，否则用当前环节） */
      var ret = returnFor(ts.sn);
      var gateDef = ret ? defForStageStatus(ts.stage, ret.to, true) : defForSubmit(ts);
      if (!gateDef) { toast('本环节无已发布的作业定义，无法提交', 'bad'); return; }
      /* R2 放行①：节点检查表未勾满 / 人工交接物缺失 → 阻塞 */
      var missing = nodeReleaseMissing(ts, gateDef);
      if (missing.length) {
        toast('节点未放行：' + missing.slice(0, 3).join('；') + (missing.length > 3 ? '（共 ' + missing.length + ' 项）' : ''), 'bad');
        return;
      }
      /* R2 放行②：整批门闩——批内同阶段在制机台进度落后时冻结 leader 提交 */
      var lag = batchGateBlock(ts, gateDef);
      if (lag.length) {
        toast('整批门闩：同批次机台 ' + lag.map(function (x) { return x.sn + '(' + statusCN(x.at) + ')'; }).join('、') +
          ' 进度落后，批内不可抢先流转，请节拍一致', 'bad');
        return;
      }
      var next = ret
        ? { next: ret.from, tip: '退回重做完成，快速归还 ' + statusCN(ret.from) + ' 复查' }
        : nextTsStep(ts) || { next: null, tip: '' };
      if (!next.next) { toast('本状态无后续节点（推进序缺失），请先配置作业定义', 'bad'); return; }
      if (ret) ret.status = 'done';
      var who = currentUser().id;
      ts.fxIssue = FORM_STATE.fx.map(function (code) {
        var m = dictOpts('fx_issue').filter(function (f) { return f.key === code; })[0];
        return m ? m.label : code;
      });
      var nFx = autoDispatch(ts);
      ts.timeline.push({ t: dateNow().slice(5), who: who, node: next.tip });
      ts.sign = who;
      ts.status = next.next;
      toast('『' + ts.sn + '』已提交 → ' + next.tip + (nFx.fired.length
        ? '，自动派发 ' + nFx.fired.join(' / ') + (nFx.fx ? '（外观 ' + nFx.fx + ' 项）' : '')
        : nFx.hooks.length
          ? '，派发钩子已触发，任务已在生成中（本次无新增）'
          : nFx.fx
            ? '，勾选外观 ' + nFx.fx + ' 项，本节点未挂派发工具，待人工环节跟进'
            : '，本节点未挂派发工具，无自动派发走人工环节'), 'ok');
      FORM_STATE.signed = false; FORM_STATE.fx = []; FORM_STATE.notes = [];
      renderPageOnly('travel-sheet');
    });
    /* 发起退回（Travel Sheet 页）：仅当前环节责任人；终态冻结不可退回 */
    bind('[data-reject-ts]', function () {
      var ts = tsCurrent();
      if (!assertCan(sheetOwner(ts), '发起退回')) return;
      if (frozenTS(ts)) { toast('终态机台已冻结，不支持退回', 'bad'); return; }
      modal('退回上一环节（两段式）', modalRejectForm(ts), function (mask) {
        var to = (mask.querySelector('[data-rj-to]') || {}).value;
        var reason = String((mask.querySelector('[data-rj-reason]') || {}).value || '').trim();
        if (!reason) { toast('退回理由必填，不可空退', 'bad'); return; }
        if (!to || to === ts.status) { toast('退回目标无效', 'bad'); return; }
        var rt = { id: 'RT-' + (L.RETURNS.length + 1), sn: ts.sn, from: ts.status, to: to, reason: reason, by: currentUser().id, at: dateNow().slice(5), status: 'pending' };
        L.RETURNS.push(rt);
        ts.timeline.push({ t: dateNow().slice(5), who: currentUser().id, node: '发起退回 → ' + statusCN(to) + '（待 ' + whoName(effId(statusOwner(to) || 'bole')) + ' 确认）' });
        L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: ts.sn + ' 发起退回 → ' + statusCN(to) + '：' + reason, res: 'warn' });
        toast('退回单 ' + rt.id + ' 已发起，等待目标环节确认接收', 'accent');
        mask.remove();
        renderPageOnly('travel-sheet');
      });
    });
    /* 确认接收（工作台）：两段式第二程——机台拨回目标环节重做，待办自动出现 */
    var retOk = document.querySelectorAll('[data-return-ok]');
    for (var ri = 0; ri < retOk.length; ri++) {
      retOk[ri].addEventListener('click', function () {
        var rid = this.getAttribute('data-id');
        var rt = L.RETURNS.filter(function (r) { return r.id === rid; })[0];
        if (!rt || rt.status !== 'pending') return;
        var st = L.TRAVEL_SHEETS.filter(function (t) { return t.sn === rt.sn; })[0];
        if (!st || frozenTS(st)) { toast('机台已终态或无台账，无法退回', 'bad'); return; }
        if (!assertCan(effId(statusOwner(rt.to) || 'bole'), '确认退回接收')) return;
        st.status = rt.to;
        st.timeline.push({ t: dateNow().slice(5), who: currentUser().id, node: '退回确认：回到 ' + statusCN(rt.to) + ' 重做（' + (rt.reason || '') + '）' });
        /* R2：重回目标节点需从头完成检查表 —— 清空该节点勾选记录 */
        var tDef = defForStageStatus(st.stage, rt.to, false);
        if (tDef && st.nodeDone) st.nodeDone[tDef.id] = [];
        rt.status = 'confirmed';
        L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: rt.sn + ' 退回确认，机台回到 ' + statusCN(rt.to) + ' 重做', res: 'warn' });
        toast(rt.sn + ' 已回 ' + statusCN(rt.to) + ' 重做；完成后提交将快速归还 ' + statusCN(rt.from) + ' 复查', 'ok');
        renderPageOnly('dashboard');
      });
    }
    /* 暂不同意退回（工作台）：机台留在发起环节 */
    var retNo = document.querySelectorAll('[data-return-no]');
    for (var rj = 0; rj < retNo.length; rj++) {
      retNo[rj].addEventListener('click', function () {
        var rid = this.getAttribute('data-id');
        var rt = L.RETURNS.filter(function (r) { return r.id === rid; })[0];
        if (!rt || rt.status !== 'pending') return;
        rt.status = 'rejected';
        var st = L.TRAVEL_SHEETS.filter(function (t) { return t.sn === rt.sn; })[0];
        if (st) st.timeline.push({ t: dateNow().slice(5), who: currentUser().id, node: '暂不同意退回（' + (rt.reason || '') + '），机台留在 ' + statusCN(rt.from) });
        L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: rt.sn + ' 退回被拒，机台留在 ' + statusCN(rt.from), res: 'info' });
        toast('已暂不同意，机台仍留在 ' + statusCN(rt.from), 'accent');
        renderPageOnly('dashboard');
      });
    }
    /* 进入管理员视图 */
    bind('[data-goto-admin]', function () {
      setRole('admin');
    });

    /* ---- 机台档案：筛选 / 翻页 ---- */
    bind('[data-mc-search]', function () {
      var q = document.querySelector('[data-mc-q]');
      var st = document.querySelector('[data-mc-stage]');
      MC_STATE.q = q ? String(q.value).trim() : '';
      MC_STATE.stage = st ? st.value : 'all';
      MC_STATE.page = 1;
      renderPageOnly('machines');
    });
    var mcQ = document.querySelector('[data-mc-q]');
    if (mcQ) mcQ.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        MC_STATE.q = String(this.value).trim();
        MC_STATE.page = 1;
        renderPageOnly('machines');
      }
    });
    var mcStage = document.querySelector('[data-mc-stage]');
    if (mcStage) mcStage.addEventListener('change', function () {
      MC_STATE.stage = this.value;
      MC_STATE.page = 1;
      renderPageOnly('machines');
    });
    bind('[data-mc-reset]', function () {
      MC_STATE.q = '';
      MC_STATE.stage = 'all';
      MC_STATE.page = 1;
      renderPageOnly('machines');
    });
    var mcPages = document.querySelectorAll('[data-mc-page]');
    for (var mci = 0; mci < mcPages.length; mci++) {
      mcPages[mci].addEventListener('click', function () {
        MC_STATE.page = parseInt(this.getAttribute('data-page'), 10) || 1;
        renderPageOnly('machines');
      });
    }
    /* ---- 测试批次：翻页 ---- */
    var btPages = document.querySelectorAll('[data-bt-page]');
    for (var bti = 0; bti < btPages.length; bti++) {
      btPages[bti].addEventListener('click', function () {
        BT_STATE.page = parseInt(this.getAttribute('data-page'), 10) || 1;
        renderPageOnly('batches');
      });
    }
    /* ---- 批次详情：导出本批（模拟生成档案并留痕） ---- */
    bind('[data-batch-export]', function () {
      var id = this.getAttribute('data-id');
      var b = batchById(id);
      L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: '导出本批 ' + (b ? b.id : id) + '（' + (b ? b.machineCount : '—') + ' 台）→ archive/' + (b ? b.id : id) + '.zip', res: 'ok' });
      toast('已导出本批「' + (b ? b.id : id) + '」完整数据（静态演示：生成档案并留痕）', 'ok');
    });

    /* ---- 取数源：编辑配置 ---- */
    var dsEdit = document.querySelectorAll('[data-ds-edit]');
    for (var dsi = 0; dsi < dsEdit.length; dsi++) {
      dsEdit[dsi].addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        modal('取数源配置 · ' + id, modalDataSource(id), function (mask) { saveDataSource(mask, id); });
      });
    }
    /* ---- 设备：远程操作（模拟 API，写回 DEVICES + 留痕） ---- */
    var devCap = document.querySelectorAll('[data-dev-cap]');
    for (var dci = 0; dci < devCap.length; dci++) {
      devCap[dci].addEventListener('click', function () {
        if (!canAction('system:device:control')) { toast('无权操作：设备远程控制需要按钮权限', 'bad'); return; }
        deviceDo(this.getAttribute('data-id'), this.getAttribute('data-cap'));
      });
    }

    /* ---- 表单两态：翻页（填写）/ 拼接（总览） ---- */
    var fmBtns = document.querySelectorAll('[data-form-mode]');
    for (var fmi = 0; fmi < fmBtns.length; fmi++) {
      fmBtns[fmi].addEventListener('click', function () {
        FORM_MODE = this.getAttribute('data-mode') || 'paged';
        renderPageOnly('travel-sheet');
      });
    }
    /* ---- 照片 lightbox：点击缩略图放大 ---- */
    var ph = document.querySelectorAll('[data-photo-view]');
    for (var phi = 0; phi < ph.length; phi++) {
      ph[phi].addEventListener('click', function () { openLightbox(this); });
    }

    /* 登录页身份卡片 */
    bindLoginCards();
  }

  /* 绑定帮助：选择器可能命中多个元素（如表单模板的批量预览），逐个绑定 */
  function bind(sel, fn) {
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) els[i].addEventListener('click', fn);
  }

  /* 延迟任务登记：切页（hashchange）时统一取消，避免回调在新页面执行产生内容/URL 不一致 */
  var PENDING_TIMERS = [];
  function later(ms, fn) {
    var id = setTimeout(function () {
      var at = PENDING_TIMERS.indexOf(id);
      if (at >= 0) PENDING_TIMERS.splice(at, 1);
      fn();
    }, ms);
    PENDING_TIMERS.push(id);
    return id;
  }
  function cancelPending() {
    while (PENDING_TIMERS.length) clearTimeout(PENDING_TIMERS.pop());
  }

  /* 数据驱动路由器渲染单个页面（不重画侧栏）；未知路由直接忽略，由 renderContent 统一纠正 hash */
  function renderPageOnly(route) {
    var fn = VIEWS[route];
    if (!fn) return;
    var el = document.getElementById('content');
    el.innerHTML = fn();
    bindPage(route);
  }

  /* ---------------- 模态 ------------------ */
  /* 角色弹窗：菜单树勾选级联 + dataScope 联动部门多选显示 */
  function setMenuCheck(mask, key, on) {
    var cb = mask.querySelector('input[data-rmenu][value="' + key + '"]');
    if (cb) cb.checked = on;
  }
  function bindRoleModal(mask) {
    var scopeSel = mask.querySelector('[data-r-scope]');
    if (scopeSel) {
      scopeSel.addEventListener('change', function () {
        var f = mask.querySelector('[data-dept-field]');
        if (f) f.style.display = scopeSel.value === '2' ? '' : 'none';
      });
    }
    var menuChecks = mask.querySelectorAll('[data-rmenu]');
    for (var i = 0; i < menuChecks.length; i++) {
      menuChecks[i].addEventListener('change', function () {
        var key = this.value;
        if (this.checked) {
          menuAncestors(key).forEach(function (a) { setMenuCheck(mask, a, true); });
          menuDescendants(key).forEach(function (d) { setMenuCheck(mask, d, true); });
        } else {
          menuDescendants(key).forEach(function (d) { setMenuCheck(mask, d, false); });
        }
      });
    }
  }

  function modal(title, body, onSave) {
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = '<div class="modal"><div class="m-head"><h3>' + esc(title) + '</h3>' +
      '<button class="m-close" data-mclose>×</button></div>' + body + '</div>';
    document.body.appendChild(mask);
    initMultiSel(mask);
    bindSubNodeEditor();
    bindRoleModal(mask);
    var close = function () { mask.remove(); };
    var mclose = mask.querySelectorAll('[data-mclose]');
    for (var mi2 = 0; mi2 < mclose.length; mi2++) {
      mclose[mi2].addEventListener('click', close);
    }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    var fill = mask.querySelector('.fill');
    if (fill) fill.addEventListener('click', function () {
      if (typeof onSave === 'function') { onSave(mask); return; }
      toast('已保存（静态演示）', 'ok'); close();
    });
  }

  function modalLeaveForm() {
    var users = L.USERS.map(function (u) { return u.id; });
    return '<div class="form-grid">' +
      '<div class="field"><label>请假人</label><select data-lv-who>' + users.map(function (u) { return '<option' + (u === 'tammy' ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>代理人</label><select data-lv-deputy>' + users.map(function (u) { return '<option' + (u === 'f1' ? ' selected' : '') + '>' + esc(u) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>起（MM-DD）</label><input type="text" value="09-18" data-lv-from></div>' +
      '<div class="field"><label>止（MM-DD）</label><input type="text" value="09-19" data-lv-to></div>' +
      '<div class="field full"><label>原因</label><input type="text" value="事假" data-lv-reason></div>' +
      '<div class="field full"><label>委托范围</label><input type="text" value="Travel Sheet · 外观目检" data-lv-scope></div>' +
      '<div class="field full"><div class="hint">登记请假后，该节点的待办 / 通知将按「当前责任人 = 代理人」改派，审计保留实际执行人。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">登记并改派</button></div></div>';
  }

  function doLeaveAdd(mask) {
    var who = (mask.querySelector('[data-lv-who]') || {}).value;
    var deputy = (mask.querySelector('[data-lv-deputy]') || {}).value;
    var from = (mask.querySelector('[data-lv-from]') || {}).value;
    var to = (mask.querySelector('[data-lv-to]') || {}).value;
    var reason = (mask.querySelector('[data-lv-reason]') || {}).value || '请假';
    var scope = (mask.querySelector('[data-lv-scope]') || {}).value || '';
    L.LEAVES.push({ who: who, from: from, to: to, reason: reason, scope: scope, deputy: deputy, status: 'active' });
    toast(whoName(who) + ' 请假 → ' + whoName(deputy) + ' 代管：' + scope, 'ok');
    mask.remove();
    renderPageOnly('workflow-config');
  }

  /* 退回单填写（两段式第一程）：当前环节责任人发起，退回目标=已过往环节（可跨级） */
  function modalRejectForm(ts) {
    var opts = (TS_BACK[ts.status] || []).map(function (s) {
      return '<option value="' + s + '">' + esc(statusCN(s)) + '（' + esc(whoName(effId(statusOwner(s) || 'bole'))) + '）</option>';
    }).join('');
    return '<div class="form-grid">' +
      '<div class="field"><label>当前环节</label><input type="text" value="' + esc(statusCN(ts.status)) + '" disabled></div>' +
      '<div class="field"><label>退回目标（已过往环节）</label><select data-rj-to>' + (opts || '<option>暂无</option>') + '</select></div>' +
      '<div class="field full"><label>退回理由（必填）</label><input type="text" data-rj-reason placeholder="如：照片与勾选不一致，退回拍照重做"></div>' +
      '<div class="field full"><div class="hint">两段式：目标环节「当前责任人」确认接收后，机台才回到该环节重做；重做完成后提交将快速归还本环节复查（中间环节不重走）。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">发起退回</button></div></div>';
  }

  function modalScriptForm(id) {
    var s = id ? L.SCRIPTS.filter(function (x) { return x.id === id; })[0] : null;
    var name = s ? s.name : '';
    var owner = s ? s.owner : '';
    return '<div class="form-grid">' +
      fld('脚本名称', 'text', name || '新脚本名称') +
      fld('Owner', 'select', owner, L.USERS.map(function (u) { return u.id; })) +
      '<div class="field full"><label>环节</label><select><option>Report/Recon</option><option>Mini line</option><option>Cosmetic</option><option>Test Center</option><option>FA</option></select></div>' +
      '<div class="field full"><label>描述</label><textarea rows="2">用途 / 输入输出格式 / 依赖数据</textarea>' +
      '<div class="hint">含 sample 数据与回归测试模板（统一规范）</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存</button></div>' +
      '</div>';
  }

  function modalSchedForm(scriptId) {
    var s = scriptId ? scriptById(scriptId) : null;
    var scriptOpts = L.SCRIPTS.map(function (x) {
      return '<option value="' + x.id + '"' + (s && x.id === s.id ? ' selected' : '') + '>' + esc(x.id + ' · ' + x.name) + '</option>';
    }).join('');
    return '<div class="form-grid">' +
      '<div class="field"><label>任务名称</label><input type="text" data-sf-name value="' + esc(s ? s.name + '（定时）' : '如：每日 16:00 CT Tracker') + '"></div>' +
      '<div class="field"><label>系统</label><select data-sf-system>' + ['CTMS', 'iMES', 'Dashboard', '共享文件馆', 'NAS', 'Radar'].map(function (v) { return '<option' + (s && s.stage === v ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>排程（cron）</label><input type="text" data-sf-cron value="0 16 * * *">' +
      '<div class="hint">示例：0 16 * * * = 每天 16:00；运行模态内的简便排程会换算成 cron。</div></div>' +
      '<div class="field full"><label>绑定脚本（注册中心）</label><select data-sf-script>' + (scriptOpts || '<option>—</option>') + '</select></div>' +
      '<div class="field full"><label>失败通知</label><select><option>负责人（邮件 + Web）</option><option>仅邮件</option></select></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存</button></div></div>';
  }

  /* 所属部门下拉：按 ORGS 层级生成（有子节点的为分组 optgroup） */
  function orgLeafOptions(sel) {
    var selArr = Array.isArray(sel) ? sel : (sel ? [sel] : []);
    var on = function (id) { return selArr.indexOf(id) >= 0; };
    var out = [];
    (L.ORGS || []).forEach(function (n) {
      if (n.children && n.children.length) {
        out.push('<optgroup label="' + esc(n.name) + '">');
        n.children.forEach(function (c) {
          out.push('<option value="' + c.id + '"' + (on(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>');
        });
        out.push('</optgroup>');
      } else {
        out.push('<option value="' + n.id + '"' + (on(n.id) ? ' selected' : '') + '>' + esc(n.name) + '</option>');
      }
    });
    return out.join('');
  }
  /* 部门多选勾选（dataScope=自定义部门用，复选框 data-rdept） */
  function orgDeptChecks(sel) {
    var selArr = Array.isArray(sel) ? sel : (sel ? [sel] : []);
    var on = function (id) { return selArr.indexOf(id) >= 0; };
    var out = [];
    (L.ORGS || []).forEach(function (n) {
      if (n.children && n.children.length) {
        out.push('<div class="small faint" style="margin:6px 0 2px">' + esc(n.name) + '</div>');
        n.children.forEach(function (c) {
          out.push('<label class="chk"><input type="checkbox" data-rdept value="' + esc(c.id) + '"' + (on(c.id) ? ' checked' : '') + '>' + esc(c.name) + '</label>');
        });
      } else {
        out.push('<label class="chk"><input type="checkbox" data-rdept value="' + esc(n.id) + '"' + (on(n.id) ? ' checked' : '') + '>' + esc(n.name) + '</label>');
      }
    });
    return out.join('');
  }

  function modalMemberForm(uid) {
    var u = uid ? userById(uid) : null;
    var initRoles = u ? roleIdsOf(u) : ['cosmetic'];
    var initPosts = u ? (u.postIds || []) : ['cosmetic-inspector'];
    var roleChecks = Object.keys(ROLE_CN).map(function (r) {
      var on = initRoles.indexOf(r) >= 0;
      return '<label class="chk"><input type="checkbox" data-m-role value="' + r + '"' + (on ? ' checked' : '') + '>' + esc(ROLE_CN[r]) + '</label>';
    }).join('');
    var postChecks = (L.POSTS || []).map(function (p) {
      var on = initPosts.indexOf(p.code) >= 0;
      return '<label class="chk"><input type="checkbox" data-m-post value="' + esc(p.code) + '"' + (on ? ' checked' : '') + '>' + esc(p.name) + '</label>';
    }).join('');
    var statusOpts = ['active', 'disabled'].map(function (s) {
      return '<option value="' + s + '"' + ((u ? u.status : 'active') === s ? ' selected' : '') + '>' + (s === 'active' ? '在职' : '停用') + '</option>';
    }).join('');
    var scopePreview = initRoles.map(function (rid) {
      return ROLE_CN[rid] + '：' + roleScope(rid);
    }).join('\n');
    return '<div class="form-grid">' +
      '<div class="field"><label>成员姓名</label><input type="text" value="' + esc(u ? u.name : '') + '" placeholder="New Member" data-m-name></div>' +
      '<div class="field"><label>账号 ID</label><input type="text" value="' + esc(u ? u.id : '') + '" placeholder="如 tayler" data-m-id' + (u ? ' disabled' : '') + '></div>' +
      '<div class="field full"><label>角色（多选，权限取所有角色并集）</label><div class="chk-grid">' + roleChecks + '</div>' +
      '<div class="hint">决定侧边栏菜单 / 页面路由 ACL / 按钮权限</div></div>' +
      '<div class="field full"><label>岗位（多选）</label><div class="chk-grid">' + postChecks + '</div></div>' +
      '<div class="field"><label>所属部门</label><select data-m-org>' + orgLeafOptions(u ? u.orgId : 'cosmetic') + '</select></div>' +
      '<div class="field"><label>电话</label><input type="text" value="' + esc(u ? (u.phone || '') : '') + '" placeholder="手机 / 分机" data-m-phone></div>' +
      '<div class="field"><label>邮箱</label><input type="text" value="' + esc(u ? (u.email || '') : '') + '" placeholder="name@dqelab.com" data-m-email></div>' +
      '<div class="field"><label>状态</label><select data-m-status>' + statusOpts + '</select></div>' +
      '<div class="field"><label>可负责机型</label><input type="text" value="' + esc(u ? (u.badge || '—') : 'T0/TX') + '" data-m-badge></div>' +
      '<div class="field full"><label>权限范围（按所选角色自动推导，保存后刷新）</label>' +
      '<textarea rows="4" readonly data-m-scope>' + esc(scopePreview) + '</textarea></div>' +
      '<div class="field full"><div class="hint">' +
      (u ? '保存写入 L.USERS，侧边栏 / 工作台 / 登录卡片 / 权限校验即时同步。' : '新增写入 L.USERS，登录页自动出现该成员的身份卡片；权限范围 = 所选角色的菜单 + 按钮 + 数据权限 + 脚本工具。') +
      '</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">' + (u ? '保存成员' : '添加成员') + '</button></div></div>';
  }

  function doSchedSave(mask) {
    var name = (mask.querySelector('[data-sf-name]') || {}).value || '定时任务';
    var system = (mask.querySelector('[data-sf-system]') || {}).value || '—';
    var cron = (mask.querySelector('[data-sf-cron]') || {}).value || '0 16 * * *';
    var sentry = (mask.querySelector('[data-sf-script]') || {}).value || '—';
    var s = scriptById(sentry);
    var idx = L.SCHEDULE_TASKS.length + 1;
    var tid = 'T' + (idx < 10 ? '0' + idx : idx);
    var owner = state.userId === 'admin' ? ((s && s.owner) || 'bole') : state.userId;
    if (s) (s.scheduleIds = s.scheduleIds || []).push(tid);
    L.SCHEDULE_TASKS.push({ id: tid, name: name, system: system, cron: cron, owner: owner, tool: s ? (s.tool || '—') : '—', script: sentry, last: '—', next: '-', status: 'success', enable: true });
    mask.remove();
    toast('已创建定时任务 ' + tid + '：' + name + (s ? '（' + cron + ' 运行 ' + s.id + '）' : ''), 'ok');
    renderPageOnly(getRoute());
  }

  /* ---------------- 脚本运行 / 上传 / 代码编辑 / 参数 / 路径浏览 ---------------- */
  function openMask(title, body, onCommit) {
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = '<div class="modal"><div class="m-head"><h3>' + esc(title) + '</h3>' +
      '<button class="m-close" data-mclose>×</button></div>' + body + '</div>';
    document.body.appendChild(mask);
    initMultiSel(mask);
    var close = function () { mask.remove(); };
    mask.querySelector('[data-mclose]').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    var fill = mask.querySelector('.fill');
    if (fill && typeof onCommit === 'function') fill.addEventListener('click', function () { onCommit(mask); });
    return mask;
  }

  function modalScriptRun(s) {
    var params = (s.params && s.params.length) ? s.params
      : [{ key: 'input', label: '待处理文件地址', type: 'path', def: '/shared/' }, { key: 'output', label: '生成文件地址', type: 'path', def: '/shared/archive/' }];
    var fields = params.map(function (p) {
      var inner;
      if (p.type === 'select') {
        inner = '<select data-p="' + esc(p.key) + '">' + (p.opts || []).map(function (o) { return '<option' + (o === p.def ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      } else {
        inner = '<input type="text" value="' + esc(p.def) + '" data-p="' + esc(p.key) + '">';
      }
      var browse = p.type === 'path' ? '<button type="button" class="btn-browse" data-path-browse data-key="' + esc(p.key) + '">' + icon('folder') + '浏览</button>' : '';
      return '<div class="field full"><label>' + esc(p.label) + (p.type === 'path' ? '（待处理 / 生成文件地址）' : '') + '</label>' +
        '<div class="path-row">' + inner + browse + '</div>' +
        (p.type === 'path' ? '<div class="hint">点击「浏览」弹出系统文件窗口，直接选择电脑上的文件 / 目录（待处理选文件，生成选目录；浏览器安全限制只会记录文件 / 目录名）。</div>' : '') + '</div>';
    }).join('');
    var crons = ['每天 08:30', '每天 09:00', '每天 16:00', '每天 17:00', '每天 18:30', '每 10min', '每小时']
      .map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    return '<div class="form-grid">' +
      '<div class="field"><label>脚本</label><input type="text" value="' + esc(s.id + ' · ' + s.name) + '" disabled></div>' +
      '<div class="field"><label>当前版本</label><input type="text" value="' + esc(s.ver) + '" disabled></div>' +
      '<div class="field full"><label>运行方式</label><div class="seg" data-run-mode>' +
      '<span class="seg-on" data-mode="now">立即运行</span><span data-mode="sched">存为定时任务</span></div></div>' +
      '<div class="field full" data-form-area>' + fields + '</div>' +
      '<div class="field full" data-sched-area style="display:none">' +
      '<label>排程（简便选择）</label><select data-sched-cron>' + crons + '</select>' +
      '<div class="hint">保存后出现在「定时调度」与本脚本的「定时任务」卡，可随时停用。</div></div>' +
      '<div class="field full"><div class="hint">输出统一为 {status, data, diff_report, errors}；每次运行写入运行记录并留审计。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">运行脚本</button></div></div>';
  }

  function openScriptRun(id) {
    var s = scriptById(id);
    if (!s) return;
    if (!isScriptMine(s)) { toast('无权运行：' + s.id + ' 归属 ' + userName(s.owner), 'bad'); return; }
    if (s.status !== 'enabled') { toast(s.id + ' 为草稿 / 停用，发布后才可运行', 'bad'); return; }
    var mask = openMask('运行脚本 · ' + s.id, modalScriptRun(s));
    mask.addEventListener('click', function (e) {
      var seg = e.target.closest ? e.target.closest('[data-run-mode] > span') : null;
      if (seg) {
        var isSched = seg.getAttribute('data-mode') === 'sched';
        var spans = mask.querySelectorAll('[data-run-mode] > span');
        for (var si = 0; si < spans.length; si++) spans[si].classList.remove('seg-on');
        seg.classList.add('seg-on');
        mask.querySelector('[data-sched-area]').style.display = isSched ? '' : 'none';
        mask.querySelector('[data-form-area]').style.display = isSched ? 'none' : '';
        var fill = mask.querySelector('.fill');
        if (fill) fill.textContent = isSched ? '保存为定时任务' : '运行脚本';
      }
      var b = e.target.closest ? e.target.closest('[data-path-browse]') : null;
      if (b) {
        var key = b.getAttribute('data-key');
        openPathPick(function (path) {
          var inp = mask.querySelector('[data-p="' + key + '"]');
          if (inp) inp.value = path;
        }, key === 'output');
        return;
      }
      var fill2 = e.target.closest ? e.target.closest('.fill') : null;
      if (fill2 && mask.querySelector('[data-form-area]')) {
        var areaDisplay = mask.querySelector('[data-sched-area]').style.display;
        if (areaDisplay !== 'none') { doSaveSchedRun(mask, s); }
        else { doExecRun(mask, s); }
      }
    });
  }

  function doExecRun(mask, s) {
    var inputs = {};
    var pkeys = mask.querySelectorAll('[data-p]');
    for (var i = 0; i < pkeys.length; i++) inputs[pkeys[i].getAttribute('data-p')] = pkeys[i].value;
    var inputPath = inputs.input;
    var outPath = inputs.output;
    if (!inputPath || !outPath) { toast('请填写 待处理文件地址 与 生成文件地址', 'bad'); return; }
    var modalEl = mask.querySelector('.modal');
    modalEl.innerHTML = '<div class="m-head"><h3>运行中 · ' + esc(s.id + ' ' + s.name) + '</h3><button class="m-close" data-mclose>×</button></div>' +
      '<div class="console run-c" id="run-console"></div>' +
      '<div class="m-foot"><button class="btn btn-primary fill" data-done>完成</button></div>';
    mask.querySelector('[data-mclose]').addEventListener('click', function () { mask.remove(); renderPageOnly(getRoute()); });
    var c = mask.querySelector('#run-console');
    appLog(c, '$ ' + s.id + ' --input ' + inputPath, '');
    appLog(c, '> 读取标准输入：' + inputPath, 'in');
    appLog(c, '> 输出目标：' + outPath, 'in');
    setTimeout(function () {
      appLog(c, '> 执行中…（模拟 1.2s）', 'dim');
      setTimeout(function () {
        var ok = ((s.run + 1) % 9) !== 0;
        appLog(c, ok ? '> 完成：{status:"ok", data: N 台, diff_report: 0, errors: 0}' : '> 失败：{status:"fail", data: 0, diff_report: 0, errors: M}', ok ? 'ok' : 'bad');
        var run = {
          id: 'R-' + (L.SCRIPT_RUNS.length + 1), script: s.id, t: dateNow(), trigger: '手动运行',
          user: state.userId === 'admin' ? s.owner : state.userId,
          dur: (4 + Math.floor(Math.random() * 38)) + 's', result: ok ? 'ok' : 'fail',
          input: inputPath, output: outPath, note: '新增手动运行'
        };
        L.SCRIPT_RUNS.unshift(run);
        s.run++; s.lastRun = run.t;
        L.AGENT_LOG.push({ t: run.t, who: 'script', act: s.id + ' 手动运行：' + inputPath + ' → ' + outPath, res: ok ? 'ok' : 'bad' });
        toast('脚本 ' + s.id + ' 运行' + (ok ? '完成，已写入运行记录' : '失败，已告警'), ok ? 'ok' : 'bad');
      }, 700);
    }, 400);
    var done = mask.querySelector('[data-done]');
    if (done) done.addEventListener('click', function () { mask.remove(); renderPageOnly(getRoute()); });
  }

  function doSaveSchedRun(mask, s) {
    var cron = (mask.querySelector('[data-sched-cron]') || {}).value || '每天 08:30';
    var inputs = {};
    var pkeys = mask.querySelectorAll('[data-p]');
    for (var i = 0; i < pkeys.length; i++) inputs[pkeys[i].getAttribute('data-p')] = pkeys[i].value;
    var idx = L.SCHEDULE_TASKS.length + 1;
    var tid = 'T' + (idx < 10 ? '0' + idx : idx);
    var owner = state.userId === 'admin' ? s.owner : state.userId;
    (s.scheduleIds = s.scheduleIds || []).push(tid);
    L.SCHEDULE_TASKS.push({
      id: tid, name: s.name + '（定时）', system: s.stage, cron: cron, owner: owner,
      tool: s.tool || '—', script: s.id, last: '—', next: '-', status: 'success', enable: true,
      note: '运行参数：' + (inputs.input || '—') + ' → ' + (inputs.output || '—')
    });
    mask.remove();
    toast('已创建定时任务 ' + tid + '：' + cron + ' 运行 ' + s.id, 'ok');
    renderPageOnly(getRoute());
  }

  function modalUploadForm(s) {
    var presets = [s.file.name || (s.id + '.py'), s.id + '_' + s.ver.replace(/\./g, '_') + '.py'];
    return '<div class="form-grid">' +
      '<div class="field"><label>脚本</label><input type="text" value="' + esc(s.id + ' · ' + s.name) + '" disabled></div>' +
      '<div class="field"><label>当前版本</label><input type="text" value="' + esc(s.ver) + '" disabled></div>' +
      '<div class="field full"><label>选择文件（假文件树，静态演示）</label><select data-uv-name>' + presets.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>变更说明（必填，进入版本历史）</label><textarea rows="3" data-uv-note placeholder="如：修复字段映射 / 支持新报告版式"></textarea></div>' +
      '<div class="field full"><div class="hint">上传即自动生成新版本（' + esc(scriptVerNext(s.ver)) + '），旧版本保留在历史中可回滚；代码内容可在编辑器中另行修改并另存新版本。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">上传为新版本</button></div></div>';
  }

  function doUploadVer(mask, s) {
    var note = (mask.querySelector('[data-uv-note]') || {}).value || '';
    if (!note) { toast('请填写变更说明（会写入版本历史）', 'bad'); return; }
    var name = (mask.querySelector('[data-uv-name]') || {}).value || s.file.name || (s.id + '.py');
    var newVer = scriptVerNext(s.ver);
    var size = (Math.random() * 8 + 3).toFixed(1) + ' KB';
    (s.files = s.files || []).unshift({ ver: newVer, name: name, size: size, by: state.userId === 'admin' ? s.owner : state.userId, at: dateNow(), note: note });
    s.ver = newVer; s.file = { name: name, size: size };
    mask.remove();
    toast('已上传 ' + s.id + ' 新版本 ' + newVer + '（历史保留）', 'ok');
    renderPageOnly(getRoute());
  }

  function modalCodeEditor(s) {
    return '<div class="form-grid">' +
      '<div class="field"><label>脚本</label><input type="text" value="' + esc(s.id + ' · ' + s.name) + '" disabled></div>' +
      '<div class="field"><label>当前版本</label><input type="text" value="' + esc(s.ver) + '" disabled></div>' +
      '<div class="field full"><label>脚本内容（Python · 保存后自动升版本）</label>' +
      '<textarea class="code-area" rows="16" data-code-editor spellcheck="false">' + esc(s.code || '') + '</textarea></div>' +
      '<div class="field full"><label>本次变更说明（可选，写入版本历史）</label><input type="text" data-code-note placeholder="如：优化标蓝边界"></div>' +
      '<div class="field full"><div class="hint">保存生成新版本 ' + esc(scriptVerNext(s.ver)) + '，不覆盖历史；「语法检查」在详情页为演示模拟。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存为新版本</button></div></div>';
  }

  function doCodeSave(mask, s) {
    var code = (mask.querySelector('[data-code-editor]') || {}).value || '';
    if (!String(code).replace(/\s/g, '')) { toast('代码内容不能为空', 'bad'); return; }
    var note = (mask.querySelector('[data-code-note]') || {}).value || '代码编辑更新';
    var newVer = scriptVerNext(s.ver);
    (s.files = s.files || []).unshift({ ver: newVer, name: (s.file && s.file.name) || (s.id + '.py'), size: (s.file && s.file.size) || '—', by: state.userId === 'admin' ? s.owner : state.userId, at: dateNow(), note: note });
    s.ver = newVer; s.code = code;
    mask.remove();
    toast('已保存 ' + s.id + ' 新版本 ' + newVer, 'ok');
    renderPageOnly(getRoute());
  }

  function modalAddParam(s) {
    var typeOpts = [['path', '文件路径'], ['text', '文本'], ['date', '日期'], ['select', '下拉']]
      .map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('');
    return '<div class="form-grid">' +
      '<div class="field"><label>参数 key</label><input type="text" data-ap-key placeholder="如：sheet"></div>' +
      '<div class="field"><label>参数类型</label><select data-ap-type>' + typeOpts + '</select></div>' +
      '<div class="field full"><label>参数名称（中文）</label><input type="text" data-ap-label placeholder="如：处理工作表"></div>' +
      '<div class="field full"><label>默认值</label><input type="text" data-ap-def placeholder="如：Appearance"></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">添加参数</button></div></div>';
  }

  function doAddParam(mask, s) {
    var key = (mask.querySelector('[data-ap-key]') || {}).value || '';
    var label = (mask.querySelector('[data-ap-label]') || {}).value || '';
    if (!key) { toast('参数 key 不能为空', 'bad'); return; }
    var type = (mask.querySelector('[data-ap-type]') || {}).value || 'text';
    var def = (mask.querySelector('[data-ap-def]') || {}).value || '';
    (s.params = s.params || []).push({ key: key, label: label || key, type: type, def: def, opts: type === 'select' ? ['模式 A', '模式 B'] : undefined });
    mask.remove();
    toast('已添加参数 ' + key + '，运行模态将按此生成表单', 'ok');
    renderPageOnly(getRoute());
  }

  function openPathPick(onPick, dir) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.style.display = 'none';
    if (dir) { inp.setAttribute('webkitdirectory', ''); inp.setAttribute('directory', ''); }
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (f) {
        var rel = f.webkitRelativePath || f.name;
        onPick(dir ? (rel.split('/').slice(0, -1).join('/') || rel) : rel);
      }
      if (inp.parentNode) inp.parentNode.removeChild(inp);
    });
    inp.click();
  }

  function saveMemberForm(mask, uid) {
    var q = function (sel) { return (mask.querySelector(sel) || {}).value; };
    var name = String(q('[data-m-name]') || '').trim();
    var id = String(q('[data-m-id]') || '').trim();
    var orgId = q('[data-m-org]') || 'cosmetic';
    var dept = (findOrg(orgId) || {}).name || orgId;
    var checkedVals = function (sel) {
      var out = [];
      var els = mask.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) if (els[i].checked) out.push(els[i].value);
      return out;
    };
    var roleIds = checkedVals('[data-m-role]');
    var postIds = checkedVals('[data-m-post]');
    var badge = String(q('[data-m-badge]') || '').trim() || '—';
    var phone = String(q('[data-m-phone]') || '').trim() || '—';
    var email = String(q('[data-m-email]') || '').trim() || '—';
    var status = q('[data-m-status]') || 'active';
    if (!name) { toast('请输入成员姓名', 'bad'); return; }
    if (!roleIds.length) { toast('请至少选择一个角色', 'bad'); return; }
    if (uid) {
      var u = userById(uid);
      u.name = name; u.roleIds = roleIds; u.postIds = postIds; u.dept = dept; u.orgId = orgId; u.badge = badge;
      u.phone = phone; u.email = email; u.status = status;
      toast('已更新 ' + name + '：角色 ' + roleIds.map(function (r) { return ROLE_CN[r]; }).join('/') + '，权限范围已刷新', 'ok');
    } else {
      if (!id) { toast('请输入账号 ID', 'bad'); return; }
      if (L.USERS.some(function (x) { return x.id === id; })) { toast('账号 ' + id + ' 已存在', 'bad'); return; }
      L.USERS.push({ id: id, name: name, roleIds: roleIds, postIds: postIds, dept: dept, orgId: orgId, badge: badge, phone: phone, email: email, status: status });
      toast('已添加成员 ' + name + '（' + id + ' · ' + roleIds.map(function (r) { return ROLE_CN[r]; }).join('/') + '）', 'ok');
    }
    mask.remove();
    renderPageOnly('admin-users');
  }

  /* ---------------- 电子表单模板：纸表式表单设计器 ----------------
     设计思路（方案①流式网格纸表）：像日常纸质表单一样，每个字段是一个「格子框」。
       画布 = 12 列流体网格：
         w = 占用列数（1~12）→ 决定方框宽度（宽窄各不相同）
         h = 行高倍数（1~3x） → 决定方框高度（勾选小格 / 备注·签名大方框）
       格子按顺序从左往右排，超出 12 列自动换行；同一行高度取最高格，边框连成纸面。
       类型决定框内控件：文本 / 数字 / 日期 / 下拉（可自定义 key=value）/ 勾选 / 文本域 / 签名 / 文件·图片·压缩包上传。
       ↑↓ 调整次序 → 预览实时重排出「纸表版式」。 */
  var FORM_TYPE_OPTS = ['文本', '数字', '日期', '下拉', '多选下拉', '勾选', '文本域', '签名', '文件上传', '图片上传', '压缩包上传'];

  function formVerNext(v) {
    var m = /v(\d+)\.(\d+)\.(\d+)/.exec(v || 'v1.0.0');
    if (!m) return 'v1.1.0';
    return 'v' + m[1] + '.' + (parseInt(m[2], 10) + 1) + '.' + m[3];
  }

  /* 下拉选项列：把 key=value 行文本转为 [{key,value}] */
  function optsLines(f) {
    return (f.options || []).map(function (o) { return o.key + '=' + o.value; }).join('\n');
  }
  function parseOpts(s) {
    return String(s || '').split('\n').map(function (l) {
      l = String(l).trim();
      if (!l) return null;
      var i = l.indexOf('=');
      return { key: i >= 0 ? l.slice(0, i).trim() : l, value: i >= 0 ? l.slice(i + 1).trim() : l };
    }).filter(Boolean);
  }

  /* 下拉 / 多选下拉栏位的「引用字典」选择框：数据来自集中字典 DICTS（一处修改多处生效） */
  function dictSelHtml(dictId) {
    return '<select class="cfg-sel" data-f-dict>' + (L.DICTS || []).map(function (d) {
      return '<option value="' + d.id + '"' + (d.id === dictId ? ' selected' : '') + '>' + esc(d.name) + '</option>';
    }).join('') + '</select>';
  }

  /* 配置行：次序 / 名称 / 类型 / 选项 / 占用列 / 行高 / 必填 / 删除 */
  function fieldRowHtml(f, i) {
    f = f || {};
    var wOpts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return '<tr>' +
      '<td class="fd-mv"><button type="button" class="btn btn-xs btn-ghost" data-f-up title="上移">↑</button>' +
      '<button type="button" class="btn btn-xs btn-ghost" data-f-down title="下移">↓</button></td>' +
      '<td class="faint">' + (i + 1) + '</td>' +
      '<td><input class="cfg-in" type="text" value="' + esc(f.label || '') + '" data-f-label></td>' +
      '<td><select class="cfg-sel" data-f-type>' + FORM_TYPE_OPTS.map(function (t) { return '<option' + (t === f.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></td>' +
      '<td class="fd-opts">' + (f.type === '下拉' || f.type === '多选下拉' ? dictSelHtml(f.dict) : '<span class="faint small">' + (f.type === '文件上传' || f.type === '图片上传' || f.type === '压缩包上传' ? '附件槽：纸表预览留上传位' : '—') + '</span>') + '</td>' +
      '<td><select class="cfg-sel" data-f-w>' + wOpts.map(function (n) { return '<option value="' + n + '"' + (+f.w === n ? ' selected' : '') + '>' + n + '列</option>'; }).join('') + '</select></td>' +
      '<td><select class="cfg-sel" data-f-h>' + [1, 2, 3].map(function (n) { return '<option value="' + n + '"' + (+f.h === n ? ' selected' : '') + '>' + n + 'x</option>'; }).join('') + '</select></td>' +
      '<td class="fd-req"><input type="checkbox" data-f-req' + (f.required ? ' checked' : '') + '></td>' +
      '<td><button type="button" class="btn btn-xs btn-ghost" data-f-del>删除</button></td></tr>';
  }

  /* 12 列流体纸表：把字段排布进行（每行累计 ≤12 列，超出换行） */
  function fdGroupRows(fields) {
    var rows = [], cur = [], col = 0;
    fields.forEach(function (f) {
      var w = Math.max(1, Math.min(12, +f.w || 2));
      if (col > 0 && col + w > 12) { rows.push(cur); cur = []; col = 0; }
      cur.push({ f: f, w: w });
      col += w;
    });
    if (cur.length) rows.push(cur);
    return rows;
  }

  /* ---------------- 机台基础信息区（表头） ----------------
     字段来源 L.MACHINE_BASIC（SSOT），值由台账自动带出（禁手工）。
     同时服务两处：① 表单设计器纸表版式表头（占位「自动带出」）② Travel Sheet 机台信息卡（真实值）。 */
  function dateOnly() {
    var d = new Date();
    function two(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  }
  function machineBasicValue(ts, key) {
    switch (key) {
      case 'sn':      return (ts && ts.sn) || '—';
      case 'model':   return (ts && ts.model) || '—';
      case 'phase':   return (ts && ts.phase) || '—';
      case 'stage':   return (ts && ts.stage) || '—';
      case 'station': return ((ts && ts.station) ? ts.station + ' / ' : '') + statusCN(ts && ts.status);
      case 'shift':   return (L.MINI_BATCH && L.MINI_BATCH.shift) || '—';
      case 'date':    return (L.MINI_BATCH && L.MINI_BATCH.date) || dateOnly();
      default:        return '—';
    }
  }
  function basicItemsFor(ts) {
    return (L.MACHINE_BASIC || []).map(function (f) {
      return { label: f.label, value: ts ? machineBasicValue(ts, f.key) : '自动带出' };
    });
  }
  function basicHeaderHtml(items, tag) {
    return '<div class="fp-basic"><span class="fp-basic-tag">' + icon('doc') + ' 机台基础信息 · ' + esc(tag || '台账带出') + '</span>' +
      items.map(function (it) {
        return '<span class="fp-basic-it" title="' + esc(it.label + '：' + it.value) + '"><i>' + esc(it.label) + '</i><b>' + esc(it.value) + '</b></span>';
      }).join('') + '</div>';
  }

  /* 框内控件：不同类型 = 不同方框内容 */
  function fdWidgetHtml(type, h, f) {
    f = f || {};
    if (type === '勾选') {
      return '<div class="fp-checks">' + [1, 2, 3].map(function (t) { return '<span class="fp-chip">⌷ ' + t + '</span>'; }).join('') + '</div>';
    }
    if (type === '签名') return '<div class="fp-sign">签名区</div>';
    if (type === '文本域') return '<div class="fp-area">多行填写…</div>';
    if (type === '下拉') {
      var opts = dictOpts(f.dict || 'fx_issue');
      return '<div class="fp-widget">' + (opts.length ? '▼ ' + opts.map(function (o) { return o.label; }).join(' / ') : '▼ 请选择') + '</div>';
    }
    if (type === '多选下拉') {
      var ms = dictOpts(f.dict || 'fx_issue');
      return '<div class="fp-checks">' + ms.map(function (o) { return '<span class="fp-chip">⌷ ' + esc(o.label) + '</span>'; }).join('') + '</div>';
    }
    if (type === '文件上传') return '<div class="fp-upload">+' + icon('file') + ' 文件上传</div>';
    if (type === '图片上传') return '<div class="fp-upload">+' + icon('file') + ' 图片上传</div>';
    if (type === '压缩包上传') return '<div class="fp-upload">+' + icon('file') + ' 压缩包上传</div>';
    var ph = { '文本': '填写', '数字': '123', '日期': 'YYYY-MM-DD' }[type] || '填写';
    return '<div class="fp-widget">' + ph + '</div>';
  }

  function fdPreviewHtml(fields, title, ext, header) {
    var rows = fdGroupRows(fields || []);
    var head = header ? basicHeaderHtml(basicItemsFor(null), '台账带出 · 禁手工') : '';
    if (!rows.length && !head) return '<div class="faint small">尚未定义格子，添加字段后此处实时生成纸表版式。</div>';
    var body = rows.map(function (r) {
      var used = r.reduce(function (s, c) { return s + c.w; }, 0);
      var cells = r.map(function (c) {
        var h = Math.max(1, +c.f.h || 1);
        var req = c.f.required ? '<i class="fp-req">*</i>' : '';
        return '<div class="fp-cell" style="flex:0 0 ' + Math.round(c.w / 12 * 100) + '%;min-height:' + (44 * h) + 'px">' +
          '<div class="fp-label">' + esc(c.f.label || '') + ' ' + req + '</div>' +
          fdWidgetHtml(c.f.type, h, c.f) +
          '</div>';
      }).join('');
      return '<div class="fp-row">' + cells +
        (used < 12 ? '<div class="fp-empty" style="flex:1"></div>' : '') + '</div>';
    }).join('');
    return '<div class="form-paper"><div class="fp-head"><div class="fp-title">' + esc(title || '电子表单') + '</div>' +
      '<div class="fp-meta">' + esc(ext || '') + '</div></div>' +
      (head ? '<div class="fp-basic-wrap">' + head + '</div>' : '') + body + '</div>';
  }

  function readFdRows(mask) {
    var out = [];
    var rows = mask.querySelectorAll('[data-f-body] tr');
    rows.forEach(function (tr) {
      var label = (tr.querySelector('[data-f-label]') || {}).value || '';
      if (!String(label).trim()) return;
      var type = (tr.querySelector('[data-f-type]') || {}).value || '文本';
      var row = {
        label: String(label).trim(),
        type: type,
        w: +(tr.querySelector('[data-f-w]') || {}).value || 2,
        h: +(tr.querySelector('[data-f-h]') || {}).value || 1,
        required: !!((tr.querySelector('[data-f-req]') || {}).checked)
      };
      if (type === '下拉' || type === '多选下拉') {
        row.dict = (tr.querySelector('[data-f-dict]') || {}).value || 'fx_issue';
      }
      out.push(row);
    });
    return out;
  }

  function modalFormConfig(key, tpl) {
    var fields = tpl ? (tpl.fields || []) : (key === 'travel_sheet' ? [
      { label: 'SN', type: '文本', w: 4, h: 1 }, { label: '日期', type: '日期', w: 4, h: 1 },
      { label: '各部位外观', type: '勾选', w: 6, h: 1 }, { label: '电子签名', type: '签名', w: 6, h: 2 }
    ] : []);
    return '<div class="form-grid">' +
      '<div class="field"><label>模板 Key</label><input type="text" value="' + esc(tpl ? tpl.key : (key || 'custom_form')) + '" data-form-key></div>' +
      '<div class="field"><label>模板名称</label><input type="text" value="' + esc(tpl ? tpl.name : '新表单模板') + '" data-form-name></div>' +
      '<div class="field"><label>适用阶段</label><input type="text" value="' + esc(tpl ? tpl.stage : 'T0') + '" data-form-stage></div>' +
      '<div class="field"><label>版本</label><input type="text" value="' + (tpl ? esc(tpl.version) + ' → 保存升 ' + esc(formVerNext(tpl.version)) : 'v0.1.0（新建）') + '" disabled></div>' +
      '<div class="field full"><label>机台基础信息区（表头）</label>' +
      '<div class="hint" style="margin-top:6px;display:flex;align-items:center;gap:8px">' +
      '<input type="checkbox" data-form-header' + (tpl ? (tpl.header ? ' checked' : '') : ' checked') + ' style="width:auto;flex:none">' +
      '<span>表头带出机台基础信息（' + (L.MACHINE_BASIC || []).map(function (f) { return f.label; }).join(' / ') + '），由台账自动带出、禁手工输入</span></div></div>' +
      '<div class="field full"><label>字段格子（像纸质表单：每个格子自成方框，宽高都可自定义；↑↓ 调整次序）</label>' +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>次序</th><th>#</th><th>字段名</th><th>类型</th><th>引用字典（下拉/多选下拉）</th><th>宽度(列)</th><th>行高</th><th>必填</th><th></th></tr></thead>' +
      '<tbody data-f-body>' + fields.map(function (f, i) { return fieldRowHtml(f, i); }).join('') + '</tbody></table></div>' +
      '<div class="hint"><button type="button" class="btn btn-xs" data-f-add>' + icon('plus') + '添加字段</button>　·　勾选=方格、文本域/签名=大方框、文件/图片/压缩包上传=纸表附件槽；「下拉 / 多选下拉」在选项列选引用字典（数据来自「字典中心」，一处修改多处生效）；每行排满 12 列自动换行</div></div>' +
      '<div class="field full"><label>表单预览（纸表版式 · 实时刷新）</label>' +
      '<div data-fd-preview>加载中…</div></div>' +
      '<div class="m-foot full"><button class="btn btn-ghost" data-mclose>取消</button><button class="btn btn-primary fill">保存结构</button></div></div>';
  }

  function renderFdPreview(mask) {
    var box = mask.querySelector('[data-fd-preview]');
    if (!box) return;
    var nameV = (mask.querySelector('[data-form-name]') || {}).value || '电子表单';
    var keyV = (mask.querySelector('[data-form-key]') || {}).value || '';
    var stageV = (mask.querySelector('[data-form-stage]') || {}).value || '';
    var headerOn = !!((mask.querySelector('[data-form-header]') || {}).checked);
    box.innerHTML = fdPreviewHtml(readFdRows(mask), nameV, keyV + ' · ' + stageV, headerOn);
  }

  function reRenderFdBody(mask) {
    var fields = readFdRows(mask);
    var tb = mask.querySelector('[data-f-body]');
    if (!tb) return;
    tb.innerHTML = fields.map(function (f, i) { return fieldRowHtml(f, i); }).join('') ||
      '<tr><td colspan="9" class="faint">尚未定义字段，点「添加字段」新建格子</td></tr>';
    renderFdPreview(mask);
  }

  /* 打开纸表式表单设计器 */
  function openFormBuilder(key) {
    var tpl = key ? (L.FORM_TEMPLATES.filter(function (t) { return t.key === key; })[0] || null) : null;
    modal(tpl ? '编辑表单模板 · ' + tpl.name : '新建表单模板', modalFormConfig(key, tpl), function (mask) {
      var keyV = (mask.querySelector('[data-form-key]') || {}).value || (tpl ? tpl.key : 'custom_form');
      var nameV = (mask.querySelector('[data-form-name]') || {}).value || '新表单模板';
      var stageV = (mask.querySelector('[data-form-stage]') || {}).value || 'T0';
      var headerOn = !!((mask.querySelector('[data-form-header]') || {}).checked);
      var fields = readFdRows(mask);
      if (!fields.length) { toast('至少保留一个字段格子', 'bad'); return; }
      if (tpl) {
        tpl.name = nameV; tpl.stage = stageV; tpl.fields = fields; tpl.header = headerOn;
        tpl.version = formVerNext(tpl.version);
      } else {
        tpl = { key: keyV, name: nameV, stage: stageV, fields: fields, header: headerOn, nodes: 1, owner: [currentUser().id], version: 'v0.1.0', status: 'active' };
        L.FORM_TEMPLATES.push(tpl);
      }
      L.AGENT_LOG.push({ t: dateNow(), who: currentUser().id, act: '更新表单模板 ' + keyV + '：' + fields.length + ' 个字段格子' + (headerOn ? ' + 机台基础信息表头' : '') + ' → 版本 ' + tpl.version, res: 'info' });
      mask.remove();
      toast('模板 ' + keyV + ' 已保存：纸表结构已更新（' + tpl.version + '）', 'ok');
      renderPageOnly(getRoute());
    });
    var maskEl = document.querySelector('.modal-mask');
    if (!maskEl) return;
    var mmWide = maskEl.querySelector('.modal');
    if (mmWide) mmWide.classList.add('wide');
    var tab = maskEl.querySelector('[data-f-body]');
    if (tab) tab.addEventListener('click', function (e) {
      var tr = e.target && e.target.closest ? e.target.closest('tr') : null;
      if (!tr || !tab.contains(tr)) return;
      if (e.target.closest('[data-f-del]')) {
        tab.removeChild(tr); reRenderFdBody(maskEl); return;
      }
      var up = e.target.closest('[data-f-up]');
      var dn = e.target.closest('[data-f-down]');
      if (up || dn) {
        var all = Array.prototype.slice.call(tab.children);
        var idx = all.indexOf(tr);
        var to = up ? idx - 1 : idx + 1;
        tab.removeChild(tr);
        if (up && idx > 0) tab.insertBefore(tr, all[idx - 1]);
        else if (dn && idx >= 0 && idx < all.length - 1) tab.insertBefore(tr, all[idx + 1]);
        else tab.appendChild(tr);
        reRenderFdBody(maskEl);
      }
    });
    var addBtn = maskEl.querySelector('[data-f-add]');
    if (addBtn) addBtn.addEventListener('click', function () {
      if (!tab) return;
      var nb = document.createElement('tr');
      nb.innerHTML = fieldRowHtml({ label: '新字段', type: '文本', w: 3, h: 1 }, tab.children.length);
      tab.appendChild(nb);
      renderFdPreview(maskEl);
    });
    if (tab) {
      tab.addEventListener('input', function () { renderFdPreview(maskEl); });
      tab.addEventListener('change', function (e) {
        if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-f-type')) reRenderFdBody(maskEl);
        else renderFdPreview(maskEl);
      });
    }
    maskEl.querySelectorAll('[data-form-name],[data-form-key],[data-form-stage]').forEach(function (el) {
      el.addEventListener('input', function () { renderFdPreview(maskEl); });
    });
    var hdrChk = maskEl.querySelector('[data-form-header]');
    if (hdrChk) hdrChk.addEventListener('change', function () { renderFdPreview(maskEl); });
    renderFdPreview(maskEl);
  }

  /* 模板纸表预览：只读查看已保存版式 */
  function openFormPreview(key) {
    var tpl = L.FORM_TEMPLATES.filter(function (t) { return t.key === key; })[0];
    if (!tpl) return;
    var rows = fdGroupRows(tpl.fields || []);
    var statusTxt = (tpl.status === 'active' ? '启用' : '草稿');
    modal(tpl.name + ' · 纸表预览',
      '<div class="form-grid">' +
      '<div class="field"><label>模板 Key</label><input type="text" value="' + esc(tpl.key) + '" disabled></div>' +
      '<div class="field"><label>版本 · 状态</label><input type="text" value="' + esc(tpl.version) + ' · ' + statusTxt + '" disabled></div>' +
      '<div class="field"><label>适用阶段</label><input type="text" value="' + esc(tpl.stage) + '" disabled></div>' +
      '<div class="field"><label>格子 / 行</label><input type="text" value="' + tpl.fields.length + ' 格 · ' + rows.length + ' 行' + '" disabled></div>' +
      '<div class="field full"><label>纸表版式（由字段格子派生，只读）</label>' +
      '<div>' + (tpl.fields.length ? fdPreviewHtml(tpl.fields, tpl.name, tpl.key + ' · ' + tpl.version, tpl.header) : '<div class="faint small">该模板尚未配置字段，请先「配置字段」。</div>') + '</div></div>' +
      '<div class="field full"><div class="hint">要调整版式（宽 / 高 / 类型 / 次序），关闭后进入「配置字段」编辑，保存自动升版本。</div></div>' +
      '<div class="m-foot full"><button class="btn btn-primary fill">关闭</button></div></div>',
      function (mask) { mask.remove(); });
  }

  function fld(label, type, val, options) {
    var inner;
    if (type === 'select') {
      inner = '<select>' + (options || []).map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    } else {
      inner = '<input type="' + type + '" value="' + esc(val) + '">';
    }
    var full = label === '全部' ? ' full' : '';
    return '<div class="field' + full + '"><label>' + esc(label) + '</label>' + inner + '</div>';
  }

  /* ---------------- toast ---------------- */
  function toast(text, type) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.innerHTML = '<div class="t-title">' + esc(text) + '</div>';
    box.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(function () { t.remove(); }, 420); }, 2600);
  }

  function appLog(el, line, cls) {
    el.insertAdjacentHTML('beforeend', '<div class="ln ' + (cls || '') + '">' + esc(line) + '</div>');
  }

  /* ---------------- 身份切换（数据与页面切换核心） ---------------- */
  function setRole(value) {
    var isAdmin = value === 'admin';
    state.mode = isAdmin ? 'admin' : 'user';
    if (!isAdmin) state.userId = value;
    L.SESSION.mode = state.mode; L.SESSION.userId = state.userId;
    saveSession();
    renderTopbar();
    renderSidebar();
    go(isAdmin ? 'admin-dashboard' : 'dashboard');
  }

  /* ---------------- 时间 ---------------- */
  function dateNow() {
    var d = new Date();
    function two(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
  }

  /* ---------------- Lab Agent 全局问诊（只读答询抽屉） ---------------- */
  /* Agent 不替人签名/批复/写客户系统；每次答询引用数据源并写入审计 */
  function effOwnerName(id) {
    var o = nodeOwner({ owner: id });
    return whoName(o.id) + (o.leave ? '（代 ' + whoName(id) + '：' + o.leave.reason + '）' : '');
  }

  function agentAnswer(q) {
    var up = String(q).toUpperCase();
    var low = String(q).toLowerCase();
    var snM = up.match(/MTL\d{5}/);
    var ctM = up.match(/CT-\d+-\d+/);
    var help = function () { return { text: '问：① 机台卡点（MTL00009 怎么回事）② 当前责任人（谁处理 CT-0920-02）③ 根因（S03 为什么跳过）④ 请假委托（谁请假）⑤ 当天运行（今天跑了什么）', src: '问诊范围：台账 / 告警 / 处置单 / 时间线 / 排程' }; };

    /* ① 机台/单据号 → 台账 + 处置单 + 告警 + 时间线 */
    if (snM) {
      var sn = snM[0];
      var ts = L.TRAVEL_SHEETS.filter(function (x) { return x.sn === sn; })[0];
      var ag = L.AGENT_CASES.filter(function (x) { return x.target.indexOf(sn) >= 0; })[0];
      var al = L.ALERTS.filter(function (x) { return x.text.indexOf(sn) >= 0; })[0];
      var evs = L.UNIT_EVENTS.filter(function (x) { return x.sn === sn; });
      if (ts || ag || al) {
        var lines = [];
        if (ts && ts.stage) {
          lines.push(ts.sn + ' · ' + ts.stage + '/' + ts.status + ' · 工站 ' + ts.station);
          var tl = ts.timeline || [];
          if (tl.length) { var last = tl[tl.length - 1]; lines.push('最近环节：' + last.t + ' ' + whoName(last.who) + ' 完成「' + last.node + '」'); }
        }
        if (al) lines.push('告警 ' + al.id + '：' + al.text);
        if (ag) lines.push('处置单 ' + ag.id + '（' + ag.status + '）：' + ag.cause + '｜' + ag.act + '；当前责任人 ' + effOwnerName(ag.owner));
        if (evs.length) { var e = evs[evs.length - 1]; lines.push('最后事件：' + e.at + ' [' + e.sys + '] ' + e.ev + ' — ' + e.detail); }
        if (ag && /谁|处理|负责|跟催|owner/i.test(q)) lines.unshift('当前责任人：' + effOwnerName(ag.owner));
        return { text: lines.join('\n'), src: 'TRAVEL_SHEETS / ALERTS / AGENT_CASES / UNIT_EVENTS' };
      }
      return { text: '未在台账 / 告警 / 处置单中找到 ' + sn + '。', src: 'TRAVEL_SHEETS / ALERTS / AGENT_CASES' };
    }

    /* ② CT 单据 */
    if (ctM) {
      var ct = L.CTMS_APPLICATIONS.filter(function (x) { return x.id === ctM[0]; })[0];
      if (ct) return { text: ct.id + '：' + ct.subject + ' · 站点 ' + ct.site + ' · 状态 ' + ct.status + ' · 当前 ' + effOwnerName(ct.assignee) + (ct.note ? '｜' + ct.note : ''), src: 'CTMS_APPLICATIONS' };
      var ctl = L.ALERTS.filter(function (x) { return x.text.indexOf(ctM[0]) >= 0; })[0];
      var ctg = L.AGENT_CASES.filter(function (x) { return x.target.indexOf(ctM[0]) >= 0; })[0];
      if (ctl || ctg) {
        var o = ctg ? ctg.owner : ctl.owner;
        return { text: (ctl ? '告警 ' + ctl.id + '：' + ctl.text : '') + (ctg ? '\n处置单 ' + ctg.id + '：' + ctg.cause + '｜' + ctg.act : '') + '\n当前责任人：' + effOwnerName(o), src: 'ALERTS / AGENT_CASES（CTMS 台账未收录该单，属跨源提示）' };
      }
      return { text: ctM[0] + ' 未找到。', src: 'CTMS_APPLICATIONS / ALERTS' };
    }

    /* ③ 谁在处理 / 当前责任人 */
    if (/谁|处理|负责|owner|跟催|owner|assignee/i.test(q)) {
      var hits = [];
      L.AGENT_CASES.filter(function (c) { return c.status !== 'done'; }).forEach(function (c) { hits.push(c.id + ' ' + c.target.slice(0, 18) + ' → ' + effOwnerName(c.owner)); });
      var pend = L.WF_APPROVALS.filter(function (w) { return w.status === 'pending'; });
      pend.forEach(function (w) { hits.push('WF ' + w.wf + ' ' + w.desc.slice(0, 16) + ' → ' + effOwnerName(w.owner)); });
      if (hits.length) return { text: hits.join('\n'), src: 'AGENT_CASES / WF_APPROVALS（负责人已按委托改派路由）' };
      return { text: '当前无待处理事项。', src: 'AGENT_CASES / WF_APPROVALS' };
    }

    /* ④ 根因 */
    if (/为什么|原因|根因|为何|cause|why/i.test(q)) {
      var causes = L.AGENT_CASES.filter(function (c) { return c.status !== 'done'; }).map(function (c) { return c.id + ' ' + c.target.slice(0, 16) + '：' + c.cause; });
      return { text: causes.length ? '根因诊断：\n' + causes.join('\n') : '当前无卡点，根因均为空。', src: 'AGENT_CASES（Agent 只读诊断，非结论）' };
    }

    /* ⑤ 请假 / 委托 */
    if (/请假|委托|代理|改派|leave/i.test(q)) {
      var acts = L.LEAVES.filter(function (l) { return l.status === 'active'; });
      var rows2 = L.LEAVES.map(function (l) { return whoName(l.who) + ' ' + l.from + '~' + l.to + (l.status === 'active' ? ' → 委托 ' + whoName(l.deputy) : '（' + (l.status === 'ended' ? '已销假' : '待开始') + '）'); });
      return { text: '请假与委托：\n' + rows2.join('\n') + (acts.length ? '\n当前生效：' + acts.map(function (a) { return whoName(a.who) + '→' + whoName(a.deputy); }).join('、') + '（待办已按代理人路由）' : ''), src: 'LEAVES' };
    }

    /* ⑥ 当天运行 / 日志 */
    if (/今天|运行|日志|跑了|调度|run|跑/i.test(q)) {
      var fails = L.TOOL_RUNS.filter(function (r) { return r.status === 'fail'; });
      var ok1 = L.TOOL_RUNS.filter(function (r) { return r.status === 'ok'; });
      return { text: '今日运行：SFC 核对 ' + ok1.length + ' 次成功；失败 ' + fails.length + ' 项 → ' + fails.map(function (f) { return f.tool + '：' + f.out; }).join('；'), src: 'TOOL_RUNS / SCHEDULE_TASKS' };
    }

    /* ⑦ 巡检 / 概览 */
    if (/巡检|概览|卡点|scan|summary/i.test(q)) {
      var w = L.AGENT_CASES.filter(function (c) { return c.status === 'watch'; });
      return { text: w.length ? '监测中：' + w.map(function (c) { return c.id + ' ' + c.target.slice(0, 16); }).join('、') + '。Agent 动作 = 只读/跟催，写操作待人工确认。' : '未发现卡点。', src: 'AGENT_CASES' };
    }

    return help();
  }

  /* 问诊抽屉：消息流 / 输入 / 快捷问题（写入审计） */
  function appendAdMsg(kind, html) {
    var body = document.getElementById('ad-body');
    if (!body) return;
    var d = document.createElement('div');
    d.className = 'ad-msg ' + kind;
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  function agentChat(q) {
    q = String(q || '').trim();
    if (!q) return;
    appendAdMsg('user', esc(q));
    L.AGENT_LOG.push({ t: dateNow(), who: agentName(), act: '问诊：' + q.slice(0, 30), res: 'info' });
    var ans = agentAnswer(q);
    setTimeout(function () {
      appendAdMsg('agent', esc(ans.text) + '<span class="src">数据源：' + esc(ans.src) + '</span>');
    }, 260);
  }

  function agentName() { return currentUser().name; }

  /* 问诊抽屉（FAB 悬浮入口 + 右侧抽屉）：Agent 聊天，只读答询 */
  function agentDrawerHtml() {
    return '<button class="agent-fab" data-agent-fab title="Lab Agent 问诊">' + icon('bot') + '<span class="pulse-dot"></span></button>' +
      '<div class="agent-drawer" id="agent-drawer">' +
      '<div class="ad-head"><div class="ad-title">' + icon('bot') + ' Lab Agent 问诊</div>' +
      '<button class="ad-close" data-agent-close title="关闭">×</button></div>' +
      '<div class="ad-body" id="ad-body">' +
      '<div class="ad-msg agent">你好，我是 Lab Agent。只读答询：① 机台卡点 ② 当前责任人 ③ 根因 ④ 请假委托 ⑤ 今日运行。我不替你签名 / 批复 / 写客户系统，每次答询引用数据源并写入审计。</div>' +
      '</div>' +
      '<div class="ad-sugs">' +
      '<button data-ad-q>MTL00009 怎么回事</button>' +
      '<button data-ad-q>谁在处理 CT-0920-02</button>' +
      '<button data-ad-q>谁请假了</button>' +
      '<button data-ad-q>今天跑了什么</button>' +
      '</div>' +
      '<div class="ad-foot"><input type="text" id="ad-input" placeholder="问机台 / 单据 / 责任人 / 根因…"><button class="btn btn-primary" data-agent-send>发送</button></div>' +
      '<div class="ad-ask">' + icon('lock') + ' 只读 · 引用数据源 · 写审计</div>' +
      '</div>';
  }

  function bindAgent() {
    var fab = document.querySelector('[data-agent-fab]');
    var drawer = document.getElementById('agent-drawer');
    if (!fab || !drawer) return;
    fab.addEventListener('click', function () { drawer.classList.toggle('open'); });
    var close = document.querySelector('[data-agent-close]');
    if (close) close.addEventListener('click', function () { drawer.classList.remove('open'); });
    var input = document.getElementById('ad-input');
    var send = document.querySelector('[data-agent-send]');
    function sendQ() {
      if (!input) return;
      var v = input.value;
      input.value = '';
      agentChat(v);
    }
    if (send) send.addEventListener('click', sendQ);
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendQ(); });
    var qs = document.querySelectorAll('[data-ad-q]');
    for (var i = 0; i < qs.length; i++) {
      qs[i].addEventListener('click', function () { agentChat(this.textContent); });
    }
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    try {
      if (localStorage.getItem('lab.theme') === 'light') document.body.classList.add('theme-light');
    } catch (err) {}
    document.body.innerHTML =
      '<div class="app">' +
      '<aside class="sidebar" id="sidebar"></aside>' +
      '<div class="main">' +
      '<header class="topbar" id="topbar"></header>' +
      '<main class="content" id="content"></main>' +
      '</div></div>';

    /* 全局 Agent 问诊抽屉（FAB + 右侧抽屉），挂在 app 之外、跨路由常驻 */
    document.body.insertAdjacentHTML('beforeend', agentDrawerHtml());
    bindAgent();

    /* 顶部事件：身份切换 / 通知 / 搜索 */
    document.getElementById('topbar').addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.hasAttribute('data-role-sel')) {
        setRole(t.value);
      }
    });
    document.getElementById('topbar').addEventListener('click', function (e) {
      var theme = e.target && e.target.closest ? e.target.closest('[data-theme]') : null;
      if (theme) {
        var light = document.body.classList.toggle('theme-light');
        try { localStorage.setItem('lab.theme', light ? 'light' : 'dark'); } catch (err) {}
        renderTopbar();
        return;
      }
      var bell = e.target && e.target.closest ? e.target.closest('[data-bell]') : null;
      if (bell) {
        modal('通知中心（' + myNotifications().length + '）', notificationsModal(), function (mask) {
          myNotifications().forEach(function (n) { n.read = true; });
          mask.remove();
          renderTopbar();
        });
      }
    });
    document.getElementById('topbar').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var inp = e.target && e.target.closest ? e.target.closest('[data-search]') : null;
      if (!inp) return;
      var keyword = String(inp.value).trim();
      if (!keyword) { toast('请输入搜索关键词（SN / 脚本 / 工具 / 成员）', 'bad'); return; }
      modal('搜索结果：' + esc(keyword), searchModal(keyword));
    });

    window.addEventListener('hashchange', function () {
      var sel = document.querySelector('[data-role-sel]');
      if (sel) sel.value = state.mode === 'admin' ? 'admin' : state.userId;
      cancelPending();
      /* 叠层模态全部关闭：只移除一个会在叠加后留下遮罩锁死页面 */
      var masks = document.querySelectorAll('.modal-mask');
      for (var mi = 0; mi < masks.length; mi++) masks[mi].remove();
      if (DEVICE_TICKER && getRoute() !== 'devices') {
        clearInterval(DEVICE_TICKER);
        DEVICE_TICKER = null;
      }
      flushNow();
      renderTopbar();
      renderSidebar();
      renderContent();
    });

    window.addEventListener('beforeunload', function () { flushNow(); });
  window.addEventListener('pagehide', function () { flushNow(); });

    /* 侧边栏父级菜单折叠：全局委托，绑定一次（侧边栏重绘不重复绑定） */
    bindNavToggle();

    /* 首次渲染（默认进入该角色的工作台；若 hash 为 login 则显示身份选择） */
    if (!location.hash) {
      renderTopbar(); renderSidebar(); renderContent();
    } else {
      renderTopbar(); renderSidebar(); renderContent();
    }
  }

  function notificationsModal() {
    var u = currentUser();
    var items = myNotifications();
    var rows = items.map(function (n) {
      var eff = nodeOwner({ owner: n.to }).id;
      var dep = eff !== n.to ? '<span class="tag-chip bad">代理</span>' : '';
      var cls = n.type === 'alert' ? (n.level === 'high' ? 't-bad' : 't-warn') : 't-info';
      return '<div class="todo-row"><div class="t-ico">' + icon(n.type === 'alert' ? 'bell' : 'check') + '</div>' +
        '<div class="t-body"><div class="t-title ' + cls + '">' + esc(n.text) + '</div>' +
        '<div class="t-sub mono small">' + esc(n.at) + dep + '</div></div></div>';
    }).join('');
    var empty = items.length ? '' :
      '<div class="small dim" style="padding:14px 2px">当前身份暂无归你的通知（含代管）。</div>';
    var hasDep = items.some(function (n) { return nodeOwner({ owner: n.to }).id !== n.to; });
    var hint = '<div class="m-foot dim small" style="justify-content:flex-start;border-top:none;margin:14px 0 0">' +
      '按「当前责任人」过滤：' + esc(u.name) + ' 收到 ' + items.length + ' 条' +
      (state.mode === 'admin' ? ' · 管理员看全部' : '') +
      (hasDep ? '（含代理代管）' : '') + '</div>';
    return '<div>' + empty + rows +
      '<div class="m-foot"><button class="btn btn-ghost" data-mclose>关闭</button>' +
      (items.length ? '<button class="btn btn-primary fill">全部已读</button>' : '') + '</div>' +
      hint + '</div>';
  }

  /* 全局搜索：SN / 脚本 / 工具 / 成员，结果可点跳转 */
  function searchModal(q) {
    var low = q.toLowerCase();
    var m = [];
    L.TRAVEL_SHEETS.forEach(function (t) {
      if (t.sn.toLowerCase().indexOf(low) >= 0) {
        m.push({ icon: 'scan', title: t.sn + ' · ' + t.stage, sub: statusCN(t.status), href: '#/travel-sheet' });
      }
    });
    L.SCRIPTS.forEach(function (s) {
      if (s.name.toLowerCase().indexOf(low) >= 0 || (s.desc || '').toLowerCase().indexOf(low) >= 0) {
        m.push({ icon: 'file', title: s.name, sub: '脚本 · ' + (s.desc || ''), href: '#/travel-sheet' });
      }
    });
    L.EXCEL_TOOLS.forEach(function (x) {
      if (x.name.toLowerCase().indexOf(low) >= 0) {
        m.push({ icon: 'tool', title: x.name, sub: '工具 · ' + x.type + ' · ' + x.input, href: '#/travel-sheet' });
      }
    });
    L.USERS.forEach(function (u) {
      if (u.name.toLowerCase().indexOf(low) >= 0 || u.id.toLowerCase().indexOf(low) >= 0) {
        m.push({ icon: 'user', title: u.name, sub: postNamesOf(u) + ' · ' + u.dept, href: '#/dashboard' });
      }
    });
    if (!m.length) {
      return '<div class="dim small" style="padding:14px 0">未找到与「' + esc(q) + '」相关的机台 / 脚本 / 工具 / 成员。</div>' +
        '<div class="m-foot"><button class="btn btn-primary fill">确定</button></div>';
    }
    var rows = m.slice(0, 12).map(function (r) {
      return '<a class="todo-row" style="text-decoration:none" href="' + r.href + '"><div class="t-ico">' + icon(r.icon) + '</div>' +
        '<div class="t-body"><div class="t-title" style="color:var(--accent)">' + esc(r.title) + '</div>' +
        '<div class="t-sub small dim">' + esc(r.sub) + '</div></div></a>';
    }).join('');
    return '<div>' + rows + '<div class="m-foot"><button class="btn btn-ghost" data-mclose>关闭</button></div></div>';
  }

  /* 版本上绑定到 window 方便调试 */
  window.LabApp = { setRole: setRole, go: go, state: state, myTasks: myTasks, myMachines: myMachines, viewDashboard: viewDashboard, flowBar: flowBar, sheetOwner: sheetOwner, effId: effId, canView: canView, effRoles: effRoles, isMine: isMine, assertCan: assertCan, canAction: canAction, rebuildRoles: rebuildRoles, rebuildAcl: rebuildAcl, viewAdminRoles: viewAdminRoles, viewNoAccess: viewNoAccess, viewTravelSheet: viewTravelSheet, tsSheets: tsSheets, stationOfUser: stationOfUser, tsStationSeg: tsStationSeg, formState: FORM_STATE, viewDefs: viewDefs, viewAdminForms: viewAdminForms, viewMyScripts: viewMyScripts, viewAdminScripts: viewAdminScripts, viewScriptDetail: viewScriptDetail, pageShell: pageShell, scriptVerNext: scriptVerNext, catLabel: catLabel, PAGE_ACL: PAGE_ACL, saveStationDef: saveStationDef, addStationDefPatch: addStationDefPatch, deleteStationDef: deleteStationDef, publishStationDef: publishStationDef, reorderStationDef: reorderStationDef, addStageCity: addStageCity, updateStageCity: updateStageCity, deleteStageCity: deleteStageCity, defForSubmit: defForSubmit, runDefScan: runDefScan, validateArtifacts: validateArtifacts, nodeArtCard: nodeArtCard, artSnapshot: artSnapshot, uploadFor: uploadFor, artVw: artVw };

  /* 启动：优先使用内嵌数据（纯静态 file:// 可用），否则回退到服务接口 */
  function initData() {
    if (window.LAB_DATA) {
      return Promise.resolve(window.LAB_DATA);
    }
    return fetch('/api/data')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  initData()
    .then(function (data) { startApp(data); })
    .catch(function () {
      document.body.innerHTML =
        '<div style="max-width:560px;margin:80px auto;font-family:-apple-system,Segoe UI,Roboto,sans-serif">' +
        '<h2 style="margin:0 0 8px">无法载入演示数据</h2>' +
        '<p style="color:#666">请确认已生成 frontend/data.js，或通过服务访问：</p>' +
        '<pre style="background:#f4f4f4;padding:14px;border-radius:8px"><code>node server.js\n' +
        '// 然后打开  http://localhost:8080/frontend/</code></pre></div>';
    });

})(window);