export type Literal = number | string;

export type Statement =
  | DeclarationStatement
  | MethodCallStatement
  | CommentStatement;

export interface DeclarationStatement {
  type: "Declaration";
  className: string;
  variableName: string;
  args: Literal[];
  line: number;
}

export interface MethodCallStatement {
  type: "MethodCall";
  target: string;
  method: string;
  args: Literal[];
  line: number;
}

export interface CommentStatement {
  type: "Comment";
  text: string;
  line: number;
}

export interface Program {
  body: Statement[];
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

export interface ParseResult {
  program: Program | null;
  errors: ParseError[];
}
