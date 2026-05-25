# Struct-Viz 开发进度

> 最后更新: 2026-05-22

## 项目概述

Struct-Viz 是一个面向 408 考研的数据结构可视化工具，使用 React + TypeScript + Vite + D3.js + Framer Motion 构建。用户输入类 C++ 的 StructScript 代码，系统逐步动画展示数据结构的执行过程。

## 当前状态

- **算法模板**: 60+ 个，覆盖 7 大分类（含删除操作、查找操作、贪心算法模板）
- **可视化器**: 8 种（树、图、数组/栈、队列、字符串、哈希表、多数组、矩阵）
- **类型检查**: ✅ 通过（0 错误）
- **单元测试**: ✅ 22 个测试通过（tokenizer + parser + executor）
- **UI/UX**: ✅ Tailwind CSS 迁移完成，Linear 风格重设计
- **编辑器**: ✅ StructScript 自定义语法高亮 + 自动补全 + 错误波浪线
- **代码分割**: ✅ 首页/SandboxPage 独立 chunk + Web Worker
- **持久化**: ✅ Zustand persist（代码/主题/速度保存到 localStorage）

## v2.0 功能增强记录 (2026-05-22)

### Phase 1: 基础修复
- **Tokenizer 负数支持**: `g.addEdge(0, 1, -3)` 现在正确解析负数字面量
- **Parser 标识符参数**: `HashTable ht(11, linear)` 的 bare identifier 现在正确解析为字符串参数
- **QueueRuntime (FIFO)**: 新建独立队列 runtime，替换原来错误复用的 StackRuntime
  - 支持 `enqueue`/`dequeue`/`front` 方法（兼容 `push`/`pop`/`peek`）
  - QueueView 可视化：横向排列，标注 FRONT/REAR + 出队/入队方向箭头
- **测试基础设施**: 引入 vitest，22 个测试覆盖 tokenizer/parser/executor

### Phase 2: UX 快速改进
- **首页搜索**: 支持按名称/英文名/描述搜索模板，带搜索图标输入框和结果计数
- **代码持久化**: Zustand persist 中间件保存 code/selectedTemplate/isDark/speed 到 localStorage
- **路由级代码分割**: SandboxPage 使用 React.lazy()，Monaco/D3/算法延迟加载
  - 主 bundle: 702KB → 275KB，SandboxPage 独立 chunk 263KB

### Phase 3: Monaco StructScript 支持
- **自定义 Monarch 语法**: 类名（BST/Graph/HashTable 等）高亮为 keyword
- **自动补全**: 行首提示类名，`.` 后提示方法名（基于变量类型推断）
- **错误波浪线**: 解析错误映射为 Monaco markers，行内红色波浪线提示

### Phase 4: 新模板与算法扩充
- **哈希表删除模板**: hashtable-delete（线性探测法懒惰删除可视化）
- **树查找模板**: avl-search、rbtree-search、btree-search、bplustree-search（4 个 runtime 新增 search 方法）
- **贪心算法扩充**: FractionalKnapsackRuntime（分数背包）+ JobSchedulingRuntime（作业调度）

### Phase 5: 高级功能
- **分享功能**: Base64 编码代码到 `?code=` URL 参数，分享按钮一键复制链接
- **Web Worker**: 解析/执行移至 Worker 线程，不阻塞 UI
  - Worker 独立 chunk 192KB，异步执行

### 可视化器暗色模式适配
- GraphVisualizer: 节点状态色 → CSS 变量
- StringVisualizer: matched/mismatched/highlighted → CSS 变量
- HashTableVisualizer: found/deleted + rgba 背景 → CSS 变量
- MatrixVisualizer: computed/backtrack → CSS 变量
- index.css: 新增 `--tint-primary`、`--tint-success`、`--tint-accent` CSS 变量

## UI/UX 改造记录 (2026-05-22)

### 已完成
- **样式系统**: 从 CSS 变量 + 内联 style 全面迁移到 Tailwind 类名 + `dark:` 前缀
  - `index.css` 添加 `@custom-variant dark` 让 Tailwind v4 支持 class-based 暗色模式
  - UI 组件（首页/沙盒页/导航栏/播放控制/状态面板）全部使用 Tailwind 类名
  - 可视化器组件保留 CSS 变量（`--primary`、`--text`、`--border` 等），通过 `:root` / `.dark` 切换
- **首页重新设计**: Linear 风格，毛玻璃导航栏、分类标签筛选、统计区域、网格背景
- **沙盒页布局**: 可拖拽三栏分栏（ResizableLayout），移动端 Tab 切换（MobileTabLayout）
- **播放控制**: 速度扩展为 5 档（0.25x/0.5x/1x/2x/4x）
- **键盘快捷键**: Space 播放/暂停、← → 步进、R 重置、1-5 速度切换
- **响应式**: 全设备适配（桌面 ≥1024px / 平板 768-1023px / 手机 <768px）

