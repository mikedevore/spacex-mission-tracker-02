import React, { useEffect, useRef, useState } from 'react';
import {
  getDirectPastWebcast,
  getPastWebcastFallback,
  resolvePastWebcast,
} from '../lib/pastWebcast';

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
  const [resolvedWebcasts, setResolvedWebcasts] = useState<Record<string, string>>({});
  const attemptedMissionIds = useRef(new Set<string>());
  const isMounted = useRef(false);
  const displayedMissions = landingsOnly ? filteredPast.filter(m => m.has_landing) : filteredPast;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    displayedMissions.forEach((mission) => {
      const missionId = String(mission?.id || '');
      if (!missionId || getDirectPastWebcast(mission) || attemptedMissionIds.current.has(missionId)) return;

      attemptedMissionIds.current.add(missionId);
      resolvePastWebcast(mission).then((url) => {
        if (!isMounted.current || !url) return;
        setResolvedWebcasts((current) => ({ ...current, [missionId]: url }));
      });
    });
  }, [displayedMissions]);

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
            const missionId = String(mission?.id || '');
            const isSelect = selectedLaunch && selectedLaunch.id === mission.id;
            const confirmedWebcast = getDirectPastWebcast(mission) || resolvedWebcasts[missionId] || '';
            const webcastUrl = confirmedWebcast || getPastWebcastFallback(mission);

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
                    data-link-type={confirmedWebcast ? 'confirmed-webcast' : 'youtube-search'}
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
