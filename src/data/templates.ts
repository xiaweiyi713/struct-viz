import { pseudocodes } from "./pseudocodes";
import { examReferences, type ExamReference } from "./examReferences";
import type { Subject } from "./subjects";

export interface AlgorithmTemplate {
  id: string;
  name: string;
  nameEn: string;
  subject: Subject;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  examFrequency: number;
  description: string;
  code: string;
  supportedClass: string;
  pseudocode?: string;
  pseudocodeLineMap?: Record<number, number>;
  examReferences?: ExamReference[];
}

export const templates: AlgorithmTemplate[] = [
  {
    id: "stack-basic",
    name: "栈操作",
    nameEn: "Stack Operations",
    subject: "data-structures",
    category: "linear",
    difficulty: "easy",
    examFrequency: 5,
    description:
      "栈的基本操作：push 入栈、pop 出栈、peek 查看栈顶。掌握后进先出（LIFO）原理。",
    code: `Stack s;
s.push(1);
s.push(2);
s.push(3);
s.pop();
s.peek();`,
    supportedClass: "Stack",
  },
  {
    id: "queue-basic",
    name: "队列操作",
    nameEn: "Queue Operations",
    subject: "data-structures",
    category: "linear",
    difficulty: "easy",
    examFrequency: 5,
    description:
      "队列的基本操作：enqueue 入队、dequeue 出队。掌握先进先出（FIFO）原理。",
    code: `Queue q;
q.enqueue(1);
q.enqueue(2);
q.enqueue(3);
q.enqueue(4);
q.dequeue();
q.front();`,
    supportedClass: "Queue",
  },
  {
    id: "bst-insert",
    name: "BST 插入",
    nameEn: "BST Insertion",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "二叉搜索树的插入操作：从根节点开始，比较键值决定向左或向右移动，直到找到空位插入。保持左小右大的性质。",
    code: `BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.insert(1);
tree.insert(6);
tree.insert(14);
tree.insert(4);`,
    supportedClass: "BST",
  },
  {
    id: "bst-delete",
    name: "BST 删除",
    nameEn: "BST Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "BST 删除三种情况：叶子节点直接删除、单子节点用子节点替换、双子节点用后继替换再删后继。保持 BST 性质。",
    code: `BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.insert(1);
tree.insert(6);
tree.insert(14);
tree.insert(4);
tree.delete(3);
tree.delete(10);
tree.delete(1);`,
    supportedClass: "BST",
  },
  {
    id: "bst-search",
    name: "BST 查找",
    nameEn: "BST Search",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "二叉搜索树的查找操作：从根节点开始，利用 BST 性质逐步缩小搜索范围，平均时间复杂度 O(log n)。",
    code: `BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);
tree.insert(1);
tree.insert(6);
tree.insert(14);
tree.insert(4);
tree.search(6);
tree.search(7);`,
    supportedClass: "BST",
  },
  {
    id: "rbtree-insert",
    name: "红黑树插入",
    nameEn: "Red-Black Tree Insertion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "红黑树的插入操作：先按 BST 方式插入，再通过旋转和变色恢复红黑性质。掌握 Case 1/2/3 三种修复情况。",
    code: `RBTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(15);
tree.insert(25);`,
    supportedClass: "RBTree",
  },
  {
    id: "dijkstra",
    name: "Dijkstra 最短路",
    nameEn: "Dijkstra Shortest Path",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "Dijkstra 单源最短路径算法：使用贪心策略，每次选取距离最小的未访问节点进行松弛操作。适用于非负权图。",
    code: `Graph g(5);
g.addEdge(0, 1, 10);
g.addEdge(0, 2, 3);
g.addEdge(2, 1, 1);
g.addEdge(1, 3, 2);
g.addEdge(2, 3, 8);
g.addEdge(3, 4, 4);
g.dijkstra(0);`,
    supportedClass: "Graph",
  },
  {
    id: "graph-bfs",
    name: "图 BFS 遍历",
    nameEn: "Graph BFS Traversal",
    subject: "data-structures",
    category: "graph",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "广度优先搜索（BFS）：使用队列逐层扩展，先访问距源点近的节点。常用于求最短路径（无权图）和层序遍历。",
    code: `Graph g(6);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 3, 1);
g.addEdge(1, 4, 1);
g.addEdge(2, 4, 1);
g.addEdge(3, 5, 1);
g.addEdge(4, 5, 1);
g.bfs(0);`,
    supportedClass: "Graph",
  },
  {
    id: "graph-dfs",
    name: "图 DFS 遍历",
    nameEn: "Graph DFS Traversal",
    subject: "data-structures",
    category: "graph",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "深度优先搜索（DFS）：沿一条路径深入到底再回溯，使用递归/栈实现。常用于拓扑排序、连通分量检测、回路检测。",
    code: `Graph g(6);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 3, 1);
g.addEdge(1, 4, 1);
g.addEdge(2, 4, 1);
g.addEdge(3, 5, 1);
g.addEdge(4, 5, 1);
g.dfs(0);`,
    supportedClass: "Graph",
  },
  {
    id: "quicksort",
    name: "快速排序",
    nameEn: "Quick Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "快速排序：选取基准元素（pivot），将数组分为 ≤pivot 和 >pivot 两部分，递归排序。平均 O(n log n)，最坏 O(n²)。",
    code: `QuickSort q;
q.sort(38, 27, 43, 3, 9, 82, 10);`,
    supportedClass: "QuickSort",
  },
  {
    id: "heapsort",
    name: "堆排序",
    nameEn: "Heap Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "堆排序：先建立最大堆，然后反复将堆顶（最大值）交换到数组末尾并调整堆。时间复杂度 O(n log n)，原地排序。",
    code: `HeapSort h;
h.sort(38, 27, 43, 3, 9, 82, 10);`,
    supportedClass: "HeapSort",
  },
  {
    id: "mergesort",
    name: "归并排序",
    nameEn: "Merge Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "归并排序：分治法，先递归分割为子数组，再逐步合并有序子数组。稳定排序，时间复杂度 O(n log n)，需要额外 O(n) 空间。",
    code: `MergeSort m;
m.sort(38, 27, 43, 3, 9, 82, 10);`,
    supportedClass: "MergeSort",
  },
  {
    id: "bubblesort",
    name: "冒泡排序",
    nameEn: "Bubble Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "easy",
    examFrequency: 3,
    description:
      "冒泡排序：每趟比较相邻元素，将最大值冒泡到末尾。若某趟无交换则已有序。时间复杂度 O(n²)。",
    code: `BubbleSort b;
b.sort(38, 27, 43, 3, 9, 82, 10);`,
    supportedClass: "BubbleSort",
  },
  {
    id: "insertionsort",
    name: "插入排序",
    nameEn: "Insertion Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "easy",
    examFrequency: 3,
    description:
      "插入排序：将无序区首个元素插入到有序区的正确位置。稳定排序，最好 O(n)，最坏 O(n²)。",
    code: `InsertionSort is;
is.sort(38, 27, 43, 3, 9, 82, 10);`,
    supportedClass: "InsertionSort",
  },
  {
    id: "avl-insert",
    name: "AVL 树插入",
    nameEn: "AVL Tree Insertion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "AVL 树插入：先按 BST 方式插入，再沿路径检查平衡因子，执行 LL/RR/LR/RL 四种旋转恢复平衡。掌握旋转是重点。",
    code: `AVLTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(5);
tree.insert(15);
tree.insert(25);`,
    supportedClass: "AVLTree",
  },
  {
    id: "avl-delete",
    name: "AVL 树删除",
    nameEn: "AVL Tree Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "AVL 树删除：先按 BST 方式删除，再从被删节点的父节点向上重平衡。删除可能触发多次旋转。",
    code: `AVLTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(5);
tree.insert(15);
tree.insert(25);
tree.delete(20);
tree.delete(5);`,
    supportedClass: "AVLTree",
  },
  {
    id: "avl-search",
    name: "AVL 树查找",
    nameEn: "AVL Tree Search",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "AVL 树查找：与 BST 查找相同的比较过程，但由于 AVL 始终平衡，查找效率稳定在 O(log n)。",
    code: `AVLTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(5);
tree.insert(15);
tree.insert(25);
tree.search(15);
tree.search(12);`,
    supportedClass: "AVLTree",
  },
  {
    id: "rbtree-delete",
    name: "红黑树删除",
    nameEn: "Red-Black Tree Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "红黑树删除：先 BST 删除，若删的是黑色节点需 fixup。四种情况（兄弟红/兄弟黑双子黑/近红远黑/远红），是红黑树最复杂的操作。",
    code: `RBTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(15);
tree.insert(25);
tree.delete(20);
tree.delete(10);`,
    supportedClass: "RBTree",
  },
  {
    id: "rbtree-search",
    name: "红黑树查找",
    nameEn: "Red-Black Tree Search",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "红黑树查找：与 BST 查找逻辑相同，红黑性质保证树高 O(log n)，查找效率稳定。",
    code: `RBTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(15);
tree.insert(25);
tree.search(15);
tree.search(12);`,
    supportedClass: "RBTree",
  },
  {
    id: "btree-delete",
    name: "B 树删除",
    nameEn: "B-Tree Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "B 树删除：叶子直接删（不足则借位或合并），内部节点用前驱/后继替换。借位经父节点中转，合并时父节点 key 下移。",
    code: `BTree bt(3);
bt.insert(1, 7, 4, 10, 17, 21, 31, 25, 19, 20);
bt.delete(17);
bt.delete(10);
bt.delete(4);`,
    supportedClass: "BTree",
  },
  {
    id: "btree-search",
    name: "B 树查找",
    nameEn: "B-Tree Search",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "B 树查找：在每个节点内顺序/二分查找 key，未命中则进入对应子节点。多路搜索降低树高，适合磁盘存储。",
    code: `BTree bt(3);
bt.insert(1, 7, 4, 10, 17, 21, 31, 25);
bt.search(17);
bt.search(5);`,
    supportedClass: "BTree",
  },
  {
    id: "bplustree-delete",
    name: "B+ 树删除",
    nameEn: "B+ Tree Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "B+ 树删除：只在叶子操作，借位时更新父节点索引 key，合并时维护叶子链表。内部节点下溢也可能级联。",
    code: `BPlusTree bt(3);
bt.insert(1, 4, 7, 10, 17, 21, 31, 25, 19, 20);
bt.delete(17);
bt.delete(7);
bt.delete(4);`,
    supportedClass: "BPlusTree",
  },
  {
    id: "bplustree-search",
    name: "B+ 树查找",
    nameEn: "B+ Tree Search",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "B+ 树查找：从根节点沿内部节点导航到叶子，在叶子节点中精确匹配。所有数据都在叶子层，查询路径长度一致。",
    code: `BPlusTree bt(3);
bt.insert(1, 4, 7, 10, 17, 21, 31, 25);
bt.search(17);
bt.search(5);`,
    supportedClass: "BPlusTree",
  },
  {
    id: "twothree-delete",
    name: "2-3 树删除",
    nameEn: "2-3 Tree Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 3,
    description:
      "2-3 树删除：内部节点用前驱替换转为叶子删除。叶子空了则借位（经父节点中转）或与兄弟合并，可能递归向上。",
    code: `TwoThreeTree tree;
tree.insert(10, 20, 5, 6, 12, 30, 7, 17);
tree.delete(10);
tree.delete(6);
tree.delete(30);`,
    supportedClass: "TwoThreeTree",
  },
  {
    id: "splay-delete",
    name: "Splay 树删除",
    nameEn: "Splay Tree Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "Splay 树删除：先 splay 目标到根，然后按子树情况处理。无左子→右子升根，无右子→左子升根，双子→左子树最大节点升为左子树根再挂右子树。",
    code: `SplayTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(5);
tree.insert(15);
tree.delete(20);
tree.delete(10);`,
    supportedClass: "SplayTree",
  },
  {
    id: "trie-delete",
    name: "Trie 删除",
    nameEn: "Trie Deletion",
    subject: "data-structures",
    category: "tree",
    difficulty: "easy",
    examFrequency: 3,
    description:
      "Trie 删除：沿路径找到目标单词，取消终点标记，然后从叶子向上删除不再属于其他单词的节点。",
    code: `Trie t;
t.insert("apple");
t.insert("app");
t.insert("apply");
t.insert("banana");
t.delete("app");
t.delete("apple");
t.delete("banana");`,
    supportedClass: "Trie",
  },
  {
    id: "huffman",
    name: "哈夫曼树构造",
    nameEn: "Huffman Tree Construction",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "哈夫曼树：每次选取权值最小的两棵树合并，直到只剩一棵。WPL（带权路径长度）最小，常用于编码压缩。",
    code: `Huffman h;
h.build(5, 29, 7, 8, 14, 23, 3, 11);`,
    supportedClass: "Huffman",
  },
  {
    id: "graph-prim",
    name: "Prim 最小生成树",
    nameEn: "Prim MST",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "Prim 算法：从源点出发，每步选连接 MST 与非 MST 的最小权边。适合稠密图，时间复杂度 O(V²)。",
    code: `Graph g(6);
g.addEdge(0, 1, 6);
g.addEdge(0, 2, 1);
g.addEdge(0, 3, 5);
g.addEdge(1, 2, 5);
g.addEdge(1, 4, 3);
g.addEdge(2, 3, 5);
g.addEdge(2, 4, 6);
g.addEdge(2, 5, 4);
g.addEdge(3, 5, 2);
g.addEdge(4, 5, 6);
g.prim(0);`,
    supportedClass: "Graph",
  },
  {
    id: "graph-kruskal",
    name: "Kruskal 最小生成树",
    nameEn: "Kruskal MST",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "Kruskal 算法：按边权从小到大排序，依次选取不形成环的边。使用并查集判环，适合稀疏图。",
    code: `Graph g(6);
g.addEdge(0, 1, 6);
g.addEdge(0, 2, 1);
g.addEdge(0, 3, 5);
g.addEdge(1, 2, 5);
g.addEdge(1, 4, 3);
g.addEdge(2, 3, 5);
g.addEdge(2, 4, 6);
g.addEdge(2, 5, 4);
g.addEdge(3, 5, 2);
g.addEdge(4, 5, 6);
g.kruskal();`,
    supportedClass: "Graph",
  },
  {
    id: "graph-topo",
    name: "拓扑排序",
    nameEn: "Topological Sort",
    subject: "data-structures",
    category: "graph",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "拓扑排序：Kahn 算法（BFS 入度法），每次输出入度为 0 的节点并删除其出边。用于 DAG 的线性排序。",
    code: `Graph g(6);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 3, 1);
g.addEdge(2, 3, 1);
g.addEdge(2, 4, 1);
g.addEdge(3, 5, 1);
g.addEdge(4, 5, 1);
g.topoSort();`,
    supportedClass: "Graph",
  },
  {
    id: "graph-floyd",
    name: "Floyd 最短路径",
    nameEn: "Floyd-Warshall",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "Floyd 算法：三重循环，枚举中间节点 k 松弛所有节点对 (i, j)。可求全源最短路径，支持负权边，O(V³)。",
    code: `Graph g(4);
g.addEdge(0, 1, 4);
g.addEdge(0, 2, 6);
g.addEdge(1, 2, 1);
g.addEdge(1, 3, 5);
g.addEdge(2, 3, 2);
g.floyd();`,
    supportedClass: "Graph",
  },
  {
    id: "graph-critical",
    name: "关键路径",
    nameEn: "Critical Path (AOE)",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "AOE 网关键路径：正向拓扑排序求 ve（最早发生时间），逆向求 vl（最迟发生时间），关键活动满足 e = l。",
    code: `Graph g(6);
g.addEdge(0, 1, 3);
g.addEdge(0, 2, 2);
g.addEdge(1, 3, 2);
g.addEdge(1, 4, 3);
g.addEdge(2, 3, 4);
g.addEdge(2, 5, 3);
g.addEdge(3, 5, 2);
g.addEdge(4, 5, 1);
g.criticalPath();`,
    supportedClass: "Graph",
  },
  {
    id: "binarysearch",
    name: "折半查找",
    nameEn: "Binary Search",
    subject: "data-structures",
    category: "searching",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "折半查找：在有序数组中，通过 low/high/mid 三个指针逐步缩小查找区间。时间复杂度 O(log n)。",
    code: `BinarySearch bs;
bs.search(1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 7);`,
    supportedClass: "BinarySearch",
  },
  {
    id: "kmp",
    name: "KMP 模式匹配",
    nameEn: "KMP String Matching",
    subject: "data-structures",
    category: "searching",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "KMP 算法：先计算 next 数组（部分匹配表），再利用已匹配信息避免主串指针回退。最坏时间复杂度 O(m+n)。",
    code: `KMP k;
k.match("ababcabcacbab", "abcac");`,
    supportedClass: "KMP",
  },
  {
    id: "hashtable-linear",
    name: "哈希表（线性探测）",
    nameEn: "Hash Table (Linear Probing)",
    subject: "data-structures",
    category: "searching",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "哈希表线性探测法：冲突时顺序查找下一个空桶。简单但容易产生堆积现象。支持 insert/search/delete。",
    code: `HashTable ht(11, linear);
ht.insert(47);
ht.insert(25);
ht.insert(36);
ht.insert(14);
ht.insert(58);
ht.insert(69);
ht.search(36);
ht.search(37);`,
    supportedClass: "HashTable",
  },
  {
    id: "hashtable-chain",
    name: "哈希表（链地址法）",
    nameEn: "Hash Table (Chaining)",
    subject: "data-structures",
    category: "searching",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "哈希表链地址法：每个桶维护一个链表，冲突时在链表尾部追加。不会产生堆积，删除更简单。",
    code: `HashTable ht(7, chain);
ht.insert(47);
ht.insert(25);
ht.insert(36);
ht.insert(14);
ht.insert(58);
ht.insert(69);
ht.search(36);
ht.delete(25);`,
    supportedClass: "HashTable",
  },
  {
    id: "hashtable-delete",
    name: "哈希表删除",
    nameEn: "Hash Table Delete",
    subject: "data-structures",
    category: "searching",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "哈希表删除操作：线性探测法使用懒惰删除（标记 deleted），删除后的槽位仍可用于后续查找；链地址法直接从链表中移除。",
    code: `HashTable ht(11, linear);
ht.insert(47);
ht.insert(25);
ht.insert(36);
ht.insert(14);
ht.insert(58);
ht.search(36);
ht.delete(25);
ht.search(25);
ht.insert(25);`,
    supportedClass: "HashTable",
  },
  {
    id: "selectionsort",
    name: "选择排序",
    nameEn: "Selection Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "easy",
    examFrequency: 3,
    description:
      "选择排序：每趟在未排序区间找到最小元素，与未排序区间的首元素交换。时间复杂度 O(n^2)，不稳定排序。",
    code: `SelectionSort s;
s.sort(64, 25, 12, 22, 11, 90, 45);`,
    supportedClass: "SelectionSort",
  },
  {
    id: "shellsort",
    name: "希尔排序",
    nameEn: "Shell Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "希尔排序：按增量序列分组进行插入排序，增量逐渐缩小至 1。是插入排序的改进版，时间复杂度取决于增量序列。",
    code: `ShellSort s;
s.sort(64, 25, 12, 22, 11, 90, 45, 38, 72, 56);`,
    supportedClass: "ShellSort",
  },
  {
    id: "naivestr",
    name: "朴素模式匹配",
    nameEn: "Naive String Matching",
    subject: "data-structures",
    category: "searching",
    difficulty: "easy",
    examFrequency: 3,
    description:
      "朴素模式匹配（BF 算法）：逐字符比较，失配时主串指针回退到 i-j+1，模式串重置为 0。最坏时间复杂度 O(mn)。",
    code: `NaiveStr ns;
ns.match("ababcabcacbab", "abcac");`,
    supportedClass: "NaiveStr",
  },
  {
    id: "unionfind",
    name: "并查集",
    nameEn: "Union-Find (Disjoint Set)",
    subject: "data-structures",
    category: "linear",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "并查集：支持查找元素所属集合和合并两个集合。使用路径压缩 + 按秩合并优化，接近 O(1) 均摊复杂度。",
    code: `UnionFind uf;
uf.init(8);
uf.union(0, 1);
uf.union(2, 3);
uf.union(4, 5);
uf.union(6, 7);
uf.union(1, 3);
uf.find(0);
uf.union(5, 7);`,
    supportedClass: "UnionFind",
  },
  {
    id: "activity-selection",
    name: "活动选择",
    nameEn: "Activity Selection",
    subject: "data-structures",
    category: "greedy",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "活动选择问题：给定一组活动（开始时间、结束时间），选出不冲突的最大兼容活动子集。贪心策略：按结束时间排序，每次选最早结束的活动。",
    code: `ActivitySelection as;
as.select(1, 4, 3, 5, 0, 6, 5, 7, 3, 9, 5, 9, 6, 10, 8, 11, 8, 12, 2, 14, 12, 16);`,
    supportedClass: "ActivitySelection",
  },
  {
    id: "countingsort",
    name: "计数排序",
    nameEn: "Counting Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "计数排序：统计每个值的出现次数，累加得到前缀和，反向填充输出数组。时间复杂度 O(n+k)，稳定排序，非比较排序。",
    code: `CountingSort s;
s.sort(4, 2, 2, 8, 3, 3, 1);`,
    supportedClass: "CountingSort",
  },
  {
    id: "radixsort",
    name: "基数排序",
    nameEn: "Radix Sort (LSD)",
    subject: "data-structures",
    category: "sorting",
    difficulty: "hard",
    examFrequency: 3,
    description:
      "基数排序（LSD）：从低位到高位，按每位数字分配到 0-9 号桶，再按桶序收集。时间复杂度 O(d(n+k))，稳定排序。",
    code: `RadixSort s;
s.sort(170, 45, 75, 90, 802, 24, 2, 66);`,
    supportedClass: "RadixSort",
  },
  {
    id: "btree-insert",
    name: "B 树插入",
    nameEn: "B-Tree Insertion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "B 树插入：沿根到叶子查找插入位置，若叶子节点已满则分裂并将中间键提升到父节点。保持多路平衡搜索树性质。",
    code: `BTree bt(3);
bt.insert(1, 7, 4, 10, 17, 21, 31, 25, 19, 20);`,
    supportedClass: "BTree",
  },
  {
    id: "bplustree-insert",
    name: "B+ 树插入",
    nameEn: "B+ Tree Insertion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "B+ 树插入：数据只在叶子节点存储，叶子节点通过链表相连。插入时若溢出则分裂并提升最小键到父节点。",
    code: `BPlusTree bt(3);
bt.insert(1, 4, 7, 10, 17, 21, 31, 25, 19, 20);`,
    supportedClass: "BPlusTree",
  },
  {
    id: "trie-insert",
    name: "Trie 字典树",
    nameEn: "Trie (Prefix Tree)",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "Trie 字典树：每个节点代表一个字符，从根到某节点的路径对应一个字符串前缀。支持高效的字符串插入和查找。",
    code: `Trie t;
t.insert("apple");
t.insert("app");
t.insert("apply");
t.insert("banana");
t.search("app");
t.search("apple");
t.search("ban");`,
    supportedClass: "Trie",
  },
  {
    id: "knapsack-01",
    name: "0-1 背包",
    nameEn: "0-1 Knapsack Problem",
    subject: "data-structures",
    category: "dp",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "0-1 背包问题：n 个物品，每个物品有重量和价值，背包容量 W。每个物品只能选或不选，求最大价值。dp[i][j] = max(dp[i-1][j], dp[i-1][j-w[i]]+v[i])",
    code: `Knapsack ks;
ks.solve(2, 6, 2, 3, 6, 5, 5, 4, 4, 6, 10);`,
    supportedClass: "Knapsack",
  },
  {
    id: "lcs",
    name: "最长公共子序列",
    nameEn: "Longest Common Subsequence",
    subject: "data-structures",
    category: "dp",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "LCS 问题：给定两个字符串，找到最长公共子序列。dp[i][j] = s1[i]==s2[j] ? dp[i-1][j-1]+1 : max(dp[i-1][j], dp[i][j-1])",
    code: `LCS l;
l.solve("ABCBDAB", "BDCABA");`,
    supportedClass: "LCS",
  },
  {
    id: "edit-distance",
    name: "编辑距离",
    nameEn: "Edit Distance",
    subject: "data-structures",
    category: "dp",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "编辑距离（Levenshtein Distance）：将字符串 s1 转换为 s2 所需的最少编辑操作次数（插入、删除、替换）。dp[i][j] = s1[i-1]==s2[j-1] ? dp[i-1][j-1] : min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+1)",
    code: `EditDistance ed;
ed.solve("kitten", "sitting");`,
    supportedClass: "EditDistance",
  },
  {
    id: "matrix-chain",
    name: "矩阵链乘法",
    nameEn: "Matrix Chain Multiplication",
    subject: "data-structures",
    category: "dp",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "矩阵链乘法：给定矩阵维度序列，找到最优括号化方案使标量乘法次数最少。m[i][j] = min(m[i][k]+m[k+1][j]+p[i-1]*p[k]*p[j])",
    code: `MatrixChain mc;
mc.solve(30, 35, 15, 5, 10, 20, 25);`,
    supportedClass: "MatrixChain",
  },
  {
    id: "lis",
    name: "最长递增子序列",
    nameEn: "Longest Increasing Subsequence",
    subject: "data-structures",
    category: "dp",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "LIS 问题：在数组中找到最长的严格递增子序列。O(n²) DP: dp[i] = max(dp[j]+1)，其中 j<i 且 arr[j]<arr[i]。",
    code: `LIS lis;
lis.solve(10, 9, 2, 5, 3, 7, 101, 18);`,
    supportedClass: "LIS",
  },
  {
    id: "graph-bellman-ford",
    name: "Bellman-Ford 最短路",
    nameEn: "Bellman-Ford Shortest Path",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "Bellman-Ford 单源最短路径：对所有边进行 n-1 轮松弛，可处理负权边，还能检测负权环。时间复杂度 O(VE)。",
    code: `Graph g(5);
g.addEdge(0, 1, 4);
g.addEdge(0, 2, 2);
g.addEdge(1, 2, 3);
g.addEdge(2, 1, 1);
g.addEdge(1, 3, 2);
g.addEdge(1, 4, 3);
g.addEdge(2, 3, 4);
g.addEdge(2, 4, 5);
g.bellmanFord(0);`,
    supportedClass: "Graph",
  },
  {
    id: "graph-bipartite",
    name: "二分图检测",
    nameEn: "Bipartite Graph Check",
    subject: "data-structures",
    category: "graph",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "二分图检测：使用 BFS 染色法，将相邻节点染不同颜色，若出现冲突则不是二分图。二分图可用于匹配问题。",
    code: `Graph g(6);
g.addEdge(0, 1, 1);
g.addEdge(0, 3, 1);
g.addEdge(1, 2, 1);
g.addEdge(2, 3, 1);
g.addEdge(2, 4, 1);
g.addEdge(3, 5, 1);
g.addEdge(4, 5, 1);
g.isBipartite();`,
    supportedClass: "Graph",
  },
  {
    id: "graph-euler",
    name: "欧拉路径",
    nameEn: "Euler Path",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 3,
    description:
      "欧拉路径/回路：使用 Hierholzer 算法，找到经过每条边恰好一次的路径。奇数度节点为 0 个时为欧拉回路，2 个时为欧拉路径。",
    code: `Graph g(4);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 2, 1);
g.addEdge(2, 3, 1);
g.addEdge(3, 1, 1);
g.eulerPath();`,
    supportedClass: "Graph",
  },
  {
    id: "splay-insert",
    name: "Splay 树",
    nameEn: "Splay Tree",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 3,
    description:
      "Splay 树：每次操作后将访问节点通过 zig/zig-zig/zig-zag 旋转到根，具有 amortized O(log n) 性质。支持 insert 和 search。",
    code: `SplayTree tree;
tree.insert(10);
tree.insert(20);
tree.insert(30);
tree.insert(5);
tree.insert(15);
tree.search(10);`,
    supportedClass: "SplayTree",
  },
  {
    id: "twothree-insert",
    name: "2-3 树插入",
    nameEn: "2-3 Tree Insertion",
    subject: "data-structures",
    category: "tree",
    difficulty: "hard",
    examFrequency: 3,
    description:
      "2-3 树：节点可含 1 或 2 个 key，2 或 3 个子节点。插入时若叶子溢出则分裂并向上提升中间 key，保持完美平衡。",
    code: `TwoThreeTree tree;
tree.insert(10, 20, 5, 6, 12, 30, 7, 17);`,
    supportedClass: "TwoThreeTree",
  },
  {
    id: "skiplist",
    name: "跳表",
    nameEn: "Skip List",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "跳表：多层链表结构，上层是下层的「快速通道」。支持 O(log n) 的查找和插入，是平衡树的概率替代方案。",
    code: `SkipList sl;
sl.insert(3);
sl.insert(6);
sl.insert(7);
sl.insert(9);
sl.insert(12);
sl.insert(19);
sl.insert(17);
sl.search(12);`,
    supportedClass: "SkipList",
  },
  {
    id: "fractional-knapsack",
    name: "分数背包",
    nameEn: "Fractional Knapsack",
    subject: "data-structures",
    category: "greedy",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "分数背包问题：物品可以分割装入背包。贪心策略：按单位价值（价值/重量）降序排序，依次装入，装不下则取部分。时间复杂度 O(n log n)。",
    code: `FractionalKnapsack fk;
fk.solve(50, 10, 60, 20, 100, 30, 120, 20);`,
    supportedClass: "FractionalKnapsack",
  },
  {
    id: "job-scheduling",
    name: "作业调度",
    nameEn: "Job Scheduling",
    subject: "data-structures",
    category: "greedy",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "带期限的作业调度问题：每个作业有截止时间和利润，每个时间槽只能执行一个作业。贪心策略：按利润降序处理，将作业安排到截止时间前最晚的空闲槽。",
    code: `JobScheduling js;
js.solve(2, 100, 1, 19, 2, 27, 1, 25, 3, 15);`,
    supportedClass: "JobScheduling",
  },
  {
    id: "graph-tarjan",
    name: "Tarjan 强连通分量",
    nameEn: "Tarjan SCC",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "Tarjan 算法基于 DFS 求有向图强连通分量。维护 dfn（时间戳）和 low（最早可达祖先），当 low == dfn 时弹出栈中节点形成一个 SCC。",
    code: `Graph g(8);
g.addEdge(0, 1, 1);
g.addEdge(1, 2, 1);
g.addEdge(2, 0, 1);
g.addEdge(2, 3, 1);
g.addEdge(3, 4, 1);
g.addEdge(4, 5, 1);
g.addEdge(4, 7, 1);
g.addEdge(5, 6, 1);
g.addEdge(6, 4, 1);
g.addEdge(6, 7, 1);
g.tarjan();`,
    supportedClass: "Graph",
  },
  {
    id: "graph-kosaraju",
    name: "Kosaraju 强连通分量",
    nameEn: "Kosaraju SCC",
    subject: "data-structures",
    category: "graph",
    difficulty: "hard",
    examFrequency: 3,
    description:
      "Kosaraju 算法两遍 DFS 求强连通分量：第一遍在原图上 DFS 收集逆后序，第二遍在转置图上按逆后序 DFS，每次 DFS 树即为一个 SCC。",
    code: `Graph g(8);
g.addEdge(0, 1, 1);
g.addEdge(1, 2, 1);
g.addEdge(2, 0, 1);
g.addEdge(2, 3, 1);
g.addEdge(3, 4, 1);
g.addEdge(4, 5, 1);
g.addEdge(4, 7, 1);
g.addEdge(5, 6, 1);
g.addEdge(6, 4, 1);
g.addEdge(6, 7, 1);
g.kosaraju();`,
    supportedClass: "Graph",
  },
  {
    id: "graph-coloring",
    name: "图着色",
    nameEn: "Graph Coloring",
    subject: "data-structures",
    category: "graph",
    difficulty: "medium",
    examFrequency: 3,
      description:
      "贪心图着色算法：按节点顺序遍历，对每个节点选择未被邻居使用的最小颜色编号。所需颜色数即为图的色数上界。",
    code: `Graph g(6);
g.addEdge(0, 1, 1);
g.addEdge(0, 2, 1);
g.addEdge(1, 2, 1);
g.addEdge(1, 3, 1);
g.addEdge(2, 4, 1);
g.addEdge(3, 4, 1);
g.addEdge(3, 5, 1);
g.addEdge(4, 5, 1);
g.graphColoring();`,
    supportedClass: "Graph",
  },
  {
    id: "bucket-sort",
    name: "桶排序",
    nameEn: "Bucket Sort",
    subject: "data-structures",
    category: "sorting",
    difficulty: "medium",
    examFrequency: 2,
    description:
      "桶排序：将元素按值域分到多个桶中，桶内排序后顺序收集。平均时间复杂度 O(n)，是稳定排序。",
    code: `BucketSort bs;
bs.sort(29, 25, 3, 49, 9, 37, 21, 43);`,
    supportedClass: "BucketSort",
  },
  {
    id: "string-hash",
    name: "字符串哈希",
    nameEn: "String Hashing",
    subject: "data-structures",
    category: "searching",
    difficulty: "hard",
    examFrequency: 3,
    description:
      "多项式滚动哈希：H[i] = (H[i-1] × base + charCode) mod P。支持 O(1) 子串哈希查询，用于字符串匹配和判重。",
    code: `StringHash sh;
sh.hash("abcabcabc", 1, 3, 4, 6, 7, 9);`,
    supportedClass: "StringHash",
  },

  // ── 操作系统 ──

  {
    id: "os-fcfs",
    name: "先来先服务调度",
    nameEn: "FCFS Scheduling",
    subject: "operating-systems",
    category: "os-scheduling",
    difficulty: "easy",
    examFrequency: 5,
    description:
      "先来先服务（FCFS）调度算法：按进程到达顺序依次执行。非抢占式，简单但平均等待时间较长。",
    code: `ProcessScheduler ps;
ps.fcfs(0, 5, 1, 3, 2, 8, 3, 6);`,
    supportedClass: "ProcessScheduler",
  },
  {
    id: "os-sjf",
    name: "短作业优先调度",
    nameEn: "SJF Scheduling",
    subject: "operating-systems",
    category: "os-scheduling",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "短作业优先（SJF）调度算法：选择就绪队列中突发时间最短的进程执行。非抢占式，平均等待时间最优。",
    code: `ProcessScheduler ps;
ps.sjf(0, 7, 2, 4, 4, 1, 5, 4);`,
    supportedClass: "ProcessScheduler",
  },
  {
    id: "os-rr",
    name: "时间片轮转调度",
    nameEn: "Round Robin Scheduling",
    subject: "operating-systems",
    category: "os-scheduling",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "时间片轮转（RR）调度算法：就绪进程按 FIFO 排列，每个进程执行一个时间片后轮到下一个。公平但上下文切换开销较大。",
    code: `ProcessScheduler ps;
ps.rr(0, 5, 1, 3, 2, 8, 3, 6, 2);`,
    supportedClass: "ProcessScheduler",
  },
  {
    id: "os-fifo",
    name: "FIFO 页面替换",
    nameEn: "FIFO Page Replacement",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "easy",
    examFrequency: 5,
    description:
      "先进先出（FIFO）页面替换算法：当发生缺页时，替换最早进入内存的页面。实现简单但可能产生 Belady 异常。",
    code: `PageReplacer pr;
pr.fifo(3, 7, 0, 1, 2, 0, 3, 0, 4, 2, 3);`,
    supportedClass: "PageReplacer",
  },
  {
    id: "os-lru",
    name: "LRU 页面替换",
    nameEn: "LRU Page Replacement",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "最近最少使用（LRU）页面替换算法：替换最近最长时间未被访问的页面。利用时间局部性原理，性能接近 OPT。",
    code: `PageReplacer pr;
pr.lru(3, 7, 0, 1, 2, 0, 3, 0, 4, 2, 3);`,
    supportedClass: "PageReplacer",
  },
  {
    id: "os-opt",
    name: "最佳页面替换",
    nameEn: "OPT Page Replacement",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "最佳页面替换（OPT）算法：替换未来最长时间不会被使用的页面。理论最优，但无法实际实现，用于性能比较。",
    code: `PageReplacer pr;
pr.opt(3, 7, 0, 1, 2, 0, 3, 0, 4, 2, 3);`,
    supportedClass: "PageReplacer",
  },
  {
    id: "os-banker",
    name: "银行家算法",
    nameEn: "Banker's Algorithm",
    subject: "operating-systems",
    category: "os-deadlock",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "银行家算法：通过安全性算法避免死锁。进程请求资源时，先模拟分配，检查系统是否仍处于安全状态，只有安全才真正分配。",
    code: `Banker bk;
bk.init(3, 10, 5, 7);
bk.addProcess(7, 5, 3, 0, 1, 0);
bk.addProcess(3, 2, 2, 2, 0, 0);
bk.addProcess(9, 0, 2, 3, 0, 2);
bk.addProcess(2, 2, 2, 2, 1, 1);
bk.request(1, 1, 0, 2);`,
    supportedClass: "Banker",
  },
  {
    id: "os-first-fit",
    name: "首次适应内存分配",
    nameEn: "First Fit Memory Allocation",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "easy",
    examFrequency: 4,
    description:
      "首次适应算法：从头开始搜索，找到第一个足够大的空闲块进行分配。速度快但容易产生外部碎片。",
    code: `MemoryAllocator ma;
ma.firstFit(640, 212, 417, 112, 426);`,
    supportedClass: "MemoryAllocator",
  },
  {
    id: "os-best-fit",
    name: "最佳适应内存分配",
    nameEn: "Best Fit Memory Allocation",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "最佳适应算法：搜索所有空闲块，找到能满足请求的最小块进行分配。减少大块浪费但产生很多小碎片。",
    code: `MemoryAllocator ma;
ma.bestFit(640, 212, 417, 112, 426);`,
    supportedClass: "MemoryAllocator",
  },
  {
    id: "os-disk-fcfs",
    name: "FCFS 磁盘调度",
    nameEn: "FCFS Disk Scheduling",
    subject: "operating-systems",
    category: "os-disk",
    difficulty: "easy",
    examFrequency: 4,
    description:
      "先来先服务磁盘调度：按请求到达的顺序依次服务。公平但寻道距离较大。",
    code: `DiskScheduler ds;
ds.fcfs(53, 98, 183, 37, 122, 14, 124, 65, 67);`,
    supportedClass: "DiskScheduler",
  },
  {
    id: "os-disk-scan",
    name: "SCAN 磁盘调度",
    nameEn: "SCAN Disk Scheduling",
    subject: "operating-systems",
    category: "os-disk",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "扫描算法（电梯算法）：磁头沿一个方向移动到头，服务沿途请求，然后反向。寻道性能较好且响应时间方差小。",
    code: `DiskScheduler ds;
ds.scan(53, 98, 183, 37, 122, 14, 124, 65, 67, 1);`,
    supportedClass: "DiskScheduler",
  },
  {
    id: "os-producer-consumer",
    name: "生产者-消费者问题",
    nameEn: "Producer-Consumer Problem",
    subject: "operating-systems",
    category: "os-sync",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "经典进程同步问题：生产者向缓冲区放数据，消费者从中取数据。通过 mutex、empty、full 三个信号量实现互斥与同步。",
    code: `ProducerConsumer pc;
pc.init(5);
pc.produce(10);
pc.produce(20);
pc.produce(30);
pc.consume();
pc.produce(40);
pc.consume();
pc.consume();`,
    supportedClass: "ProducerConsumer",
  },

  // ── 计算机网络 ──

  {
    id: "cn-crc",
    name: "CRC 校验",
    nameEn: "CRC Check",
    subject: "computer-networks",
    category: "cn-link",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "CRC 循环冗余校验：在数据后附加 FCS（帧检验序列），使用模2除法（异或运算）计算余数作为校验码。接收方用同样的生成多项式验证数据完整性。",
    code: `CRC crc;
crc.compute(1101011011, 10011);`,
    supportedClass: "CRC",
  },
  {
    id: "cn-gbn",
    name: "Go-Back-N 协议",
    nameEn: "Go-Back-N Protocol",
    subject: "computer-networks",
    category: "cn-transport",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "Go-Back-N 滑动窗口协议：发送方维护一个大小为 N 的窗口，连续发送多个帧而不等待确认。若某帧丢失或出错，从该帧开始的所有帧都需要重传。",
    code: `SlidingWindow sw;
sw.gbn(4, 8, 3, 6);`,
    supportedClass: "SlidingWindow",
  },
  {
    id: "cn-sr",
    name: "选择性重传协议",
    nameEn: "Selective Repeat Protocol",
    subject: "computer-networks",
    category: "cn-transport",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "选择性重传（SR）协议：只重传出错或丢失的帧，而非回退。接收方可缓存乱序到达的帧，提高了信道利用率，但实现更复杂。",
    code: `SlidingWindow sw;
sw.sr(4, 8, 3, 6);`,
    supportedClass: "SlidingWindow",
  },
  {
    id: "cn-subnet",
    name: "IP 子网划分",
    nameEn: "IP Subnetting",
    subject: "computer-networks",
    category: "cn-network",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "IP 子网划分：将一个网络划分为多个子网，通过借用主机位来创建子网位。需要计算子网掩码、网络地址、广播地址和可用主机范围。",
    code: `Subnetting sub;
sub.divide(192, 168, 1, 0, 24, 4);`,
    supportedClass: "Subnetting",
  },
  {
    id: "cn-distance-vector",
    name: "距离向量路由",
    nameEn: "Distance Vector Routing",
    subject: "computer-networks",
    category: "cn-network",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "距离向量路由算法（Bellman-Ford）：每个节点维护到所有目的地的距离向量，通过与邻居交换信息逐步收敛。D(x) = min{c(x,y) + D(y)}。",
    code: `DistanceVector dv;
dv.init(4);
dv.link(0, 1, 2);
dv.link(0, 2, 7);
dv.link(1, 2, 1);
dv.link(1, 3, 3);
dv.link(2, 3, 5);
dv.run();`,
    supportedClass: "DistanceVector",
  },
  {
    id: "cn-tcp-state",
    name: "TCP 状态机",
    nameEn: "TCP State Machine",
    subject: "computer-networks",
    category: "cn-transport",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "TCP 状态转换：展示 TCP 连接的完整生命周期，包括三次握手（SYN→SYN+ACK→ACK）建立连接和四次挥手（FIN→ACK→FIN→ACK）断开连接的状态变化过程。",
    code: `TCPStateMachine tcp;
tcp.full();`,
    supportedClass: "TCPStateMachine",
  },

  // ── 计算机组成原理 ──

  {
    id: "co-twos-complement",
    name: "补码加减法",
    nameEn: "Two's Complement Addition/Subtraction",
    subject: "computer-organization",
    category: "co-arithmetic",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "补码加减法：计算机中使用补码表示有符号数，加法直接相加，减法转为加上减数的补码。包含溢出检测和标志位计算。",
    code: `TwosComplement tc;
tc.add(6, -3, 8);
tc.sub(6, 3, 8);`,
    supportedClass: "TwosComplement",
  },
  {
    id: "co-ieee754",
    name: "IEEE 754 浮点数",
    nameEn: "IEEE 754 Floating Point",
    subject: "computer-organization",
    category: "co-arithmetic",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "IEEE 754 单精度浮点数编码/解码：符号位(1位) + 指数(8位,偏移127) + 尾数(23位,隐含前导1)。支持规格化数、非规格化数、零、无穷、NaN。",
    code: `IEEE754 fp;
fp.encode(6.625);
fp.encode(-12.375);
fp.decode("01000001101010100000000000000000");`,
    supportedClass: "IEEE754",
  },
  {
    id: "co-booth",
    name: "Booth 乘法",
    nameEn: "Booth Multiplication",
    subject: "computer-organization",
    category: "co-arithmetic",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "Booth 乘法算法：通过检查乘数末两位(Q₀Q₋₁)决定加减被乘数，再算术右移。可处理有符号数乘法，减少加法次数。",
    code: `BoothMultiply bm;
bm.multiply(7, -3, 4);`,
    supportedClass: "BoothMultiply",
  },
  {
    id: "co-cache-direct",
    name: "Cache 直接映射",
    nameEn: "Cache Direct Mapping",
    subject: "computer-organization",
    category: "co-cache",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "Cache 直接映射：主存块只能映射到唯一的 Cache 行（块号 % Cache行数）。简单但冲突率高，适合地址随机分布的场景。",
    code: `CacheMapping cm;
cm.direct(4, 16, 0, 4, 8, 0, 6, 8);`,
    supportedClass: "CacheMapping",
  },
  {
    id: "co-cache-set",
    name: "Cache 组相联映射",
    nameEn: "Cache Set-Associative Mapping",
    subject: "computer-organization",
    category: "co-cache",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "Cache 组相联映射：主存块映射到固定组，组内多路可放。路内采用 LRU 替换策略。兼顾直接映射的简单性和全相联的低冲突率。",
    code: `CacheMapping cm;
cm.setAssoc(2, 2, 16, 0, 1, 4, 5, 0, 1);`,
    supportedClass: "CacheMapping",
  },
  {
    id: "co-pipeline-basic",
    name: "基本指令流水线",
    nameEn: "Basic Instruction Pipeline",
    subject: "computer-organization",
    category: "co-pipeline",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "基本指令流水线：IF(取指)→ID(译码)→EX(执行)→MEM(访存)→WB(写回)。每周期启动一条新指令，N 条指令需要 K+N-1 个周期。",
    code: `Pipeline pl;
pl.basic(5, 5);`,
    supportedClass: "Pipeline",
  },
  {
    id: "co-pipeline-hazard",
    name: "带数据冒险的流水线",
    nameEn: "Pipeline with Data Hazards",
    subject: "computer-organization",
    category: "co-pipeline",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "数据冒险流水线：当后继指令需要前序指令的结果时，必须插入 stall（气泡）等待。冒险格式 'i-j' 表示指令 i 的结果被指令 j 使用。",
    code: `Pipeline pl;
pl.hazard(5, 5, "1-2", "3-4");`,
    supportedClass: "Pipeline",
  },

  // ── 操作系统（新增） ──

  {
    id: "os-priority",
    name: "优先级调度",
    nameEn: "Priority Scheduling",
    subject: "operating-systems",
    category: "os-scheduling",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "非抢占式优先级调度：选择优先级最高（数字最小）的进程优先执行。优先级相同时按到达时间排序。需计算等待时间和周转时间。",
    code: `PriorityScheduler ps;
ps.schedule(0, 5, 2, 1, 3, 1, 2, 8, 3, 3, 6, 2);`,
    supportedClass: "PriorityScheduler",
  },
  {
    id: "os-clock",
    name: "CLOCK 页面替换",
    nameEn: "CLOCK Page Replacement",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "CLOCK（时钟）页面替换算法：使用循环指针和引用位实现。当需要替换时，扫描帧并给引用位为 1 的帧\"第二次机会\"（清零并跳过），选择引用位为 0 的帧替换。",
    code: `ClockReplacement cr;
 cr.clock(3, 7, 0, 1, 2, 0, 3, 0, 4, 2, 3);`,
    supportedClass: "ClockReplacement",
  },
  {
    id: "os-disk-cscan",
    name: "C-SCAN 磁盘调度",
    nameEn: "C-SCAN Disk Scheduling",
    subject: "operating-systems",
    category: "os-disk",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "循环扫描（C-SCAN）算法：磁头单向移动到磁盘一端后直接跳回另一端继续服务。消除了 SCAN 对两端请求的不公平待遇。",
    code: `CScanDisk ds;
 ds.cscan(53, 199, 98, 183, 37, 122, 14, 124, 65, 67);`,
    supportedClass: "CScanDisk",
  },
  {
    id: "os-readers-writers",
    name: "读者-写者问题",
    nameEn: "Readers-Writers Problem",
    subject: "operating-systems",
    category: "os-sync",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "读者优先的读者-写者问题：允许多个读者同时读取，但写者必须独占。通过 readcount、writecount、rw_mutex、mutex 四个信号量实现。读者优先可能导致写者饥饿。",
    code: `ReadersWriters rw;
 rw.reader(1);
 rw.reader(2);
 rw.writer(1);
 rw.reader(3);
 rw.writer(2);`,
    supportedClass: "ReadersWriters",
  },
  {
    id: "os-dining",
    name: "哲学家就餐问题",
    nameEn: "Dining Philosophers Problem",
    subject: "operating-systems",
    category: "os-sync",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "哲学家就餐问题：n 个哲学家围坐圆桌，左右各一根筷子。使用奇偶策略（奇数号先拿左筷子，偶数号先拿右筷子）避免死锁。init 初始化，think 思考（放下筷子），eat 就餐（获取筷子）。",
    code: `DiningPhilosophers dp;
 dp.init(5);
 dp.think(0);
 dp.eat(0);
 dp.think(2);
 dp.eat(2);
 dp.eat(4);`,
    supportedClass: "DiningPhilosophers",
  },
  {
    id: "os-deadlock-detect",
    name: "死锁检测",
    nameEn: "Deadlock Detection",
    subject: "operating-systems",
    category: "os-deadlock",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "死锁检测算法：基于资源分配矩阵和请求矩阵，通过类似安全性检查的算法判断是否存在死锁。若某进程的请求无法被当前可用资源满足且形成循环等待，则该进程处于死锁状态。",
    code: `DeadlockDetection dd;
 dd.init(3, 3);
 dd.allocate(0, 0, 1);
 dd.allocate(0, 1, 2);
 dd.allocate(1, 1, 1);
 dd.allocate(1, 2, 2);
 dd.allocate(2, 0, 1);
 dd.request(0, 2, 1);
 dd.request(1, 0, 2);
 dd.request(2, 1, 1);
 dd.detect();`,
    supportedClass: "DeadlockDetection",
  },
  {
    id: "os-worst-fit",
    name: "最坏适应内存分配",
    nameEn: "Worst Fit Memory Allocation",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "easy",
    examFrequency: 3,
    description:
      "最坏适应算法：选择最大的空闲块进行分配，以减少外部碎片。分配后剩余空间较大，可能被后续请求利用。",
    code: `MemoryAllocator ma;
 ma.worstFit(640, 130, 60, 100, 200, 140, 80, 70);`,
    supportedClass: "MemoryAllocator",
  },
  {
    id: "os-paging",
    name: "分页地址转换",
    nameEn: "Paging Address Translation",
    subject: "operating-systems",
    category: "os-memory",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "分页存储管理地址转换：将逻辑地址分为页号和页内偏移，通过页表查找页号对应的页框号，计算物理地址 = 页框号 × 页大小 + 页内偏移。",
    code: `Paging pg;
 pg.translate(8192, 4096, 2, 5, 8, 3, 7);`,
    supportedClass: "Paging",
  },

  // ── 数据结构（新增） ──

  {
    id: "ds-uf-compress",
    name: "并查集路径压缩",
    nameEn: "Union-Find with Path Compression",
    subject: "data-structures",
    category: "linear",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "并查集（带路径压缩）可视化：makeset 创建集合，union 合并两个集合，find 查找根节点并展示路径压缩过程。路径压缩使后续查找更高效。",
    code: `UFCompress uf;
uf.makeset(6);
uf.union(0, 1);
uf.union(2, 3);
uf.union(4, 5);
uf.union(1, 3);
uf.find(5);
uf.union(3, 5);`,
    supportedClass: "UFCompress",
  },
  {
    id: "ds-heap-ops",
    name: "二叉堆操作",
    nameEn: "Binary Heap Operations",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "最小堆的基本操作：insert 插入（上滤调整）、extract 取堆顶（下滤调整）、build 建堆（Floyd 算法）。完全二叉树形态，保持堆序性质。",
    code: `BinaryHeap h;
h.build(9, 5, 2, 7, 1, 8, 3, 6, 4);
h.insert(0);
h.extract();
h.insert(2);`,
    supportedClass: "BinaryHeap",
  },
  {
    id: "ds-huffman-decode",
    name: "哈夫曼编码解码",
    nameEn: "Huffman Encoding and Decoding",
    subject: "data-structures",
    category: "tree",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "哈夫曼编码解码：build 根据频率序列构建哈夫曼树，自动生成编码表。encode 对指定字符进行编码，展示沿树路径的编码过程。左走 0，右走 1。",
    code: `HuffmanDecode hf;
hf.build(5, 9, 12, 13, 16, 45);
hf.encode("D");
hf.encode("A");`,
    supportedClass: "HuffmanDecode",
  },

  // ── 计算机组成原理（新增） ──

  {
    id: "co-float-add",
    name: "浮点数加减法",
    nameEn: "Floating-Point Addition",
    subject: "computer-organization",
    category: "co-arithmetic",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "IEEE 754 单精度浮点加法：对阶（小阶向大阶看齐）→ 尾数相加 → 规格化 → 舍入 → 溢出判断。展示完整的浮点运算五步流程。",
    code: `FloatArithmetic fa;
fa.add(0.75, 0.5);`,
    supportedClass: "FloatArithmetic",
  },
  {
    id: "co-cache-fully",
    name: "全相联 Cache 映射",
    nameEn: "Fully Associative Cache Mapping",
    subject: "computer-organization",
    category: "co-cache",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "全相联 Cache：主存块可映射到任意 Cache 行，采用 LRU 替换策略。冲突率最低但硬件成本高，适合小容量 Cache。",
    code: `CacheFullyAssoc ca;
ca.access(4, 16, 0, 4, 8, 16, 0, 32, 8);`,
    supportedClass: "CacheFullyAssoc",
  },
  {
    id: "co-virtual-addr",
    name: "虚拟地址转换",
    nameEn: "Virtual Address Translation",
    subject: "computer-organization",
    category: "co-cache",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "虚拟地址到物理地址转换：分解虚拟地址为页号和页内偏移，通过页表查找物理页框号，拼接得到物理地址。支持缺页检测。",
    code: `VirtualAddress va;
va.translate(8192, 4096, 2, 1, 5, 1, 8, 1);`,
    supportedClass: "VirtualAddress",
  },
  {
    id: "co-sign-magnitude-mul",
    name: "原码一位乘法",
    nameEn: "Sign-Magnitude One-bit Multiplication",
    subject: "computer-organization",
    category: "co-arithmetic",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "原码一位乘法：符号位异或确定结果符号，绝对值部分逐位相乘。每次检查乘数最低位，为 1 则部分积加被乘数，然后逻辑右移。",
    code: `SignMagnitudeMul sm;
sm.multiply(11, 13, 5);`,
    supportedClass: "SignMagnitudeMul",
  },
  {
    id: "co-pipeline-superscalar",
    name: "超标量指令流水线",
    nameEn: "Superscalar Instruction Pipeline",
    subject: "computer-organization",
    category: "co-pipeline",
    difficulty: "hard",
    examFrequency: 4,
    description:
      "超标量流水线：每周期可同时发射多条指令。与单发射流水线对比，总周期显著减少。issueWidth 控制每周期最大发射数。",
    code: `PipelineSuperscalar ps;
ps.run(8, 2);`,
    supportedClass: "PipelineSuperscalar",
  },

  // ── 计算机网络（新增） ──

  {
    id: "cn-hamming",
    name: "海明码",
    nameEn: "Hamming Code",
    subject: "computer-networks",
    category: "cn-link",
    difficulty: "medium",
    examFrequency: 5,
    description:
      "海明码编码与纠错：encode 将数据编码为海明码（自动计算校验位），detect 检测接收码字中的错误并纠正一位错误。校验位放在 2^k 的位置。",
    code: `Hamming hc;
hc.encode(11);
hc.detect(15);`,
    supportedClass: "Hamming",
  },
  {
    id: "cn-csma",
    name: "CSMA/CD 退避",
    nameEn: "CSMA/CD Binary Exponential Backoff",
    subject: "computer-networks",
    category: "cn-link",
    difficulty: "medium",
    examFrequency: 4,
    description:
      "CSMA/CD 二进制指数退避：第 k 次冲突后，站点在 [0, 2^k - 1] 个时间槽中随机选择一个等待。退避值最小的站点获得发送权。展示多站点竞争和退避过程。",
    code: `CSMA cs;
cs.collide(4, 5);`,
    supportedClass: "CSMA",
  },
  {
    id: "cn-link-state",
    name: "OSPF 链路状态路由",
    nameEn: "OSPF Link-State Routing (Dijkstra)",
    subject: "computer-networks",
    category: "cn-network",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "链路状态路由（OSPF）：init 初始化节点，link 添加链路及代价，dijkstra 运行 Dijkstra 最短路径算法。展示每个节点的最短距离表和前驱信息。",
    code: `LinkState ls;
ls.init(5);
ls.link(0, 1, 2);
ls.link(0, 2, 5);
ls.link(1, 2, 2);
ls.link(1, 3, 4);
ls.link(2, 3, 1);
ls.link(2, 4, 3);
ls.link(3, 4, 2);
ls.dijkstra(0);`,
    supportedClass: "LinkState",
  },
  {
    id: "cn-nat",
    name: "NAT 地址转换",
    nameEn: "NAT Address Translation",
    subject: "computer-networks",
    category: "cn-network",
    difficulty: "easy",
    examFrequency: 4,
    description:
      "NAPT（网络地址端口转换）：将私有 IP + 端口映射为公有 IP + 端口。多个内部主机共享一个公网 IP 地址，通过不同端口号区分连接。",
    code: `NAT nat;
nat.translate("192.168.1.10", 3000, "192.168.1.11", 4000, "192.168.1.12", 5000);`,
    supportedClass: "NAT",
  },
  {
    id: "cn-tcp-congestion",
    name: "TCP 拥塞控制",
    nameEn: "TCP Congestion Control",
    subject: "computer-networks",
    category: "cn-transport",
    difficulty: "hard",
    examFrequency: 5,
    description:
      "TCP 拥塞控制模拟：慢启动（指数增长）→ 拥塞避免（线性增长）→ 快重传/快恢复（3次重复 ACK 触发）。simulate 参数为 RTT 数和丢包发生位置。",
    code: `TCPCongestion tc;
tc.simulate(20, 8);`,
    supportedClass: "TCPCongestion",
  },
];

export function getTemplateById(id: string): AlgorithmTemplate | undefined {
  const t = templates.find((t) => t.id === id);
  if (!t) return undefined;
  const pd = pseudocodes[id];
  const er = examReferences[id];
  return {
    ...t,
    ...(pd && !t.pseudocode ? { pseudocode: pd.pseudocode, pseudocodeLineMap: pd.pseudocodeLineMap } : {}),
    ...(er && !t.examReferences ? { examReferences: er } : {}),
  };
}

export function getTemplatesByCategory(
  category: AlgorithmTemplate["category"],
): AlgorithmTemplate[] {
  return templates.filter((t) => t.category === category);
}
