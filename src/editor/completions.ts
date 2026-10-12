import { snippetCompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { ValueType } from '../lang/ast';
import type { HostSignature } from '../lang/host';

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

export function buildCompletions(host: HostSignature, names: (fn: string) => string[] | undefined): Completion[] {
  const functions = Object.keys(host.functions).flatMap((fn): Completion[] => {
    if (fn === 'TextFormat') {
      return [snippetCompletion('TextFormat("%d", ${valor})', { label: 'TextFormat', type: 'function', detail: '("%d", valor)' })];
    }
    const params = names(fn);
    if (!params) return [];
    const template = snippetTemplate(fn, params, host.functions[fn].returns);
    return [snippetCompletion(template, { label: fn, type: 'function', detail: `(${params.join(', ')})` })];
  });
  const constants = Object.keys(host.constants).map((c): Completion => ({ label: c, type: 'constant' }));
  return [...functions, ...constants];
}

/** Functions that return nothing are whole statements, so their snippet already ends with `;`. */
export function snippetTemplate(fn: string, params: string[], returns: ValueType): string {
  const fields = params.map((p) => '${' + plain(p) + '}').join(', ');
  return `${fn}(${fields})${returns === 'void' ? ';' : ''}`;
}

export function declaredVariables(code: string): string[] {
  return [...code.matchAll(/\b(?:int|float|bool|Color)\s+([A-Za-z_]\w*)\s*=/g)].map((m) => m[1]);
}

export function completionSource(base: Completion[]) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const word = ctx.matchBefore(/[A-Za-z_]\w*/);
    if (!word || (word.from === word.to && !ctx.explicit)) return null;
    const variables = declaredVariables(ctx.state.doc.toString()).map((v): Completion => ({ label: v, type: 'variable' }));
    return { from: word.from, options: [...variables, ...base], validFor: /^\w*$/ };
  };
}
