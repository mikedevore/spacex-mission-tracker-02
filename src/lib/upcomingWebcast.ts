const CACHE_PREFIX = 'spacex-upcoming-webcast-v4:';
const CACHE_TTL = 30 * 60 * 1000;

const GENERIC_SPACEX_X_PROFILE = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/SpaceX\/?(?:\?.*)?$/i;
const DIRECT_BROADCAST_PATTERN = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(?:i\/broadcasts\/[A-Za-z0-9_-]+|SpaceX\/status\/[A-Za-z0-9_-]+)/i;
const SPACEX_PAGE_PATTERN = /^https?:\/\/(?:www\.)?spacex\.com\//i;

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

function uniqueUrls(values: unknown[]): string[] {
  const seen = new Set<string>();
  return collectUrls(values).filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function findDirectBroadcast(values: unknown[]): string {
  return uniqueUrls(values).find((url) => DIRECT_BROADCAST_PATTERN.test(url)) || '';
}

function findSpaceXPages(values: unknown[]): string[] {
  return uniqueUrls(values).filter((url) => SPACEX_PAGE_PATTERN.test(url));
}

export function getDirectUpcomingWebcast(mission: any): string {
  return findDirectBroadcast([
    mission?.links?.webcast,
    mission?.webcast,
    mission?.videoUrl,
    mission?.video_url,
    mission?.vidURL,
    mission?.vid_url,
    mission?.live_url,
    mission?.vidURLs,
    mission?.vid_urls,
    mission?.ll2,
    mission?.raw,
    mission?.rawLL2,
  ]);
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
    // Browser storage is optional; live resolution still works without it.
  }
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

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

async function resolveSpaceXPage(spacexUrl: string): Promise<string> {
  const result = await fetchJson(`/api/spacex-webcast?url=${encodeURIComponent(spacexUrl)}`);
  const broadcastUrl = cleanUrl(result?.broadcastUrl);
  return DIRECT_BROADCAST_PATTERN.test(broadcastUrl) ? broadcastUrl : '';
}

async function resolveFromSpaceXPages(pages: string[]): Promise<string> {
  for (const page of pages) {
    const broadcast = await resolveSpaceXPage(page);
    if (broadcast) return broadcast;
  }
  return '';
}

function detailBroadcast(detail: any): string {
  return findDirectBroadcast([
    detail?.vidURLs,
    detail?.vidurls,
    detail?.vid_urls,
    detail?.video_urls,
    detail?.videos,
    typeof detail?.webcast_live === 'string' ? detail.webcast_live : '',
  ]);
}

function detailSpaceXPages(detail: any): string[] {
  return findSpaceXPages([
    detail?.infoURLs,
    detail?.infourls,
    detail?.info_urls,
    detail?.vidURLs,
    detail?.vidurls,
    detail?.vid_urls,
    detail?.video_urls,
    detail?.videos,
  ]);
}

export async function resolveUpcomingWebcast(mission: any): Promise<string> {
  const direct = getDirectUpcomingWebcast(mission);
  if (direct) return direct;

  const ll2Id = getLl2LaunchId(mission);
  const cacheId = ll2Id || String(mission?.id || mission?.name || 'unknown');
  const cached = readCache(cacheId);
  if (cached !== undefined) return cached || '';

  const missionSpaceXPages = findSpaceXPages([
    mission?.links?.webcast,
    mission?.links?.wikipedia,
    mission?.webcast,
    mission?.infoURLs,
    mission?.info_urls,
    mission?.raw,
    mission?.rawLL2,
  ]);

  const missionBroadcast = await resolveFromSpaceXPages(missionSpaceXPages);
  if (missionBroadcast) {
    writeCache(cacheId, missionBroadcast);
    return missionBroadcast;
  }

  if (!ll2Id) {
    writeCache(cacheId, null);
    return '';
  }

  const detailUrls = [
    `/api/ll2-launch?id=${encodeURIComponent(ll2Id)}`,
    `https://ll.thespacedevs.com/2.2.0/launch/${encodeURIComponent(ll2Id)}/`,
    `https://lldev.thespacedevs.com/2.2.0/launch/${encodeURIComponent(ll2Id)}/`,
  ];

  for (const detailUrl of detailUrls) {
    const detail = await fetchJson(detailUrl);
    if (!detail) continue;

    const detailDirect = detailBroadcast(detail);
    if (detailDirect) {
      writeCache(cacheId, detailDirect);
      return detailDirect;
    }

    const scrapedBroadcast = await resolveFromSpaceXPages(detailSpaceXPages(detail));
    if (scrapedBroadcast) {
      writeCache(cacheId, scrapedBroadcast);
      return scrapedBroadcast;
    }
  }

  writeCache(cacheId, null);
  return '';
}
