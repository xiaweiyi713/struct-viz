import type { Program } from "../../types";
import type { ExecutionResult } from "./runtime";
import { Runtime } from "./runtime";
import { StackRuntime } from "../algorithms/stack";
import { QueueRuntime } from "../algorithms/queue";
import { BSTRuntime } from "../algorithms/bst";
import { RBTreeRuntime } from "../algorithms/rbtree";
import { GraphRuntime } from "../algorithms/dijkstra";
import { QuickSortRuntime } from "../algorithms/quicksort";
import { HeapSortRuntime } from "../algorithms/heapsort";
import { AVLTreeRuntime } from "../algorithms/avl";
import { MergeSortRuntime } from "../algorithms/mergesort";
import { BubbleSortRuntime } from "../algorithms/bubblesort";
import { InsertionSortRuntime } from "../algorithms/insertionsort";
import { BinarySearchRuntime } from "../algorithms/binarysearch";
import { HuffmanTreeRuntime } from "../algorithms/huffman";
import { KMPRuntime } from "../algorithms/kmp";
import { HashTableRuntime } from "../algorithms/hashtable";
import { SelectionSortRuntime } from "../algorithms/selectionsort";
import { ShellSortRuntime } from "../algorithms/shellsort";
import { NaiveStringMatchingRuntime } from "../algorithms/naivestr";
import { UnionFindRuntime } from "../algorithms/unionfind";
import { ActivitySelectionRuntime } from "../algorithms/activityselection";
import { CountingSortRuntime } from "../algorithms/countingsort";
import { RadixSortRuntime } from "../algorithms/radixsort";
import { BTreeRuntime } from "../algorithms/btree";
import { BPlusTreeRuntime } from "../algorithms/bplustree";
import { TrieRuntime } from "../algorithms/trie";
import { KnapsackRuntime } from "../algorithms/knapsack";
import { LCSRuntime } from "../algorithms/lcs";
import { EditDistanceRuntime } from "../algorithms/editdistance";
import { MatrixChainRuntime } from "../algorithms/matrixchain";
import { LISRuntime } from "../algorithms/lis";
import { SplayTreeRuntime } from "../algorithms/splaytree";
import { TwoThreeTreeRuntime } from "../algorithms/twothreetree";
import { SkipListRuntime } from "../algorithms/skiplist";
import { FractionalKnapsackRuntime } from "../algorithms/fractionalknapsack";
import { JobSchedulingRuntime } from "../algorithms/jobscheduling";

export function createRuntime(): { execute(program: Program): ExecutionResult } {
  const runtime = new Runtime();

  runtime.registerClass("Stack", () => new StackRuntime());
  runtime.registerClass("Queue", () => new QueueRuntime());
  runtime.registerClass("BST", () => new BSTRuntime());
  runtime.registerClass("RBTree", () => new RBTreeRuntime());
  runtime.registerClass("AVLTree", () => new AVLTreeRuntime());
  runtime.registerClass("Huffman", () => new HuffmanTreeRuntime());
  runtime.registerClass("Graph", (args) => {
    const nodeCount = Number(args[0] ?? 0);
    return new GraphRuntime(nodeCount);
  });
  runtime.registerClass("QuickSort", () => new QuickSortRuntime());
  runtime.registerClass("HeapSort", () => new HeapSortRuntime());
  runtime.registerClass("MergeSort", () => new MergeSortRuntime());
  runtime.registerClass("BubbleSort", () => new BubbleSortRuntime());
  runtime.registerClass("InsertionSort", () => new InsertionSortRuntime());
  runtime.registerClass("BinarySearch", () => new BinarySearchRuntime());
  runtime.registerClass("KMP", () => new KMPRuntime());
  runtime.registerClass("HashTable", (args) => {
    const size = Number(args[0] ?? 13);
    const mode = String(args[1] ?? "linear") as "linear" | "chain";
    return new HashTableRuntime(size, mode);
  });
  runtime.registerClass("SelectionSort", () => new SelectionSortRuntime());
  runtime.registerClass("ShellSort", () => new ShellSortRuntime());
  runtime.registerClass("NaiveStr", () => new NaiveStringMatchingRuntime());
  runtime.registerClass("UnionFind", () => new UnionFindRuntime());
  runtime.registerClass("ActivitySelection", () => new ActivitySelectionRuntime());
  runtime.registerClass("CountingSort", () => new CountingSortRuntime());
  runtime.registerClass("RadixSort", () => new RadixSortRuntime());
  runtime.registerClass("BTree", (args) => new BTreeRuntime(Number(args[0] ?? 3)));
  runtime.registerClass("BPlusTree", (args) => new BPlusTreeRuntime(Number(args[0] ?? 3)));
  runtime.registerClass("Trie", () => new TrieRuntime());
  runtime.registerClass("Knapsack", () => new KnapsackRuntime());
  runtime.registerClass("LCS", () => new LCSRuntime());
  runtime.registerClass("EditDistance", () => new EditDistanceRuntime());
  runtime.registerClass("MatrixChain", () => new MatrixChainRuntime());
  runtime.registerClass("LIS", () => new LISRuntime());
  runtime.registerClass("SplayTree", () => new SplayTreeRuntime());
  runtime.registerClass("TwoThreeTree", () => new TwoThreeTreeRuntime());
  runtime.registerClass("SkipList", () => new SkipListRuntime());
  runtime.registerClass("FractionalKnapsack", () => new FractionalKnapsackRuntime());
  runtime.registerClass("JobScheduling", () => new JobSchedulingRuntime());

  return {
    execute(program: Program): ExecutionResult {
      return runtime.execute(program);
    },
  };
}

export { Runtime } from "./runtime";
export { TraceRecorder } from "./traceRecorder";
