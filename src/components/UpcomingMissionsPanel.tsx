import React, { useEffect, useRef, useState } from 'react';
import {
  getDirectUpcomingWebcast,
  getUpcomingLiveFallback,
  resolveUpcomingWebcast,
  upcomingWebcastLabel,
} from '../lib/upcomingWebcast';

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
  const [resolvedWebcasts, setResolvedWebcasts] = useState<Record<string, string>>({});
  const [resolvingWebcasts, setResolvingWebcasts] = useState<Record<string, boolean>>({});
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
      setResolvingWebcasts((current) => ({ ...current, [missionId]: true }));

      resolveUpcomingWebcast(mission)
        .then((url) => {
          if (!isMounted.current || !url) return;
          setResolvedWebcasts((current) => ({ ...current, [missionId]: url }));
        })
        .finally(() => {
          if (isMounted.current) {
            setResolvingWebcasts((current) => ({ ...current, [missionId]: false }));
          }
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
            const isResolving = Boolean(resolvingWebcasts[missionId]);
            const webcastUrl = confirmedWebcast || getUpcomingLiveFallback(mission);
            const linkLabel = confirmedWebcast
              ? upcomingWebcastLabel(confirmedWebcast)
              : isResolving
                ? 'Finding Live...'
                : 'Find Live on X';

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
                    data-link-type={confirmedWebcast ? 'confirmed-webcast' : 'mission-live-search'}
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    {linkLabel}
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
