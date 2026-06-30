export const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours — avoids LL2 rate limits on reload

export function getCachedData<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    const now = Date.now();
    if (now - item.timestamp < CACHE_TTL) {
      return item.data;
    }
  } catch (_) {
    // Graceful fail
  }
  return null;
}

export function getStaleCachedData<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    return item.data;
  } catch (_) {
    // Graceful fail
  }
  return null;
}

export function setCachedData<T>(key: string, data: T) {
  try {
    const item = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (_) {
    // Safely ignore space limits
  }
}

export function formatDate(value: string | number) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString([], { 
    year: "numeric", 
    month: "short", 
    day: "numeric", 
    hour: "numeric", 
    minute: "2-digit" 
  });
}

export function normalizeYouTubeUrl(value: any): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  if (/^[A-Za-z0-9_-]{8,20}$/.test(raw) && !raw.includes("/") && !raw.includes(".")) {
    return `https://www.youtube.com/watch?v=${raw}`;
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/watch?v=${id}` : "";
    }

    if (url.hostname.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) return `https://www.youtube.com/watch?v=${watchId}`;

      const embedMatch = url.pathname.match(/\/embed\/([A-Za-z0-9_-]+)/);
      if (embedMatch) return `https://www.youtube.com/watch?v=${embedMatch[1]}`;

      const shortsMatch = url.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/);
      if (shortsMatch) return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
    }
  } catch (error) {
    return "";
  }

  return "";
}

export function youtubeUrl(launch: any): string {
  const fromId = normalizeYouTubeUrl(launch?.links?.youtube_id);
  if (fromId) return fromId;

  const fromWebcast = normalizeYouTubeUrl(launch?.links?.webcast);
  if (fromWebcast) return fromWebcast;

  const fromLL2 = normalizeYouTubeUrl(launch?.ll2?.webcast);
  if (fromLL2) return fromLL2;

  return "";
}

export function extractYoutubeId(url: string | null | undefined): string {
  if (!url) return "";
  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    return parsed.searchParams.get("v") || "";
  } catch (_) {
    return "";
  }
}

export function patchImage(launch: any): string {
  return launch?.links?.patch?.large || launch?.links?.patch?.small || "";
}

export function inferVehicle(name = "") {
  const n = name.toLowerCase();
  if (n.includes("starship") || n.includes("ift")) return "Starship";
  if (n.includes("heavy")) return "Falcon Heavy";
  return "Falcon 9";
}

export function launchStatusLabel(mission: any) {
  if (mission.success === true) return "SUCCESS";
  if (mission.success === false) return "FAILURE";
  return (mission?.ll2?.status || mission?.rll?.status || "SCHEDULED").toUpperCase();
}

export function launchSourceLabel(mission: any) {
  if (mission.rll) return "RocketLaunch.Live Backup";
  if (mission.ll2) return "Launch Library 2";
  return "SpaceXData Archive";
}

export function missionRocketName(mission: any) {
  return mission?.ll2?.rocket || mission?.rll?.vehicle || mission?.rocket_name || "Falcon 9";
}

export function missionPadName(mission: any) {
  return mission?.ll2?.padName || mission?.rll?.padName || mission?.launchpad_name || "SLC-40, Cape Canaveral";
}

export function missionLandingSummary(mission: any) {
  if (!Array.isArray(mission.cores) || !mission.cores.length) return "Landing data pending";

  const core = mission.cores[0];

  if (core.land_success === true) {
    return `SUCCESS • ${core.landing_type || "Landing"} • ${core.landing_pad || "Pad Unknown"}`;
  }

  if (core.land_success === false) {
    return `FAILED • ${core.landing_type || "Landing"} • ${core.landing_pad || "Pad Unknown"}`;
  }

  return "Landing data pending";
}
