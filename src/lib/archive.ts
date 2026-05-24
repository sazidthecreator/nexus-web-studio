// Frontend-only project archive: stores archived project IDs in localStorage
// (DB migrations are deferred). Emits a custom event so the dashboard can react.
const KEY = "sitely:archived-projects";
const EVENT = "sitely:archive-changed";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* ignore */ }
}

export function getArchivedIds(): string[] {
  return Array.from(read());
}

export function isArchived(id: string): boolean {
  return read().has(id);
}

export function archiveProject(id: string) {
  const s = read(); s.add(id); write(s);
}

export function restoreProject(id: string) {
  const s = read(); s.delete(id); write(s);
}

export function subscribeArchive(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