### 已修复的 Bug
- **暗色切换不生效** — Tailwind CSS v4 默认用 `@media (prefers-color-scheme)` 而非 `.dark` class。修复：添加 `@custom-variant dark (&:where(.dark, .dark *))`
- **可视化器 CSS 变量丢失** — 重构 `index.css` 时移除了可视化器依赖的 CSS 变量。修复：恢复 `:root` / `.dark` 中的 `--primary`、`--text`、`--border` 等变量
- **暗色下树节点看不清** — "black" 节点 `#1e293b` 与暗色背景融合。修复：改为 `#334155`，描边改为 `#64748b`

### 待验证 / 后续方向
- 浏览器全面回归测试（需要用户手动验证）
- 可视化器组件暗色模式适配（当前仅修复了树节点，其余 6 种可视化器可能也需要调整）
- 暗色模式下 ArrayVisualizer / StringVisualizer / HashTableVisualizer 等的颜色适配

## 新增文件
| 文件 | 职责 |
|------|------|
| `src/hooks/useKeyboardShortcuts.ts` | 键盘快捷键 Hook |
| `src/components/layout/ResizableLayout.tsx` | 可拖拽分栏组件 |
| `src/components/layout/MobileTabLayout.tsx` | 移动端 Tab 布局组件 |
| `docs/mocks/homepage-redesign.html` | 首页重设计 HTML 模型 |
| `docs/superpowers/specs/2026-05-22-ui-ux-redesign.md` | UI/UX 改造设计文档 |
| `docs/superpowers/plans/2026-05-22-ui-ux-redesign.md` | UI/UX 改造实施计划 |

## 已修复的历史问题

1. **按钮内边距不足** — Tailwind CSS v4 的全局重置未包裹在 `@layer base` 中。已修复。
2. **TopNav 下拉按钮重复 style 属性** — 已合并。
3. **GraphVisualizer datum() 类型错误** — 已用类型断言 + undefined guard 修复。
4. **HashTable 逻辑 bug** — `wasDeleted` 检查顺序。已修复。
5. **HashTable InternalEntry 缺少 `"highlighted"` 状态** — 已添加。
6. **RBTree payload 类型不匹配** — 已包裹为 `{ recolors: [...] }`。
7. **RBTree 大量未使用变量/函数** — 已清理。
8. **多种 TS 类型错误** — LIS/SkipList/TwoThreeTree/Templates 等，均已修复。

## 已完成的算法模板（53 个）

### 线性结构（3 个）
| ID | 名称 | 难度 | 文件 |
|---|---|---|---|
| stack-basic | 栈操作 | easy | `stack.ts` |
| queue-basic | 队列操作 | easy | `stack.ts`（复用 StackRuntime） |
| unionfind | 并查集 | medium | `unionfind.ts` |

### 树结构（19 个）
| ID | 名称 | 难度 | 文件 |
|---|---|---|---|
| bst-insert | BST 插入 | medium | `bst.ts` |
| bst-delete | BST 删除 | hard | `bst.ts` |
| bst-search | BST 查找 | medium | `bst.ts` |
| rbtree-insert | 红黑树插入 | hard | `rbtree.ts` |
| rbtree-delete | 红黑树删除 | hard | `rbtree.ts` |
| avl-insert | AVL 树插入 | hard | `avl.ts` |
| avl-delete | AVL 树删除 | hard | `avl.ts` |
| huffman | 哈夫曼树构造 | medium | `huffman.ts` |
| btree-insert | B 树插入 | hard | `btree.ts` |
| btree-delete | B 树删除 | hard | `btree.ts` |
| bplustree-insert | B+ 树插入 | hard | `bplustree.ts` |
| bplustree-delete | B+ 树删除 | hard | `bplustree.ts` |
| trie-insert | Trie 字典树 | medium | `trie.ts` |
| trie-delete | Trie 删除 | medium | `trie.ts` |
| splay-insert | Splay 树插入 | hard | `splaytree.ts` |
| splay-delete | Splay 树删除 | hard | `splaytree.ts` |
| twothree-insert | 2-3 树插入 | hard | `twothreetree.ts` |
| twothree-delete | 2-3 树删除 | hard | `twothreetree.ts` |
| skiplist | 跳表 | medium | `skiplist.ts` |

### 图算法（11 个）
| ID | 名称 | 难度 | 文件 |
|---|---|---|---|
| dijkstra | Dijkstra 最短路 | hard | `dijkstra.ts` |
| graph-bfs | 图 BFS 遍历 | medium | `dijkstra.ts` |
| graph-dfs | 图 DFS 遍历 | medium | `dijkstra.ts` |
| graph-prim | Prim 最小生成树 | hard | `dijkstra.ts` |
| graph-kruskal | Kruskal 最小生成树 | hard | `dijkstra.ts` |
| graph-topo | 拓扑排序 | medium | `dijkstra.ts` |
| graph-floyd | Floyd 最短路径 | hard | `dijkstra.ts` |
| graph-critical | 关键路径 | hard | `dijkstra.ts` |
| graph-bellman-ford | Bellman-Ford 最短路 | hard | `dijkstra.ts` |
| graph-bipartite | 二分图检测 | medium | `dijkstra.ts` |
| graph-euler | 欧拉路径 | hard | `dijkstra.ts` |

