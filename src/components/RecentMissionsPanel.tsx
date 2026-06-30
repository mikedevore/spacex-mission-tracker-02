import React, { useState, useEffect } from 'react';

interface RecentMissionsPanelProps {
  loading: boolean;
  filteredPast: any[];
  selectedLaunch: any;
  selectMission: (id: string, initial?: boolean) => void;
}

const ITEMS_PER_PAGE = 15;

export default function RecentMissionsPanel({
  loading,
  filteredPast,
  selectedLaunch,
  selectMission
}: RecentMissionsPanelProps) {
  const [landingsOnly, setLandingsOnly] = useState(false);
  const [page, setPage] = useState(0);

  const displayedMissions = landingsOnly ? filteredPast.filter(m => m.has_landing) : filteredPast;
  const totalPages = Math.max(1, Math.ceil(displayedMissions.length / ITEMS_PER_PAGE));
  const pagedMissions = displayedMissions.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Reset to page 0 when filter changes
  useEffect(() => { setPage(0); }, [landingsOnly, filteredPast.length]);

  return (
    <aside className="panel history-panel">
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <small>Archive Feed</small>
          <h2>Recent Missions</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setLandingsOnly(!landingsOnly)}
            style={{
              background: landingsOnly ? 'rgba(0, 231, 255, 0.15)' : 'transparent',
              color: landingsOnly ? '#00e7ff' : '#88a7b8',
              border: `1px solid ${landingsOnly ? 'rgba(0, 231, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
              padding: '2px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {landingsOnly ? 'Landings' : 'All'}
          </button>
        </div>
      </div>

      <div className="feed-list">
        {loading ? (
          <div className="feed-item" style={{ textAlign: "center" }}>
            <strong>Retrieving archive data...</strong>
          </div>
        ) : displayedMissions.length === 0 ? (
          <div className="feed-item" style={{ textAlign: "center" }}>
            <strong>No matching historical flights</strong>
          </div>
        ) : (
          <>
            {pagedMissions.map((mission) => {
              const isSelect = selectedLaunch && selectedLaunch.id === mission.id;
              const youtubeId = mission?.links?.youtube_id;
              const webcastUrl = mission?.links?.webcast ||
                                 (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "") ||
                                 mission?.ll2?.webcast ||
                                 "";
              const isXUrl = /x\.com|twitter\.com/i.test(webcastUrl);
              const watchLabel = isXUrl ? "Watch on X" : "Watch Mission";

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
                  {webcastUrl && (
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
                  )}
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
                    color: page === 0 ? '#444' : '#88a7b8',
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
                    color: page === totalPages - 1 ? '#444' : '#88a7b8',
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
