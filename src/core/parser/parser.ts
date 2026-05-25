import type {
  ParseResult,
  ParseError,
  Program,
  Statement,
  Literal,
} from "../../types/ast.js";
import { tokenize, type Token } from "./tokenizer.js";

export function parse(input: string): ParseResult {
  const tokens = tokenize(input);
  const errors: ParseError[] = [];
  const statements: Statement[] = [];

  let pos = 0;

  function current(): Token {
    return tokens[pos] ?? tokens[tokens.length - 1];
  }

  function peek(offset: number): Token {
    return tokens[pos + offset] ?? tokens[tokens.length - 1];
  }

  function advance(): Token {
    const tok = tokens[pos] ?? tokens[tokens.length - 1];
    pos++;
    return tok;
  }

  function addError(line: number, column: number, message: string): void {
    errors.push({ line, column, message });
  }

  function parseArgs(): Literal[] {
    const args: Literal[] = [];
    const open = advance(); // 消耗 LPAREN

    if (current().type === "RPAREN") {
      advance(); // 消耗 RPAREN
      return args;
    }

    // 解析第一个参数
    if (current().type === "NUMBER") {
      args.push(Number(advance().value));
    } else if (current().type === "STRING") {
      args.push(advance().value);
    } else if (current().type === "IDENTIFIER") {
      args.push(advance().value);
    } else {
      addError(
        current().line,
        current().column,
        `期望参数（数字或字符串），但得到 ${current().type}`
      );
    }

    // 解析后续参数
    while (current().type === "COMMA") {
      advance(); // 消耗 COMMA

      if (current().type === "NUMBER") {
        args.push(Number(advance().value));
      } else if (current().type === "STRING") {
        args.push(advance().value);
      } else if (current().type === "IDENTIFIER") {
        args.push(advance().value);
      } else {
        addError(
          current().line,
          current().column,
          `期望参数（数字、字符串或标识符），但得到 ${current().type}`
        );
      }
    }

    if (current().type === "RPAREN") {
      advance(); // 消耗 RPAREN
    } else {
      addError(
        open.line,
        open.column,
        `缺少右括号 ')'`
      );
    }

    return args;
  }

  while (current().type !== "EOF") {
    const tok = current();

    // 注释
    if (tok.type === "COMMENT") {
      statements.push({
        type: "Comment",
        text: tok.value,
        line: tok.line,
      });
      advance();
      continue;
    }

    // 标识符开头
    if (tok.type === "IDENTIFIER") {
      const next = peek(1);

      // 变量声明：className variableName;
      // 变量声明带参数：className variableName(args);
      if (next.type === "IDENTIFIER") {
        const className = advance().value;
        const variableName = advance().value;
        const line = tok.line;
        let args: Literal[] = [];

        if (current().type === "LPAREN") {
          args = parseArgs();
        }

        if (current().type === "SEMICOLON") {
          advance();
        } else {
          addError(current().line, current().column, "缺少分号 ';'");
        }

        statements.push({
          type: "Declaration",
          className,
          variableName,
          args,
          line,
        });
        continue;
      }

      // 方法调用：target.method(args);
      if (next.type === "DOT") {
        const target = advance().value;
        advance(); // 消耗 DOT
        const line = tok.line;

        if (current().type !== "IDENTIFIER") {
          addError(
            current().line,
            current().column,
            "期望方法名，但得到 " + current().type
          );
          continue;
        }

        const method = advance().value;
        let args: Literal[] = [];

        if (current().type === "LPAREN") {
          args = parseArgs();
        }

        if (current().type === "SEMICOLON") {
          advance();
        } else {
          addError(current().line, current().column, "缺少分号 ';'");
        }

        statements.push({
          type: "MethodCall",
          target,
          method,
          args,
          line,
        });
        continue;
      }

      // 无法判断语句类型
      addError(
        tok.line,
        tok.column,
        `无法解析以 '${tok.value}' 开头的语句`
      );
      advance();
      continue;
    }

    // 无法识别的 Token
    addError(
      tok.line,
      tok.column,
      `意外的 Token: ${tok.type} '${tok.value}'`
    );
    advance();
  }

  const program: Program | null =
    statements.length > 0 ? { body: statements } : null;

  return { program, errors };
}
