/**
 * Built-in assertions catalog used by the Test Spec editor's
 * AssertionLibraryModal (Task 3.10).
 *
 * Each entry has:
 *   - id: stable key used by the spec engine.
 *   - label: short human title.
 *   - category: groups the menu in the modal.
 *   - description: one-liner explaining the check.
 *   - template: starter expression the editor pastes in (the user
 *     replaces placeholders like `{{value}}` or `{{json.path}}`).
 *
 * Backend contract: the test-spec engine evaluates each assertion as
 * a JS expression in the response context. The IDs here mirror the
 * built-in helpers exposed in `AssertionRunner.java` (existing).
 */
export type AssertionCategory = 'status' | 'headers' | 'body' | 'jsonpath' | 'timing' | 'schema';

export interface BuiltInAssertion {
  id: string;
  label: string;
  category: AssertionCategory;
  description: string;
  template: string;
}

export const BUILTIN_ASSERTIONS: BuiltInAssertion[] = [
  /* ── Status code checks ───────────────────────────────── */
  { id: 'status.is',            label: 'Status is 200',          category: 'status',   description: 'Asserts response status code equals an exact value.', template: 'response.status === 200' },
  { id: 'status.is2xx',         label: 'Status is 2xx',          category: 'status',   description: 'Passes for any 200-series success response.',         template: 'response.status >= 200 && response.status < 300' },
  { id: 'status.isNot5xx',      label: 'Status is not 5xx',      category: 'status',   description: 'Fails if the server returned a 500-series error.',     template: 'response.status < 500' },
  { id: 'status.redirect',      label: 'Status is redirect',    category: 'status',   description: 'Asserts a 3xx redirect status.',                       template: 'response.status >= 300 && response.status < 400' },

  /* ── Header checks ────────────────────────────────────── */
  { id: 'header.contentType',   label: 'Content-Type contains', category: 'headers',  description: 'Verify Content-Type header substring.',                template: "response.headers['content-type']?.includes('application/json')" },
  { id: 'header.exists',        label: 'Header exists',         category: 'headers',  description: 'Verify a specific header is present.',                 template: "'x-request-id' in response.headers" },
  { id: 'header.equals',        label: 'Header equals value',   category: 'headers',  description: 'Verify a header has exact value.',                     template: "response.headers['cache-control'] === 'no-store'" },
  { id: 'header.cors',          label: 'CORS allows origin',    category: 'headers',  description: 'Verify Access-Control-Allow-Origin matches expected.', template: "response.headers['access-control-allow-origin'] === '*'" },

  /* ── Body string/regex checks ─────────────────────────── */
  { id: 'body.contains',        label: 'Body contains text',    category: 'body',     description: 'Substring match on raw response body.',                template: "response.text.includes('expected substring')" },
  { id: 'body.matches',         label: 'Body matches regex',    category: 'body',     description: 'Regular expression match.',                            template: "/error|exception/i.test(response.text)" },
  { id: 'body.notEmpty',        label: 'Body is non-empty',     category: 'body',     description: 'Asserts response body length > 0.',                    template: 'response.text.length > 0' },

  /* ── JSONPath / structured body ───────────────────────── */
  { id: 'jp.fieldExists',       label: 'JSON field exists',     category: 'jsonpath', description: 'A specific JSON path resolves to a defined value.',    template: "response.json.data !== undefined" },
  { id: 'jp.fieldEquals',       label: 'JSON field equals',     category: 'jsonpath', description: 'A JSON path resolves to a specific value.',            template: "response.json.status === 'ok'" },
  { id: 'jp.arrayLength',       label: 'JSON array length',     category: 'jsonpath', description: 'Array property at JSON path has expected length.',     template: 'Array.isArray(response.json.items) && response.json.items.length >= 1' },
  { id: 'jp.typeOf',            label: 'JSON field is type',    category: 'jsonpath', description: 'Type check (string/number/boolean/object).',           template: "typeof response.json.id === 'string'" },
  { id: 'jp.uuid',              label: 'JSON field is UUID',    category: 'jsonpath', description: 'Asserts a field is a UUID v4.',                        template: '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(response.json.id)' },
  { id: 'jp.isoDate',           label: 'JSON field is ISO-8601',category: 'jsonpath', description: 'Asserts a field is a valid ISO timestamp.',            template: '!Number.isNaN(Date.parse(response.json.createdAt))' },

  /* ── Timing thresholds ────────────────────────────────── */
  { id: 'timing.fasterThan',    label: 'Response < N ms',       category: 'timing',   description: 'End-to-end latency below a threshold.',                template: 'response.durationMs < 500' },
  { id: 'timing.between',       label: 'Response in range',     category: 'timing',   description: 'Latency within an envelope (catches "too fast" cache hits too).', template: 'response.durationMs > 5 && response.durationMs < 2000' },

  /* ── Schema validation ────────────────────────────────── */
  { id: 'schema.jsonSchema',    label: 'Matches JSON schema',   category: 'schema',   description: 'Validate body against a JSON Schema (paste the schema in).', template: "validateJsonSchema(response.json, {\n  type: 'object',\n  required: ['id'],\n  properties: { id: { type: 'string' } }\n})" },
  { id: 'schema.openapi',       label: 'Matches OpenAPI spec',  category: 'schema',   description: 'Validate body against operation schema from your spec.',   template: 'validateOpenApi(response, request.operationId)' },
];

/** Used by the modal to render category tabs in a stable order. */
export const ASSERTION_CATEGORIES: { id: AssertionCategory; label: string }[] = [
  { id: 'status',   label: 'Status'    },
  { id: 'headers',  label: 'Headers'   },
  { id: 'body',     label: 'Body'      },
  { id: 'jsonpath', label: 'JSON path' },
  { id: 'timing',   label: 'Timing'    },
  { id: 'schema',   label: 'Schema'    },
];
