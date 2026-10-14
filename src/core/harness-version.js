// Compare live processes, never infer a running version from a peer's checkout.
export async function harnessVersions(cluster, local, { request = fetch, observe = () => {} } = {}) {
  const hosts = await Promise.all(cluster.replica.members().map(async host => {
    try {
      let status = local;
      if (host.id !== cluster.self.id) {
        const response = await request(new URL('/api/harness/status', host.url), {
          headers: { 'x-cluster-key': cluster.replica.disk.secret }, redirect: 'error',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('unavailable');
        status = await response.json();
        if (status.node !== host.id) throw new Error('identity mismatch');
      }
      try { observe(host.id, status.version); } catch {}
      const version = status.version;
      const update = status.update || {};
      const state = !version?.revision ? 'Version unavailable — update this machine'
        : update.published === false ? 'Local commit not published to GitHub — waiting for integration'
        : update.restartRequired ? 'Restart needed'
        : update.available ? `Update available${update.skipped ? `: ${update.skipped}` : ''}`
        : version.dirty ? 'Local edits at startup'
        : version.revision !== local.version.revision ? 'Different commit — check updates'
        : update.error ? 'Update check failed'
        : update.skipped ? `Update check paused: ${update.skipped}` : 'Same running commit';
      return { id: host.id, name: host.name, version, update, state, busy: Boolean(status.busy), restarting: Boolean(status.restarting) };
    } catch { try { observe(host.id, null); } catch {} return { id: host.id, name: host.name, state: 'Unreachable — version unverified' }; }
  }));
  return { version: local.version, hosts, checkedAt: new Date().toISOString(),
    aligned: hosts.length > 0 && hosts.every(h => h.state === 'Same running commit') };
}

// Display-only observations. Execution/restart decisions still use fresh checks.
export function versionMetadata(cluster, { observe = () => {} } = {}) {
  const peers = new Map();
  let pending = null, checked = 0;
  return async local => {
    if (!pending && Date.now() - checked >= 10000) {
      pending = harnessVersions(cluster, local, { observe }).then(result => {
        for (const host of result.hosts) if (host.id !== cluster.self.id) {
          const previous = peers.get(host.id);
          peers.set(host.id, host.version
            ? { ...host, observedAt: result.checkedAt, stale: false }
            : { ...previous, ...host, stale: true, busy: true });
        }
      }).catch(() => {}).finally(() => { checked = Date.now(); pending = null; });
    }
    const result = await harnessVersions({ self: cluster.self, replica: { members: () => [cluster.self] } }, local);
    for (const host of cluster.replica.members()) if (host.id !== cluster.self.id) {
      const saved = peers.get(host.id);
      const stale = !saved || saved.stale || Date.now() - Date.parse(saved.observedAt) > 30000;
      result.hosts.push(saved ? { ...saved, stale, busy: stale || saved.busy }
        : { id: host.id, name: host.name, stale: true, state: 'Checking in background', busy: true });
    }
    result.aligned = result.hosts.every(h => !h.stale && h.state === 'Same running commit');
    return result;
  };
}
