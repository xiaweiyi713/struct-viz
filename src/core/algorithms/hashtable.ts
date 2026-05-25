import type {
  Literal,
  VisualStructure,
  VisualHashBucket,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

type HashMode = "linear" | "chain";

interface InternalEntry {
  id: string;
  key: number;
  status: "default" | "active" | "found" | "deleted" | "highlighted";
}

interface InternalBucket {
  id: string;
  index: number;
  entries: InternalEntry[];
  status: "default" | "active" | "highlighted";
}

export class HashTableRuntime implements StructureRuntime {
  private buckets: InternalBucket[] = [];
  private tableSize: number;
  private mode: HashMode;
  private idCounter = 0;
  private insertCount = 0;
  private probeCount = 0;

  constructor(tableSize: number, mode: HashMode = "linear") {
    this.tableSize = tableSize;
    this.mode = mode;

    for (let i = 0; i < tableSize; i++) {
      this.buckets.push({
        id: `bucket-${i}`,
        index: i,
        entries: [],
        status: "default",
      });
    }
  }

  private nextId(): string {
    this.idCounter += 1;
    return `ht-entry-${this.idCounter}`;
  }

  private hash(key: number): number {
    return key % this.tableSize;
  }

  private buildVisualBuckets(): VisualHashBucket[] {
    return this.buckets.map((b) => ({
      id: b.id,
      index: b.index,
      entries: b.entries.map((e) => ({
        id: e.id,
        key: e.key,
        status: e.status,
      })),
      status: b.status,
    }));
  }

  private resetStatus(): void {
    for (const b of this.buckets) {
      b.status = "default";
      for (const e of b.entries) {
        if (e.status !== "deleted") e.status = "default";
      }
    }
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "insert":
        for (const a of args) this.doInsert(Number(a), recorder, line);
        break;
      case "search":
        this.doSearch(Number(args[0]), recorder, line);
        break;
      case "delete":
        this.doDelete(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`HashTable 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "hashtable",
      buckets: this.buildVisualBuckets(),
      tableSize: this.tableSize,
      hashFunc: `h(k) = k % ${this.tableSize}`,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    let occupied = 0;
    for (const b of this.buckets) {
      if (b.entries.length > 0) occupied++;
    }
    return {
      tableSize: { type: "number", value: this.tableSize, display: `${this.tableSize}` },
      mode: { type: "string", value: this.mode, display: this.mode === "linear" ? "线性探测" : "链地址法" },
      loadFactor: { type: "number", value: this.insertCount / this.tableSize, display: `${(this.insertCount / this.tableSize).toFixed(2)}` },
      elements: { type: "number", value: this.insertCount, display: `${this.insertCount}` },
    };
  }

  // ── 线性探测法插入 ──

  private doInsert(key: number, recorder: TraceRecorder, line: number): void {
    this.resetStatus();
    const h = this.hash(key);
    this.probeCount = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: `插入 ${key}，hash(${key}) = ${h}`,
      description: `计算哈希值: ${key} % ${this.tableSize} = ${h}`,
      codeLine: line,
      targets: [this.buckets[h].id],
    });

    if (this.mode === "linear") {
      this.linearInsert(key, h, recorder, line);
    } else {
      this.chainInsert(key, h, recorder, line);
    }
  }

  private linearInsert(key: number, h: number, recorder: TraceRecorder, line: number): void {
    let idx = h;
    let probed = 0;

    while (probed < this.tableSize) {
      this.probeCount++;
      const bucket = this.buckets[idx];
      bucket.status = "active";

      if (bucket.entries.length === 0) {
        // 空桶，插入
        const entry: InternalEntry = { id: this.nextId(), key, status: "active" };
        bucket.entries.push(entry);
        this.insertCount++;
        bucket.status = "highlighted";

        recorder.record({
          type: "MARK_FINAL",
          title: `插入 ${key} 到桶 ${idx}`,
          description: `桶 ${idx} 为空，直接插入。探测次数: ${this.probeCount}`,
          codeLine: line,
          targets: [bucket.id],
        });
        return;
      }

      // 检查已有元素
      const existing = bucket.entries[0];
      const wasDeleted = existing.status === "deleted";
      existing.status = "active";

      recorder.record({
        type: "COMPARE",
        title: `探测桶 ${idx}：已存在 ${existing.key}`,
        description: `桶 ${idx} 已被 ${existing.key} 占用（${wasDeleted ? "已删除" : "冲突"}），继续探测`,
        codeLine: line,
        targets: [bucket.id],
      });

      if (!wasDeleted && existing.key === key) {
        existing.status = "found";
        recorder.record({
          type: "COMPARE",
          title: `键 ${key} 已存在`,
          description: `桶 ${idx} 中已有相同键 ${key}，不重复插入`,
          codeLine: line,
          targets: [existing.id],
        });
        return;
      }

      // 检查已删除的槽是否可复用
      if (wasDeleted) {
        existing.key = key;
        existing.status = "active";
        bucket.status = "highlighted";
        this.insertCount++;

        recorder.record({
          type: "MARK_FINAL",
          title: `插入 ${key} 到桶 ${idx}（复用已删除槽）`,
          description: `桶 ${idx} 标记为已删除，复用该位置`,
          codeLine: line,
          targets: [bucket.id],
        });
        return;
      }

      idx = (idx + 1) % this.tableSize;
      probed++;
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "哈希表已满",
      description: `探测了 ${this.probeCount} 次，哈希表已满，无法插入 ${key}`,
      codeLine: line,
      targets: [],
    });
  }

  private chainInsert(key: number, h: number, recorder: TraceRecorder, line: number): void {
    const bucket = this.buckets[h];
    bucket.status = "active";

    // 检查链表
    for (const entry of bucket.entries) {
      entry.status = "active";
      this.probeCount++;

      recorder.record({
        type: "COMPARE",
        title: `检查桶 ${h} 链表中的 ${entry.key}`,
        description: `比较 ${key} 与 ${entry.key}`,
        codeLine: line,
        targets: [entry.id],
      });

      if (entry.key === key) {
        entry.status = "found";
        recorder.record({
          type: "COMPARE",
          title: `键 ${key} 已存在于桶 ${h}`,
          description: `不重复插入`,
          codeLine: line,
          targets: [entry.id],
        });
        return;
      }
      entry.status = "default";
    }

    // 插入到链表尾部
    const newEntry: InternalEntry = { id: this.nextId(), key, status: "highlighted" };
    bucket.entries.push(newEntry);
    this.insertCount++;
    bucket.status = "highlighted";

    recorder.record({
      type: "MARK_FINAL",
      title: `插入 ${key} 到桶 ${h} 的链表`,
      description: `桶 ${h} 链表长度变为 ${bucket.entries.length}`,
      codeLine: line,
      targets: [bucket.id, newEntry.id],
    });
  }

  // ── 查找 ──

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    this.resetStatus();
    const h = this.hash(key);
    this.probeCount = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: `查找 ${key}，hash(${key}) = ${h}`,
      description: `计算哈希值: ${key} % ${this.tableSize} = ${h}`,
      codeLine: line,
      targets: [this.buckets[h].id],
    });

    if (this.mode === "linear") {
      this.linearSearch(key, h, recorder, line);
    } else {
      this.chainSearch(key, h, recorder, line);
    }
  }

  private linearSearch(key: number, h: number, recorder: TraceRecorder, line: number): void {
    let idx = h;
    let probed = 0;

    while (probed < this.tableSize) {
      this.probeCount++;
      const bucket = this.buckets[idx];
      bucket.status = "active";

      if (bucket.entries.length === 0) {
        recorder.record({
          type: "COMPARE",
          title: `探测桶 ${idx}：空`,
          description: `桶 ${idx} 为空，查找失败。探测次数: ${this.probeCount}`,
          codeLine: line,
          targets: [bucket.id],
        });

        recorder.record({
          type: "VISIT_NODE",
          title: `${key} 不在哈希表中`,
          description: `查找失败`,
          codeLine: line,
          targets: [],
          payload: { found: false },
        });
        return;
      }

      const entry = bucket.entries[0];
      const wasDeleted = entry.status === "deleted";
      entry.status = "active";

      recorder.record({
        type: "COMPARE",
        title: `探测桶 ${idx}：比较 ${entry.key} 与 ${key}`,
        description: `${entry.key} ${entry.key === key ? "==" : "!="} ${key}${wasDeleted ? " (已删除)" : ""}`,
        codeLine: line,
        targets: [entry.id],
      });

      if (entry.key === key) {
        if (wasDeleted) {
          recorder.record({
            type: "COMPARE",
            title: `桶 ${idx}：${key} 已被删除，继续探测`,
            description: `找到 ${key} 但已被标记为 deleted，继续查找`,
            codeLine: line,
            targets: [entry.id],
          });
        } else {
          entry.status = "found";
          bucket.status = "highlighted";

          recorder.record({
            type: "MARK_FINAL",
            title: `找到 ${key}，在桶 ${idx}`,
            description: `查找成功！探测次数: ${this.probeCount}`,
            codeLine: line,
            targets: [entry.id],
            payload: { found: true, index: idx },
          });
          return;
        }
      }

      idx = (idx + 1) % this.tableSize;
      probed++;
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `${key} 不在哈希表中`,
      description: `探测了 ${this.probeCount} 次未找到`,
      codeLine: line,
      targets: [],
      payload: { found: false },
    });
  }

  private chainSearch(key: number, h: number, recorder: TraceRecorder, line: number): void {
    const bucket = this.buckets[h];
    bucket.status = "active";

    for (const entry of bucket.entries) {
      entry.status = "active";
      this.probeCount++;

      recorder.record({
        type: "COMPARE",
        title: `桶 ${h} 链表中比较 ${entry.key} 与 ${key}`,
        description: `${entry.key} ${entry.key === key ? "==" : "!="} ${key}`,
        codeLine: line,
        targets: [entry.id],
      });

      if (entry.key === key) {
        entry.status = "found";
        bucket.status = "highlighted";

        recorder.record({
          type: "MARK_FINAL",
          title: `找到 ${key}，在桶 ${h} 的链表中`,
          description: `查找成功！探测次数: ${this.probeCount}`,
          codeLine: line,
          targets: [entry.id],
          payload: { found: true },
        });
        return;
      }
      entry.status = "default";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `${key} 不在哈希表中`,
      description: `桶 ${h} 链表中未找到`,
      codeLine: line,
      targets: [],
      payload: { found: false },
    });
  }

  // ── 删除 ──

  private doDelete(key: number, recorder: TraceRecorder, line: number): void {
    this.resetStatus();
    const h = this.hash(key);

    recorder.record({
      type: "VISIT_NODE",
      title: `删除 ${key}，hash(${key}) = ${h}`,
      description: `计算哈希值: ${key} % ${this.tableSize} = ${h}`,
      codeLine: line,
      targets: [this.buckets[h].id],
    });

    if (this.mode === "linear") {
      // 线性探测：标记为 deleted
      let idx = h;
      let probed = 0;
      while (probed < this.tableSize) {
        const bucket = this.buckets[idx];
        bucket.status = "active";

        if (bucket.entries.length === 0) break;

        const entry = bucket.entries[0];
        entry.status = "active";

        if (entry.key === key) {
          entry.status = "deleted";
          bucket.status = "highlighted";
          this.insertCount--;

          recorder.record({
            type: "MARK_FINAL",
            title: `删除桶 ${idx} 中的 ${key}（标记为已删除）`,
            description: `线性探测法删除采用懒惰删除，标记为 deleted`,
            codeLine: line,
            targets: [entry.id],
          });
          return;
        }

        recorder.record({
          type: "COMPARE",
          title: `桶 ${idx}：${entry.key} != ${key}，继续`,
          description: `当前桶中元素 ${entry.key} 与目标 ${key} 不匹配，继续探测`,
          codeLine: line,
          targets: [bucket.id],
        });

        idx = (idx + 1) % this.tableSize;
        probed++;
      }
    } else {
      // 链地址法：从链表中移除
      const bucket = this.buckets[h];
      bucket.status = "active";

      const entryIdx = bucket.entries.findIndex((e) => e.key === key);
      if (entryIdx >= 0) {
        const entry = bucket.entries[entryIdx];
        entry.status = "deleted";
        bucket.entries.splice(entryIdx, 1);
        this.insertCount--;
        bucket.status = "highlighted";

        recorder.record({
          type: "MARK_FINAL",
          title: `从桶 ${h} 链表中删除 ${key}`,
          description: `链表长度变为 ${bucket.entries.length}`,
          codeLine: line,
          targets: [bucket.id],
        });
        return;
      }
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `${key} 不在哈希表中，无法删除`,
      description: "查找失败",
      codeLine: line,
      targets: [],
    });
  }
}