### 排序算法（9 个）
| ID | 名称 | 难度 | 文件 |
|---|---|---|---|
| quicksort | 快速排序 | hard | `quicksort.ts` |
| heapsort | 堆排序 | hard | `heapsort.ts` |
| mergesort | 归并排序 | hard | `mergesort.ts` |
| bubblesort | 冒泡排序 | easy | `bubblesort.ts` |
| insertionsort | 插入排序 | easy | `insertionsort.ts` |
| selectionsort | 选择排序 | easy | `selectionsort.ts` |
| shellsort | 希尔排序 | medium | `shellsort.ts` |
| countingsort | 计数排序 | medium | `countingsort.ts` |
| radixsort | 基数排序 | hard | `radixsort.ts` |

### 查找算法（5 个）
| ID | 名称 | 难度 | 文件 |
|---|---|---|---|
| binarysearch | 折半查找 | medium | `binarysearch.ts` |
| kmp | KMP 模式匹配 | hard | `kmp.ts` |
| naivestr | 朴素模式匹配 | easy | `naivestr.ts` |
| hashtable-linear | 哈希表（线性探测） | medium | `hashtable.ts` |
| hashtable-chain | 哈希表（链地址法） | medium | `hashtable.ts` |

### 贪心算法（1 个）
| ID | 名称 | 难度 | 文件 |
|---|---|---|---|
| activity-selection | 活动选择 | medium | `activityselection.ts` |

### 动态规划（5 个）
| ID | 名称 | 难度 | 文件 |
|---|---|---|---|
| knapsack-01 | 0-1 背包 | hard | `knapsack.ts` |
| lcs | 最长公共子序列 | hard | `lcs.ts` |
| edit-distance | 编辑距离 | hard | `editdistance.ts` |
| matrix-chain | 矩阵链乘法 | hard | `matrixchain.ts` |
| lis | 最长递增子序列 | medium | `lis.ts` |

## 已完成的可视化器（7 种）

| 类型 | 组件 | 渲染方式 | 文件 |
|---|---|---|---|
| tree | TreeVisualizer | D3 + SVG（支持二叉/多路） | `TreeVisualizer.tsx` |
| graph | GraphVisualizer | D3 + SVG + forceSimulation | `GraphVisualizer.tsx` |
| array/stack | ArrayVisualizer | Framer Motion | `ArrayVisualizer.tsx` |
| string | StringVisualizer | Framer Motion | `StringVisualizer.tsx` |
| hashtable | HashTableVisualizer | Framer Motion | `HashTableVisualizer.tsx` |
| multiarray | MultiArrayVisualizer | Framer Motion | `MultiArrayVisualizer.tsx` |
| matrix | MatrixVisualizer | Framer Motion | `MatrixVisualizer.tsx` |

## 项目关键文件结构

```
src/
├── core/
│   ├── algorithms/          # 29 个算法 runtime 文件
│   ├── executor/
│   │   ├── index.ts         # Runtime 工厂 + 类注册
│   │   ├── runtime.ts       # Runtime 主类
│   │   └── traceRecorder.ts # Trace 记录器
│   └── parser/
│       ├── parser.ts        # StructScript 解析器
│       └── tokenizer.ts     # 词法分析器
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx       # 导航栏（毛玻璃 + 响应式）
│   │   ├── ResizableLayout.tsx  # 可拖拽分栏（桌面端）
│   │   └── MobileTabLayout.tsx  # Tab 切换（移动端）
│   ├── visualizers/         # 7 个可视化器组件
│   ├── editor/
│   │   └── CodeEditor.tsx   # Monaco 编辑器
│   ├── inspector/
│   │   └── StateInspector.tsx  # 状态检查面板
│   └── timeline/
│       └── PlaybackControls.tsx # 播放控制（5 档速度）
├── hooks/
│   └── useKeyboardShortcuts.ts  # 键盘快捷键 Hook
├── pages/
│   ├── HomePage.tsx         # 首页（Linear 风格 + 分类筛选）
│   └── SandboxPage.tsx      # 沙盒页（可拖拽分栏 + 响应式）
├── data/
│   └── templates.ts         # 53 个算法模板定义
├── types/
│   ├── trace.ts             # VisualStructure 等核心类型
│   ├── ast.ts               # AST 类型
│   └── index.ts             # 类型导出
└── stores/
    └── sandboxStore.ts      # Zustand 状态管理
```

## 可扩展的后续方向

### 功能增强
- 搜索/查找操作模板（BST search 已有，可加 AVL/RBTree/BTree 搜索）
- 哈希表删除操作模板
- 算法复杂度对比页面
- 代码编辑器语法高亮增强

### 可视化器暗色模式适配
- ArrayVisualizer / StringVisualizer / HashTableVisualizer / MultiArrayVisualizer / MatrixVisualizer 的颜色可能需要在暗色模式下调整
- GraphVisualizer 的节点状态颜色适配

### 可继续添加的算法
- 桶排序（需 BucketVisualizer）
- 更多贪心算法（哈夫曼编码解码、Dijkstra 贪心证明等）
- 图着色算法
- 强连通分量（Tarjan/Kosaraju）
