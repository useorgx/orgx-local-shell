export const PEERS = [
  { id: '@useorgx/claude-code-plugin', name: 'Claude Code' },
  { id: '@useorgx/codex-plugin', name: 'Codex' },
  { id: '@useorgx/orgx-opencode-plugin', name: 'OpenCode' },
] as const;

export type PeerId = (typeof PEERS)[number]['id'];
export type PeerLaunchState = 'idle' | 'starting' | 'started' | 'failed';
export type PeerLaunchStates = Record<PeerId, PeerLaunchState>;

export function initialPeerStates(): PeerLaunchStates {
  return Object.fromEntries(PEERS.map(({ id }) => [id, 'idle'])) as PeerLaunchStates;
}

/** A spawn acknowledgment is not a readiness or ongoing health check. */
export async function startPendingPeers(
  previous: PeerLaunchStates,
  launch: (id: PeerId) => Promise<unknown>,
  onChange: (states: PeerLaunchStates) => void,
): Promise<PeerLaunchStates> {
  let states = { ...previous };
  const update = (id: PeerId, state: PeerLaunchState) => {
    states = { ...states, [id]: state };
    onChange(states);
  };

  for (const { id } of PEERS) {
    if (states[id] === 'started' || states[id] === 'starting') continue;
    update(id, 'starting');
    try {
      const result = await launch(id);
      const spawned = typeof result === 'object' && result !== null
        && 'plugin_id' in result && result.plugin_id === id
        && 'running' in result && result.running === true;
      update(id, spawned ? 'started' : 'failed');
    } catch {
      update(id, 'failed');
    }
  }
  return states;
}
