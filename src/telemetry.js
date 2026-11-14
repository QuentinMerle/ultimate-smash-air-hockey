// Zero-dependency Web-API-first telemetry & retention funnel tracker
// Tracks: match_start, match_end, rematch_clicked, invite_copied
// Bridges automatically to Umami (window.umami), Plausible (window.plausible),
// Vercel Analytics (window.va), or a custom beacon endpoint (VITE_TELEMETRY_URL).

const STORAGE_KEY = "usah_telemetry_v1";

function readLocalStats() {
  if (typeof window === "undefined") return { counters: {}, lastEvents: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { counters: {}, lastEvents: [] };
    const parsed = JSON.parse(raw);
    return {
      counters: parsed?.counters || {},
      lastEvents: Array.isArray(parsed?.lastEvents) ? parsed.lastEvents : [],
    };
  } catch {
    return { counters: {}, lastEvents: [] };
  }
}

export function getTelemetrySummary() {
  const stats = readLocalStats();
  const starts = stats.counters.match_start || 0;
  const ends = stats.counters.match_end || 0;
  const rematches = stats.counters.rematch_clicked || 0;
  const invites = stats.counters.invite_copied || 0;
  return {
    ...stats.counters,
    completionRatePct: starts > 0 ? Math.round((ends / starts) * 100) : 0,
    rematchRatePct: ends > 0 ? Math.round((rematches / ends) * 100) : 0,
    viralInviteCount: invites,
    lastEvents: stats.lastEvents,
  };
}

export function trackEvent(eventName, payload = {}) {
  if (typeof window === "undefined") return;

  try {
    const stats = readLocalStats();
    stats.counters[eventName] = (stats.counters[eventName] || 0) + 1;
    stats.lastEvents = [
      { event: eventName, payload, ts: Date.now() },
      ...stats.lastEvents.slice(0, 19),
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    window.__USAH_METRICS__ = getTelemetrySummary();
    window.dispatchEvent(
      new CustomEvent("usah:telemetry", { detail: { event: eventName, payload } })
    );
  } catch {
    // Ignore storage quota or private mode restrictions
  }

  // 1. Umami Analytics (free cloud / self-hosted, GDPR cookie-free)
  if (typeof window.umami?.track === "function") {
    try {
      window.umami.track(eventName, payload);
    } catch {
      // Ignore third-party tracker errors
    }
  }

  // 2. Plausible Analytics
  if (typeof window.plausible === "function") {
    try {
      window.plausible(eventName, { props: payload });
    } catch {
      // Ignore
    }
  }

  // 3. Vercel Web Analytics custom events
  if (typeof window.va === "function") {
    try {
      window.va("event", { name: eventName, data: payload });
    } catch {
      // Ignore
    }
  }

  // 4. Native Web API Beacon if custom endpoint configured
  const endpoint = import.meta.env?.VITE_TELEMETRY_URL;
  if (endpoint && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob(
        [JSON.stringify({ event: eventName, payload, ts: Date.now() })],
        { type: "application/json" }
      );
      navigator.sendBeacon(endpoint, blob);
    } catch {
      // Ignore
    }
  }
}
