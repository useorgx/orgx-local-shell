import assert from 'node:assert/strict';
import test from 'node:test';

import { initialPeerStates, PEERS, startPendingPeers } from '../src/peerStartup.ts';

test('rejected peer launches never become a successful process status', async () => {
  const updates = [];
  const states = await startPendingPeers(initialPeerStates(), async () => {
    throw new Error('Native runtime unavailable');
  }, (next) => updates.push(next));

  assert.deepEqual(Object.values(states), ['failed', 'failed', 'failed']);
  assert.ok(updates.some((next) => next[PEERS[0].id] === 'starting'));
  assert.ok(updates.every((next) => !Object.values(next).includes('started')));
});

test('a failed peer does not hide another peer’s successful spawn', async () => {
  const [first, second, third] = PEERS;
  const states = await startPendingPeers(initialPeerStates(), async (id) => {
    if (id === second.id) return { plugin_id: id, running: false };
    if (id === third.id) throw new Error('Executable missing');
    return { plugin_id: id, running: true };
  }, () => {});

  assert.equal(states[first.id], 'started');
  assert.equal(states[second.id], 'failed');
  assert.equal(states[third.id], 'failed');
});

test('a peer stays starting until its own spawn response arrives', async () => {
  const states = initialPeerStates();
  states[PEERS[1].id] = 'started';
  states[PEERS[2].id] = 'started';
  let resolve;
  const response = new Promise((done) => { resolve = done; });
  let latest;
  const pending = startPendingPeers(states, () => response, (next) => { latest = next; });

  assert.equal(latest[PEERS[0].id], 'starting');
  resolve({ plugin_id: PEERS[0].id, running: true });
  await pending;
  assert.equal(latest[PEERS[0].id], 'started');
});

test('retry launches failed or unstarted peers without duplicating started processes', async () => {
  const states = initialPeerStates();
  states[PEERS[0].id] = 'started';
  states[PEERS[1].id] = 'failed';
  const calls = [];
  const result = await startPendingPeers(states, async (id) => {
    calls.push(id);
    return { plugin_id: id, running: true };
  }, () => {});

  assert.deepEqual(calls, [PEERS[1].id, PEERS[2].id]);
  assert.deepEqual(Object.values(result), ['started', 'started', 'started']);
});

test('malformed or mismatched acknowledgments are not accepted as a spawn', async () => {
  for (const response of [undefined, true, { running: true }, { plugin_id: 'another-plugin', running: true }]) {
    const states = await startPendingPeers(initialPeerStates(), async () => response, () => {});
    assert.deepEqual(Object.values(states), ['failed', 'failed', 'failed']);
  }
});
