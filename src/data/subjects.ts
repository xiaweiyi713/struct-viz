export type Subject =
  | "data-structures"
  | "computer-organization"
  | "operating-systems"
  | "computer-networks";

export interface SubjectInfo {
  id: Subject;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  gradient: string;
  bgLight: string;
  bgDark: string;
  border: string;
  text: string;
  categories: { key: string; label: string }[];
}

export const subjects: SubjectInfo[] = [
  {
    id: "data-structures",
    name: "数据结构",
    nameEn: "Data Structures",
    icon: "🌳",
    description: "树、图、排序、查找、动态规划等核心算法可视化",
    gradient: "from-indigo-500 to-violet-500",
    bgLight: "from-indigo-50 to-violet-50",
    bgDark: "dark:from-indigo-950/50 dark:to-violet-950/50",
    border: "border-indigo-200/80 dark:border-indigo-800/50",
    text: "text-indigo-600 dark:text-indigo-400",
    categories: [
      { key: "linear", label: "线性结构" },
      { key: "tree", label: "树结构" },
      { key: "graph", label: "图算法" },
      { key: "sorting", label: "排序算法" },
      { key: "searching", label: "查找算法" },
      { key: "dp", label: "动态规划" },
      { key: "greedy", label: "贪心算法" },
    ],
  },
  {
    id: "computer-organization",
    name: "计算机组成原理",
    nameEn: "Computer Organization",
    icon: "⚙️",
    description: "运算方法、Cache 映射、指令流水线等硬件原理可视化",
    gradient: "from-emerald-500 to-teal-500",
    bgLight: "from-emerald-50 to-teal-50",
    bgDark: "dark:from-emerald-950/50 dark:to-teal-950/50",
    border: "border-emerald-200/80 dark:border-emerald-800/50",
    text: "text-emerald-600 dark:text-emerald-400",
    categories: [
      { key: "co-arithmetic", label: "运算方法" },
      { key: "co-cache", label: "存储体系" },
      { key: "co-pipeline", label: "指令流水线" },
    ],
  },
  {
    id: "operating-systems",
    name: "操作系统",
    nameEn: "Operating Systems",
    icon: "🖥️",
    description: "进程调度、页面置换、银行家算法、磁盘调度等 OS 核心算法",
    gradient: "from-amber-500 to-orange-500",
    bgLight: "from-amber-50 to-orange-50",
    bgDark: "dark:from-amber-950/50 dark:to-orange-950/50",
    border: "border-amber-200/80 dark:border-amber-800/50",
    text: "text-amber-600 dark:text-amber-400",
    categories: [
      { key: "os-scheduling", label: "进程调度" },
      { key: "os-deadlock", label: "死锁" },
      { key: "os-memory", label: "内存管理" },
      { key: "os-disk", label: "磁盘调度" },
      { key: "os-sync", label: "进程同步" },
    ],
  },
  {
    id: "computer-networks",
    name: "计算机网络",
    nameEn: "Computer Networks",
    icon: "🌐",
    description: "CRC 校验、滑动窗口、子网划分、路由算法等网络协议可视化",
    gradient: "from-rose-500 to-pink-500",
    bgLight: "from-rose-50 to-pink-50",
    bgDark: "dark:from-rose-950/50 dark:to-pink-950/50",
    border: "border-rose-200/80 dark:border-rose-800/50",
    text: "text-rose-600 dark:text-rose-400",
    categories: [
      { key: "cn-link", label: "数据链路层" },
      { key: "cn-network", label: "网络层" },
      { key: "cn-transport", label: "传输层" },
    ],
  },
];
