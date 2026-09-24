import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationLinkHandler } from '../lib/notification-links';

const alert = (id: string, targetRef: string | null = null) => ({
  id, title: `Alert ${id}`, severity: 'critical' as const, kind: 'owner_signal', targetRef, status: 'unread',
});
const approval = (id: string) => ({ id, lifecycle: 'PENDING' as const });
const waiting = (id: string) => ({ id, subject: `Waiting ${id}` });

function harness(overrides: Record<string, unknown> = {}) {
  const events: string[] = [];
  const calls = { alerts: 0, approvals: 0, waiting: 0, acknowledged: [] as string[] };
  const api = {
    alerts: async () => { calls.alerts++; events.push('fresh-alerts'); return [alert('notice-1')]; },
    approvals: async () => { calls.approvals++; events.push('fresh-approvals'); return [approval('approval-exact')]; },
    waiting: async () => { calls.waiting++; events.push('fresh-waiting'); return [waiting('waiting-exact')]; },
    markNotificationDelivery: async (id: string) => { calls.acknowledged.push(id); events.push('acknowledge'); return { recorded: true }; },
    ...overrides,
  };
  const handler = createNotificationLinkHandler({
    getApi: () => api as any,
    cacheFreshTarget: async (target) => { events.push(`cache-${target.destination}:${target.id}`); },
    navigate: async (destination, id) => { events.push(`navigate-${destination}:${id}`); },
    navigatePublic: (destination) => { events.push(`navigate-public-${destination}`); },
    reportReceiptFailure: () => { events.push('receipt-failed'); },
  });
  return { handler, api, calls, events };
}

test('alert, approval, and waiting links preserve their exact target IDs', async () => {
  const alertHarness = harness({
    alerts: async () => [alert('alert-Exact-01')],
  });
  assert.equal(await alertHarness.handler.openLink('lee-android://alerts/alert-Exact-01'), true);
  assert.ok(alertHarness.events.includes('navigate-alerts:alert-Exact-01'));

  const alertPushHarness = harness({
    alerts: async () => [alert('notice-Exact-02', 'related-record')],
  });
  assert.equal(await alertPushHarness.handler.openNotification({ tab: 'alerts', notificationId: 'notice-Exact-02' }), true);
  assert.ok(alertPushHarness.events.includes('navigate-alerts:notice-Exact-02'));

  const approvalLinkHarness = harness();
  assert.equal(await approvalLinkHarness.handler.openLink('lee-android://approvals/approval-exact'), true);
  assert.ok(approvalLinkHarness.events.includes('navigate-approvals:approval-exact'));

  const approvalHarness = harness({
    alerts: async () => [alert('notice-1', 'approval-exact')],
  });
  assert.equal(await approvalHarness.handler.openNotification({ tab: 'approvals', notificationId: 'notice-1' }), true);
  assert.ok(approvalHarness.events.includes('navigate-approvals:approval-exact'));

  const waitingLinkHarness = harness();
  assert.equal(await waitingLinkHarness.handler.openLink('lee-android://waiting/waiting-exact'), true);
  assert.ok(waitingLinkHarness.events.includes('navigate-waiting:waiting-exact'));

  const waitingHarness = harness({
    alerts: async () => [alert('notice-1', 'waiting-exact')],
  });
  assert.equal(await waitingHarness.handler.openNotification({ tab: 'waiting', notificationId: 'notice-1' }), true);
  assert.ok(waitingHarness.events.includes('navigate-waiting:waiting-exact'));
});

test('malformed, missing, unknown, mismatched, and Family references fail closed', async () => {
  const { handler, calls, events } = harness({
    alerts: async () => [alert('notice-1', 'different-approval')],
  });
  assert.equal(await handler.openLink('lee-android://alerts/%ZZ'), false);
  assert.equal(await handler.openLink('lee-android://alerts'), false);
  assert.equal(await handler.openLink('lee-android://untrusted/alerts/alert-1'), false);
  assert.equal(await handler.openLink('lee-android://alerts/alert-1?familyId=family-1'), false);
  assert.equal(await handler.openLink('https://example.com/alerts/alert-1'), false);
  assert.equal(await handler.openLink('lee-android://family/secret-id'), false);
  assert.equal(await handler.openNotification({ tab: 'alerts' }), false);
  assert.equal(await handler.openNotification({ tab: 'unknown', notificationId: 'notice-1' }), false);
  assert.equal(await handler.openNotification({ tab: 'approvals', approvalId: 'approval-exact', notificationId: 'notice-1' }), false);
  assert.equal(await handler.openNotification({ tab: 'approvals', approvalId: 'approval-exact', familyId: 'family-record' }), false);
  assert.equal(await handler.openNotification({ tab: 'waiting', id: 'waiting-exact' }), false);
  assert.equal(events.some((event) => event.startsWith('navigate-')), false);
  assert.equal(calls.acknowledged.length, 0);
});

