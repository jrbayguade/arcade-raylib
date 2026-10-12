import type { ValueType } from './ast';
import type { Code, DiagParams } from './diagnostics';

export interface ColorValue { r: number; g: number; b: number; a: number }
export type Value = number | boolean | string | ColorValue;

export interface NativeSignature { params: ValueType[]; returns: ValueType; variadic?: boolean }
export interface NativeFunction extends NativeSignature { call(args: Value[]): Value | undefined }
export interface ConstantDef { type: ValueType; value: Value }

export interface HostSignature {
  functions: Record<string, NativeSignature>;
  constants: Record<string, { type: ValueType }>;
}

export interface HostEnv extends HostSignature {
  functions: Record<string, NativeFunction>;
  constants: Record<string, ConstantDef>;
  /** True once after a native function (EndDrawing) asked the interpreter to end the frame. */
  takeFrameYield(): boolean;
}

/** Thrown by native functions; the interpreter converts it into a LangError at the call site. */
export class NativeError extends Error {
  constructor(readonly code: Code, readonly params: DiagParams = {}) {
    super(code);
  }
}
