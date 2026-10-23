import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { initialPeerStates, PEERS, startPendingPeers, type PeerLaunchStates } from './peerStartup';

import {
  ParallelRunBoard,
  ExecutionReceiptsSurface,
  LowConfidenceReviewSurface,
  VaultAndBudgetsSurface,
  AuditLogSurface,
  type LiveRun,
  type ReceiptRow,
  type ReviewRow,
  type VaultProviderRow,
  type VaultBudgetRow,
  type VaultPendingDecision,
  type AuditRow,
} from '@useorgx/orgx-ui-kit';

type Tab = 'runs' | 'receipts' | 'reviews' | 'vault' | 'audit';

type Config = {
  baseUrl: string;
  apiKey: string;
  workspaceId: string;
};

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [shellVersion, setShellVersion] = useState<string>('');
  const [tab, setTab] = useState<Tab>('runs');
  const [peerStates, setPeerStates] = useState(initialPeerStates);
  const [startingPeers, setStartingPeers] = useState(false);
  const launchInProgress = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('orgx.config');
      if (raw) setConfig(JSON.parse(raw) as Config);
    } catch {
      // ignore
    }
    invoke<string>('shell_version')
      .then(setShellVersion)
      .catch(() => setShellVersion('dev'));
  }, []);

  async function startPeers(cfg: Config) {
    if (launchInProgress.current) return;
    launchInProgress.current = true;
    setStartingPeers(true);
    try {
      await startPendingPeers(peerStates, (id) => invoke('start_peer', {
        pluginId: id,
        apiKey: cfg.apiKey,
        workspaceId: cfg.workspaceId,
      }), setPeerStates);
    } finally {
      launchInProgress.current = false;
      setStartingPeers(false);
    }
  }

  if (!config) {
    return (
      <ConfigPrompt
        onSubmit={(c) => {
          localStorage.setItem('orgx.config', JSON.stringify(c));
          setConfig(c);
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        tab={tab}
        setTab={setTab}
        shellVersion={shellVersion}
        peerStates={peerStates}
        startingPeers={startingPeers}
        startPeers={() => startPeers(config)}
      />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <TabContent tab={tab} config={config} />
      </main>
    </div>
  );
}

function Header({
  tab,
  setTab,
  shellVersion,
  peerStates,
  startingPeers,
  startPeers,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  shellVersion: string;
  peerStates: PeerLaunchStates;
  startingPeers: boolean;
  startPeers: () => void;
}) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'runs', label: 'Runs' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'vault', label: 'Vault' },
    { id: 'audit', label: 'Audit' },
  ];
  const allSpawned = PEERS.every(({ id }) => peerStates[id] === 'started');
  const hasFailures = PEERS.some(({ id }) => peerStates[id] === 'failed');
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        OrgX Shell · {shellVersion}
      </span>
      <nav style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              background: tab === t.id ? 'rgba(191,255,0,0.08)' : 'transparent',
              border:
                tab === t.id
                  ? '1px solid rgba(191,255,0,0.35)'
                  : '1px solid rgba(255,255,255,0.08)',
              color:
                tab === t.id ? 'rgba(191,255,0,0.9)' : 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <button
        onClick={startPeers}
        style={{
          marginLeft: 'auto',
          padding: '6px 14px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          cursor: startingPeers || allSpawned ? 'default' : 'pointer',
          background: allSpawned ? 'rgba(191,255,0,0.18)' : '#BFFF00',
          color: allSpawned ? 'rgba(191,255,0,0.85)' : 'black',
          border: allSpawned
            ? '1px solid rgba(191,255,0,0.3)'
            : '1px solid transparent',
        }}
        disabled={startingPeers || allSpawned}
      >
        {startingPeers ? 'Starting peers…' : allSpawned ? 'Processes started' : hasFailures ? 'Retry failed peers' : 'Start plugin peers'}
      </button>
      <div role="status" aria-label="Plugin peer launch status" style={{ flexBasis: '100%', fontSize: 12 }}>
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', margin: 0, padding: 0, listStyle: 'none' }}>
          {PEERS.map(({ id, name }) => (
            <li key={id} style={{ color: peerStates[id] === 'failed' ? '#ff9b9b' : 'rgba(255,255,255,0.7)' }}>
              {name}: {peerStates[id] === 'idle' ? 'Not started' : peerStates[id] === 'starting' ? 'Starting…' : peerStates[id] === 'started' ? 'Process started' : 'Failed to start'}
            </li>
          ))}
        </ul>
        {hasFailures && <p style={{ margin: '8px 0 0' }}>Check that the peer executable is installed and the native desktop runtime is available, then retry.</p>}
        <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.5)' }}>Launch status only. Peer readiness and ongoing health have not been checked.</p>
      </div>
    </header>
  );
}

