# Struct-Viz UI/UX 全面改造设计

> 日期: 2026-05-22
> 状态: 已批准

## 概述

对 Struct-Viz 进行全面 UI/UX 改造，包括样式系统重构、首页重新设计、沙盒页布局优化、键盘快捷键和全设备响应式适配。视觉风格定位为品牌型（Linear/Vercel 风格）：精致渐变、微妙玻璃效果、高对比度排版。

## 1. 样式系统重构

### 目标
从 100% 内联样式迁移到 Tailwind CSS 类名 + `dark:` 前缀，消除 `onMouseEnter/onMouseLeave` 手动 hover 管理。

### 策略
- 移除 `index.css` 中的 CSS 变量双主题机制（`:root` / `.dark` 的 `--bg`、`--text` 等），改用 Tailwind 原生的 `dark:` 前缀
- 保留 `@theme` 中的品牌色定义（`--color-primary`、`--color-accent` 等），供 Tailwind 工具类使用
- 替换映射：
  - `style={{ color: "var(--text)" }}` → `text-slate-900 dark:text-slate-100`
  - `style={{ background: "var(--surface)" }}` → `bg-white dark:bg-slate-900`
  - `style={{ background: "var(--bg)" }}` → `bg-slate-50 dark:bg-slate-950`
  - `style={{ borderColor: "var(--border)" }}` → `border-slate-200 dark:border-slate-800`
  - `style={{ color: "var(--text-muted)" }}` → `text-slate-400 dark:text-slate-500`
  - 所有 `onMouseEnter/Leave` hover 效果 → Tailwind `hover:` 前缀
- 保留 `index.css` 中的：自定义滚动条、Range input 样式、`@layer base` 全局重置

### 不变的范围
- 可视化器组件（Tree/Graph/Array/String/HashTable/MultiArray/Matrix）保持原样
- 这些组件由 D3.js/Framer Motion 驱动 SVG 渲染，不涉及 Tailwind 类名

### 涉及文件
- `src/index.css` — 精简 CSS 变量系统
- `src/pages/HomePage.tsx` — 全面重写
- `src/pages/SandboxPage.tsx` — 全面重写
- `src/components/layout/TopNav.tsx` — 重构
- `src/components/editor/CodeEditor.tsx` — 小幅调整（主题跟随暗色模式的逻辑）
- `src/components/timeline/PlaybackControls.tsx` — 重构
- `src/components/inspector/StateInspector.tsx` — 重构

## 2. 首页重新设计

### 导航栏
- 固定顶部，`backdrop-filter: blur(16px) saturate(180%)` 毛玻璃效果
- 左侧：Logo（渐变 SVG 树形图标）+ "Struct-Viz" 渐变文字
- 中间：锚点导航（特性 / 模板 / 统计），仅桌面端显示
- 右侧：主题切换按钮 + "打开沙盒" CTA 按钮
- 底部：渐变分隔线

### Hero 区域
- 标签 pill："面向 408 考研"，带脉冲动画的状态点
- 标题：保持 `Struct-Viz` 渐变大字
- 副标题：更精炼的文案，"把数据结构的执行过程**画出来**"
- CTA 按钮组："开始实验 →"（渐变紫）+ "浏览模板"（描边）
- 统计摘要：53 算法模板 | 7 可视化器 | 7 分类
- 背景装饰：渐变光晕 + 网格背景 + 树形 SVG 脉冲动画

### Feature 区域
- 上方标签："FEATURES" 大写小字
- 标题："直观理解每一步"
- 三列卡片保持不变，样式迁移到 Tailwind 类名

### 模板区域
- 上方标签："TEMPLATE LIBRARY" 大写小字
- 标题："53 个算法模板"
- **新增**：分类标签筛选栏（全部/线性结构/树结构/图算法/排序算法/查找算法/贪心/DP）
  - 点击高亮，支持客户端筛选
  - 使用 `useState` 管理选中分类
- 模板卡片底部新增：可视化器类型标签（`tree`/`graph`/`stack`/`array` 等）
- 底部："查看全部 53 个模板" 链接

### 统计区域（新增）
- 上方标签："COVERAGE" 大写小字
- 标题："全面覆盖 408 大纲"
- 4 格统计卡片：19 树结构算法 / 11 图算法 / 9 排序算法 / 7 可视化器
- 数字使用渐变文字效果

### Footer
- Logo + 版权信息
- 简化为一行

## 3. 沙盒页布局优化

### 可拖拽分栏
- 实现轻量 `ResizableLayout` 组件，不引入第三方依赖
- 三个面板（编辑器 / 可视化 / 状态）可拖拽调整宽度
- 拖拽手柄：4px 宽透明区域，hover 显示 `cursor: col-resize` + indigo 高亮线
- 最小宽度约束：编辑器 240px、可视化 320px、状态面板 240px
- 默认比例：30% / 40% / 30%
- 宽度存入 `localStorage`，key 为 `struct-viz:panel-layout`，刷新后恢复

### 播放控制增强
- 速度选择从 `[0.5, 1, 2]` 扩展为 `[0.25, 0.5, 1, 2, 4]`
- 整体样式迁移到 Tailwind 类名

### 移动端布局（≤768px）
- 取消三栏，改为单栏 + Tab 切换：「代码」「可视化」「状态」
- Tab 栏固定在可视化区域下方
- 播放控制保持底部固定
- 编辑器高度固定为 40vh，可视化区域占剩余空间

## 4. 键盘快捷键

### 快捷键映射
| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放/暂停 |
| `←` | 上一步 |
| `→` | 下一步 |
| `R` | 重置 |
| `1` | 速度 0.25x |
| `2` | 速度 0.5x |
| `3` | 速度 1x |
| `4` | 速度 2x |
| `5` | 速度 4x |

### 实现方式
- 在 `SandboxPage` 顶层添加 `useEffect` 监听 `keydown`
- 检查 `document.activeElement` 是否在 `.monaco-editor` 容器内
- 如果在编辑器内或正在输入（`activeElement.tagName === 'INPUT'`），忽略快捷键
- 封装为 `useKeyboardShortcuts()` 自定义 Hook

## 5. 响应式适配

### 断点定义
- 桌面：≥1024px（三栏可拖拽布局）
- 平板：768px-1023px（三栏等比缩放，面板最小宽度适当减小）
- 手机：<768px（单栏 Tab 切换布局）

### 首页响应式
- Hero 标题：`text-5xl sm:text-6xl md:text-7xl`
- 模板卡片：`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- 分类标签栏：`flex-wrap`，水平滚动
- 统计卡片：`grid-cols-2 md:grid-cols-4`

### 沙盒页响应式
- 桌面（≥1024px）：三栏可拖拽布局
- 平板（768-1023px）：三栏比例调整为 35%/40%/25%，减小最小宽度
- 手机（<768px）：单栏 Tab 切换，编辑器 40vh，可视化剩余空间

### 导航栏响应式
- 桌面：完整导航
- 移动端：隐藏中间导航链接，Logo 右侧仅保留"打开沙盒"按钮

## 6. 实施顺序

按依赖关系排列：

1. **样式系统重构** — 先清理基础，所有后续改动基于新样式系统
2. **首页重新设计** — 独立页面，不影响沙盒页
3. **沙盒页布局优化**（可拖拽分栏 + 播放控制增强）— 核心交互改进
4. **键盘快捷键** — 独立 Hook，最后添加
5. **响应式适配** — 最后做，确保所有组件已有正确的 Tailwind 类名后再调整断点
