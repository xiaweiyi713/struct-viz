export type TokenType =
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "LPAREN"
  | "RPAREN"
  | "SEMICOLON"
  | "DOT"
  | "COMMA"
  | "COMMENT"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/** 词法错误：携带行列号，parse() 会捕获并转为 ParseError */
export class LexError extends Error {
  line: number;
  column: number;
  constructor(line: number, column: number, message: string) {
    super(message);
    this.name = "LexError";
    this.line = line;
    this.column = column;
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;

  while (pos < input.length) {
    const ch = input[pos];

    // 换行符
    if (ch === "\n") {
      line++;
      column = 1;
      pos++;
      continue;
    }

    // 空白字符
    if (/\s/.test(ch)) {
      pos++;
      column++;
      continue;
    }

    // 注释 // ...
    if (ch === "/" && pos + 1 < input.length && input[pos + 1] === "/") {
      const startCol = column;
      pos += 2; // 跳过 //
      column += 2;
      let text = "";
      while (pos < input.length && input[pos] !== "\n") {
        text += input[pos];
        pos++;
        column++;
      }
      tokens.push({ type: "COMMENT", value: text.trim(), line, column: startCol });
      continue;
    }

    // 标点符号
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(", line, column });
      pos++;
      column++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")", line, column });
      pos++;
      column++;
      continue;
    }
    if (ch === ";") {
      tokens.push({ type: "SEMICOLON", value: ";", line, column });
      pos++;
      column++;
      continue;
    }
    if (ch === ".") {
      tokens.push({ type: "DOT", value: ".", line, column });
      pos++;
      column++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ",", line, column });
      pos++;
      column++;
      continue;
    }

    // 字符串字面量
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startCol = column;
      const startLine = line;
      pos++;
      column++;
      let value = "";
      while (pos < input.length && input[pos] !== quote) {
        if (input[pos] === "\\" && pos + 1 < input.length) {
          pos++;
          column++;
          const escaped = input[pos];
          if (escaped === "n") value += "\n";
          else if (escaped === "t") value += "\t";
          else if (escaped === "\\") value += "\\";
          else if (escaped === quote) value += quote;
          else value += escaped;
        } else {
          if (input[pos] === "\n") {
            line++;
            column = 0;
          }
          value += input[pos];
        }
        pos++;
        column++;
      }
      if (pos < input.length) {
        pos++; // 跳过结尾引号
        column++;
      } else {
        // 到达输入末尾仍未见到闭合引号：明确报错，而不是吞掉剩余输入
        throw new LexError(startLine, startCol, `字符串未闭合：缺少 ${quote} 引号`);
      }
      tokens.push({ type: "STRING", value, line: startLine, column: startCol });
      continue;
    }

    // 负号：StructScript 没有减法运算符，'-' 只允许作为负数字面量的一部分，
    // 且只能出现在开头、左括号或逗号之后。其他位置的 '-' 直接报错，
    // 避免静默丢弃导致语义改变（如 insert(3-5) 被误解析为 insert(3, 5)）。
    if (ch === "-") {
      const startCol = column;
      const nextIsDigit = pos + 1 < input.length && /[0-9]/.test(input[pos + 1]);
      const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;
      const validPosition =
        !lastToken || lastToken.type === "LPAREN" || lastToken.type === "COMMA";
      if (nextIsDigit && validPosition) {
        let value = "-";
        pos++; column++;
        while (pos < input.length && /[0-9]/.test(input[pos])) {
          value += input[pos];
          pos++; column++;
        }
        // 支持小数部分
        if (pos < input.length && input[pos] === "." && pos + 1 < input.length && /[0-9]/.test(input[pos + 1])) {
          value += ".";
          pos++; column++;
          while (pos < input.length && /[0-9]/.test(input[pos])) {
            value += input[pos];
            pos++; column++;
          }
        }
        tokens.push({ type: "NUMBER", value, line, column: startCol });
        continue;
      }
      throw new LexError(
        line,
        startCol,
        nextIsDigit
          ? "负号位置非法：'-' 只能出现在代码开头、'(' 或 ',' 之后"
          : "无法识别的字符 '-'（StructScript 不支持减法运算）",
      );
    }

    // 数字字面量（支持浮点数）
    if (/[0-9]/.test(ch)) {
      const startCol = column;
      let value = "";
      while (pos < input.length && /[0-9]/.test(input[pos])) {
        value += input[pos];
        pos++;
        column++;
      }
      // 支持小数部分
      if (pos < input.length && input[pos] === "." && pos + 1 < input.length && /[0-9]/.test(input[pos + 1])) {
        value += ".";
        pos++; column++;
        while (pos < input.length && /[0-9]/.test(input[pos])) {
          value += input[pos];
          pos++; column++;
        }
      }
      tokens.push({ type: "NUMBER", value, line, column: startCol });
      continue;
    }

    // 标识符
    if (/[a-zA-Z_]/.test(ch)) {
      const startCol = column;
      let value = "";
      while (pos < input.length && /[a-zA-Z0-9_]/.test(input[pos])) {
        value += input[pos];
        pos++;
        column++;
      }
      tokens.push({ type: "IDENTIFIER", value, line, column: startCol });
      continue;
    }

    // 无法识别的字符：直接报错并携带行列号，不再静默跳过
    throw new LexError(line, column, `无法识别的字符 '${ch}'`);
  }

  tokens.push({ type: "EOF", value: "", line, column });
  return tokens;
}
