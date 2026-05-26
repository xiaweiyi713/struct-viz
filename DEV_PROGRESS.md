# Struct-Viz 开发进度

> 最后更新: 2026-05-26

## 项目概述

Struct-Viz 是一个面向 408 考研的四科可视化平台，使用 React + TypeScript + Vite + D3.js + Framer Motion 构建。用户输入类 C++ 的 StructScript 代码，系统逐步动画展示数据结构的执行过程。

## 当前状态

- **算法模板**: 86 个，覆盖 4 科 18 分类
- **算法文件**: 73 个 runtime 实现
- **可视化器**: 7 种（树、图、数组、字符串、哈希表、多数组、矩阵）
- **类型检查**: `tsc --noEmit` 通过（0 错误）
- **单元测试**: 164 个测试通过（8 个测试文件）
- **UI/UX**: Tailwind CSS 迁移完成，Linear 风格重设计
- **编辑器**: StructScript 自定义语法高亮 + 自动补全 + 错误波浪线
- **代码分割**: 首页/SandboxPage 独立 chunk + Web Worker
- **持久化**: Zustand persist（代码/主题/速度保存到 localStorage）
- **暗色模式**: 全部可视化器 + 滚动条 + Range 输入已完成适配
- **部署**: Netlify（https://tourmaline-sable-9c8eb5.netlify.app）
- **仓库**: GitHub（https://github.com/xiaweiyi713/struct-viz）

## 四科覆盖

### 数据结构（58 个模板，7 分类）

| 分类 | 数量 | 模板 ID |
|------|------|---------|
| 线性结构 | 4 | stack-basic, queue-basic, unionfind, ds-uf-compress |
| 树结构 | 25 | bst-insert/delete/search, rbtree-insert/delete/search, avl-insert/delete/search, btree-insert/delete/search, bplustree-insert/delete/search, twothree-insert/delete, splay-insert/delete, trie-insert/delete, huffman, ds-huffman-decode, skiplist, ds-heap-ops |
| 图算法 | 14 | dijkstra, graph-bfs/dfs/prim/kruskal/topo/floyd/critical/bellman-ford/bipartite/euler/tarjan/kosaraju/coloring |
| 排序 | 10 | quicksort, heapsort, mergesort, bubblesort, insertionsort, selectionsort, shellsort, countingsort, radixsort, bucket-sort |
| 查找 | 7 | binarysearch, kmp, naivestr, hashtable-linear/chain/delete, string-hash |
| 贪心 | 3 | activity-selection, fractional-knapsack, job-scheduling |
| 动态规划 | 5 | knapsack-01, lcs, edit-distance, matrix-chain, lis |

### 操作系统（18 个模板，5 分类）

| 分类 | 数量 | 模板 ID |
|------|------|---------|
| 进程调度 | 4 | os-fcfs, os-sjf, os-rr, os-priority |
| 死锁 | 2 | os-banker, os-deadlock-detect |
| 内存管理 | 8 | os-fifo, os-lru, os-opt, os-first-fit/best-fit/worst-fit, os-clock, os-paging |
| 磁盘调度 | 3 | os-disk-fcfs, os-disk-scan, os-disk-cscan |
| 进程同步 | 3 | os-producer-consumer, os-readers-writers, os-dining |

### 计算机组成原理（11 个模板，3 分类）

| 分类 | 数量 | 模板 ID |
|------|------|---------|
| 运算器 | 5 | co-twos-complement, co-ieee754, co-booth, co-float-add, co-sign-magnitude-mul |
| Cache | 4 | co-cache-direct/set/fully, co-virtual-addr |
| 流水线 | 3 | co-pipeline-basic/hazard/superscalar |

### 计算机网络（11 个模板，3 分类）

| 分类 | 数量 | 模板 ID |
|------|------|---------|
| 数据链路层 | 3 | cn-crc, cn-hamming, cn-csma |
| 网络层 | 4 | cn-subnet, cn-distance-vector, cn-link-state, cn-nat |
| 传输层 | 4 | cn-gbn, cn-sr, cn-tcp-state, cn-tcp-congestion |

## 可视化器（7 种）

| 类型 | 组件 | 渲染方式 | 暗色模式 |
|------|------|---------|---------|
| tree | TreeVisualizer | D3 + SVG（支持二叉/多路） | CSS 变量 + RB 专用变量 |
| graph | GraphVisualizer | D3 + SVG + forceSimulation | CSS 变量 |
| array/stack | ArrayVisualizer | Framer Motion | CSS 变量 |
| string | StringVisualizer | Framer Motion | CSS 变量 |
| hashtable | HashTableVisualizer | Framer Motion | CSS 变量 |
| multiarray | MultiArrayVisualizer | Framer Motion | CSS 变量 |
| matrix | MatrixVisualizer | Framer Motion | CSS 变量 |

