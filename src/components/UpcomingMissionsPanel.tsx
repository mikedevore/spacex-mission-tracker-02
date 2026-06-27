import React, { useEffect, useRef, useState } from 'react';
import {
  getDirectUpcomingWebcast,
  resolveUpcomingWebcast,
} from '../lib/upcomingWebcast';

interface UpcomingMissionsPanelProps {
  loading: boolean;
  filteredUpcoming: any[];
  selectedLaunch: any;
  selectMission: (id: string, initial?: boolean) => void;
}

function buildPlaceholderUrl(mission: any): string {
  const params = new URLSearchParams({
    mission: String(mission?.name || 'Upcoming Mission'),
    date: String(mission?.date_utc || ''),
  });

  return `/webcast-placeholder.html?${params.toString()}`;
}

export default function UpcomingMissionsPanel({
  loading,
  filteredUpcoming,
  selectedLaunch,
  selectMission
}: UpcomingMissionsPanelProps) {
  const [resolvedWebcasts, setResolvedWebcasts] = useState<Record<string, string>>({});
  const attemptedMissionIds = useRef(new Set<string>());
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    filteredUpcoming.forEach((mission) => {
      const missionId = String(mission?.id || '');
      if (!missionId || getDirectUpcomingWebcast(mission) || attemptedMissionIds.current.has(missionId)) return;

      attemptedMissionIds.current.add(missionId);
      resolveUpcomingWebcast(mission).then((url) => {
        if (!isMounted.current || !url) return;
        setResolvedWebcasts((current) => ({ ...current, [missionId]: url }));
      });
    });
  }, [filteredUpcoming]);

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
            const missionId = String(mission?.id || '');
            const isSelect = selectedLaunch && selectedLaunch.id === mission.id;
            const confirmedWebcast = getDirectUpcomingWebcast(mission) || resolvedWebcasts[missionId] || '';
            const webcastUrl = confirmedWebcast || buildPlaceholderUrl(mission);

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
                    data-link-type={confirmedWebcast ? 'confirmed-webcast' : 'webcast-placeholder'}
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
