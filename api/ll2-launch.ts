const LL2_ID_PATTERN = /^[a-zA-Z0-9-]{6,80}$/;

const LL2_DETAIL_ENDPOINTS = [
  (id: string) => `https://ll.thespacedevs.com/2.2.0/launch/${encodeURIComponent(id)}/`,
  (id: string) => `https://ll.thespacedevs.com/2.3.0/launches/${encodeURIComponent(id)}/?mode=detailed`,
  (id: string) => `https://lldev.thespacedevs.com/2.3.0/launches/${encodeURIComponent(id)}/?mode=detailed`,
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';

  if (!LL2_ID_PATTERN.test(id)) {
    return res.status(400).json({ error: 'Invalid launch id' });
  }

  let lastStatus = 502;
  let lastError = 'Launch detail unavailable';

  for (const endpoint of LL2_DETAIL_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const upstream = await fetch(endpoint(id), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SpaceX-Mission-Tracker/2.0',
        },
      });

      clearTimeout(timeout);
      lastStatus = upstream.status;

      if (!upstream.ok) {
        lastError = `LL2 returned HTTP ${upstream.status}`;
        continue;
      }

      const detail = await upstream.json();
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
      return res.status(200).json(detail);
    } catch (error: any) {
      clearTimeout(timeout);
      lastError = error?.name === 'AbortError'
        ? 'LL2 launch detail request timed out'
        : error?.message || 'LL2 launch detail request failed';
    }
  }

  return res.status(lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502).json({
    error: lastError,
  });
}
