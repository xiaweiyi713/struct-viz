import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import type { VisualArrayItem } from "../../types";

function exec(code: string) {
  const result = parse(code);
  expect(result.errors).toHaveLength(0);
  const runtime = createRuntime();
  return runtime.execute(result.program!);
}

/** 获取排序后最终帧的数组值（支持 array 和 multiarray 类型） */
function getSortedValues(
  r: ReturnType<ReturnType<typeof createRuntime>["execute"]>,
  multiarrayIndex = 0,
): number[] {
  const lastFrame = r.frames[r.frames.length - 1];
  const structures = lastFrame.snapshot.structures;
  const struct = Object.values(structures)[0];

  if (struct.type === "array") {
    const arr = struct as { type: "array"; items: VisualArrayItem[]; label: string };
    return arr.items.map((item) => Number(item.value));
  }
  if (struct.type === "multiarray") {
    const ma = struct as { type: "multiarray"; arrays: VisualArrayItem[][]; labels: string[] };
    return ma.arrays[multiarrayIndex].map((item) => Number(item.value));
  }
  throw new Error(`Unexpected structure type: ${struct.type}`);
}

/** 验证排序算法（array 类型） */
function testSort(className: string, input: string, expected: number[]) {
  const r = exec(`${className} s;\ns.sort(${input});`);
  expect(r.errors).toHaveLength(0);
  expect(r.frames.length).toBeGreaterThan(0);
  expect(getSortedValues(r)).toEqual(expected);
}

/** 验证 multiarray 排序算法（指定取哪个数组作为结果） */
function testMultiSort(className: string, input: string, expected: number[], resultIndex: number) {
  const r = exec(`${className} s;\ns.sort(${input});`);
  expect(r.errors).toHaveLength(0);
  expect(r.frames.length).toBeGreaterThan(0);
  expect(getSortedValues(r, resultIndex)).toEqual(expected);
}

const sortCases: [string, string, number[]][] = [
  ["QuickSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9]],
  ["HeapSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9]],
  ["MergeSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9]],
  ["BubbleSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9]],
  ["InsertionSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9]],
  ["SelectionSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9]],
  ["ShellSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9]],
];

describe("排序算法", () => {
  for (const [className, input, expected] of sortCases) {
    describe(className, () => {
      it("基本排序正确", () => {
        testSort(className, input, expected);
      });

      it("空数组不报错", () => {
        const r = exec(`${className} s;
s.sort();`);
        expect(r.errors).toHaveLength(0);
      });

      it("单元素", () => {
        testSort(className, "42", [42]);
      });

      it("已排序数组", () => {
        testSort(className, "1, 2, 3, 4, 5", [1, 2, 3, 4, 5]);
      });

      it("逆序数组", () => {
        testSort(className, "5, 4, 3, 2, 1", [1, 2, 3, 4, 5]);
      });

      it("含重复元素", () => {
        testSort(className, "3, 1, 3, 2, 1", [1, 1, 2, 3, 3]);
      });
    });
  }

  // ─── CountingSort（非比较排序，只验证基本功能） ───

  describe("CountingSort", () => {
    it("基本排序正确", () => {
      // CountingSort 的输出数组在 arrays[2]（"输出数组"）
      testMultiSort("CountingSort", "5, 3, 8, 1, 9, 2, 7", [1, 2, 3, 5, 7, 8, 9], 2);
    });

    it("空数组不报错", () => {
      const r = exec(`CountingSort s;
s.sort();`);
      expect(r.errors).toHaveLength(0);
    });

    it("含重复元素", () => {
      testMultiSort("CountingSort", "3, 1, 3, 2, 1", [1, 1, 2, 3, 3], 2);
    });
  });

  // ─── RadixSort（非比较排序） ───

  describe("RadixSort", () => {
    it("基本排序正确", () => {
      // RadixSort 的排序结果在 arrays[0]（"排序数组"）
      testMultiSort("RadixSort", "170, 45, 75, 90, 802, 24, 2, 66", [2, 24, 45, 66, 75, 90, 170, 802], 0);
    });

    it("空数组不报错", () => {
      const r = exec(`RadixSort s;
s.sort();`);
      expect(r.errors).toHaveLength(0);
    });

    it("单元素", () => {
      testMultiSort("RadixSort", "42", [42], 0);
    });
  });

  // ─── BucketSort ───

  describe("BucketSort", () => {
    it("基本排序正确", () => {
      // 输出数组在最后一个 arrays 元素中
      const r = exec(`BucketSort bs;
bs.sort(29, 25, 3, 49, 9, 37, 21, 43);`);
      expect(r.errors).toHaveLength(0);
      const lastFrame = r.frames[r.frames.length - 1];
      const struct = Object.values(lastFrame.snapshot.structures)[0] as { type: string; arrays: VisualArrayItem[][]; labels: string[] };
      const outputArr = struct.arrays[struct.arrays.length - 1];
      expect(outputArr.map((item) => Number(item.value))).toEqual([3, 9, 21, 25, 29, 37, 43, 49]);
    });

    it("空数组不报错", () => {
      const r = exec(`BucketSort bs;
bs.sort();`);
      expect(r.errors).toHaveLength(0);
    });

    it("含重复元素", () => {
      const r = exec(`BucketSort bs;
bs.sort(5, 3, 5, 1, 3);`);
      expect(r.errors).toHaveLength(0);
    });
  });
});
