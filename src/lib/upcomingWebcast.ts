const CACHE_PREFIX = 'spacex-upcoming-webcast-v1:';
const CACHE_TTL = 30 * 60 * 1000;

const GENERIC_SPACEX_X_PROFILE = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/SpaceX\/?(?:\?.*)?$/i;

function cleanUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!/^https?:\/\//i.test(url) || GENERIC_SPACEX_X_PROFILE.test(url)) return '';
  return url;
}

function collectUrls(value: unknown, output: string[] = []): string[] {
  if (!value) return output;

  if (typeof value === 'string') {
    const url = cleanUrl(value);
    if (url) output.push(url);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, output));
    return output;
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectUrls(item, output));
  }

  return output;
}

function scoreBroadcastUrl(url: string): number {
  if (/(?:x|twitter)\.com\/i\/broadcasts\//i.test(url)) return 100;
  if (/(?:x|twitter)\.com\/SpaceX\/status\//i.test(url)) return 95;
  if (/youtube\.com\/(?:watch|live)|youtu\.be\//i.test(url)) return 90;
  if (/\b(?:webcast|broadcast|livestream|live-stream)\b/i.test(url)) return 70;
  return 0;
}

export function getDirectUpcomingWebcast(mission: any): string {
  const youtubeId = mission?.links?.youtube_id;
  const candidates = collectUrls([
    mission?.links?.webcast,
    youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '',
    mission?.webcast,
    mission?.videoUrl,
    mission?.video_url,
    mission?.vidURL,
    mission?.vid_url,
    mission?.live_url,
    mission?.youtube_url,
    mission?.vidURLs,
    mission?.vid_urls,
    mission?.ll2,
    mission?.raw,
    mission?.rawLL2,
  ]);

  return candidates
    .map((url, index) => ({ url, index, score: scoreBroadcastUrl(url) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.url || '';
}

function getLl2LaunchId(mission: any): string {
  const rawId = mission?.rawLL2?.id || mission?.raw?.id || mission?.ll2_id;
  if (rawId) return String(rawId);

  const missionId = String(mission?.id || '');
  return missionId.startsWith('ll2-') ? missionId.slice(4) : '';
}

function readCache(id: string): string | null | undefined {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${id}`);
    if (!raw) return undefined;

    const cached = JSON.parse(raw);
    if (Date.now() - Number(cached?.timestamp || 0) > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_PREFIX}${id}`);
      return undefined;
    }

    return typeof cached?.url === 'string' ? cached.url : null;
  } catch {
    return undefined;
  }
}

function writeCache(id: string, url: string | null) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${id}`, JSON.stringify({
      timestamp: Date.now(),
      url,
    }));
  } catch {
    // Storage can be unavailable in private browsing; resolution still works.
  }
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function extractDetailWebcast(detail: any): string {
  const candidates = collectUrls([
    detail?.vidURLs,
    detail?.vidurls,
    detail?.vid_urls,
    detail?.video_urls,
    detail?.videos,
    typeof detail?.webcast_live === 'string' ? detail.webcast_live : '',
  ]);

  return candidates
    .map((url, index) => ({ url, index, score: scoreBroadcastUrl(url) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.url || '';
}

export async function resolveUpcomingWebcast(mission: any): Promise<string> {
  const direct = getDirectUpcomingWebcast(mission);
  if (direct) return direct;

  const ll2Id = getLl2LaunchId(mission);
  if (!ll2Id) return '';

  const cached = readCache(ll2Id);
  if (cached !== undefined) return cached || '';

  const detailUrls = [
    `https://ll.thespacedevs.com/2.2.0/launch/${encodeURIComponent(ll2Id)}/`,
    `https://ll.thespacedevs.com/2.3.0/launches/${encodeURIComponent(ll2Id)}/?mode=detailed`,
    `https://lldev.thespacedevs.com/2.3.0/launches/${encodeURIComponent(ll2Id)}/?mode=detailed`,
  ];

  for (const detailUrl of detailUrls) {
    const detail = await fetchJson(detailUrl);
    const webcast = extractDetailWebcast(detail);
    if (webcast) {
      writeCache(ll2Id, webcast);
      return webcast;
    }
  }

  writeCache(ll2Id, null);
  return '';
}

export function upcomingWebcastLabel(url: string): string {
  if (/(?:x|twitter)\.com/i.test(url)) return 'X Live';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
  return 'Webcast';
}
