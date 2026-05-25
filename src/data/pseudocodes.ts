/**
 * 伪代码数据：为每个算法模板提供教科书级伪代码
 * pseudocode: 每行一条伪代码（不含行号）
 * pseudocodeLineMap: DSL 源码行号(1-based) → 伪代码行号(0-based)
 */

export interface PseudocodeData {
  pseudocode: string;
  pseudocodeLineMap: Record<number, number>;
}

export const pseudocodes: Record<string, PseudocodeData> = {
  "stack-basic": {
    pseudocode: `InitStack(S)
Push(S, 1)
Push(S, 2)
Push(S, 3)
x = Pop(S)        // x = 3
x = GetTop(S)     // x = 2`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 },
  },

  "queue-basic": {
    pseudocode: `InitQueue(Q)
Enqueue(Q, 1)
Enqueue(Q, 2)
Enqueue(Q, 3)
Enqueue(Q, 4)
x = Dequeue(Q)    // x = 1
x = GetHead(Q)    // x = 2`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 },
  },

  "unionfind": {
    pseudocode: `Init UF(n)
Union(0, 1)
Union(2, 3)
Union(0, 2)       // 路径压缩
Union(4, 5)
Union(6, 7)
Union(4, 6)
Find(0)           // 返回根
Find(4)
Union(0, 4)       // 按秩合并`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10 },
  },

  "bst-insert": {
    pseudocode: `BST-Insert(T, key)
  if T == NULL
    return new Node(key)
  if key < T.key
    T.left = BST-Insert(T.left, key)
  else if key > T.key
    T.right = BST-Insert(T.right, key)
  return T`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11 },
  },

  "bst-delete": {
    pseudocode: `BST-Delete(T, key)
  if T == NULL return NULL
  if key < T.key
    T.left = BST-Delete(T.left, key)
  else if key > T.key
    T.right = BST-Delete(T.right, key)
  else
    if T.left == NULL return T.right
    if T.right == NULL return T.left
    succ = Min(T.right)
    T.key = succ.key
    T.right = BST-Delete(T.right, succ.key)
  return T`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 6, 6: 8, 7: 10, 8: 12, 9: 13, 10: 15, 11: 16 },
  },

  "bst-search": {
    pseudocode: `BST-Search(T, key)
  if T == NULL return NULL
  if key == T.key return T
  if key < T.key
    return BST-Search(T.left, key)
  else
    return BST-Search(T.right, key)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5, 6: 7, 7: 9, 8: 11, 9: 13 },
  },

  "rbtree-insert": {
    pseudocode: `RB-Insert(T, key)
  z = BST-Insert(T, key)   // 标准 BST 插入
  z.color = RED
  while z.parent.color == RED
    if z.parent == z.pparent.left
      y = z.pparent.right   // 叔节点
      if y.color == RED      // Case 1: 叔红
        z.parent.color = BLACK
        y.color = BLACK
        z.pparent.color = RED
        z = z.pparent
      else
        if z == z.parent.right  // Case 2: LL 型
          z = z.parent
          Left-Rotate(T, z)
        z.parent.color = BLACK  // Case 3: LR 型
        z.pparent.color = RED
        Right-Rotate(T, z.pparent)
    else (对称处理右子树)
  T.root.color = BLACK`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 7, 7: 9, 8: 11, 9: 13, 10: 15, 11: 17 },
  },

  "rbtree-delete": {
    pseudocode: `RB-Delete(T, key)
  z = BST-Search(T, key)
  if z has < 2 children
    y = z, x = y's child
  else
    y = Successor(z), x = y's child
  Replace y with x
  if y was BLACK
    RB-Fixup(T, x)  // 双黑修复
      while x != root and x is BLACK
        // Case 1-4: 兄弟红/侄子红等
        // 旋转 + 变色恢复红黑性质
      x.color = BLACK`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5, 6: 7, 7: 9, 8: 11, 9: 13, 10: 15 },
  },

  "rbtree-search": {
    pseudocode: `RB-Search(T, key)
  // 红黑树查找与 BST 相同
  node = T.root
  while node != NULL
    if key == node.key return node
    if key < node.key
      node = node.left
    else
      node = node.right
  return NULL`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 },
  },

  "avl-insert": {
    pseudocode: `AVL-Insert(T, key)
  T = BST-Insert(T, key)
  balance = Height(T.left) - Height(T.right)
  if balance > 1 and key < T.left.key
    return Right-Rotate(T)         // LL 型
  if balance > 1 and key > T.left.key
    T.left = Left-Rotate(T.left)   // LR 型
    return Right-Rotate(T)
  if balance < -1 and key > T.right.key
    return Left-Rotate(T)          // RR 型
  if balance < -1 and key < T.right.key
    T.right = Right-Rotate(T.right) // RL 型
    return Left-Rotate(T)
  return T`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 6, 6: 9, 7: 11, 8: 13, 9: 15, 10: 17, 11: 19, 12: 21, 13: 23 },
  },

  "avl-delete": {
    pseudocode: `AVL-Delete(T, key)
  T = BST-Delete(T, key)
  if T == NULL return NULL
  balance = Height(T.left) - Height(T.right)
  if balance > 1
    if Balance(T.left) >= 0
      return Right-Rotate(T)    // LL
    else
      T.left = Left-Rotate(T.left)  // LR
      return Right-Rotate(T)
  if balance < -1
    if Balance(T.right) <= 0
      return Left-Rotate(T)     // RR
    else
      T.right = Right-Rotate(T.right) // RL
      return Left-Rotate(T)
  return T`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6, 7: 8, 8: 10, 9: 11, 10: 12, 11: 14, 12: 15, 13: 17, 14: 19 },
  },

  "avl-search": {
    pseudocode: `AVL-Search(T, key)
  // AVL 查找与 BST 相同
  node = T.root
  while node != NULL
    if key == node.key return node
    if key < node.key
      node = node.left
    else
      node = node.right
  return NULL`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5, 6: 6, 7: 7, 8: 9 },
  },

  "btree-insert": {
    pseudocode: `B-Tree-Insert(T, key)
  r = T.root
  if r is full (2t-1 keys)
    s = new Node()
    T.root = s
    s.children[0] = r
    B-Split-Child(s, 0)
    B-Insert-Nonfull(s, key)
  else
    B-Insert-Nonfull(r, key)

B-Insert-Nonfull(x, key)
  i = x.n - 1
  if x is leaf
    insert key into x.keys
  else
    find child[i] to descend
    if child[i] is full
      B-Split-Child(x, i)
    B-Insert-Nonfull(x, key)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 12 },
  },

  "btree-delete": {
    pseudocode: `B-Tree-Delete(x, key)
  if key in x.keys
    if x is leaf
      remove key from x     // Case 1
    else
      // Case 2: key in internal node
      if predecessor child has >= t keys
        pred = Predecessor(key)
        replace key with pred
        B-Tree-Delete(child, pred)
      else if successor child has >= t keys
        succ = Successor(key)
        replace key with succ
        B-Tree-Delete(child, succ)
      else
        merge key into one child
        B-Tree-Delete(merged, key)
  else
    // Case 3: key not in x
    ensure child has >= t keys
    B-Tree-Delete(child, key)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 7, 7: 9, 8: 11, 9: 13, 10: 15 },
  },

  "btree-search": {
    pseudocode: `B-Tree-Search(x, key)
  i = 0
  while i < x.n and key > x.keys[i]
    i++
  if i < x.n and key == x.keys[i]
    return (x, i)       // 找到
  if x.leaf
    return NULL         // 未找到
  Disk-Read(x.children[i])
  return B-Tree-Search(x.children[i], key)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 3, 4: 5, 5: 7, 6: 8, 7: 10, 8: 12 },
  },

  "bplustree-insert": {
    pseudocode: `B+-Insert(T, key, value)
  leaf = Find-Leaf(T, key)
  Insert-In-Leaf(leaf, key, value)
  if leaf overflows (n > 2t-1)
    Split-Leaf(leaf)
      copy up middle key to parent
      left keeps keys ≤ mid
      right keeps keys > mid
    if parent overflows
      Split-Internal(parent)
        push up middle key
        recurse upward`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 9, 9: 10, 10: 11 },
  },

  "bplustree-delete": {
    pseudocode: `B+-Delete(T, key)
  leaf = Find-Leaf(T, key)
  Remove key from leaf
  if leaf underflows (n < t-1)
    if sibling has > t-1 keys
      Borrow from sibling
      Update separator in parent
    else
      Merge with sibling
      Remove separator from parent
      if parent underflows
        recurse upward
  Update internal keys if needed`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 6, 7: 8, 8: 10, 9: 11, 10: 13 },
  },

  "bplustree-search": {
    pseudocode: `B+-Search(T, key)
  node = T.root
  while not leaf
    i = first index where key < node.keys[i]
    node = node.children[i]
  // 到达叶子节点
  scan leaf for key
  if found return value
  else return NULL`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
  },

  "trie-insert": {
    pseudocode: `Trie-Insert(root, word)
  node = root
  for each char c in word
    if node.children[c] == NULL
      node.children[c] = new TrieNode()
    node = node.children[c]
  node.isEnd = true`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6, 7: 8 },
  },

  "trie-delete": {
    pseudocode: `Trie-Delete(root, word)
  if root == NULL return NULL
  if word is empty
    root.isEnd = false
    if root has no children
      free(root), return NULL
    return root
  c = word[0]
  root.children[c] = Trie-Delete(root.children[c], word[1:])
  if root has no children and not root.isEnd
    free(root), return NULL
  return root`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 },
  },

  "splay-insert": {
    pseudocode: `Splay-Insert(T, key)
  if T.root == NULL
    T.root = new Node(key)
    return
  Splay(T, key)  // 将 key 或最近节点旋到根
  if key == root.key return  // 已存在
  new_node = new Node(key)
  if key < root.key
    new_node.left = root.left
    new_node.right = root
    root.left = NULL
  else
    new_node.right = root.right
    new_node.left = root
    root.right = NULL
  T.root = new_node`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 14, 13: 16, 14: 18 },
  },

  "splay-delete": {
    pseudocode: `Splay-Delete(T, key)
  Splay(T, key)  // 将 key 旋到根
  if root.key != key return  // 不存在
  if root.left == NULL
    T.root = root.right
  else
    Splay(root.left, +∞) // 左子树最大值旋到根
    left_subtree.right = root.right
    T.root = left_subtree`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5, 6: 7, 7: 8, 8: 10, 9: 11, 10: 12 },
  },

  "twothree-insert": {
    pseudocode: `2-3-Insert(T, key)
  Insert leaf node
  if leaf has 3 keys → stable
  if leaf has 4 keys → split
    push middle key to parent
    if parent has 4 keys → split recursively
    if root splits → new root
  Update keys along path`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 9, 9: 10, 10: 12, 11: 13, 12: 14 },
  },

  "twothree-delete": {
    pseudocode: `2-3-Delete(T, key)
  Find leaf containing key
  Remove key from leaf
  if leaf underflows (0 keys)
    if sibling has spare key
      Borrow from sibling
    else
      Merge with sibling
      Pull down parent key
      if parent underflows
        recurse upward
      if root empty → shrink tree`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 7, 7: 8, 8: 10, 9: 11, 10: 12, 11: 13 },
  },

  "skiplist": {
    pseudocode: `SkipList-Insert(L, key)
  level = Random-Level()
  if level > L.maxLevel
    update header to level
  for i = L.maxLevel down to 0
    find insertion position at each level
    splice in new node
  SkipList-Search(L, key)
  x = L.header
  for i = L.maxLevel down to 0
    while x.forward[i].key < key
      x = x.forward[i]
  x = x.forward[0]
  return x.key == key`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 9, 9: 10, 10: 11, 11: 12, 12: 14, 13: 15 },
  },

  "huffman": {
    pseudocode: `Huffman(C)
  n = |C|
  Q = Min-Priority-Queue(C)  // 按频率建堆
  for i = 1 to n-1
    x = Extract-Min(Q)
    y = Extract-Min(Q)
    z = new Node()
    z.left = x, z.right = y
    z.freq = x.freq + y.freq
    Insert(Q, z)
  return Extract-Min(Q)  // 哈夫曼树根`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11, 13: 12 },
  },

  "dijkstra": {
    pseudocode: `Dijkstra(G, s)
  Init dist[v] = ∞ for all v
  dist[s] = 0
  S = {}  // 已确定最短路的集合
  Q = Min-Priority-Queue(V)
  while Q ≠ ∅
    u = Extract-Min(Q)
    S = S ∪ {u}
    for each edge (u, v) with weight w
      if dist[u] + w < dist[v]   // 松弛
        dist[v] = dist[u] + w
        Update Q with new dist[v]`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13 },
  },

  "graph-bfs": {
    pseudocode: `BFS(G, s)
  for each v in V
    visited[v] = false
  visited[s] = true
  Q = {s}
  while Q ≠ ∅
    u = Dequeue(Q)
    for each v in Adj[u]
      if not visited[v]
        visited[v] = true
        Enqueue(Q, v)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12 },
  },

  "graph-dfs": {
    pseudocode: `DFS(G, s)
  for each v in V
    visited[v] = false
  DFS-Visit(s)

DFS-Visit(u)
  visited[u] = true
  for each v in Adj[u]
    if not visited[v]
      DFS-Visit(v)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 3, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10 },
  },

  "graph-prim": {
    pseudocode: `Prim(G, r)
  for each v in V
    key[v] = ∞, parent[v] = NULL
  key[r] = 0
  Q = Min-Priority-Queue(V)
  while Q ≠ ∅
    u = Extract-Min(Q)
    for each v in Adj[u]
      if v ∈ Q and w(u,v) < key[v]
        parent[v] = u
        key[v] = w(u, v)
  // 结果: parent[] 构成最小生成树`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11 },
  },

  "graph-kruskal": {
    pseudocode: `Kruskal(G)
  Sort edges by weight
  Init UF with |V| sets
  T = {}  // 生成树边集
  for each edge (u, v) in sorted order
    if Find(u) ≠ Find(v)  // 不成环
      T = T ∪ {(u, v)}
      Union(u, v)
  return T`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10 },
  },

  "graph-topo": {
    pseudocode: `Topological-Sort(G)
  Compute in-degree for all v
  Q = {v | in-degree[v] == 0}
  result = []
  while Q ≠ ∅
    u = Dequeue(Q)
    result.append(u)
    for each v in Adj[u]
      in-degree[v]--
      if in-degree[v] == 0
        Enqueue(Q, v)
  return result`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11 },
  },

  "graph-floyd": {
    pseudocode: `Floyd-Warshall(G)
  // dist[i][j] = weight(i,j) or ∞
  for k = 0 to n-1
    for i = 0 to n-1
      for j = 0 to n-1
        if dist[i][k] + dist[k][j] < dist[i][j]
          dist[i][j] = dist[i][k] + dist[k][j]
  return dist[][]`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 },
  },

  "graph-critical": {
    pseudocode: `Critical-Path(G)
  Topological sort → order[]
  // 正推: 最早开始时间
  ve[source] = 0
  for v in topological order
    ve[v] = max(ve[u] + w(u,v))
  // 逆推: 最晚开始时间
  vl[sink] = ve[sink]
  for v in reverse order
    vl[v] = min(vl[w] - w(v,w))
  // 关键活动: e == l
  Critical path = activities where ve[v] == vl[v]`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 8, 8: 9, 9: 10, 10: 11, 11: 13, 12: 14 },
  },

  "graph-bellman-ford": {
    pseudocode: `Bellman-Ford(G, s)
  dist[v] = ∞ for all v; dist[s] = 0
  for i = 1 to |V|-1
    for each edge (u, v, w)
      if dist[u] + w < dist[v]
        dist[v] = dist[u] + w
  // 检测负权回路
  for each edge (u, v, w)
    if dist[u] + w < dist[v]
      return "负权回路存在"
  return dist[]`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11 },
  },

  "graph-bipartite": {
    pseudocode: `Bipartite-Check(G)
  color[v] = UNCOLORED for all v
  for each v in V
    if color[v] == UNCOLORED
      BFS/DFS from v
      color[v] = RED
      for each neighbor u
        if color[u] == color[v]
          return false  // 不是二分图
        color[u] = opposite(color[v])
  return true  // 是二分图`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12 },
  },

  "graph-euler": {
    pseudocode: `Euler-Path(G)
  // 欧拉路径条件: 恰有0或2个奇度顶点
  count = 0
  for each v in V
    if degree(v) is odd
      count++
      start = v
  if count != 0 and count != 2
    return "无欧拉路径"
  DFS from start, mark used edges
  Append vertex when backtracking
  return path (reversed)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12 },
  },

  "quicksort": {
    pseudocode: `QuickSort(A, lo, hi)
  if lo < hi
    p = Partition(A, lo, hi)
    QuickSort(A, lo, p-1)
    QuickSort(A, p+1, hi)

Partition(A, lo, hi)
  pivot = A[hi]
  i = lo - 1
  for j = lo to hi-1
    if A[j] ≤ pivot
      i++; swap(A[i], A[j])
  swap(A[i+1], A[hi])
  return i+1`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13 },
  },

  "heapsort": {
    pseudocode: `HeapSort(A)
  Build-Max-Heap(A)      // O(n)
  for i = n-1 down to 1
    swap(A[0], A[i])     // 最大值到末尾
    Heapify(A, 0, i)     // 恢复堆性质

Build-Max-Heap(A)
  for i = ⌊n/2⌋ down to 0
    Heapify(A, i, n)

Heapify(A, i, n)
  largest = max(A[i], A[left], A[right])
  if largest != i
    swap(A[i], A[largest])
    Heapify(A, largest, n)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 9, 9: 10, 11: 11, 12: 12, 13: 13 },
  },

  "mergesort": {
    pseudocode: `MergeSort(A, lo, hi)
  if lo < hi
    mid = (lo + hi) / 2
    MergeSort(A, lo, mid)
    MergeSort(A, mid+1, hi)
    Merge(A, lo, mid, hi)

Merge(A, lo, mid, hi)
  L = A[lo..mid], R = A[mid+1..hi]
  i = 0, j = 0, k = lo
  while i < |L| and j < |R|
    if L[i] ≤ R[j]
      A[k++] = L[i++]
    else
      A[k++] = R[j++]
  copy remaining L or R`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15 },
  },

  "bubblesort": {
    pseudocode: `BubbleSort(A)
  n = A.length
  for i = 0 to n-2
    swapped = false
    for j = 0 to n-2-i
      if A[j] > A[j+1]
        swap(A[j], A[j+1])
        swapped = true
    if not swapped break  // 已有序`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 7: 7, 8: 8, 9: 9, 10: 10 },
  },

  "insertionsort": {
    pseudocode: `InsertionSort(A)
  for i = 1 to n-1
    key = A[i]
    j = i - 1
    while j >= 0 and A[j] > key
      A[j+1] = A[j]
      j--
    A[j+1] = key`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9 },
  },

  "selectionsort": {
    pseudocode: `SelectionSort(A)
  n = A.length
  for i = 0 to n-2
    minIdx = i
    for j = i+1 to n-1
      if A[j] < A[minIdx]
        minIdx = j
    swap(A[i], A[minIdx])`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 },
  },

  "shellsort": {
    pseudocode: `ShellSort(A)
  n = A.length
  gap = n / 2
  while gap > 0
    for i = gap to n-1
      temp = A[i]
      j = i
      while j >= gap and A[j-gap] > temp
        A[j] = A[j-gap]
        j -= gap
      A[j] = temp
    gap = gap / 2`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11 },
  },

  "countingsort": {
    pseudocode: `CountingSort(A, k)
  // A[i] ∈ [0, k]
  C[0..k] = 0
  for i = 0 to n-1
    C[A[i]]++
  for i = 1 to k
    C[i] += C[i-1]     // 累计计数
  for i = n-1 down to 0
    B[C[A[i]]-1] = A[i]
    C[A[i]]--
  return B`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11 },
  },

  "radixsort": {
    pseudocode: `RadixSort(A, d)
  // d = 最大数字位数
  for i = 1 to d
    Stable-Sort(A, by digit i)
    // 通常用计数排序作为子程序
  return A`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 },
  },

  "binarysearch": {
    pseudocode: `BinarySearch(A, key)
  lo = 0, hi = n-1
  while lo ≤ hi
    mid = (lo + hi) / 2
    if A[mid] == key
      return mid
    else if A[mid] < key
      lo = mid + 1
    else
      hi = mid - 1
  return -1  // 未找到`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12 },
  },

  "kmp": {
    pseudocode: `KMP-Matcher(T, P)
  n = |T|, m = |P|
  Compute-Next(P)
  q = 0  // 已匹配字符数
  for i = 0 to n-1
    while q > 0 and P[q] ≠ T[i]
      q = Next[q]    // 失配，回退
    if P[q] == T[i]
      q++
    if q == m
      print "匹配于" i-m+1
      q = Next[q]

Compute-Next(P)
  Next[0] = -1
  k = -1
  for j = 1 to m-1
    while k >= 0 and P[k+1] ≠ P[j]
      k = Next[k]
    if P[k+1] == P[j]
      k++
    Next[j] = k`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 9, 10: 10, 11: 12, 12: 13, 13: 14, 14: 15, 15: 16, 16: 17, 17: 18 },
  },

  "naivestr": {
    pseudocode: `Naive-Matcher(T, P)
  n = |T|, m = |P|
  for s = 0 to n-m
    if T[s..s+m-1] == P
      print "匹配于" s
  // 最坏 O(nm), 最好 O(n)`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 },
  },

  "hashtable-linear": {
    pseudocode: `Hash-Insert-Linear(T, k)
  i = 0
  repeat
    j = h(k) + i  mod m
    if T[j] == EMPTY or DELETED
      T[j] = k; return j
    i++
  until i == m
  return "溢出"

Hash-Search-Linear(T, k)
  i = 0
  repeat
    j = h(k) + i mod m
    if T[j] == k return j
    if T[j] == EMPTY return -1
    i++
  until i == m`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6, 7: 7, 8: 9, 9: 10, 10: 11, 11: 12, 12: 14, 13: 15, 14: 16, 15: 17 },
  },

  "hashtable-chain": {
    pseudocode: `Hash-Insert-Chain(T, k)
  j = h(k)
  if k not in T[j]
    T[j].append(k)

Hash-Search-Chain(T, k)
  j = h(k)
  search list T[j] for k
  return found or not`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 3, 4: 4, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10 },
  },

  "hashtable-delete": {
    pseudocode: `Hash-Delete-Linear(T, k)
  j = Hash-Search-Linear(T, k)
  if j == -1 return "不存在"
  T[j] = DELETED  // 懒惰删除
  // 后续查找可跳过 DELETED
  // 后续插入可复用 DELETED`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 6, 7: 7, 8: 9, 9: 10, 10: 11 },
  },

  "activity-selection": {
    pseudocode: `Activity-Selection(s, f)
  Sort activities by finish time f
  A = {0}  // 选第一个活动
  k = 0
  for i = 1 to n-1
    if s[i] >= f[k]     // 不冲突
      A = A ∪ {i}
      k = i
  return A`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9 },
  },

  "fractional-knapsack": {
    pseudocode: `Fractional-Knapsack(W, items)
  Sort items by value/weight ratio desc
  total = 0, weight = 0
  for each item in sorted order
    if weight + item.w ≤ W
      take all of item
      weight += item.w
      total += item.v
    else
      fraction = (W - weight) / item.w
      take fraction of item
      total += item.v * fraction
      break
  return total`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 8, 9: 9, 10: 10, 11: 11, 12: 13 },
  },

  "job-scheduling": {
    pseudocode: `Job-Scheduling(deadlines, profits)
  Sort jobs by profit desc
  result = array of size n
  for each job (d, p) in sorted order
    for t = min(d, n)-1 down to 0
      if result[t] is empty
        result[t] = job
        break
  return sum of profits in result`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 7, 8: 8, 9: 10 },
  },

  "knapsack-01": {
    pseudocode: `01-Knapsack(W, wt[], val[], n)
  dp[0..n][0..W] = 0
  for i = 1 to n
    for w = 0 to W
      if wt[i-1] > w
        dp[i][w] = dp[i-1][w]
      else
        dp[i][w] = max(
          dp[i-1][w],
          dp[i-1][w - wt[i-1]] + val[i-1]
        )
  return dp[n][W]`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11 },
  },

  "lcs": {
    pseudocode: `LCS(X, Y)
  m = |X|, n = |Y|
  dp[0..m][0..n] = 0
  for i = 1 to m
    for j = 1 to n
      if X[i-1] == Y[j-1]
        dp[i][j] = dp[i-1][j-1] + 1
      else
        dp[i][j] = max(dp[i-1][j], dp[i][j-1])
  return dp[m][n]
  // 回溯可得具体序列`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 9, 10: 10, 11: 11, 12: 12 },
  },

  "edit-distance": {
    pseudocode: `Edit-Distance(A, B)
  m = |A|, n = |B|
  dp[0..m][0..n]
  dp[i][0] = i, dp[0][j] = j
  for i = 1 to m
    for j = 1 to n
      if A[i-1] == B[j-1]
        dp[i][j] = dp[i-1][j-1]
      else
        dp[i][j] = 1 + min(
          dp[i-1][j],     // 删除
          dp[i][j-1],     // 插入
          dp[i-1][j-1]    // 替换
        )
  return dp[m][n]`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 11, 12: 12, 13: 14, 14: 15 },
  },

  "matrix-chain": {
    pseudocode: `Matrix-Chain-Order(p[])
  n = length(p) - 1
  m[1..n][1..n] = 0
  s[1..n][1..n]  // 最优分割点
  for l = 2 to n         // 链长
    for i = 1 to n-l+1
      j = i + l - 1
      m[i][j] = ∞
      for k = i to j-1
        q = m[i][k] + m[k+1][j] + p[i-1]*p[k]*p[j]
        if q < m[i][j]
          m[i][j] = q
          s[i][j] = k
  return m, s`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10, 12: 11, 13: 12, 14: 13 },
  },

  "lis": {
    pseudocode: `LIS(A)
  n = A.length
  dp[0..n-1] = 1   // 每个元素自身长度1
  for i = 1 to n-1
    for j = 0 to i-1
      if A[j] < A[i]
        dp[i] = max(dp[i], dp[j] + 1)
  return max(dp[])`,
    pseudocodeLineMap: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9 },
  },
};