## 开发记录

### v2.0 功能增强 (2026-05-22)

- Tokenizer 负数支持、Parser 标识符参数、QueueRuntime (FIFO)
- 首页搜索、代码持久化、路由级代码分割
- Monaco StructScript 语法高亮 + 自动补全 + 错误波浪线
- 扩展为四科 408 可视化平台
- 分享功能（Base64 URL）、Web Worker

### UI/UX 改造 (2026-05-22)

- CSS 变量 + Tailwind 类名 + `dark:` 前缀共存
- Linear 风格首页、SubjectPage 科目浏览页
- 可拖拽三栏分栏 + 移动端 Tab 切换
- 5 档速度播放控制、键盘快捷键

### 暗色模式全量修复 (2026-05-26)

- **TreeVisualizer RB 树**: `fillColor`/`strokeColor` 改用 CSS 变量（`--rb-red-fill`/`--rb-black-fill` 等），暗色 "black" 节点使用 `#475569` + `#94a3b8`
- **滚动条**: 硬编码改为 `var(--text-muted)`/`var(--text-secondary)`
- **Range 输入**: 硬编码改为 `var(--primary)`/`var(--surface)`

### 首页 3D 背景集成 (2026-05-26)

- 集成 Spline 3D 场景（Googly Eyes）作为 Hero 背景
- 使用 `@splinetool/react-spline` + lazy loading
- 通过 `_renderer.pipeline.setWatermark(null)` 移除水印
- Hero 文字改为白色系 + 紫色光晕阴影增强可读性
- 全屏首屏布局 + 「开始实验」按钮跳转沙盒
- 底部向下箭头滚动指引

### 模板选择器四科支持 (2026-05-26)

- TopNav 模板下拉菜单改为按 **科目 → 分类** 两级分组
- SandboxPage 对比模式下拉同步更新
- 从 `subjects.ts` 动态读取分类，不再硬编码

### 部署上线 (2026-05-26)

- Netlify 部署：https://tourmaline-sable-9c8eb5.netlify.app
- GitHub 仓库：https://github.com/xiaweiyi713/struct-viz
- `netlify.toml` 配置 SPA 路由重定向
- 构建 script 分离：`build` = `vite build`，`typecheck` = `tsc -b`
- Favicon 更换为树结构 logo（紫色渐变 + 白色节点）

## 待继续方向

### Bug 修复
- `tsc -b` 严格类型检查有约 30 个错误（未使用变量、类型不匹配等），不影响运行但应修复
- `pseudocodes.ts` 有 6 处重复属性名需去重

### 功能增强
- 沙盒页模板选择器支持科目 Tab 筛选（类似首页科目页）
- 算法复杂度对比页面
- 暗色模式切换动画优化
- 移动端体验优化（Spline 3D 场景在手机端性能）
- 添加更多算法模板

### 工程优化
- Spline 运行时 2MB chunk 可考虑进一步 code-split
- physics/navmesh 等 Spline 子模块按需加载

## 项目文件结构

```
src/
├── core/
│   ├── algorithms/          # 73 个算法 runtime 文件
│   ├── executor/
│   │   ├── index.ts         # Runtime 工厂 + 类注册
│   │   ├── runtime.ts       # Runtime 主类
│   │   └── traceRecorder.ts # Trace 记录器
│   ├── parser/
│   │   ├── parser.ts        # StructScript 解析器
│   │   └── tokenizer.ts     # 词法分析器
│   ├── worker/
│   │   ├── executorWorker.ts  # Web Worker 执行器
│   │   └── useExecutorWorker.ts  # Worker Hook
│   └── __tests__/           # 8 个测试文件
├── components/
│   ├── layout/              # TopNav / ResizableLayout / MobileTabLayout
│   ├── visualizers/         # 7 个可视化器组件
│   ├── editor/              # CodeEditor + structscriptLanguage
│   ├── inspector/           # StateInspector / PseudocodePanel / ExamQuestion
│   └── timeline/            # PlaybackControls
├── pages/
│   ├── HomePage.tsx         # 首页（3D 背景 + 全屏 Hero + 科目卡片）
│   ├── SubjectPage.tsx      # 科目页（按科目浏览）
│   └── SandboxPage.tsx      # 沙盒页（可拖拽分栏 + 响应式）
├── data/
│   ├── templates.ts         # 86 个算法模板定义
│   ├── subjects.ts          # 4 科目定义
│   ├── pseudocodes.ts       # 伪代码数据
│   └── examReferences.ts    # 考试参考
├── hooks/
│   └── useKeyboardShortcuts.ts
├── stores/
│   ├── homeStore.ts         # 首页状态
│   └── sandboxStore.ts      # 沙盒页状态
└── types/
    ├── ast.ts / trace.ts / index.ts
```
