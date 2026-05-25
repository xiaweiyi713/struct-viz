import { pseudocodes } from "./pseudocodes";
import { examReferences, type ExamReference } from "./examReferences";

export interface AlgorithmTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: "linear" | "tree" | "graph" | "sorting" | "searching" | "dp" | "greedy";
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
    category: "greedy",
    difficulty: "medium",
    examFrequency: 3,
    description:
      "带期限的作业调度问题：每个作业有截止时间和利润，每个时间槽只能执行一个作业。贪心策略：按利润降序处理，将作业安排到截止时间前最晚的空闲槽。",
    code: `JobScheduling js;
js.solve(2, 100, 1, 19, 2, 27, 1, 25, 3, 15);`,
    supportedClass: "JobScheduling",
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
