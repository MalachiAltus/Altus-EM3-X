// Tiny pub-sub for connectivity state, set from the Supabase client's fetch
// wrapper (see supabase/client.ts). Lives outside React so it can be driven
// from wherever a request actually happens, not just inside components.
type Listener = (offline: boolean) => void;

let offline = false;
const listeners = new Set<Listener>();

export function setOffline(next: boolean) {
  if (next === offline) return;
  offline = next;
  listeners.forEach((l) => l(offline));
}

export function getOffline() {
  return offline;
}

export function subscribeOffline(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
