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
      }
      tokens.push({ type: "STRING", value, line: startLine, column: startCol });
      continue;
    }

    // 负数字面量：'-' 后跟数字，且前一个 token 是 LPAREN/COMMA/无
    if (ch === "-" && pos + 1 < input.length && /[0-9]/.test(input[pos + 1])) {
      const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;
      if (!lastToken || lastToken.type === "LPAREN" || lastToken.type === "COMMA") {
        const startCol = column;
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

    // 无法识别的字符，跳过
    pos++;
    column++;
  }

  tokens.push({ type: "EOF", value: "", line, column });
  return tokens;
}
