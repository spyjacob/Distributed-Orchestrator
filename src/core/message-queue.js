// Keep ordered follow-ups per session on the server, independent of browser lifetime.
// Pending messages are intentionally not persisted across a server restart.
export function createMessageQueue() {
  const active = new Map();
  async function drain(id, entry, task) {
    try { await task.run(); }
    catch (e) { task.onError(e); }
    finally {
      const next = entry.next.shift();
      if (next) void drain(id, entry, next);
      else active.delete(id);
    }
  }
  return {
    get size() { return active.size; },
    busy: id => active.has(id),
    pending(id) { return (active.get(id)?.next || []).map(task => task.body); },
    edit(id, expected, text) {
      const body = active.get(id)?.next.find(task => task.body.pendingId === expected)?.body;
      if (!body || body.pendingId !== expected) throw new Error("This message has already started or changed.");
      body.text = text;
      return body;
    },
    cancel(id, expected) { const entry = active.get(id); if (entry) entry.next = expected ? entry.next.filter(task => task.body.pendingId !== expected) : []; },
    submit(id, run, { queue = false, onError = () => {}, body = null } = {}) {
      const entry = active.get(id);
      const task = { run, onError, body };
      if (entry) {
        if (!queue) throw new Error('A turn is already running. Use Queue next.');
        entry.next.push(task);
      } else {
        const fresh = { next: [] };
        active.set(id, fresh);
        void drain(id, fresh, task);
      }
    },
  };
}
