import ca from './ca.json';
import type { DiagParams, Diagnostic } from '../lang/diagnostics';

interface Catalog {
  errors: Record<string, string>;
  features: Record<string, string>;
  types: Record<string, string>;
  suggestion: string;
  ui: Record<string, string>;
}

const catalogs: Record<string, Catalog> = { ca };
let current = 'ca';

export function setLanguage(lang: string): void {
  if (Object.hasOwn(catalogs, lang)) current = lang;
}

type Section = 'errors' | 'features' | 'types' | 'ui';

function lookup(section: Section, key: string): string | undefined {
  const own = catalogs[current][section];
  if (Object.hasOwn(own, key)) return own[key];
  return Object.hasOwn(catalogs.ca[section], key) ? catalogs.ca[section][key] : undefined;
}

export function fill(template: string, params: DiagParams): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.hasOwn(params, k) ? String(params[k]) : m));
}

export function t(key: string, params: DiagParams = {}): string {
  return fill(lookup('ui', key) ?? key, params);
}

export function formatDiagnostic(d: Diagnostic): string {
  const params: DiagParams = { line: d.line, ...d.params };
  for (const [k, v] of Object.entries(params)) {
    if (k.endsWith('Type') && typeof v === 'string') params[k] = lookup('types', v) ?? v;
  }
  if (typeof params.feature === 'string') params.feature = lookup('features', params.feature) ?? params.feature;
  let msg = fill(lookup('errors', d.code) ?? d.code, params);
  if (params.suggestion !== undefined) msg += ' ' + fill(catalogs[current].suggestion, params);
  return msg;
}
