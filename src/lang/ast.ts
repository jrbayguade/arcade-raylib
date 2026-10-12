export type ValueType = 'int' | 'float' | 'bool' | 'Color' | 'string' | 'void';
export type DeclType = 'int' | 'float' | 'bool' | 'Color';
export type BinaryOp = '+' | '-' | '*' | '/' | '%' | '<' | '>' | '<=' | '>=' | '==' | '!=' | '&&' | '||';
export type AssignOp = '=' | '+=' | '-=' | '*=' | '/=';

export interface Node { id: number; line: number; col: number }
interface ExprBase extends Node { type?: ValueType }

export interface IntLit extends ExprBase { kind: 'IntLit'; value: number }
export interface FloatLit extends ExprBase { kind: 'FloatLit'; value: number }
export interface BoolLit extends ExprBase { kind: 'BoolLit'; value: boolean }
export interface StringLit extends ExprBase { kind: 'StringLit'; value: string }
export interface VarRef extends ExprBase { kind: 'Var'; name: string }
export interface Unary extends ExprBase { kind: 'Unary'; op: '-' | '!'; operand: Expr }
export interface Binary extends ExprBase { kind: 'Binary'; op: BinaryOp; left: Expr; right: Expr }
export interface Call extends ExprBase { kind: 'Call'; callee: string; args: Expr[] }
export type Expr = IntLit | FloatLit | BoolLit | StringLit | VarRef | Unary | Binary | Call;

export interface VarDecl extends Node { kind: 'VarDecl'; varType: DeclType; name: string; init: Expr }
export interface Assign extends Node { kind: 'Assign'; target: string; op: AssignOp; value: Expr; targetType?: DeclType }
export interface IncDec extends Node { kind: 'IncDec'; target: string; op: '++' | '--'; targetType?: DeclType }
export interface ExprStmt extends Node { kind: 'ExprStmt'; expr: Call }
export interface Block extends Node { kind: 'Block'; body: Stmt[] }
export interface If extends Node { kind: 'If'; cond: Expr; then: Block; otherwise: Block | If | null }
export interface While extends Node { kind: 'While'; cond: Expr; body: Block }
export interface For extends Node {
  kind: 'For'; init: VarDecl | Assign | IncDec | null; cond: Expr | null; update: Assign | IncDec | null; body: Block;
}
export interface Return extends Node { kind: 'Return'; value: Expr | null }
export type Stmt = VarDecl | Assign | IncDec | ExprStmt | Block | If | While | For | Return;

export interface Program { kind: 'Program'; main: Block }
