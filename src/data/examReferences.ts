/**
 * 408 真题关联数据
 * 基于 2009-2024 年计算机统考 408 真题整理
 */

export interface ExamReference {
  year: number;
  question: string;
  topic: string;
}

export const examReferences: Record<string, ExamReference[]> = {
  "stack-basic": [
    { year: 2019, question: "选择题 2", topic: "栈的出入序列合法性" },
    { year: 2021, question: "选择题 1", topic: "栈的基本操作与后缀表达式" },
    { year: 2016, question: "选择题 2", topic: "栈在表达式求值中的应用" },
  ],
  "queue-basic": [
    { year: 2019, question: "选择题 1", topic: "循环队列的判满判空条件" },
    { year: 2020, question: "选择题 2", topic: "队列的出入操作" },
  ],
  "unionfind": [
    { year: 2015, question: "综合题 41", topic: "等价类划分与并查集" },
  ],
  "bst-insert": [
    { year: 2018, question: "选择题 6", topic: "BST 构造与查找效率" },
    { year: 2020, question: "选择题 7", topic: "BST 插入序列与树形态" },
    { year: 2012, question: "选择题 8", topic: "二叉排序树的查找过程" },
  ],
  "bst-delete": [
    { year: 2019, question: "选择题 8", topic: "BST 删除节点后树的变化" },
    { year: 2015, question: "综合题 41", topic: "BST 删除与调整" },
  ],
  "bst-search": [
    { year: 2018, question: "选择题 6", topic: "BST 查找效率与 ASL" },
  ],
  "rbtree-insert": [
    { year: 2018, question: "综合题 42", topic: "红黑树插入与调整" },
    { year: 2021, question: "选择题 9", topic: "红黑树的性质" },
    { year: 2016, question: "选择题 9", topic: "红黑树的插入调整过程" },
  ],
  "rbtree-delete": [
    { year: 2022, question: "选择题 8", topic: "红黑树删除调整" },
  ],
  "avl-insert": [
    { year: 2010, question: "选择题 7", topic: "AVL 树旋转操作" },
    { year: 2019, question: "选择题 9", topic: "平衡二叉树的插入与旋转" },
    { year: 2023, question: "选择题 7", topic: "AVL 树构造与旋转次数" },
  ],
  "avl-delete": [
    { year: 2013, question: "选择题 9", topic: "AVL 树删除与平衡调整" },
  ],
  "btree-insert": [
    { year: 2012, question: "选择题 9", topic: "B 树的插入与分裂" },
    { year: 2016, question: "选择题 8", topic: "B 树关键字数量与高度" },
    { year: 2020, question: "选择题 9", topic: "B 树的分裂过程" },
  ],
  "btree-delete": [
    { year: 2023, question: "选择题 8", topic: "B 树删除与合并" },
  ],
  "bplustree-insert": [
    { year: 2021, question: "选择题 8", topic: "B+ 树的叶子节点链表" },
  ],
  "huffman": [
    { year: 2010, question: "选择题 6", topic: "哈夫曼树构造与 WPL" },
    { year: 2017, question: "选择题 5", topic: "哈夫曼编码与字符集" },
    { year: 2022, question: "选择题 7", topic: "哈夫曼树的带权路径长度" },
  ],
  "dijkstra": [
    { year: 2011, question: "综合题 41", topic: "Dijkstra 最短路径算法" },
    { year: 2015, question: "选择题 7", topic: "最短路径算法比较" },
    { year: 2020, question: "选择题 10", topic: "Dijkstra 算法的时间复杂度" },
  ],
  "graph-bfs": [
    { year: 2013, question: "选择题 5", topic: "图的 BFS 遍历序列" },
    { year: 2019, question: "选择题 5", topic: "BFS 生成树" },
  ],
  "graph-dfs": [
    { year: 2015, question: "选择题 6", topic: "图的 DFS 遍历与拓扑排序" },
    { year: 2016, question: "选择题 6", topic: "DFS 生成树与回边" },
  ],
  "graph-prim": [
    { year: 2017, question: "综合题 42", topic: "Prim 最小生成树" },
    { year: 2021, question: "选择题 7", topic: "最小生成树性质" },
  ],
  "graph-kruskal": [
    { year: 2018, question: "选择题 8", topic: "Kruskal 算法的边选择" },
  ],
  "graph-topo": [
    { year: 2012, question: "选择题 6", topic: "拓扑排序与入度" },
    { year: 2017, question: "选择题 8", topic: "AOV 网与拓扑排序" },
    { year: 2023, question: "选择题 6", topic: "拓扑排序的唯一性" },
  ],
  "graph-floyd": [
    { year: 2022, question: "综合题 41", topic: "Floyd 算法与传递闭包" },
  ],
  "graph-critical": [
    { year: 2011, question: "选择题 8", topic: "AOE 网关键路径" },
    { year: 2014, question: "综合题 41", topic: "关键路径与最早最晚时间" },
    { year: 2020, question: "选择题 8", topic: "关键活动的判定条件" },
  ],
  "graph-bellman-ford": [
    { year: 2019, question: "选择题 6", topic: "含负权边的最短路径" },
  ],
  "quicksort": [
    { year: 2010, question: "选择题 10", topic: "快速排序的划分过程" },
    { year: 2015, question: "选择题 9", topic: "快速排序的时间复杂度" },
    { year: 2019, question: "选择题 10", topic: "快速排序的比较次数" },
    { year: 2022, question: "选择题 9", topic: "快速排序的划分与递归深度" },
  ],
  "heapsort": [
    { year: 2011, question: "选择题 9", topic: "堆排序的建堆过程" },
    { year: 2018, question: "选择题 10", topic: "堆的性质与调整" },
    { year: 2021, question: "选择题 10", topic: "堆排序的筛选过程" },
  ],
  "mergesort": [
    { year: 2014, question: "选择题 10", topic: "归并排序的合并过程" },
    { year: 2020, question: "选择题 11", topic: "归并排序的空间复杂度" },
  ],
  "bubblesort": [
    { year: 2016, question: "选择题 11", topic: "冒泡排序的趟数优化" },
  ],
  "insertionsort": [
    { year: 2017, question: "选择题 10", topic: "插入排序的比较次数" },
  ],
  "selectionsort": [
    { year: 2012, question: "选择题 10", topic: "选择排序的不稳定性" },
  ],
  "binarysearch": [
    { year: 2010, question: "选择题 8", topic: "折半查找的比较序列" },
    { year: 2014, question: "选择题 8", topic: "折半查找的判定树" },
    { year: 2018, question: "选择题 7", topic: "折半查找的 ASL" },
    { year: 2023, question: "选择题 9", topic: "有序表上的折半查找" },
  ],
  "kmp": [
    { year: 2015, question: "综合题 42", topic: "KMP 算法的 Next 数组计算" },
    { year: 2019, question: "选择题 7", topic: "模式匹配算法比较" },
    { year: 2022, question: "综合题 42", topic: "KMP 失配函数与匹配过程" },
  ],
  "hashtable-linear": [
    { year: 2011, question: "选择题 7", topic: "散列表的线性探测" },
    { year: 2018, question: "选择题 9", topic: "散列表的查找效率" },
    { year: 2021, question: "选择题 6", topic: "散列函数与冲突处理" },
  ],
  "hashtable-chain": [
    { year: 2014, question: "选择题 9", topic: "链地址法的平均查找长度" },
    { year: 2020, question: "选择题 6", topic: "散列表的装填因子" },
  ],
  "knapsack-01": [
    { year: 2014, question: "综合题 42", topic: "0-1 背包问题的动态规划" },
    { year: 2018, question: "选择题 11", topic: "动态规划求解背包问题" },
  ],
  "lcs": [
    { year: 2016, question: "综合题 42", topic: "最长公共子序列的 DP 求解" },
  ],
  "edit-distance": [
    { year: 2023, question: "综合题 41", topic: "编辑距离的动态规划" },
  ],
  "matrix-chain": [
    { year: 2012, question: "综合题 42", topic: "矩阵连乘的最优计算次序" },
  ],
  "lis": [
    { year: 2021, question: "选择题 11", topic: "最长递增子序列" },
  ],
  "activity-selection": [
    { year: 2017, question: "选择题 7", topic: "贪心算法的活动选择" },
  ],
  "shellsort": [
    { year: 2024, question: "选择题 10", topic: "希尔排序的增量序列" },
  ],
  "countingsort": [
    { year: 2020, question: "选择题 9", topic: "计数排序的稳定性" },
  ],
  "radixsort": [
    { year: 2013, question: "选择题 11", topic: "基数排序的趟数" },
  ],
  "trie-insert": [
    { year: 2023, question: "选择题 5", topic: "Trie 树的查找效率" },
  ],
};
