/**
 * Sample event payloads shown in the Catalog tab so users can see exactly
 * what JSON body ForgeQ will POST to their endpoint for each event type.
 *
 * These shapes mirror the envelope emitted by `forgeq-integrations-webhooks-svc`:
 *   - `id`        — unique delivery id
 *   - `type`      — event type (matches /events/catalog)
 *   - `severity`  — INFO | WARN | CRITICAL
 *   - `ts`        — ISO-8601 timestamp
 *   - `workspaceId`, `actor`
 *   - `data`      — event-specific payload
 *
 * Every delivery carries an HMAC-SHA256 signature in the
 * `X-ForgeQ-Signature` header computed with the subscriber's signing
 * secret — never store the secret on the client.
 */
export const samplePayloads: Record<string, object> = {
  'monitor.down': {
    id: 'evt_01HZK3XQ4MX9PZY6V3B6N1T8PK',
    type: 'monitor.down',
    severity: 'CRITICAL',
    ts: '2026-04-30T08:32:15.412Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'system', name: 'monitor-scheduler' },
    data: {
      monitorId: 'mon_c81f…',
      monitorName: 'Billing API · health',
      url: 'https://api.acme.com/healthz',
      region: 'us-east-1',
      status: 'DOWN',
      consecutiveFailures: 3,
      lastError: 'connect ETIMEDOUT',
      lastHttpStatus: null,
      runbookUrl: 'https://runbooks.acme.com/billing/api',
    },
  },
  'monitor.up': {
    id: 'evt_01HZK3Y14S6EHZ7TDJBMKY8R0V',
    type: 'monitor.up',
    severity: 'INFO',
    ts: '2026-04-30T08:35:01.004Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'system', name: 'monitor-scheduler' },
    data: {
      monitorId: 'mon_c81f…',
      monitorName: 'Billing API · health',
      downtimeSec: 166,
      recoveredAt: '2026-04-30T08:35:00.993Z',
    },
  },
  'incident.opened': {
    id: 'evt_01HZK41YXQHSY0RXWQMBE4TG4Z',
    type: 'incident.opened',
    severity: 'CRITICAL',
    ts: '2026-04-30T08:32:17.981Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'system', name: 'incident-router' },
    data: {
      incidentId: 'inc_8ea4…',
      title: 'Billing API health check is failing',
      severity: 'sev2',
      openedBy: 'monitor-scheduler',
      monitorIds: ['mon_c81f…'],
      assignees: ['on-call@acme.com'],
      correlationId: 'corr_01HZK41YXQ',
    },
  },
  'incident.resolved': {
    id: 'evt_01HZK4C3TEV1W8Z86RSNKY2B1N',
    type: 'incident.resolved',
    severity: 'INFO',
    ts: '2026-04-30T08:36:22.104Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'user', userId: 'usr_012', name: 'Aditi' },
    data: {
      incidentId: 'inc_8ea4…',
      title: 'Billing API health check is failing',
      durationSec: 245,
      resolution: 'Transient AWS networking blip — auto-recovered',
    },
  },
  'test.run.started': {
    id: 'evt_01HZK4M6G0N1E7PRQX84W0HJ3H',
    type: 'test.run.started',
    severity: 'INFO',
    ts: '2026-04-30T08:40:05.551Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'user', userId: 'usr_012', name: 'Aditi' },
    data: {
      runId: 'run_3c7d…',
      suiteId: 'suite_pre-deploy',
      suiteName: 'Pre-deploy smoke',
      environment: 'staging',
      triggeredBy: 'ci',
    },
  },
  'test.run.failed': {
    id: 'evt_01HZK4XE7KRJ0A5YN6V1Q30P0W',
    type: 'test.run.failed',
    severity: 'CRITICAL',
    ts: '2026-04-30T08:41:51.823Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'user', userId: 'usr_012', name: 'Aditi' },
    data: {
      runId: 'run_3c7d…',
      passed: 47,
      failed: 3,
      skipped: 0,
      durationMs: 41_228,
      firstFailure: {
        testId: 'tst_login_happy',
        name: 'POST /auth/login — happy path',
        assertion: 'response.body.token exists',
        actual: undefined,
        reportUrl: '/projects/testing/runs/run_3c7d',
      },
    },
  },
  'test.run.passed': {
    id: 'evt_01HZK5A22MV3C1Q50B29W4KH1F',
    type: 'test.run.passed',
    severity: 'INFO',
    ts: '2026-04-30T08:48:14.331Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'user', userId: 'usr_012', name: 'Aditi' },
    data: {
      runId: 'run_4d8e…',
      passed: 50,
      durationMs: 38_902,
    },
  },
  'heartbeat.missed': {
    id: 'evt_01HZK5J09FEN5Q1VYN0X5E2HJG',
    type: 'heartbeat.missed',
    severity: 'CRITICAL',
    ts: '2026-04-30T09:00:02.112Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'system', name: 'heartbeat-scheduler' },
    data: {
      heartbeatId: 'hb_21aa…',
      name: 'Nightly ETL cron',
      expectedIntervalSec: 3600,
      gracePeriodSec: 300,
      lastPingAt: '2026-04-30T07:58:41.000Z',
      missedBySec: 4_282,
    },
  },
  'audit.entry.created': {
    id: 'evt_01HZK5W1B6V7T00AJY8C4C6H0D',
    type: 'audit.entry.created',
    severity: 'INFO',
    ts: '2026-04-30T09:01:44.001Z',
    workspaceId: 'ws_7f2e…',
    actor: { kind: 'user', userId: 'usr_012', name: 'Aditi' },
    data: {
      entryId: 'aud_9f3b…',
      action: 'collection.deleted',
      target: { kind: 'collection', id: 'col_7abc…', name: 'Legacy v1 APIs' },
      ipAddress: '203.0.113.42',
      userAgent: 'ForgeQ-Web/1.0',
    },
  },
};

/** Returns a pretty JSON string for the given event type, falling back to
 *  a minimal envelope so the catalog never shows a blank panel. */
export const samplePayloadFor = (type: string): string => {
  const body = samplePayloads[type] ?? {
    id: 'evt_…',
    type,
    severity: 'INFO',
    ts: new Date().toISOString(),
    workspaceId: 'ws_…',
    data: { note: 'Sample payload not yet curated for this event.' },
  };
  return JSON.stringify(body, null, 2);
};
