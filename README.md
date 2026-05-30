<div align="center">

# 🌳 Struct-Viz

**面向 408 考研的四科算法可视化平台**

输入类 C++ 的伪代码，逐步动画演示数据结构与算法的执行全过程。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-164%20passed-3FB950)

[🚀 在线体验](https://tourmaline-sable-9c8eb5.netlify.app) · [📦 源码仓库](https://github.com/xiaweiyi713/struct-viz)

</div>

---

## 📖 项目简介

**Struct-Viz** 是一个为计算机考研统考（408）打造的算法可视化学习工具，覆盖**数据结构、计算机组成原理、操作系统、计算机网络**四大科目，内置 **111 个算法模板**。

与「看动画」类工具不同，Struct-Viz 让你**亲手写代码**：用项目自研的 **StructScript** 伪代码语言描述操作，系统会解析、执行并把每一步状态变化用动画呈现出来——配合伪代码同步高亮、运行时状态面板和历年真题，帮助理解算法「为什么这样跑」。

## ✨ 核心特性

- 🧩 **四科全覆盖** —— 111 个模板、73 个算法运行时，从二叉树到 TCP 拥塞控制
- ✍️ **StructScript 伪代码语言** —— 类 C++ 语法，配 Monaco 编辑器：语法高亮、自动补全、错误波浪线
- 🎬 **逐步动画演示** —— 基于 D3.js 与 Framer Motion，可单步 / 连续播放，5 档变速
- 🔍 **7 种可视化器** —— 树、图、数组、字符串、哈希表、多数组、矩阵，自动按数据结构切换
- 📑 **伪代码同步高亮** —— 动画播放时高亮对应的伪代码行，对照学习
- 🧠 **运行时状态面板** —— 实时查看变量、指针、不变量（invariant）变化
- 📚 **408 真题关联** —— 关联 2009–2024 年统考真题，边练边对照考点
- ⚖️ **对比模式** —— 双侧并排运行两个算法，直观对比执行差异
- 🌗 **暗色模式 + 响应式** —— 完整适配深色主题与移动端
- 🔗 **代码分享 / 本地持久化** —— 通过 URL 分享代码片段，编辑内容自动保存
- ⚡ **Web Worker 执行** —— 算法在后台线程运行，重负载也不卡顿界面

## 📚 四科覆盖

| 科目 | 模板数 | 涵盖分类 |
|------|:------:|---------|
| 🌳 **数据结构** | 68 | 线性结构、树（BST/AVL/红黑树/B 树/B+ 树/2-3 树/伸展树/Trie/跳表/堆/哈夫曼）、图算法、排序、查找、动态规划、贪心 |
| ⚙️ **计算机组成原理** | 12 | 运算方法（补码 / IEEE754 / Booth / 浮点加法）、存储体系（Cache 映射 / 虚拟地址）、指令流水线 |
| 🖥️ **操作系统** | 20 | 进程调度、死锁（银行家算法 / 死锁检测）、内存管理（页面置换 / 分区分配）、磁盘调度、进程同步 |
| 🌐 **计算机网络** | 11 | 数据链路层（CRC / 海明码 / CSMA）、网络层（子网划分 / 距离向量 / 链路状态 / NAT）、传输层（GBN / SR / TCP 状态机 / 拥塞控制） |

## ✍️ StructScript 用法

StructScript 是一种极简的伪代码语言：**声明一个结构**，然后**调用它的方法**。系统会逐句执行并记录每一步的状态快照。

**二叉搜索树插入：**

```cpp
BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.insert(1);
tree.insert(6);
tree.insert(14);
```

**快速排序：**

```cpp
QuickSort q;
q.sort(38, 27, 43, 3, 9, 82, 10);
```

**Dijkstra 最短路径**（构造时传入节点数）：

```cpp
Graph g(5);
g.addEdge(0, 1, 10);
g.addEdge(0, 2, 3);
g.addEdge(2, 1, 1);
g.addEdge(1, 3, 2);
g.addEdge(2, 3, 8);
g.addEdge(3, 4, 4);
g.dijkstra(0);
```

> 💡 在[沙盒页](https://tourmaline-sable-9c8eb5.netlify.app/sandbox)从模板下拉框选择任意算法，即可载入示例代码并一键运行。

## 🛠️ 技术栈

| 领域 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript + Vite 8 |
| 可视化 | D3.js（树 / 图）、Framer Motion（数组 / 矩阵动画） |
| 状态管理 | Zustand（含 persist 持久化） |
| 路由 | React Router 7（路由级代码分割） |
| 编辑器 | Monaco Editor + 自定义 StructScript 语言 |
| 样式 | Tailwind CSS 4 |
| 测试 | Vitest（164 个单元测试） |
| 部署 | Netlify |

## 🚀 本地开发

### 环境要求

- Node.js ≥ 20.19（推荐 22.x）
- npm / pnpm / yarn 任一包管理器

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/xiaweiyi713/struct-viz.git
cd struct-viz

# 安装依赖（国内可使用镜像加速）
npm install --registry=https://registry.npmmirror.com

# 启动开发服务器
npm run dev
```

### 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（默认 http://localhost:5173） |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 本地预览生产构建产物 |
| `npm run typecheck` | TypeScript 类型检查（`tsc -b`） |
| `npm run lint` | ESLint 代码检查 |
| `npm run test` | 运行单元测试（Vitest） |

## 📂 项目结构

```
src/
├── core/                  # 算法引擎（与 UI 解耦）
│   ├── parser/            # StructScript 词法分析 + 语法解析
│   ├── executor/          # 运行时工厂 + Trace 记录器
│   ├── algorithms/        # 73 个算法运行时实现
│   ├── worker/            # Web Worker 执行器
│   └── __tests__/         # 单元测试
├── components/
│   ├── visualizers/       # 7 种可视化器（树 / 图 / 数组 …）
│   ├── editor/            # Monaco 编辑器 + StructScript 语言定义
│   ├── inspector/         # 状态面板 / 伪代码面板 / 真题
│   ├── timeline/          # 播放控制条
│   └── layout/            # 顶栏 / 可拖拽分栏 / 移动端布局
├── pages/                 # 首页 / 科目页 / 沙盒页
├── data/                  # 模板、科目、伪代码、真题数据
├── stores/                # Zustand 状态
└── types/                 # AST / Trace / 可视化结构类型定义
```

**架构要点**：算法引擎（`core/`）完全独立于 React。解析器把 StructScript 编译为 AST，执行器逐步运行并产出一系列 `TraceFrame`（每帧是某一时刻的完整状态快照），可视化层只负责渲染这些快照——因此算法逻辑可以脱离 UI 单独测试，界面也能任意替换。

## 🌐 部署

项目已配置 Netlify 自动部署（见 [`netlify.toml`](netlify.toml)）：

- 构建命令：`npm run build`
- 发布目录：`dist`
- 已配置 SPA 路由重定向，刷新子路由不会 404

也可将 `dist/` 部署到任意静态托管（Vercel、GitHub Pages、Cloudflare Pages 等）。

## 🤝 说明

本项目为个人学习与考研复习辅助而创建，欢迎提 Issue 或 PR 交流改进。如果它对你的复习有帮助，欢迎点一个 ⭐️。

> 真题解析仅供学习参考，如有疏漏欢迎指正。
