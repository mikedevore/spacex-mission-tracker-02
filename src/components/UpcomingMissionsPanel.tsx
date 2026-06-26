import React, { useEffect, useRef, useState } from 'react';
import {
  getDirectUpcomingWebcast,
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
  const [checkedWebcasts, setCheckedWebcasts] = useState<Record<string, boolean>>({});
  const requestedMissionIds = useRef(new Set<string>());
  const isMounted = useRef(true);

  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  useEffect(() => {
    filteredUpcoming.forEach((mission) => {
      const missionId = String(mission?.id || '');
      if (!missionId || getDirectUpcomingWebcast(mission) || requestedMissionIds.current.has(missionId)) return;

      requestedMissionIds.current.add(missionId);
      setResolvingWebcasts((current) => ({ ...current, [missionId]: true }));

      resolveUpcomingWebcast(mission)
        .then((url) => {
          if (!isMounted.current) return;
          if (url) {
            setResolvedWebcasts((current) => ({ ...current, [missionId]: url }));
          }
          setCheckedWebcasts((current) => ({ ...current, [missionId]: true }));
        })
        .finally(() => {
          requestedMissionIds.current.delete(missionId);
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
            const webcastUrl = getDirectUpcomingWebcast(mission) || resolvedWebcasts[missionId] || '';
            const isResolving = Boolean(resolvingWebcasts[missionId]);
            const hasChecked = Boolean(checkedWebcasts[missionId]);

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
                      {upcomingWebcastLabel(webcastUrl)}
                    </a>
                  ) : (
                    <span className="feed-video-missing">
                      {isResolving ? 'Locating broadcast...' : hasChecked ? 'Broadcast not posted' : 'Checking broadcast...'}
                    </span>
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
