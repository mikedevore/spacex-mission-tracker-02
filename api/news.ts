const ALLOWED_SOURCES = new Set([
  "https://api.spaceflightnewsapi.net/v4/articles/?limit=30&ordering=-published_at",
  "https://api.spaceflightnewsapi.net/v4/articles/?limit=30&search=SpaceX",
  "https://api.spaceflightnewsapi.net/v4/articles/?limit=30&search=Starship",
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requestedSource = Array.isArray(req.query?.source)
    ? req.query.source[0]
    : req.query?.source;

  const source = ALLOWED_SOURCES.has(requestedSource)
    ? requestedSource
    : "https://api.spaceflightnewsapi.net/v4/articles/?limit=30&ordering=-published_at";

  try {
    const upstream = await fetch(source, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SpaceX-Mission-Tracker/2.0",
      },
    });

    if (!upstream.ok) {
      throw new Error(`Spaceflight News API returned HTTP ${upstream.status}`);
    }

    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(502).json({
      error: error?.message || "News feed unavailable",
      results: [],
    });
  }
}