function ConfigPrompt({ onSubmit }: { onSubmit: (c: Config) => void }) {
  const [baseUrl, setBaseUrl] = useState('https://useorgx.com');
  const [apiKey, setApiKey] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  return (
    <div
      style={{
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          width: 440,
          padding: 24,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h1 style={{ fontSize: 18, margin: 0 }}>Connect OrgX</h1>
        <p
          style={{
            margin: '8px 0 16px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          The shell needs a workspace + API key to connect. API keys are stored
          locally in localStorage; never shipped off this machine.
        </p>
        <LabeledInput label="Base URL" value={baseUrl} onChange={setBaseUrl} />
        <LabeledInput
          label="Workspace ID"
          value={workspaceId}
          onChange={setWorkspaceId}
          placeholder="uuid"
        />
        <LabeledInput
          label="oxk_ API key"
          value={apiKey}
          onChange={setApiKey}
          placeholder="oxk_..."
          secret
        />
        <button
          onClick={() => onSubmit({ baseUrl, apiKey, workspaceId })}
          disabled={!apiKey || !workspaceId}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '10px 14px',
            borderRadius: 999,
            background: '#BFFF00',
            color: 'black',
            fontWeight: 700,
            border: 'none',
            cursor: apiKey && workspaceId ? 'pointer' : 'not-allowed',
            opacity: apiKey && workspaceId ? 1 : 0.4,
          }}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  secret,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  return (
    <label style={{ display: 'block', marginTop: 10, fontSize: 11 }}>
      <span
        style={{
          display: 'block',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 6,
          background: '#0A0C14',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.9)',
          fontSize: 13,
        }}
      />
    </label>
  );
}

// ───── Tab content wires @useorgx/orgx-data-style fetches against config ─────

function TabContent({ tab, config }: { tab: Tab; config: Config }) {
  const base = useMemo(() => config.baseUrl.replace(/\/$/, ''), [config.baseUrl]);
  const auth = useMemo(
    () => ({
      Authorization: `Bearer ${config.apiKey}`,
    }),
    [config.apiKey]
  );

  if (tab === 'runs') return <RunsTab base={base} auth={auth} ws={config.workspaceId} />;
  if (tab === 'receipts') return <ReceiptsTab base={base} auth={auth} ws={config.workspaceId} />;
  if (tab === 'reviews') return <ReviewsTab base={base} auth={auth} ws={config.workspaceId} />;
  if (tab === 'vault') return <VaultTab base={base} auth={auth} ws={config.workspaceId} />;
  return <AuditTab base={base} auth={auth} ws={config.workspaceId} />;
}

function useEndpoint<T>(
  url: string | null,
  auth: Record<string, string>
): { data: T | null; error: string | null; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetch(url, { headers: auth })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((j) => {
        setData(j);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'unknown'))
      .finally(() => setLoading(false));
  }, [url, tick, auth]);

  return { data, error, loading, refresh: () => setTick((t) => t + 1) };
}

function RunsTab({ base, auth, ws }: { base: string; auth: Record<string, string>; ws: string }) {
  type Payload = { runs: Array<LiveRun & { workspace_id?: string }> };
  const { data } = useEndpoint<Payload>(`${base}/api/v1/runs?status=all&limit=50`, auth);
  return (
    <Padded>
      <ParallelRunBoard runs={data?.runs ?? []} concurrencyCap={5} />
    </Padded>
  );
}

function ReceiptsTab({
  base,
  auth,
  ws,
}: {
  base: string;
  auth: Record<string, string>;
  ws: string;
}) {
  type Payload = { receipts: ReceiptRow[] };
  const url = `${base}/api/v1/execution/receipts?workspace_id=${ws}&days=30`;
  const { data } = useEndpoint<Payload>(url, auth);
  return (
    <Padded>
      <ExecutionReceiptsSurface receipts={data?.receipts ?? []} windowLabel="last 30 days" />
    </Padded>
  );
}

function ReviewsTab({
  base,
  auth,
  ws,
}: {
  base: string;
  auth: Record<string, string>;
  ws: string;
}) {
  type Payload = { reviews: ReviewRow[] };
  const url = `${base}/api/v1/reviews?workspace_id=${ws}&status=pending`;
  const { data, refresh } = useEndpoint<Payload>(url, auth);

  async function onResolve(input: {
    review_id: string;
    decision: 'agree' | 'disagree';
    disagreement_md?: string;
  }) {
    await fetch(`${base}/api/v1/reviews/${input.review_id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(input),
    });
    refresh();
  }

  return (
    <Padded>
      <LowConfidenceReviewSurface reviews={data?.reviews ?? []} onResolve={onResolve} />
    </Padded>
  );
}

function VaultTab({
  base,
  auth,
  ws,
}: {
  base: string;
  auth: Record<string, string>;
  ws: string;
}) {
  type Providers = { providers: VaultProviderRow[] };
  type Budgets = { budgets: VaultBudgetRow[] };
  type Pending = { decisions: VaultPendingDecision[] };
  const providers = useEndpoint<Providers>(
    `${base}/api/v1/vault/providers?workspace_id=${ws}`,
    auth
  );
  const budgets = useEndpoint<Budgets>(`${base}/api/v1/budgets?workspace_id=${ws}`, auth);
  const pending = useEndpoint<Pending>(
    `${base}/api/v1/budget-decisions?workspace_id=${ws}&status=pending`,
    auth
  );
  return (
    <Padded>
      <VaultAndBudgetsSurface
        providers={providers.data?.providers ?? []}
        budgets={budgets.data?.budgets ?? []}
        pendingDecisions={pending.data?.decisions ?? []}
      />
    </Padded>
  );
}

function AuditTab({
  base,
  auth,
  ws,
}: {
  base: string;
  auth: Record<string, string>;
  ws: string;
}) {
  type Payload = { rows: AuditRow[] };
  const [filter, setFilter] = useState<string | null>(null);
  const url = filter
    ? `${base}/api/v1/audit-log?workspace_id=${ws}&entity_type=${filter}&limit=100`
    : `${base}/api/v1/audit-log?workspace_id=${ws}&limit=100`;
  const { data, loading } = useEndpoint<Payload>(url, auth);
  return (
    <Padded>
      <AuditLogSurface
        rows={data?.rows ?? []}
        entityFilter={filter}
        onFilterChange={setFilter}
        loading={loading}
      />
    </Padded>
  );
}

function Padded({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 1120, margin: '0 auto', padding: 24 }}>{children}</div>;
}
