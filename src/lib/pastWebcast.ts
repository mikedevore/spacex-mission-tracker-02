const CACHE_PREFIX = 'spacex-past-webcast-v1:';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function cleanUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url : '';
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

function isXUrl(url: string): boolean {
  return /(?:x|twitter)\.com/i.test(url);
}

function scoreReplayUrl(url: string): number {
  if (isXUrl(url)) return 0;
  if (/youtube\.com\/(?:watch|live)|youtu\.be\//i.test(url)) return 100;
  if (/spacex\.com\/launches\//i.test(url)) return 85;
  if (/\b(?:webcast|broadcast|replay|video)\b/i.test(url)) return 70;
  return 0;
}

function selectReplayUrl(values: unknown[]): string {
  const seen = new Set<string>();
  return collectUrls(values)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url, index) => ({ url, index, score: scoreReplayUrl(url) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.url || '';
}

export function getDirectPastWebcast(mission: any): string {
  const youtubeId = mission?.links?.youtube_id;
  return selectReplayUrl([
    youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '',
    mission?.links?.webcast,
    mission?.webcast,
    mission?.videoUrl,
    mission?.video_url,
    mission?.vidURL,
    mission?.vid_url,
    mission?.youtube_url,
    mission?.vidURLs,
    mission?.vid_urls,
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
    // Browser storage is optional.
  }
}

async function fetchDetail(id: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(`/api/ll2-launch?id=${encodeURIComponent(id)}`, {
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

export async function resolvePastWebcast(mission: any): Promise<string> {
  const direct = getDirectPastWebcast(mission);
  if (direct) return direct;

  const ll2Id = getLl2LaunchId(mission);
  if (!ll2Id) return '';

  const cached = readCache(ll2Id);
  if (cached !== undefined) return cached || '';

  const detail = await fetchDetail(ll2Id);
  const replay = selectReplayUrl([
    detail?.vidURLs,
    detail?.vidurls,
    detail?.vid_urls,
    detail?.video_urls,
    detail?.videos,
    detail?.infoURLs,
    detail?.info_urls,
  ]);

  writeCache(ll2Id, replay || null);
  return replay;
}

export function getPastWebcastFallback(mission: any): string {
  const name = String(mission?.name || 'SpaceX mission')
    .replace(/^Falcon\s*9\s*Block\s*5\s*\|\s*/i, '')
    .trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`SpaceX ${name} launch webcast`)}`;
}
