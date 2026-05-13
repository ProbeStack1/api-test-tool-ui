/**
 * analyzers — purely static query / schema analyses (no network calls).
 *
 *  - analyzeQueryComplexity: depth / fields / aliases / cost + tier
 *    bucket (LOW / MEDIUM / HIGH / SEVERE). Operates on raw text via a
 *    line-by-line tokeniser so it tolerates incomplete queries while
 *    the user is still typing.
 *
 *  - lintSchema (R1-R5): runs a handful of best-practice checks on a
 *    parsed GraphQLSchema. Returns LintFinding[] for the Analysis panel
 *    to render dots-and-message rows.
 */
import { GraphQLObjectType, type GraphQLSchema, isObjectType } from 'graphql';

export type LintSeverity = 'info' | 'warning' | 'error';
export interface LintFinding {
  rule: string;          // R1, R2 …
  severity: LintSeverity;
  message: string;
  location?: string;     // type / field name
}

export interface Complexity {
  depth: number;
  fields: number;
  aliases: number;
  cost: number;
  tier: 'low' | 'medium' | 'high' | 'severe';
}

/**
 * Lightweight complexity walker.
 *
 *  cost = sum(1 per field selection) + (aliases × 2)  – aliases are
 *  cheap on the server but a strong correlate of clients fanning out
 *  duplicate queries, so we charge them slightly.
 *
 *  We *don't* parse the document with the graphql library here because
 *  the editor calls this on every keystroke — graphql-js throws on
 *  syntax errors, which is exactly what an in-flight query looks like
 *  90% of the time.
 */
export const analyzeQueryComplexity = (query: string): Complexity => {
  let depth = 0;
  let maxDepth = 0;
  let fields = 0;
  let aliases = 0;
  let inString: false | '"' | "'" = false;
  let inLineComment = false;

  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (inString) { if (ch === inString && query[i - 1] !== '\\') inString = false; continue; }
    if (ch === '#') { inLineComment = true; continue; }
    if (ch === '"' || ch === "'") { inString = ch as any; continue; }
    if (ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; continue; }
    if (ch === '}') { if (depth > 0) depth--; continue; }
    if (ch === ':' && /\s/.test(query[i + 1] ?? '')) aliases++;
  }

  // Field counter — approximate: count identifiers immediately followed
  // by `(`, `{`, whitespace+identifier or newline.
  const fieldMatches = query.match(/\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*[({\n\r])/g);
  fields = fieldMatches ? fieldMatches.length : 0;
  // strip keyword false-positives
  const KW = new Set(['query', 'mutation', 'subscription', 'fragment', 'on', 'true', 'false', 'null']);
  fields = (fieldMatches ?? []).filter((f) => !KW.has(f)).length;

  const cost = fields + aliases * 2;
  const tier: Complexity['tier'] =
    cost <= 5  ? 'low' :
    cost <= 20 ? 'medium' :
    cost <= 50 ? 'high'   :
                 'severe';
  return { depth: maxDepth, fields, aliases, cost, tier };
};

/**
 * Schema-level lint. The rules are intentionally simple — they catch
 * the issues teams hit most often when shipping a new schema.
 */
export const lintSchema = (schema: GraphQLSchema | null): LintFinding[] => {
  const findings: LintFinding[] = [];
  if (!schema) return findings;

  const types = Object.values(schema.getTypeMap());
  for (const t of types) {
    if (t.name.startsWith('__')) continue;
    if (!isObjectType(t)) continue;

    // R1 — missing description on object type
    if (!t.description) {
      findings.push({
        rule: 'R1', severity: 'info',
        message: `Type "${t.name}" has no description.`,
        location: t.name,
      });
    }

    const fields = (t as GraphQLObjectType).getFields();
    for (const f of Object.values(fields)) {
      // R2 — field with no description
      if (!f.description) {
        findings.push({
          rule: 'R2', severity: 'info',
          message: `${t.name}.${f.name} has no description.`,
          location: `${t.name}.${f.name}`,
        });
      }
      // R3 — non-camelCase field
      if (!/^[a-z][a-zA-Z0-9]*$/.test(f.name)) {
        findings.push({
          rule: 'R3', severity: 'warning',
          message: `Field "${f.name}" is not camelCase.`,
          location: `${t.name}.${f.name}`,
        });
      }
      // R4 — boolean field not prefixed with "is/has/can/should"
      const ret = String(f.type).replace(/!/g, '');
      if (ret === 'Boolean' && !/^(is|has|can|should|was|did)[A-Z]/.test(f.name)) {
        findings.push({
          rule: 'R4', severity: 'info',
          message: `Boolean field "${f.name}" should start with is/has/can/should/was/did.`,
          location: `${t.name}.${f.name}`,
        });
      }
      // R5 — list field that doesn't end with a plural "s"
      if (String(f.type).startsWith('[') && !f.name.endsWith('s') && !f.name.endsWith('es')) {
        findings.push({
          rule: 'R5', severity: 'info',
          message: `List field "${f.name}" should be plural.`,
          location: `${t.name}.${f.name}`,
        });
      }
    }
  }
  return findings;
};
