import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";

describe("parser", () => {
  it("parses a simple declaration", () => {
    const result = parse("BST tree;");
    expect(result.errors).toHaveLength(0);
    expect(result.program).not.toBeNull();
    expect(result.program!.body).toHaveLength(1);
    expect(result.program!.body[0]).toEqual({
      type: "Declaration",
      className: "BST",
      variableName: "tree",
      args: [],
      line: 1,
    });
  });

  it("parses a declaration with number args", () => {
    const result = parse("Graph g(5);");
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body[0]).toEqual({
      type: "Declaration",
      className: "Graph",
      variableName: "g",
      args: [5],
      line: 1,
    });
  });

  it("parses a declaration with identifier args", () => {
    const result = parse("HashTable ht(11, linear);");
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body[0]).toEqual({
      type: "Declaration",
      className: "HashTable",
      variableName: "ht",
      args: [11, "linear"],
      line: 1,
    });
  });

  it("parses method calls with number args", () => {
    const result = parse("tree.insert(8);");
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body[0]).toEqual({
      type: "MethodCall",
      target: "tree",
      method: "insert",
      args: [8],
      line: 1,
    });
  });

  it("parses method calls with string args", () => {
    const result = parse('t.insert("apple");');
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body[0]).toEqual({
      type: "MethodCall",
      target: "t",
      method: "insert",
      args: ["apple"],
      line: 1,
    });
  });

  it("parses method calls with negative numbers", () => {
    const result = parse("g.addEdge(0, 1, -3);");
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body[0]).toEqual({
      type: "MethodCall",
      target: "g",
      method: "addEdge",
      args: [0, 1, -3],
      line: 1,
    });
  });

  it("parses a complete program", () => {
    const code = `BST tree;
tree.insert(8);
tree.insert(3);
tree.search(8);
// find it`;
    const result = parse(code);
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body).toHaveLength(5);
    expect(result.program!.body[4].type).toBe("Comment");
  });

  it("parses floating point number args", () => {
    const result = parse("fp.encode(6.625);");
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body[0]).toEqual({
      type: "MethodCall",
      target: "fp",
      method: "encode",
      args: [6.625],
      line: 1,
    });
  });

  it("parses negative floating point number args", () => {
    const result = parse("fp.encode(-12.375);");
    expect(result.errors).toHaveLength(0);
    expect(result.program!.body[0]).toEqual({
      type: "MethodCall",
      target: "fp",
      method: "encode",
      args: [-12.375],
      line: 1,
    });
  });

  it("reports error for missing semicolon", () => {
    const result = parse("BST tree");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain(";");
  });
});
