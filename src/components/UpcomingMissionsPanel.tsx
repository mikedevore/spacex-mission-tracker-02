import React from 'react';

interface UpcomingMissionsPanelProps {
  loading: boolean;
  filteredUpcoming: any[];
  selectedLaunch: any;
  selectMission: (id: string, initial?: boolean) => void;
}

const collectUrlCandidates = (value: any, output: string[] = []): string[] => {
  if (!value) return output;

  if (typeof value === 'string') {
    const candidate = value.trim();
    if (/^https?:\/\//i.test(candidate)) output.push(candidate);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUrlCandidates(item, output));
    return output;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectUrlCandidates(item, output));
  }

  return output;
};

const resolveBroadcastUrl = (mission: any): string => {
  const youtubeId = mission?.links?.youtube_id;
  const explicitCandidates = [
    mission?.links?.webcast,
    youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : '',
    mission?.webcast,
    mission?.video_url,
    mission?.ll2?.webcast,
  ];

  const discoveredCandidates = collectUrlCandidates([
    mission?.vid_urls,
    mission?.vidURLs,
    mission?.info_urls,
    mission?.infoURLs,
    mission?.links,
    mission?.ll2,
  ]);

  const candidates = [...explicitCandidates, ...discoveredCandidates]
    .filter((url, index, all) => Boolean(url) && all.indexOf(url) === index)
    .filter((url) => !/^https?:\/\/(www\.)?(x|twitter)\.com\/SpaceX\/?(?:\?.*)?$/i.test(url));

  const scoreUrl = (url: string) => {
    if (/\/(i\/broadcasts)\//i.test(url) && /(x|twitter)\.com/i.test(url)) return 100;
    if (/(x|twitter)\.com\/SpaceX\/status\//i.test(url)) return 90;
    if (/(youtube\.com\/(watch|live)|youtu\.be\/)/i.test(url)) return 80;
    if (/\b(webcast|broadcast|live)\b/i.test(url)) return 70;
    return explicitCandidates.includes(url) ? 60 : 0;
  };

  return candidates
    .map((url, index) => ({ url, index, score: scoreUrl(url) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.url || '';
};

const broadcastLabel = (url: string) => {
  if (/(x|twitter)\.com/i.test(url)) return 'X Live';
  if (/(youtube\.com|youtu\.be)/i.test(url)) return 'YouTube';
  return 'Webcast';
};

export default function UpcomingMissionsPanel({
  loading,
  filteredUpcoming,
  selectedLaunch,
  selectMission
}: UpcomingMissionsPanelProps) {
  return (
    <aside className="panel upcoming-panel">
      <div className="panel-title">
        <div>
          <small>Forward Feed</small>
          <h2>Upcoming Missions</h2>
        </div>
      </div>

      <div className="feed-list">
        {loading ? (
          <div className="feed-item" style={{ textAlign: "center" }}>
            <strong>Retrieving queue...</strong>
          </div>
        ) : filteredUpcoming.length === 0 ? (
          <div className="feed-item" style={{ textAlign: "center" }}>
            <strong>No matching upcoming flights</strong>
          </div>
        ) : (
          filteredUpcoming.map((mission) => {
            const isSelect = selectedLaunch && selectedLaunch.id === mission.id;
            const webcastUrl = resolveBroadcastUrl(mission);

            return (
              <div 
                key={mission.id}
                onClick={() => selectMission(mission.id)}
                className={`feed-item ${isSelect ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
                data-mission={mission.id}
              >
                <strong>{mission.name}</strong>
                <div className="feed-meta">
                  <span>
                    {new Date(mission.date_utc).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                <div className="feed-links">
                  {webcastUrl ? (
                    <a 
                      className="feed-video-link"
                      href={webcastUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      {broadcastLabel(webcastUrl)}
                    </a>
                  ) : (
                    <span className="feed-video-missing">Broadcast pending</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
