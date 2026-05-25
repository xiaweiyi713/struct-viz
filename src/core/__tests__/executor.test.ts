import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";

describe("executor", () => {
  it("executes BST insert and produces frames", () => {
    const code = `BST tree;
tree.insert(8);
tree.insert(3);
tree.insert(10);`;
    const result = parse(code);
    expect(result.errors).toHaveLength(0);

    const runtime = createRuntime();
    const execResult = runtime.execute(result.program!);
    expect(execResult.errors).toHaveLength(0);
    expect(execResult.frames.length).toBeGreaterThan(0);
  });

  it("executes Queue operations with FIFO behavior", () => {
    const code = `Queue q;
q.enqueue(1);
q.enqueue(2);
q.enqueue(3);
q.dequeue();
q.front();`;
    const result = parse(code);
    expect(result.errors).toHaveLength(0);

    const runtime = createRuntime();
    const execResult = runtime.execute(result.program!);
    expect(execResult.errors).toHaveLength(0);
    expect(execResult.frames.length).toBeGreaterThan(0);

    // Verify queue type in the snapshot
    const lastFrame = execResult.frames[execResult.frames.length - 1];
    const structures = lastFrame.snapshot.structures;
    const qStruct = Object.values(structures)[0] as { type: string };
    expect(qStruct.type).toBe("queue");
  });

  it("executes HashTable with identifier mode arg", () => {
    const code = `HashTable ht(11, linear);
ht.insert(47);
ht.insert(25);
ht.search(47);`;
    const result = parse(code);
    expect(result.errors).toHaveLength(0);

    const runtime = createRuntime();
    const execResult = runtime.execute(result.program!);
    expect(execResult.errors).toHaveLength(0);
    expect(execResult.frames.length).toBeGreaterThan(0);
  });

  it("executes Graph with edge weights", () => {
    const code = `Graph g(4);
g.addEdge(0, 1, 5);
g.addEdge(1, 2, 3);
g.bfs(0);`;
    const result = parse(code);
    expect(result.errors).toHaveLength(0);

    const runtime = createRuntime();
    const execResult = runtime.execute(result.program!);
    expect(execResult.errors).toHaveLength(0);
  });

  it("reports runtime errors for invalid methods", () => {
    const code = `BST tree;
tree.fly();`;
    const result = parse(code);
    expect(result.errors).toHaveLength(0);

    const runtime = createRuntime();
    const execResult = runtime.execute(result.program!);
    expect(execResult.errors.length).toBeGreaterThan(0);
  });
});