test('missing and unauthorized live records never fall back to cached projections', async () => {
  const missing = harness({ alerts: async () => [] });
  assert.equal(await missing.handler.openLink('lee-android://alerts/not-in-live-list'), false);
  assert.equal(missing.events.some((event) => event.startsWith('cache-') || event.startsWith('navigate-')), false);

  const revoked = harness({ alerts: async () => { throw Object.assign(new Error('revoked'), { status: 401 }); } });
  assert.equal(await revoked.handler.openNotification({ tab: 'alerts', notificationId: 'notice-1' }), false);
  assert.equal(revoked.events.some((event) => event.startsWith('cache-') || event.startsWith('navigate-')), false);

  const staleCachedRows = [alert('stale-cached-alert')];
  const unavailable = harness({ alerts: async () => { throw new Error('Core unavailable'); } });
  assert.equal(await unavailable.handler.openLink('lee-android://alerts/stale-cached-alert'), false);
  assert.equal(staleCachedRows[0].id, 'stale-cached-alert');
  assert.equal(unavailable.events.some((event) => event.startsWith('cache-') || event.startsWith('navigate-')), false);
});

test('duplicate taps navigate and acknowledge once, only after a fresh read and navigation', async () => {
  const { handler, calls, events } = harness({
    alerts: async () => [alert('notice-1', 'approval-exact')],
  });
  const payload = { tab: 'approvals', notificationId: 'notice-1' };
  assert.equal(await handler.openNotification(payload), true);
  assert.equal(await handler.openNotification(payload), false);
  assert.deepEqual(calls.acknowledged, ['notice-1']);
  assert.equal(events.filter((event) => event === 'navigate-approvals:approval-exact').length, 1);
  assert.ok(events.indexOf('fresh-approvals') < events.indexOf('cache-approvals:approval-exact'));
  assert.ok(events.indexOf('cache-approvals:approval-exact') < events.indexOf('navigate-approvals:approval-exact'));
  assert.ok(events.indexOf('navigate-approvals:approval-exact') < events.indexOf('acknowledge'));
});

test('concurrent duplicate notification opens are suppressed while the first read is pending', async () => {
  let release: (() => void) | undefined;
  let entered: (() => void) | undefined;
  const enteredPromise = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const setup = harness({
    alerts: async () => {
      setupCalls.alerts++;
      if (setupCalls.alerts === 1) {
        entered?.();
        await gate;
        return [alert('notice-1')];
      }
      return [alert('notice-1')];
    },
  });
  const setupCalls = setup.calls;
  const first = setup.handler.openNotification({ tab: 'alerts', notificationId: 'notice-1' });
  await enteredPromise;
  assert.equal(await setup.handler.openNotification({ tab: 'alerts', notificationId: 'notice-1' }), false);
  release?.();
  assert.equal(await first, true);
  assert.equal(setup.events.filter((event) => event === 'navigate-alerts:notice-1').length, 1);
  assert.deepEqual(setup.calls.acknowledged, ['notice-1']);
});

test('the in-memory open guard stays bounded and evicts completed entries', async () => {
  let liveId = '';
  const navigated: string[] = [];
  const handler = createNotificationLinkHandler({
    getApi: () => ({
      alerts: async () => [alert(liveId)],
      approvals: async () => [],
      waiting: async () => [],
      markNotificationDelivery: async () => ({ recorded: true }),
    }),
    cacheFreshTarget: () => undefined,
    navigate: (_destination, id) => { navigated.push(id); },
    navigatePublic: () => undefined,
  });

  for (let index = 0; index < 129; index++) {
    liveId = `alert-${index}`;
    assert.equal(await handler.openLink(`lee-android://alerts/${liveId}`), true);
  }
  liveId = 'alert-0';
  assert.equal(await handler.openLink('lee-android://alerts/alert-0'), true);
  assert.equal(navigated.filter((id) => id === 'alert-0').length, 2);
});

test('Ask and Today deep links remain available without protected-record routing', async () => {
  const { handler, events } = harness();
  assert.equal(await handler.openLink('lee-android://ask?prompt=hello'), true);
  assert.equal(await handler.openLink('lee-android://today'), true);
  assert.equal(await handler.openNotification({ tab: 'index', notificationId: 'notice-1' }), true);
  assert.equal(await handler.openNotification({ tab: 'index', notificationId: 'notice/invalid' }), false);
  assert.deepEqual(events, ['navigate-public-ask', 'navigate-public-today', 'navigate-public-today']);
});