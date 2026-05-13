/**
 * gqlExtras — small helpers that don't fit anywhere else.
 *
 *   - detectFederation: returns true when the cached introspection
 *     declares Apollo Federation markers (`_service`, `_entities`).
 *   - extractTracing: pulls Apollo tracing spans out of a response so a
 *     future flame chart can render them. (Not wired yet.)
 */
import type { IntrospectionQuery } from 'graphql';

export const detectFederation = (intro: IntrospectionQuery | null): boolean => {
  if (!intro?.__schema) return false;
  const queryType = intro.__schema.queryType?.name;
  if (!queryType) return false;
  const qt: any = intro.__schema.types.find((t: any) => t.name === queryType);
  if (!qt?.fields) return false;
  const names = qt.fields.map((f: any) => f.name);
  return names.includes('_service') || names.includes('_entities');
};

export interface TraceSpan {
  path: string;
  start: number;
  end: number;
}

export const extractTracing = (response: any): TraceSpan[] => {
  const t = response?.extensions?.tracing;
  if (!t?.execution?.resolvers) return [];
  return t.execution.resolvers.map((r: any) => ({
    path: (r.path ?? []).join('.'),
    start: r.startOffset,
    end: r.startOffset + r.duration,
  }));
};
