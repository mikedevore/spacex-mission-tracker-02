import React, { useState } from 'react';

interface RecentMissionsPanelProps {
  loading: boolean;
  filteredPast: any[];
  selectedLaunch: any;
  selectMission: (id: string, initial?: boolean) => void;
}

export default function RecentMissionsPanel({
  loading,
  filteredPast,
  selectedLaunch,
  selectMission
}: RecentMissionsPanelProps) {
  const [landingsOnly, setLandingsOnly] = useState(false);
  const displayedMissions = landingsOnly ? filteredPast.filter(m => m.has_landing) : filteredPast;

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
          displayedMissions.map((mission) => {
            const isSelect = selectedLaunch && selectedLaunch.id === mission.id;
            
            // Extract a valid webcast URL if possible
            const youtubeId = mission?.links?.youtube_id;
            const webcastUrl = mission?.links?.webcast || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "") || mission?.ll2?.webcast || "";

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
                      Webcast
                    </a>
                  ) : (
                    <span className="feed-video-missing">No media link</span>
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
