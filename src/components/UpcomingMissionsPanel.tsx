import React, { useState, useEffect } from 'react';

interface UpcomingMissionsPanelProps {
  loading: boolean;
  filteredUpcoming: any[];
  selectedLaunch: any;
  selectMission: (id: string, initial?: boolean) => void;
}

const ITEMS_PER_PAGE = 10;

export default function UpcomingMissionsPanel({
  loading,
  filteredUpcoming,
  selectedLaunch,
  selectMission
}: UpcomingMissionsPanelProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(filteredUpcoming.length / ITEMS_PER_PAGE));
  const pagedUpcoming = filteredUpcoming.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  useEffect(() => { setPage(0); }, [filteredUpcoming.length]);

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
          <>
            {pagedUpcoming.map((mission) => {
              const isSelect = selectedLaunch && selectedLaunch.id === mission.id;

              const youtubeId = mission?.links?.youtube_id;
              const directStream =
                mission?.links?.webcast ||
                mission?.vid_urls?.[0]?.url ||
                mission?.vidURLs?.[0]?.url ||
                (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "") ||
                mission?.ll2?.webcast ||
                "";

              const spacexInfoUrl = mission?.links?.spacexInfo || "";
              const webcastUrl = directStream || spacexInfoUrl || "https://x.com/SpaceX";

              const isXUrl       = /x\.com|twitter\.com/i.test(webcastUrl);
              const isSpaceXPage = /\bspacex\.com\b/i.test(webcastUrl) && !isXUrl;
              const watchLabel   = isXUrl
                ? "Watch Live on X"
                : isSpaceXPage
                  ? "Watch on SpaceX.com"
                  : "Watch Mission Live";

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
                    <a
                      className="feed-video-link"
                      href={webcastUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      {watchLabel}
                    </a>
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 4px 4px',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                marginTop: '4px',
                gap: '8px'
              }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: page === 0 ? '#444' : '#00e7ff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: page === 0 ? 'default' : 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em'
                  }}
                >
                  ← Prev
                </button>
                <span style={{ color: '#88a7b8', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: page === totalPages - 1 ? '#444' : '#00e7ff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: page === totalPages - 1 ? 'default' : 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em'
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
