import React from 'react';

interface UpcomingMissionsPanelProps {
  loading: boolean;
  filteredUpcoming: any[];
  selectedLaunch: any;
  selectMission: (id: string, initial?: boolean) => void;
}

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
            
            // Extract a valid webcast URL if possible for upcoming
            const youtubeId = mission?.links?.youtube_id;
            const webcastUrl = mission?.links?.webcast || 
                               mission?.vid_urls?.[0]?.url || 
                               mission?.vidURLs?.[0]?.url || 
                               (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "") || 
                               mission?.ll2?.webcast || 
                               "https://x.com/SpaceX";

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
                    Webcast
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
