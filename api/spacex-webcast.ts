const SPACEX_PAGE_PATTERN = /^https?:\/\/(?:www\.)?spacex\.com\//i;
const BROADCAST_PATTERNS = [
  /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/i\/broadcasts\/[A-Za-z0-9_-]+/i,
  /https?:\\\/\\\/(?:www\\\.)?(?:x|twitter)\\\.com\\\/i\\\/broadcasts\\\/[A-Za-z0-9_-]+/i,
];

function extractBroadcastUrl(html: string): string {
  for (const pattern of BROADCAST_PATTERNS) {
    const match = html.match(pattern);
    if (!match?.[0]) continue;

    return match[0]
      .replace(/\\\//g, '/')
      .replace(/\\u0026/g, '&');
  }

  return '';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawUrl = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';

  if (!url || !SPACEX_PAGE_PATTERN.test(url)) {
    return res.status(400).json({ error: 'Invalid SpaceX page URL' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; SpaceXMissionTracker/2.0)',
      },
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(502).json({ error: `SpaceX returned HTTP ${upstream.status}` });
    }

    const html = await upstream.text();
    const broadcastUrl = extractBroadcastUrl(html);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ broadcastUrl: broadcastUrl || null });
  } catch (error: any) {
    clearTimeout(timeout);
    return res.status(502).json({
      error: error?.name === 'AbortError'
        ? 'SpaceX page request timed out'
        : error?.message || 'SpaceX page request failed',
    });
  }
}
