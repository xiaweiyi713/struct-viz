# Struct-Viz 功能增强设计

> 日期: 2026-05-22

## 概述

为 Struct-Viz 添加四项功能增强：
1. 搜索操作模板（8 个新模板 + 5 个 runtime 扩展）
2. 哈希表删除模板（2 个新模板）
3. 算法复杂度对比页（新路由 + 新页面）
4. Monaco 编辑器 StructScript 语法高亮

## 一、搜索操作模板

### 1.1 Runtime 扩展

以下 5 个 runtime 需要新增 `doSearch` 方法：

| Runtime 文件 | 现有方法 | 需新增 |
|---|---|---|
| `avl.ts` | insert, delete | search |
| `rbtree.ts` | insert, delete | search |
| `btree.ts` | insert, delete | search |
| `bplustree.ts` | insert, delete | search |
| `twothreetree.ts` | insert, delete | search |

已有 search 的 runtime：`bst.ts`、`trie.ts`、`splaytree.ts`、`skiplist.ts`

**search 实现模式**（以 BST 为参考）：
1. 从根节点开始遍历
2. 每步记录 `VISIT_NODE` 事件（当前节点）
3. 比较目标值与当前节点，记录 `COMPARE` 事件（方向决策）
4. 找到目标：记录 `COMPARE` + payload `{ found: true }`
5. 到达空节点：记录 `VISIT_NODE` + payload `{ found: false }`

**多路树（BTree、B+Tree、2-3 树）的 search**：
- 在节点内遍历 keys，确定进入哪个子节点
- 需要逐步记录每个 key 的比较过程

### 1.2 新增模板定义

在 `src/data/templates.ts` 中新增 9 个模板：

| ID | 名称 | nameEn | category | difficulty | examFrequency | supportedClass |
|---|---|---|---|---|---|---|
| avl-search | AVL 树查找 | AVL Search | tree | medium | 4 | AVLTree |
| rbtree-search | 红黑树查找 | RBTree Search | tree | medium | 3 | RBTree |
| btree-search | B 树查找 | B-Tree Search | tree | medium | 4 | BTree |
| bplustree-search | B+ 树查找 | B+Tree Search | tree | medium | 3 | BPlusTree |
| trie-search | Trie 查找 | Trie Search | tree | medium | 3 | Trie |
| splay-search | Splay 树查找 | Splay Search | tree | medium | 3 | SplayTree |
| twothree-search | 2-3 树查找 | 2-3 Tree Search | tree | medium | 3 | TwoThreeTree |
| skiplist-search | 跳表查找 | SkipList Search | tree | medium | 3 | SkipList |

模板代码统一模式：先 insert 建树/建表，再 search 查找成功和查找失败的 key。

## 二、哈希表删除模板

### 2.1 现状

- `HashTableRuntime` 已支持 `insert`、`search`、`delete` 三种方法
- 现有模板 `hashtable-linear` 和 `hashtable-chain` 的代码中没有演示删除操作（线性探测）或只演示了链地址法的删除

### 2.2 新增模板

| ID | 名称 | nameEn | category | difficulty | examFrequency | supportedClass |
|---|---|---|---|---|---|---|
| hashtable-linear-delete | 哈希表删除（线性探测） | Hash Delete (Linear) | searching | medium | 4 | HashTable |
| hashtable-chain-delete | 哈希表删除（链地址法） | Hash Delete (Chaining) | searching | medium | 4 | HashTable |

模板代码模式：
```
HashTable ht(size, mode);
ht.insert(a);
ht.insert(b);
ht.insert(c);
ht.search(b);    // 展示查找
ht.delete(b);    // 执行删除
ht.search(b);    // 删除后再查找，展示结果
```

- 线性探测：演示懒惰删除（标记为 deleted）
- 链地址法：演示从链表中移除

## 三、算法复杂度对比页

### 3.1 数据层

新建 `src/data/complexity.ts`：

```typescript
export interface ComplexityEntry {
  templateId: string;
  name: string;
  category: string;
  timeBest: string;
  timeAvg: string;
  timeWorst: string;
  space: string;
  stable?: boolean;
  notes?: string;
}

export const complexityData: ComplexityEntry[] = [...];
```

覆盖全部 53 + 10 = 63 个算法模板（含新增模板），按分类组织。

### 3.2 页面组件

新建 `src/pages/ComparePage.tsx`：

**布局**：
- 顶部标题："算法复杂度对比"
- 分类筛选 tabs：全部 | 排序 | 查找 | 树 | 图 | 线性 | 贪心 | DP
- 表格：算法名 | 最优时间 | 平均时间 | 最差时间 | 空间 | 稳定性(排序) | 备注
- 算法名可点击，跳转 `/sandbox?template={id}`
- 复用现有主题变量（`--bg`、`--surface`、`--border` 等）

**交互**：
- 点击 tab 切换分类筛选
- 表头支持排序（点击表头切换升序/降序）
- 鼠标悬停行高亮

### 3.3 路由

在 `src/App.tsx` 中添加 `/compare` 路由指向 `ComparePage`。

### 3.4 导航入口

在 `TopNav.tsx` 中添加"复杂度对比"导航链接。

## 四、Monaco 编辑器增强

### 4.1 自定义语言注册

在 `src/components/editor/CodeEditor.tsx` 的 `handleMount` 回调中：

1. 注册语言：`monaco.languages.register({ id: 'structscript' })`
2. 注册 tokenizer：`monaco.languages.setMonarchTokensProvider('structscript', {...})`
3. 注册自动补全：`monaco.languages.registerCompletionItemProvider('structscript', {...})`
4. 将 `defaultLanguage` 从 `"cpp"` 改为 `"structscript"`

### 4.2 Token 规则

```
关键词（类名）：Stack, Queue, BST, AVLTree, RBTree, Graph,
               QuickSort, HeapSort, ...（全部 supportedClass）
方法名：       insert, delete, search, push, pop, peek,
               sort, find, union
数字：         \d+(\.\d+)?
字符串：       ".*?"
注释：         //.*$
标点：         ( ) ; . ,
```

### 4.3 自动补全

- 输入类名 + `.` 后弹出该类支持的方法列表
- 补全项包含方法签名和文档说明

### 4.4 主题配色

使用现有的 vs-dark/light 主题，通过 `monaco.editor.defineTheme` 自定义 token 颜色：
- 关键词：紫色（与项目主题色一致）
- 方法名：蓝色
- 数字：橙色
- 注释：灰色
- 字符串：绿色

## 文件变更清单

### 新增文件
- `src/pages/ComparePage.tsx` — 复杂度对比页
- `src/data/complexity.ts` — 复杂度数据定义

### 修改文件
- `src/data/templates.ts` — 新增 10 个模板定义（8 个搜索 + 2 个哈希表删除）
- `src/core/algorithms/avl.ts` — 新增 doSearch 方法
- `src/core/algorithms/rbtree.ts` — 新增 doSearch 方法
- `src/core/algorithms/btree.ts` — 新增 doSearch 方法
- `src/core/algorithms/bplustree.ts` — 新增 doSearch 方法
- `src/core/algorithms/twothreetree.ts` — 新增 doSearch 方法
- `src/components/editor/CodeEditor.tsx` — 注册 StructScript 语言
- `src/App.tsx` — 添加 /compare 路由
- `src/components/layout/TopNav.tsx` — 添加导航入口
- `DEV_PROGRESS.md` — 更新开发进度
