import { describe, it, expect } from "vitest";
import { tokenize } from "../parser/tokenizer";

describe("tokenizer", () => {
  it("tokenizes identifiers", () => {
    const tokens = tokenize("BST tree;");
    expect(tokens).toHaveLength(4); // BST, tree, ;, EOF
    expect(tokens[0]).toEqual({ type: "IDENTIFIER", value: "BST", line: 1, column: 1 });
    expect(tokens[1]).toEqual({ type: "IDENTIFIER", value: "tree", line: 1, column: 5 });
    expect(tokens[2]).toEqual({ type: "SEMICOLON", value: ";", line: 1, column: 9 });
  });

  it("tokenizes positive numbers", () => {
    const tokens = tokenize("tree.insert(42);");
    expect(tokens[4]).toEqual({ type: "NUMBER", value: "42", line: 1, column: 13 });
  });

  it("tokenizes negative numbers after LPAREN", () => {
    const tokens = tokenize("g.addEdge(0, 1, -3);");
    const numToken = tokens.find((t) => t.value === "-3");
    expect(numToken).toBeDefined();
    expect(numToken!.type).toBe("NUMBER");
    expect(numToken!.value).toBe("-3");
  });

  it("tokenizes negative numbers after COMMA", () => {
    const tokens = tokenize("q.sort(-5, 3);");
    // q . sort ( -5 , 3 ) ;
    expect(tokens[3]).toEqual({ type: "LPAREN", value: "(", line: 1, column: 7 });
    expect(tokens[4]).toEqual({ type: "NUMBER", value: "-5", line: 1, column: 8 });
  });

  it("tokenizes strings with double quotes", () => {
    const tokens = tokenize(`t.insert("hello");`);
    expect(tokens[4]).toEqual({ type: "STRING", value: "hello", line: 1, column: 10 });
  });

  it("tokenizes strings with single quotes", () => {
    const tokens = tokenize(`t.insert('world');`);
    const strToken = tokens.find((t) => t.value === "world");
    expect(strToken).toBeDefined();
    expect(strToken!.type).toBe("STRING");
  });

  it("tokenizes comments", () => {
    const tokens = tokenize("// this is a comment\ntree.insert(5);");
    expect(tokens[0].type).toBe("COMMENT");
    expect(tokens[0].value).toBe("this is a comment");
  });

  it("tokenizes bare identifiers as IDENTIFIER (not error)", () => {
    const tokens = tokenize("HashTable ht(11, linear);");
    const linearToken = tokens.find((t) => t.value === "linear");
    expect(linearToken).toBeDefined();
    expect(linearToken!.type).toBe("IDENTIFIER");
  });

  it("handles multiline input", () => {
    const tokens = tokenize("BST tree;\ntree.insert(8);");
    // BST tree ; tree . insert ( 8 ) ; EOF = 11 tokens
    expect(tokens.filter((t) => t.type !== "EOF")).toHaveLength(10);
    expect(tokens[0].line).toBe(1);
    expect(tokens[3].line).toBe(2);
  });
});
