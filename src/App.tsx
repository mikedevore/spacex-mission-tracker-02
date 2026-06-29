/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Tv, Globe, Twitter, Youtube, Instagram, Camera, Calendar, Cpu, Layers, Info, ExternalLink, AlertTriangle, Anchor, Gauge, FileText, DownloadCloud, Lock, Star, Target, Shield, Rocket } from 'lucide-react';
import RecentMissionsPanel from './components/RecentMissionsPanel';
import UpcomingMissionsPanel from './components/UpcomingMissionsPanel';
import { TrajectoryChart } from './components/TrajectoryChart';
import { initAuth, googleSignIn, logout, getAccessToken } from './auth';
import { backupToDrive } from './driveBackup';
import TrackerProPage from './components/TrackerProPage';



import { CACHE_TTL, getCachedData, getStaleCachedData, setCachedData, formatDate, normalizeYouTubeUrl, youtubeUrl, extractYoutubeId, patchImage, inferVehicle, launchStatusLabel, launchSourceLabel, missionRocketName, missionPadName, missionLandingSummary } from "./lib/utils";
import { LANDING_VIDEOS, SPACEX_HISTORIC_EVENTS, FALLBACK_UPCOMING, FALLBACK_NEWS } from "./lib/constants";
import LowerFeaturesArea from "./components/LowerFeaturesArea";


export default function App() {
  const [view, setView] = useState<'dashboard' | 'pro'>('dashboard');
  const [lowerTab, setLowerTab] = useState<'news' | 'giveaway' | 'premium'>('news');
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [filterSuccess, setFilterSuccess] = useState<string>("all");
  const [launches, setLaunches] = useState<any[]>([]);
  const [selectedRecentLaunch, setSelectedRecentLaunch] = useState<any | null>(null);
  const [selectedUpcomingLaunch, setSelectedUpcomingLaunch] = useState<any | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<'upcoming' | 'recent'>('upcoming');
  const [resolvedRecentDetails, setResolvedRecentDetails] = useState<{
    rocketName?: string;
    rocketType?: string;
    padFullName?: string;
    padLocality?: string;
    payloadsList?: any[];
    coresList?: any[];
    failuresList?: any[];
    staticFireDate?: string;
    linksDetails?: {
      redditCampaign?: string;
      redditLaunch?: string;
      redditMedia?: string;
      redditRecovery?: string;
      wikipedia?: string;
      article?: string;
    };
    isLoading: boolean;
  } | null>(null);
  const [resolvedUpcomingDetails, setResolvedUpcomingDetails] = useState<{
    rocketName?: string;
    rocketType?: string;
    padFullName?: string;
    padLocality?: string;
    payloadsList?: any[];
    coresList?: any[];
    failuresList?: any[];
    staticFireDate?: string;
    linksDetails?: {
      redditCampaign?: string;
      redditLaunch?: string;
      redditMedia?: string;
      redditRecovery?: string;
      wikipedia?: string;
      article?: string;
    };
    isLoading: boolean;
  } | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [giveawayName, setGiveawayName] = useState("");
  const [giveawayEmail, setGiveawayEmail] = useState("");
  const [giveawayEntries, setGiveawayEntries] = useState<any[]>([]);
  const [currentWinner, setCurrentWinner] = useState<string>("To Be Announced");

  const [activeRecentVideoId, setActiveRecentVideoId] = useState<string>("");
  const [activeUpcomingVideoId, setActiveUpcomingVideoId] = useState<string>("");
  const [activeLowerReplay, setActiveLowerReplay] = useState<any | null>({
    id: "l_g2s8mIWeQ",
    video_id: "l_g2s8mIWeQ",
    title: "Starship Flight 6",
    type: "upcoming",
    vehicle: "Starship",
    booster: "Super Heavy Booster",
    pad: "Starbase OLP-1",
    details: "Sixth test flight of the combined Starship and Super Heavy vehicle, targeting booster catch at Starbase and orbital stage ocean landing.",
    launchpad: "Starbase OLP-1"
  });
  
  // Auth & Drive State
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // RealUTC ticking timer
  const [utcTime, setUtcTime] = useState("");
  const [localDateStr, setLocalDateStr] = useState("");
  const [countdownText, setCountdownText] = useState("SYNCING");
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
    isTbd: true,
    statusText: "SYNCING"
  });
  
  const upcomingWebcastUrl = useMemo(() => {
    const targetLaunch = selectedUpcomingLaunch || launches.find(l => l.upcoming);
    if (!targetLaunch) return "https://x.com/SpaceX";
    const youtubeId = targetLaunch.links?.youtube_id;
    const webcastUrl = targetLaunch.links?.webcast || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "") || targetLaunch.ll2?.webcast || "";
    return webcastUrl || targetLaunch.links?.wikipedia || "https://x.com/SpaceX";
  }, [launches, selectedUpcomingLaunch]);

  useEffect(() => {
    initAuth(
      (user, token) => {
        setAuthToken(token);
        setNeedsAuth(false);
        addLog("Logged in with Google successfully.");
      },
      () => {
        setAuthToken(null);
        setNeedsAuth(true);
      }
    );
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAuthToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      if ((err.message && err.message.includes('popup-closed-by-user')) || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        addLog(`Google Login popup dismissed by user.`, false);
      } else {
        addLog(`Google Login failed: ${err.message}`, true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBackupToDrive = async () => {
    setIsBackingUp(true);
    addLog("Initiating Google Drive backup sequence targeting SpaceX Mission Tracker folder...");
    try {
      await backupToDrive();
      addLog("Successfully saved full project backup to Google Drive.");
    } catch (err: any) {
      addLog(`Google Drive Backup failed: ${err.message}`, true);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Log function to append system console items
  const addLog = (msg: string, isError: boolean = false) => {
    const stamp = new Date().toLocaleTimeString();
    const formatted = isError ? `☠️ ERROR: ${msg}` : msg;
    if (isError) {
      console.error(`[${stamp}] ${formatted}`);
    } else {
      console.log(`[${stamp}] ${formatted}`);
    }
  };

  // Selection state controller
  const selectMission = (id: string, initial = false) => {
    const mission = launches.find(l => l.id === id);
    if (!mission) return;
    if (mission.upcoming) {
      setSelectedUpcomingLaunch(mission);
      setActiveCenterTab('upcoming');
    } else {
      setSelectedRecentLaunch(mission);
      setActiveCenterTab('recent');
    }
    if (!initial) {
      addLog(`Selected mission: ${mission.name}`);
    }
  };

  // Clock Update Effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setUtcTime(now.toISOString().slice(11, 19) + " UTC");
      setLocalDateStr(now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch News Intelligence & Fallback
  const fetchNews = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedData<any[]>("spacex-cache-news-articles-v3");
      if (cached) {
        setNews(cached);
        addLog("Spaceflight News loaded from local browser cache.");
        return;
      }
    }
    try {
      addLog("Connecting to Spaceflight News API servers...");
      const endpoints = [
        `/api/news?source=${encodeURIComponent("https://api.spaceflightnewsapi.net/v4/articles/?limit=30&ordering=-published_at")}`,
        `/api/news?source=${encodeURIComponent("https://api.spaceflightnewsapi.net/v4/articles/?limit=30&search=SpaceX")}`,
        `/api/news?source=${encodeURIComponent("https://api.spaceflightnewsapi.net/v4/articles/?limit=30&search=Starship")}`
      ];
      
      const responses = await Promise.allSettled(
        endpoints.map(ep => fetch(ep, { headers: { "Accept": "application/json" } }).then(r => {
          if (!r.ok) throw new Error(`HTTP Error ${r.status}`);
          return r.json();
        }))
      );
      
      const articles: any[] = [];
      for (const result of responses) {
        if (result.status === "fulfilled") {
          const data = result.value;
          if (Array.isArray(data?.results)) articles.push(...data.results);
          else if (Array.isArray(data)) articles.push(...data);
        }
      }
      
      const keywords = ["spacex", "starship", "falcon", "raptor", "starlink"];
      const filtered = articles
        .filter(a => {
          const haystack = [a.title, a.summary, a.news_site, a.url].filter(Boolean).join(" ").toLowerCase();
          return keywords.some(kw => haystack.includes(kw));
        })
        .filter((article, index, arr) => arr.findIndex(item => item.url === article.url) === index)
        .sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime())
        .slice(0, 9);
      
      if (filtered.length > 0) {
        setNews(filtered);
        setCachedData("spacex-cache-news-articles-v3", filtered);
        addLog("Spaceflight News Feed synchronized successfully.");
      } else {
        const stale = getStaleCachedData<any[]>("spacex-cache-news-articles-v3");
        if (stale) {
          setNews(stale);
          addLog("Zero records from news endpoint; loading stale browser cache.");
        } else {
          setNews(FALLBACK_NEWS);
          addLog("Zero records from news endpoint; loading default SpaceX Intel briefs.");
        }
      }
    } catch (err: any) {
      // Fallback to expired stale cache if available, else standard fallback
      const stale = getStaleCachedData<any[]>("spacex-cache-news-articles-v3");
      if (stale) {
        setNews(stale);
        addLog(`News feed failed: ${err.message}. Using stale local browser cache.`);
      } else {
        setNews(FALLBACK_NEWS);
        addLog(`News feed failed: ${err.message}. Using cache failover.`);
      }
    }
  };

  const fetchMissions = async (forceRefresh = false) => {
    setLoading(true);
    try {
      let pastMissions: any[] = [];
      let llUpcoming: any[] = [];
      
      const cachedPast = !forceRefresh ? getCachedData<any[]>("spacex-cache-past-missions-v2") : null;
      const cachedUpcoming = !forceRefresh ? getCachedData<any[]>("spacex-cache-upcoming-missions") : null;

      if (cachedPast && cachedUpcoming) {
        pastMissions = cachedPast;
        llUpcoming = cachedUpcoming;
        addLog("Launches and future manifests loaded from local browser cache.");
      } else {
        // 1. Fetch live, contemporary past missions from Launch Library 2
        try {
          addLog("Retrieving live recent flights from Launch Library 2...");
          const llPastRes = await fetch("/api/proxy?url=" + encodeURIComponent("https://lldev.thespacedevs.com/2.3.0/launches/previous/?search=SpaceX&limit=30&mode=detailed"));
          if (llPastRes.ok) {
            const llPastData = await llPastRes.json();
            const results = Array.isArray(llPastData.results) ? llPastData.results : [];
            pastMissions = results.map((launch: any) => {
              const image = launch.image?.image_url || launch.image || "";
              return {
                id: `ll2-${launch.id}`,
                name: launch.name || "SpaceX Mission",
                date_utc: launch.net || launch.window_start,
                upcoming: false,
                success: launch.status?.id === 3,
                details: launch.mission?.description || "SpaceX launch campaign flight.",
                rocket_name: launch.rocket?.configuration?.name || "Falcon 9",
                launchpad_name: launch.pad?.name || "SLC-40, Cape Canaveral",
                pad_locality: launch.pad?.location?.name || "Cape Canaveral, FL, USA",
                has_landing: launch.rocket?.launcher_stage?.some((stage: any) => stage.landing?.attempt) ?? false,
                links: {
                  patch: { large: image, small: image },
                  webcast: launch.vid_urls?.[0]?.url || launch.vidURLs?.[0]?.url || launch.video_url || "",
                  wikipedia: launch.info_urls?.[0]?.url || launch.infoURLs?.[0]?.url || "https://www.spacex.com/"
                }
              };
            });
            setCachedData("spacex-cache-past-missions-v2", pastMissions);
            addLog(`Live synchronized: ${pastMissions.length} contemporary flights acquired.`);
          } else {
            throw new Error("HTTP " + llPastRes.status);
          }
        } catch (pastErr: any) {
          addLog(`Contemporary feed offline: ${pastErr.message}. Checking stale browser cache...`);
          const stalePast = getStaleCachedData<any[]>("spacex-cache-past-missions-v2");
          if (stalePast) {
            pastMissions = stalePast;
            addLog("Successfully restored stale recent flights cache.");
          } else {
            addLog("No local cache found. Utilizing legacy SpaceX archive cache...");
            try {
              const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://api.spacexdata.com/v4/launches"));
              if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
              const spacexArchive = await res.json();
              pastMissions = spacexArchive
                .filter((l: any) => !l.upcoming)
                .map((l: any) => ({
                  ...l,
                  id: `spacex-${l.id}`,
                  source: "SpaceX API Archive",
                  upcoming: false,
                  has_landing: !!l.cores?.some((c: any) => c.landing_attempt)
                }))
                .sort((a: any, b: any) => new Date(b.date_utc).getTime() - new Date(a.date_utc).getTime());
              addLog(`SpaceX archive parsed: ${pastMissions.length} historical flights loaded.`);
            } catch (subErr: any) {
              addLog(`Critical mission feed failure: ${subErr.message}`, true);
            }
          }
        }

        // 2. Attempt to acquire Upcoming launches from Launch Library 2
        try {
          addLog("Requesting future manifest from Launch Library 2...");
          const llRes = await fetch("/api/proxy?url=" + encodeURIComponent("https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?search=SpaceX&limit=12&mode=detailed"));
          if (llRes.ok) {
            const llData = await llRes.json();
            const results = Array.isArray(llData.results) ? llData.results : [];
            const now = Date.now();
            llUpcoming = results
              .filter((launch: any) => {
                const launchTime = new Date(launch.net || launch.window_start).getTime();
                return launchTime > now; // Only keep truly future launches
              })
              .map((launch: any) => {
                const image = launch.image?.image_url || launch.image || "";
                return {
                  id: `ll2-${launch.id}`,
                  name: launch.name || "Upcoming Launch",
                  date_utc: launch.net || launch.window_start,
                  upcoming: true,
                  details: launch.mission?.description || "Upcoming launch schedule data.",
                  rocket_name: launch.rocket?.configuration?.name || "Falcon 9",
                  launchpad_name: launch.pad?.name || "KSC Launch Complex 39A",
                  pad_locality: launch.pad?.location?.name || "Cape Canaveral, FL, USA",
                  links: {
                    patch: { large: image, small: image },
                    webcast: launch.vid_urls?.[0]?.url || launch.vidURLs?.[0]?.url || launch.video_url || "",
                    wikipedia: launch.info_urls?.[0]?.url || launch.infoURLs?.[0]?.url || "https://www.spacex.com/"
                  }
                };
              });

            if (llUpcoming.length === 0) {
              throw new Error("Empty upcoming flights from LL2");
            }

            setCachedData("spacex-cache-upcoming-missions", llUpcoming);
            addLog(`Retrieved ${llUpcoming.length} future missions from Launch Library 2.`);
          } else {
            throw new Error("LL2 response not ok");
          }
        } catch (err: any) {
          addLog(`Future manifest offline: ${err.message}. Checking stale browser cache...`);
          const staleUpcoming = getStaleCachedData<any[]>("spacex-cache-upcoming-missions");
          if (staleUpcoming) {
            llUpcoming = staleUpcoming;
            addLog("Successfully restored stale future manifest cache.");
          } else {
            addLog("LL2 offline. Attempting backup sync via live SpaceX V4 upcoming API flight list...");
            try {
              const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://api.spacexdata.com/v4/launches"));
              if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
              const spacexArchive = await res.json();
              const now = Date.now();
              llUpcoming = spacexArchive
                .filter((l: any) => l.upcoming && new Date(l.date_utc || l.date_local).getTime() > now)
                .map((l: any) => {
                  const image = l.links?.patch?.large || l.links?.patch?.small || "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&q=80&w=400";
                  return {
                    ...l,
                    id: `spacex-${l.id}`,
                    name: l.name || "SpaceX Upcoming Mission",
                    date_utc: l.date_utc,
                    upcoming: true,
                    details: l.details || "Upcoming SpaceX flight manifest schedule data.",
                    rocket_name: "Falcon 9",
                    launchpad_name: "Kennedy Space Center / SLC-40",
                    pad_locality: "Cape Canaveral / Vandenberg, USA",
                    links: {
                      patch: { large: image, small: image },
                      webcast: l.links?.webcast || (l.links?.youtube_id ? `https://www.youtube.com/watch?v=${l.links.youtube_id}` : ""),
                      wikipedia: l.links?.wikipedia || "https://www.spacex.com/"
                    }
                  };
                })
                .sort((a: any, b: any) => new Date(a.date_utc).getTime() - new Date(b.date_utc).getTime());
              
              if (llUpcoming.length === 0) {
                addLog('SpaceX V4 fallback yielded 0 upcoming. Utilizing local backup calendar.');
                llUpcoming = FALLBACK_UPCOMING;
              }

              setCachedData("spacex-cache-upcoming-missions", llUpcoming);
              addLog(`Successfully parsed ${llUpcoming.length} real-time upcoming launches from SpaceX API.`);
            } catch (subErr: any) {
              addLog(`SpaceX V4 fallback failed: ${subErr.message}. Utilizing local backup calendar.`, true);
              llUpcoming = FALLBACK_UPCOMING;
            }
          }
        }
      }

      // Merge and store launches
      const allMissions = pastMissions.concat(llUpcoming);
      setLaunches(allMissions);

      // Set initial selected launches independently
      if (llUpcoming.length > 0) {
        setSelectedUpcomingLaunch(llUpcoming[0]);
      }
      if (pastMissions.length > 0) {
        setSelectedRecentLaunch(pastMissions[0]);
      }
    } catch (err: any) {
      addLog(`API fetch failure: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    addLog("SpaceX Mission Control Dashboard booting up...");
    // Fetch missions and news
    fetchMissions();
    fetchNews();

    // Load Giveaway persistent entries
    try {
      const storedEntries = localStorage.getItem("spacex-giveaway-entries");
      if (storedEntries) {
        setGiveawayEntries(JSON.parse(storedEntries));
      }
      const storedWinner = localStorage.getItem("spacex-giveaway-winner");
      if (storedWinner) {
        setCurrentWinner(storedWinner);
      }
    } catch (_) {}

    // Setup periodic polling for Live Feeds (every 5 minutes)
    const pollTimer = setInterval(async () => {
      fetchNews(true);
      try {
        const llRes = await fetch("/api/proxy?url=" + encodeURIComponent("https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?search=SpaceX&limit=12&mode=detailed"));
        if (llRes.ok) {
          const llData = await llRes.json();
          const results = Array.isArray(llData.results) ? llData.results : [];
          const now = Date.now();
          const llUpcoming = results
            .filter((launch: any) => new Date(launch.net || launch.window_start).getTime() > now)
            .map((launch: any) => {
              const image = launch.image?.image_url || launch.image || "";
              return {
                id: `ll2-${launch.id}`,
                name: launch.name || "Upcoming Launch",
                date_utc: launch.net || launch.window_start,
                upcoming: true,
                details: launch.mission?.description || "Upcoming launch schedule data.",
                rocket_name: launch.rocket?.configuration?.name || "Falcon 9",
                launchpad_name: launch.pad?.name || "KSC Launch Complex 39A",
                pad_locality: launch.pad?.location?.name || "Cape Canaveral, FL, USA",
                links: {
                  patch: { large: image, small: image },
                  webcast: launch.vid_urls?.[0]?.url || launch.vidURLs?.[0]?.url || launch.video_url || "",
                  wikipedia: launch.info_urls?.[0]?.url || launch.infoURLs?.[0]?.url || "https://www.spacex.com/"
                }
              };
            });

          if (llUpcoming.length === 0) {
            throw new Error("Empty upcoming flights from LL2 polling");
          }

          setLaunches(prev => {
            const past = prev.filter(l => !l.upcoming);
            return past.concat(llUpcoming);
          });
          setCachedData("spacex-cache-upcoming-missions", llUpcoming);
          addLog("Live feed sync: Upcoming missions updated.");
        } else {
          throw new Error("Polling response status " + llRes.status);
        }
      } catch (e: any) {
        // Fallback sync with SpaceX API
        try {
          const res = await fetch("/api/proxy?url=" + encodeURIComponent("https://api.spacexdata.com/v4/launches"));
          if (res.ok) {
            const spacexArchive = await res.json();
            const now = Date.now();
            let llUpcoming = spacexArchive
              .filter((l: any) => l.upcoming && new Date(l.date_utc || l.date_local).getTime() > now)
              .map((l: any) => {
                const image = l.links?.patch?.large || l.links?.patch?.small || "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&q=80&w=400";
                return {
                  ...l,
                  id: `spacex-${l.id}`,
                  name: l.name || "SpaceX Upcoming Mission",
                  date_utc: l.date_utc,
                  upcoming: true,
                  details: l.details || "Upcoming SpaceX flight manifest schedule data.",
                  rocket_name: "Falcon 9",
                  launchpad_name: "Kennedy Space Center / SLC-40",
                  pad_locality: "Cape Canaveral / Vandenberg, USA",
                  links: {
                    patch: { large: image, small: image },
                    webcast: l.links?.webcast || (l.links?.youtube_id ? `https://www.youtube.com/watch?v=${l.links.youtube_id}` : ""),
                    wikipedia: l.links?.wikipedia || "https://www.spacex.com/"
                  }
                };
              })
              .sort((a: any, b: any) => new Date(a.date_utc).getTime() - new Date(b.date_utc).getTime());
            
            if (llUpcoming.length === 0) {
              llUpcoming = FALLBACK_UPCOMING;
            }

            setLaunches(prev => {
              const past = prev.filter(l => !l.upcoming);
              return past.concat(llUpcoming);
            });
            setCachedData("spacex-cache-upcoming-missions", llUpcoming);
            addLog("Live feed sync: Recouped upcoming launches from SpaceX API after rate limits.");
          }
        } catch (_) {}
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(pollTimer);
  }, []);

  // Selected Launch Countdown calculation loop
  useEffect(() => {
    if (!selectedLaunch || !selectedLaunch.date_utc) {
      setCountdownText("TBD");
      setTimeLeft(prev => ({ ...prev, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isTbd: true, statusText: "TBD" }));
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(selectedLaunch.date_utc).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        const text = "GO LIVE";
        setCountdownText(text);
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          isTbd: false,
          statusText: text
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setCountdownText(`T- ${days}D ${pad(hours)}H ${pad(minutes)}M ${pad(seconds)}S`);
      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isPast: false,
        isTbd: false,
        statusText: `T- ${days}D ${pad(hours)}H ${pad(minutes)}M ${pad(seconds)}S`
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [selectedUpcomingLaunch]);

  // Telemetry Deep-Resolver for Selected Recent Launch
  useEffect(() => {
    if (!selectedRecentLaunch) {
      setResolvedRecentDetails(null);
      return;
    }

    // If it is Launch Library 2 or a local fallback, instantly resolve basic fields
    if (selectedRecentLaunch.id?.toString().startsWith('ll2-') || !selectedRecentLaunch.id) {
      setResolvedRecentDetails({
        rocketName: selectedRecentLaunch.rocket_name || "Falcon 9",
        padFullName: selectedRecentLaunch.launchpad_name || "SLC-40, Cape Canaveral",
        linksDetails: {
          article: selectedRecentLaunch.links?.webcast || undefined
        },
        isLoading: false,
      });
      return;
    }

    let isCancelled = false;
    setResolvedRecentDetails({ isLoading: true });
    addLog(`Initiating advanced telemetry lookup for Recent "${selectedRecentLaunch.name}"...`);

    const fetchExpandedInfo = async () => {
      try {
        // 1. Fetch Rocket Info
        let rocketName = "Falcon 9";
        let rocketType = "Falcon 9";
        if (selectedRecentLaunch.rocket) {
          try {
            const rRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/rockets/${selectedRecentLaunch.rocket}`)}`);
            if (rRes.ok) {
              const rData = await rRes.json();
              rocketName = rData.name || rocketName;
              rocketType = rData.type || rocketType;
            }
          } catch (_) {}
        }

        if (isCancelled) return;

        // 2. Fetch Launchpad Info
        let padFullName = "SLC-40, Cape Canaveral";
        let padLocality = "Florida";
        if (selectedRecentLaunch.launchpad) {
          try {
            const pRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/launchpads/${selectedRecentLaunch.launchpad}`)}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              padFullName = pData.full_name || pData.name || padFullName;
              padLocality = pData.locality ? `${pData.locality}, ${pData.region}` : padLocality;
            }
          } catch (_) {}
        }

        if (isCancelled) return;

        // 3. Fetch Payloads Info
        let payloadsList: any[] = [];
        if (Array.isArray(selectedRecentLaunch.payloads) && selectedRecentLaunch.payloads.length > 0) {
          try {
            const targets = selectedRecentLaunch.payloads.slice(0, 3);
            const pPromises = targets.map(async (pId: string) => {
              const pRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/payloads/${pId}`)}`);
              return pRes.ok ? pRes.json() : null;
            });
            const pResults = await Promise.all(pPromises);
            payloadsList = pResults.filter(Boolean);
          } catch (_) {}
        }

        if (isCancelled) return;

        // 4. Fetch Cores & Landpads
        let coresList: any[] = [];
        if (Array.isArray(selectedRecentLaunch.cores) && selectedRecentLaunch.cores.length > 0) {
          try {
            const cPromises = selectedRecentLaunch.cores.map(async (c: any) => {
              let coreData: any = null;
              let landpadData: any = null;

              if (c.core) {
                try {
                  const cRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/cores/${c.core}`)}`);
                  if (cRes.ok) coreData = await cRes.json();
                } catch (_) {}
              }

              if (c.landpad) {
                try {
                  const lpRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/landpads/${c.landpad}`)}`);
                  if (lpRes.ok) landpadData = await lpRes.json();
                } catch (_) {}
              }

              return {
                ...c,
                coreDetails: coreData,
                landDetails: landpadData
              };
            });
            coresList = await Promise.all(cPromises);
          } catch (_) {}
        }

        if (isCancelled) return;

        // 5. Build full state
        const staticFireDate = selectedRecentLaunch.static_fire_date_utc 
          ? new Date(selectedRecentLaunch.static_fire_date_utc).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
          : undefined;

        const linksDetails = {
          redditCampaign: selectedRecentLaunch.links?.reddit?.campaign || undefined,
          redditLaunch: selectedRecentLaunch.links?.reddit?.launch || undefined,
          redditMedia: selectedRecentLaunch.links?.reddit?.media || undefined,
          redditRecovery: selectedRecentLaunch.links?.reddit?.recovery || undefined,
          wikipedia: selectedRecentLaunch.links?.wikipedia || undefined,
          article: selectedRecentLaunch.links?.article || undefined,
        };

        if (!isCancelled) {
          setResolvedRecentDetails({
            rocketName,
            rocketType,
            padFullName,
            padLocality,
            payloadsList,
            coresList,
            failuresList: selectedRecentLaunch.failures || [],
            staticFireDate,
            linksDetails,
            isLoading: false
          });
          addLog(`Advanced telemetry acquired for Recent "${selectedRecentLaunch.name}".`);
        }
      } catch (err: any) {
        addLog(`Deep resolver error: ${err.message}`, true);
        if (!isCancelled) {
          setResolvedRecentDetails({
            rocketName: selectedRecentLaunch.rocket_name || "Falcon 9",
            padFullName: selectedRecentLaunch.launchpad_name || "SLC-40, Cape Canaveral",
            isLoading: false
          });
        }
      }
    };

    fetchExpandedInfo();

    return () => {
      isCancelled = true;
    };
  }, [selectedRecentLaunch]);

  // Telemetry Deep-Resolver for Selected Upcoming Launch
  useEffect(() => {
    if (!selectedUpcomingLaunch) {
      setResolvedUpcomingDetails(null);
      return;
    }

    // If it is Launch Library 2 or a local fallback, instantly resolve basic fields
    if (selectedUpcomingLaunch.id?.toString().startsWith('ll2-') || !selectedUpcomingLaunch.id) {
      setResolvedUpcomingDetails({
        rocketName: selectedUpcomingLaunch.rocket_name || "Falcon 9",
        padFullName: selectedUpcomingLaunch.launchpad_name || "SLC-40, Cape Canaveral",
        linksDetails: {
          article: selectedUpcomingLaunch.links?.webcast || undefined
        },
        isLoading: false,
      });
      return;
    }

    let isCancelled = false;
    setResolvedUpcomingDetails({ isLoading: true });
    addLog(`Initiating advanced telemetry lookup for Upcoming "${selectedUpcomingLaunch.name}"...`);

    const fetchExpandedInfo = async () => {
      try {
        // 1. Fetch Rocket Info
        let rocketName = "Falcon 9";
        let rocketType = "Falcon 9";
        if (selectedUpcomingLaunch.rocket) {
          try {
            const rRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/rockets/${selectedUpcomingLaunch.rocket}`)}`);
            if (rRes.ok) {
              const rData = await rRes.json();
              rocketName = rData.name || rocketName;
              rocketType = rData.type || rocketType;
            }
          } catch (_) {}
        }

        if (isCancelled) return;

        // 2. Fetch Launchpad Info
        let padFullName = "SLC-40, Cape Canaveral";
        let padLocality = "Florida";
        if (selectedUpcomingLaunch.launchpad) {
          try {
            const pRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/launchpads/${selectedUpcomingLaunch.launchpad}`)}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              padFullName = pData.full_name || pData.name || padFullName;
              padLocality = pData.locality ? `${pData.locality}, ${pData.region}` : padLocality;
            }
          } catch (_) {}
        }

        if (isCancelled) return;

        // 3. Fetch Payloads Info
        let payloadsList: any[] = [];
        if (Array.isArray(selectedUpcomingLaunch.payloads) && selectedUpcomingLaunch.payloads.length > 0) {
          try {
            const targets = selectedUpcomingLaunch.payloads.slice(0, 3);
            const pPromises = targets.map(async (pId: string) => {
              const pRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/payloads/${pId}`)}`);
              return pRes.ok ? pRes.json() : null;
            });
            const pResults = await Promise.all(pPromises);
            payloadsList = pResults.filter(Boolean);
          } catch (_) {}
        }

        if (isCancelled) return;

        // 4. Fetch Cores & Landpads
        let coresList: any[] = [];
        if (Array.isArray(selectedUpcomingLaunch.cores) && selectedUpcomingLaunch.cores.length > 0) {
          try {
            const cPromises = selectedUpcomingLaunch.cores.map(async (c: any) => {
              let coreData: any = null;
              let landpadData: any = null;

              if (c.core) {
                try {
                  const cRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/cores/${c.core}`)}`);
                  if (cRes.ok) coreData = await cRes.json();
                } catch (_) {}
              }

              if (c.landpad) {
                try {
                  const lpRes = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.spacexdata.com/v4/landpads/${c.landpad}`)}`);
                  if (lpRes.ok) landpadData = await lpRes.json();
                } catch (_) {}
              }

              return {
                ...c,
                coreDetails: coreData,
                landDetails: landpadData
              };
            });
            coresList = await Promise.all(cPromises);
          } catch (_) {}
        }

        if (isCancelled) return;

        // 5. Build full state
        const staticFireDate = selectedUpcomingLaunch.static_fire_date_utc 
          ? new Date(selectedUpcomingLaunch.static_fire_date_utc).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
          : undefined;

        const linksDetails = {
          redditCampaign: selectedUpcomingLaunch.links?.reddit?.campaign || undefined,
          redditLaunch: selectedUpcomingLaunch.links?.reddit?.launch || undefined,
          redditMedia: selectedUpcomingLaunch.links?.reddit?.media || undefined,
          redditRecovery: selectedUpcomingLaunch.links?.reddit?.recovery || undefined,
          wikipedia: selectedUpcomingLaunch.links?.wikipedia || undefined,
          article: selectedUpcomingLaunch.links?.article || undefined,
        };

        if (!isCancelled) {
          setResolvedUpcomingDetails({
            rocketName,
            rocketType,
            padFullName,
            padLocality,
            payloadsList,
            coresList,
            failuresList: selectedUpcomingLaunch.failures || [],
            staticFireDate,
            linksDetails,
            isLoading: false
          });
          addLog(`Advanced telemetry acquired for Upcoming "${selectedUpcomingLaunch.name}".`);
        }
      } catch (err: any) {
        addLog(`Deep resolver error: ${err.message}`, true);
        if (!isCancelled) {
          setResolvedUpcomingDetails({
            rocketName: selectedUpcomingLaunch.rocket_name || "Falcon 9",
            padFullName: selectedUpcomingLaunch.launchpad_name || "SLC-40, Cape Canaveral",
            isLoading: false
          });
        }
      }
    };

    fetchExpandedInfo();

    return () => {
      isCancelled = true;
    };
  }, [selectedUpcomingLaunch]);

  // Synchronize active video when selectedRecentLaunch changes
  useEffect(() => {
    if (selectedRecentLaunch) {
      const ytId = extractYoutubeId(youtubeUrl(selectedRecentLaunch));
      setActiveRecentVideoId(ytId);
    }
  }, [selectedRecentLaunch]);

  // Synchronize active video when selectedUpcomingLaunch changes
  useEffect(() => {
    if (selectedUpcomingLaunch) {
      const ytId = extractYoutubeId(youtubeUrl(selectedUpcomingLaunch));
      setActiveUpcomingVideoId(ytId);
    }
  }, [selectedUpcomingLaunch]);

  const playLandingVideo = (video: any) => {
    setActiveLowerReplay({ ...video, type: 'landing' });
    addLog(`Loading landing replay webcast: ${video.title}`);
  };

  // Render variables & helpers
  const selectedLaunch = activeCenterTab === 'upcoming' ? selectedUpcomingLaunch : selectedRecentLaunch;
  const resolvedDetails = activeCenterTab === 'upcoming' ? resolvedUpcomingDetails : resolvedRecentDetails;
  const activeVideoId = activeCenterTab === 'upcoming' ? activeUpcomingVideoId : activeRecentVideoId;

  const currentLandingVideoData = useMemo(() => {
    return LANDING_VIDEOS.find(v => v.id === activeVideoId);
  }, [activeVideoId]);

  const pastLaunchesList = useMemo(() => {
    return launches.filter(l => !l.upcoming);
  }, [launches]);

  const upcomingLaunchesList = useMemo(() => {
    return launches.filter(l => l.upcoming);
  }, [launches]);

  const filteredPast = useMemo(() => {
    return pastLaunchesList.slice(0, 30);
  }, [pastLaunchesList]);

  const filteredUpcoming = useMemo(() => {
    return upcomingLaunchesList;
  }, [upcomingLaunchesList]);

  const isCloseToLaunch = useMemo(() => {
    if (timeLeft.isPast || timeLeft.isTbd) return false;
    const totalMinutesLeft = timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes;
    return totalMinutesLeft < 5;
  }, [timeLeft]);

  // Form Submission
  const handleGiveawaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giveawayName.trim() || !giveawayEmail.trim()) return;

    const newEntry = {
      id: Date.now(),
      name: giveawayName.trim(),
      email: giveawayEmail.trim(),
      date: new Date().toLocaleDateString()
    };

    const updated = [newEntry, ...giveawayEntries];
    setGiveawayEntries(updated);
    localStorage.setItem("spacex-giveaway-entries", JSON.stringify(updated));

    addLog(`New giveaway entry received: ${newEntry.name} (${newEntry.email})`);
    setGiveawayName("");
    setGiveawayEmail("");
  };

  // Draw Winner
  const handleDrawWinner = () => {
    if (!giveawayEntries.length) {
      addLog("Draw failed: No entrants registered yet.", true);
      alert("No entries recorded yet. Submit name & email to enter!");
      return;
    }
    const idx = Math.floor(Math.random() * giveawayEntries.length);
    const winner = giveawayEntries[idx].name;
    setCurrentWinner(winner);
    localStorage.setItem("spacex-giveaway-winner", winner);
    addLog(`GIVEAWAY DRAWN: Winner is ${winner}!`);
    alert(`Congratulations to our monthly model winner: ${winner}!`);
  };

  const patch = selectedLaunch ? patchImage(selectedLaunch) : "";

  if (view === 'pro') {
    return <TrackerProPage onBack={() => setView('dashboard')} />;
  }

  return (
    <div className="min-h-screen relative font-inter">
      <div className="page-bg" aria-hidden="true"></div>

      <main className="shell relative z-10">

        {/* Upper Space Navigation Centered Header matching master copy */}
        <header className="topbar">
          <div className="header-logo-inside-box">
            <img 
              className="site-logo header-inline-logo" 
              src="/spacex_logo_v2.png" 
              alt="SpaceX Logo" 
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Countdown Clock moved below the main logo in the header */}
          <div className="relative z-10 w-full flex flex-col items-center mt-1.5 mb-1 px-4 max-w-[500px]">
            <div className="text-sky-400 font-bold tracking-[0.2em] text-[10px] sm:text-xs uppercase mb-0.5 font-space text-center select-none font-semibold">
              {countdownText === "MISSION ARCHIVE" ? "MISSION ARCHIVE" : "TIME UNTIL LAUNCH"}
            </div>
            
            <div id="countdown" className="flex items-center gap-1.5 sm:gap-2 justify-center select-none font-mono tracking-tight text-3xl sm:text-4xl text-sky-400 font-semibold leading-none">
              <div className="flex flex-col items-center w-11 sm:w-12">
                <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.15] origin-center">
                  {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.days.toString().padStart(2, '0')}
                </span>
                <span className="text-[7.5px] sm:text-[8.5px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-0.5 font-space text-center leading-none">
                  DAYS
                </span>
              </div>
              
              <span className="text-sky-400/90 leading-none -translate-y-1 select-none inline-block transform scale-y-[1.15]">
                :
              </span>

              <div className="flex flex-col items-center w-11 sm:w-12">
                <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.15] origin-center">
                  {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.hours.toString().padStart(2, '0')}
                </span>
                <span className="text-[7.5px] sm:text-[8.5px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-0.5 font-space text-center leading-none">
                  HOURS
                </span>
              </div>
              
              <span className="text-sky-400/90 leading-none -translate-y-1 select-none inline-block transform scale-y-[1.15]">
                :
              </span>

              <div className="flex flex-col items-center w-11 sm:w-12">
                <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.15] origin-center">
                  {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.minutes.toString().padStart(2, '0')}
                </span>
                <span className="text-[7.5px] sm:text-[8.5px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-0.5 font-space text-center leading-none">
                  MINUTES
                </span>
              </div>

              <span className="text-sky-400/90 leading-none -translate-y-1 select-none inline-block transform scale-y-[1.15]">
                :
              </span>

              <div className="flex flex-col items-center w-11 sm:w-12">
                <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.15] origin-center">
                  {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.seconds.toString().padStart(2, '0')}
                </span>
                <span className="text-[7.5px] sm:text-[8.5px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-0.5 font-space text-center leading-none">
                  SECONDS
                </span>
              </div>
            </div>

            <div id="nextName" className="mt-1 px-2 text-[10px] md:text-[11px] tracking-[0.15em] text-[#ff7a18] text-center font-bold font-space uppercase break-words max-w-full">
              {selectedUpcomingLaunch ? selectedUpcomingLaunch.name : "Syncing Mission State"}
            </div>
          </div>

          <div className="title-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="header-brand-inline">
              <div className="header-seo-tagline">
                Real-time SpaceX Launch Updates, Mission History, News &amp; Rocket Details
              </div>
              {/* Removed console-footer-text per user request */}
            </div>
          </div>
        </header>

        {/* Master Triple Column Dashboard Grid */}
        <section className="mission-grid">
          
          {/* Left Column: Archive Feed (Recent Missions) */}
          <RecentMissionsPanel 
            loading={loading}
            filteredPast={filteredPast}
            selectedLaunch={selectedRecentLaunch}
            selectMission={selectMission}
          />

          {/* Center Column: Detailed Mission Display Block */}
          <article className="panel main-display">
            <div className="panel-title">
              <div>
                <small>Selected Launch</small>
                <h2 style={{ fontSize: '1.25rem' }}>Mission Display</h2>
              </div>
              <div className="flex flex-col items-end gap-1.5 select-none">
                <span className="badge">LIVE PANEL</span>
                <a
                  href={upcomingWebcastUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`badge cursor-pointer text-center select-none uppercase transition-all duration-300 font-mono tracking-widest ${
                    isCloseToLaunch 
                      ? '!bg-red-600 !border-red-500 !text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)]' 
                      : 'hover:bg-cyan-500/20 hover:border-cyan-400'
                  }`}
                  style={{ display: 'inline-block', fontSize: '10px', padding: '3px 8px', minWidth: '82px' }}
                  title={isCloseToLaunch ? "Launch imminent! Watch Live broadcast." : "Watch webcast coverage"}
                >
                  WATCH LIVE
                </a>
              </div>
            </div>



            {selectedLaunch ? (
              <div id="displayArea" className="space-y-4">
                
                {/* Hero mission banner and Video Player Integration */}
                <div className={`hero-mission relative overflow-hidden transition-all duration-500 rounded-lg ${activeVideoId ? 'aspect-video w-full shadow-[0_0_40px_rgba(0,231,255,0.15)] ring-1 ring-cyan-500/30' : ''}`}>
                  {activeVideoId ? (
                    <div className="absolute inset-0 w-full h-full z-0 bg-black">
                      <iframe 
                        src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`} 
                        title="SpaceX Webcast Player" 
                        allowFullScreen 
                        loading="lazy" 
                        className="w-full h-full border-0 absolute inset-0 z-10"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      ></iframe>
                    </div>
                  ) : (
                    <>
                      {/* Outer space cosmic starfield backdrop is always present */}
                      <div className="fallback-art z-0"></div>

                      {/* High-fidelity glowing mission patch watermark overlay */}
                      {patch && (
                        <img 
                          src={patch} 
                          alt="SpaceX Patch banner" 
                          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-28 h-28 md:w-44 md:h-44 object-contain opacity-25 pointer-events-none select-none z-0 filter drop-shadow-[0_0_25px_rgba(0,231,255,0.25)] transition-all duration-300"
                        />
                      )}
                    </>
                  )}
                  
                  {/* Hero Copy overlay only shows if NO video is actively playing */}
                  {!activeVideoId && (
                    <div className="hero-copy z-10">
                      <h2>{selectedLaunch.name}</h2>
                      <p>
                        {selectedLaunch.details || "Launch operations dashboard, telemetry parameters, stream assets, and launchpad details."}
                      </p>
                    </div>
                  )}
                </div>

                {currentLandingVideoData && (
                  <div className="bg-[#0b101f]/90 border border-cyan-500/30 rounded-xl p-4 text-left space-y-4 mb-4 animate-fade-in relative overflow-hidden backdrop-blur-sm self-stretch w-full">
                    <div className="flex justify-between items-center border-b border-cyan-500/10 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <h3 className="font-space text-xs text-cyan-300 font-bold tracking-wider uppercase">
                          REPLAY TELEMETRY MATRIX
                        </h3>
                      </div>
                      <span className={`font-mono text-[9px] px-2 py-0.5 rounded border uppercase ${
                        currentLandingVideoData.success 
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                          : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}>
                        {currentLandingVideoData.success ? "Landed Successfully" : "Loss of Core"}
                      </span>
                    </div>

                    {/* Metadata Panel (vehicle, pad, mission, weather, landing type) */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 relative z-10">
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex flex-col justify-between">
                        <span className="text-[8px] text-slate-400 font-mono tracking-wider block uppercase">MISSION</span>
                        <strong className="font-mono text-xs text-white block truncate">{currentLandingVideoData.mission}</strong>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex flex-col justify-between">
                        <span className="text-[8px] text-slate-400 font-mono tracking-wider block uppercase">VEHICLE</span>
                        <strong className="font-mono text-xs text-white block truncate">{currentLandingVideoData.vehicle}</strong>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex flex-col justify-between col-span-2 lg:col-span-1">
                        <span className="text-[8px] text-slate-400 font-mono tracking-wider block uppercase">BOOSTER</span>
                        <strong className="font-mono text-xs text-amber-400 block truncate">{currentLandingVideoData.booster}</strong>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex flex-col justify-between">
                        <span className="text-[8px] text-slate-400 font-mono tracking-wider block uppercase">LANDING ZONE</span>
                        <strong className="font-mono text-[11px] text-cyan-400 block truncate" title={currentLandingVideoData.pad}>{currentLandingVideoData.pad}</strong>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex flex-col justify-between">
                        <span className="text-[8px] text-slate-400 font-mono tracking-wider block uppercase">WEATHER STATE</span>
                        <strong className="font-mono text-[11px] text-white block truncate" title={currentLandingVideoData.weather}>{currentLandingVideoData.weather}</strong>
                      </div>
                    </div>

                    {/* Landing timeline */}
                    <div className="space-y-2 pt-1 border-t border-slate-800/60">
                      <div className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mb-1">
                        MISSION PROFILE PROPULSION SEQUENCE
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                        {currentLandingVideoData.timeline.map((item) => (
                          <div 
                            key={item.id} 
                            className="bg-slate-950/50 p-2 rounded border border-slate-900 text-center flex flex-col justify-between min-h-[56px]"
                          >
                            <span className="text-[8px] text-slate-400 block truncate font-mono uppercase tracking-wider">{item.label}</span>
                            <div className="my-1 flex justify-center items-center gap-1.5">
                              {item.status === "Nominal" ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                                  <span className="text-[8px] text-emerald-400 font-mono uppercase">NOMINAL</span>
                                </>
                              ) : item.status === "Skipped" ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  <span className="text-[8px] text-slate-500 font-mono text-center">N/A</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_6px_#f59e0b]" />
                                  <span className="text-[8px] text-amber-400 font-mono uppercase">{item.status}</span>
                                </>
                              )}
                            </div>
                            <span className="font-mono text-[9px] text-slate-300 font-semibold block">{item.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Master Details 6-Card Grid */}
                <section className="detail-grid">
                  <div className="detail-card">
                    <span>Status</span>
                    <strong style={{ color: selectedLaunch.upcoming ? "var(--orange)" : selectedLaunch.success ? "var(--green)" : "var(--red)" }}>
                      {launchStatusLabel(selectedLaunch)}
                    </strong>
                  </div>
                  <div className="detail-card">
                    <span>Source</span>
                    <strong>{launchSourceLabel(selectedLaunch)}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Vehicle</span>
                    <strong>{resolvedDetails?.rocketName || missionRocketName(selectedLaunch)} {resolvedDetails?.rocketType && `(${resolvedDetails.rocketType})`}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Launch Pad</span>
                    <strong>
                      {resolvedDetails?.padFullName || missionPadName(selectedLaunch)}
                      {resolvedDetails?.padLocality && (
                        <span style={{ fontSize: '10px', textTransform: 'none', color: 'var(--muted)', display: 'block', marginTop: '2px', letterSpacing: 'normal' }}>
                          Locality: {resolvedDetails.padLocality}
                        </span>
                      )}
                    </strong>
                  </div>
                  <div className="detail-card">
                    <span>Local Time</span>
                    <strong>{formatDate(selectedLaunch.date_utc)}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Landing Type / Site</span>
                    <strong>
                      {resolvedDetails?.coresList?.[0]?.landDetails?.name 
                        ? resolvedDetails.coresList[0].landDetails.name 
                        : (selectedLaunch?.cores?.[0]?.landing_type || "No attempt scheduled")}
                    </strong>
                  </div>
                </section>

                {/* Dual Downlink Status & Failure Board */}
                {resolvedDetails?.isLoading && (
                  <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span className="font-mono text-[10px] text-cyan-300">RECEIVING DOWNLINK REAL-TIME TELEMETRY...</span>
                    </div>
                    <span className="font-mono text-[10px] text-cyan-400/80">CHANNEL ACTIVE</span>
                  </div>
                )}

                {selectedLaunch.success === false && (
                  <div className="p-4 bg-red-950/35 border border-red-500/30 rounded-xl text-left space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-semibold uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Command Center: Flight anomaly report
                    </div>
                    <div className="space-y-1">
                      {resolvedDetails?.failuresList && resolvedDetails.failuresList.map((fail: any, idx: number) => (
                        <div key={idx} className="font-mono text-xs text-red-200 bg-red-950/40 p-2.5 rounded border border-red-900/30 space-y-1">
                          <div><strong className="text-red-400">Time elapsed:</strong> T+ {fail.time ?? "Unknown"}s</div>
                          <div><strong className="text-red-400">Altitude:</strong> {fail.altitude ? `${fail.altitude} km` : "N/A"}</div>
                          <div><strong className="text-red-400">Telemetry Reason:</strong> "{fail.reason}"</div>
                        </div>
                      ))}
                      {(!resolvedDetails?.failuresList || resolvedDetails?.failuresList.length === 0) && (
                        <div className="font-mono text-xs text-red-200">
                          Launch campaign ended in loss of vehicle. Mission status confirmed failure.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Intelligence Booster & Payload Characteristics */}
                <section className="mission-intelligence" style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '0 0 14px' }}>
                  
                  {/* Falcon Booster Telemetry details */}
                  <div className="bg-slate-900/35 border border-cyan-400/15 rounded-xl p-4 text-left w-full">
                    <h3 className="font-space text-xs text-cyan-300 tracking-wider uppercase mb-3 flex items-center gap-1.5 border-b border-cyan-500/10 pb-2">
                      <Cpu className="w-4 h-4 text-cyan-300" />
                      Falcon booster & vehicle telemetry
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-200 font-mono block mb-1">BOOSTER SERIAL</span>
                        <strong className="font-mono text-xs text-white">
                          {resolvedDetails?.coresList?.[0]?.coreDetails?.serial || selectedLaunch?.cores?.[0]?.core?.serial || selectedLaunch?.cores?.[0]?.core || "Core Unknown"}
                        </strong>
                      </div>
                      <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-200 font-mono block mb-1">FLIGHT NUMBER</span>
                        <strong className="font-mono text-xs text-white">
                          {selectedLaunch?.cores?.[0]?.flight ? `${selectedLaunch.cores[0].flight} Flight` : "1st Flight"} 
                          {selectedLaunch?.cores?.[0]?.reused ? " (Reused)" : " (New Core)"}
                        </strong>
                      </div>
                      <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-200 font-mono block mb-1">RECOVERY ATTEMPT</span>
                        <strong className="font-mono text-xs text-white">
                          {selectedLaunch?.cores?.[0]?.landing_attempt ? "Scheduled Attempt" : "No Attempt"}
                        </strong>
                      </div>
                      <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-200 font-mono block mb-1">RECOVERY OUTCOME</span>
                        <strong className="font-mono text-xs text-white" style={{ color: selectedLaunch?.cores?.[0]?.landing_success ? "var(--green)" : selectedLaunch?.cores?.[0]?.landing_attempt ? "var(--orange)" : "inherit" }}>
                          {selectedLaunch?.cores?.[0]?.landing_attempt 
                            ? (selectedLaunch?.cores?.[0]?.landing_success ? "Landed Successfully" : "Loss of booster") 
                            : "Expended"}
                        </strong>
                      </div>
                    </div>

                    {/* Core last update block if pulled */}
                    {resolvedDetails?.coresList?.[0]?.coreDetails?.last_update && (
                      <div className="mt-3 p-2.5 px-3 bg-[#0a101d] border border-cyan-500/5 rounded-lg text-xs leading-relaxed text-slate-100 font-mono text-[11px]">
                        <span className="text-[9px] text-[#00e7ff] uppercase tracking-wider block mb-0.5">FLEET HISTORIC LOG:</span>
                        {resolvedDetails.coresList[0].coreDetails.last_update}
                      </div>
                    )}

                    {/* Additional grid/leg characteristics */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-200">
                      <div className="flex justify-between bg-slate-950/20 p-2 rounded border border-slate-800/40">
                        <span>Grid Fins Navigation:</span>
                        <strong className="text-white">{selectedLaunch?.cores?.[0]?.gridfins ? "EQUIPPED" : "NONE"}</strong>
                      </div>
                      <div className="flex justify-between bg-slate-950/20 p-2 rounded border border-slate-800/40">
                        <span>Landing Legs Deployment:</span>
                        <strong className="text-white">{selectedLaunch?.cores?.[0]?.legs ? "EQUIPPED" : "NONE"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Payloads Intelligence inventory breakdown */}
                  <div className="bg-slate-900/35 border border-cyan-400/15 rounded-xl p-4 text-left w-full">
                    <h3 className="font-space text-xs text-cyan-300 tracking-wider uppercase mb-3 flex items-center gap-1.5 border-b border-cyan-500/10 pb-2">
                      <Layers className="w-4 h-4 text-cyan-300" />
                      Mission payload parameters
                    </h3>
                    
                    {resolvedDetails?.payloadsList && resolvedDetails.payloadsList.length > 0 ? (
                      <div className="space-y-3">
                        {resolvedDetails.payloadsList.map((payload: any) => (
                          <div key={payload.id} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                              <span className="font-space text-[13px] text-white font-medium">{payload.name}</span>
                              <span className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase">
                                {payload.type || "Satellite"}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono text-slate-200">
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block">Mass</span>
                                <strong className="text-white">{payload.mass_kg ? `${payload.mass_kg.toLocaleString()} kg` : "Unknown Mass"}</strong>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block">Orbit</span>
                                <strong className="text-white">{payload.orbit || "LEO"} ({payload.regime || "Low Earth"})</strong>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 block">Manufacturer</span>
                                <strong className="text-white text-ellipsis overflow-hidden block whitespace-nowrap">{payload.manufacturers?.join(', ') || "SpaceX"}</strong>
                              </div>
                              <div className="col-span-2 md:col-span-3">
                                <span className="text-[9px] uppercase text-slate-400 block">Customers</span>
                                <strong className="text-white text-xs block truncate">{payload.customers?.join(', ') || "Commercial Carrier"}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 text-left font-mono text-xs space-y-1">
                        <div className="flex justify-between items-center text-xs text-slate-200 pb-1 pb-1 border-b border-slate-950/50">
                          <span>Consolidated Mass:</span>
                          <strong className="text-white">
                            {selectedLaunch?.payloads?.[0]?.mass_kg || selectedLaunch?.payload_mass_kg || "Payload Mass Pending"} kg
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-200">
                          <span>Target Injection Orbit:</span>
                          <strong className="text-white">
                            {selectedLaunch?.payloads?.[0]?.orbit || selectedLaunch?.payload_orbit || "LEO (Low Earth Orbit)"}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Static Fire check */}
                    {resolvedDetails?.staticFireDate && (
                      <div className="mt-3 text-[10px] font-mono text-slate-200 bg-slate-950/30 p-2.5 rounded border border-slate-800 flex justify-between items-center">
                        <span>Launch Campaign Static Fire:</span>
                        <span className="font-semibold text-cyan-300">SUCCESSFULLY COMPLETED ON {resolvedDetails.staticFireDate.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Reference Link Matrix */}
                  {resolvedDetails?.linksDetails && (
                    <div className="bg-slate-900/20 border border-slate-800/60 rounded-xl p-3 text-left w-full">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block mb-2 px-1">COMMUNICATION & INTEL PORTALS</span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {resolvedDetails.linksDetails.article && (
                          <a href={resolvedDetails.linksDetails.article} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 rounded flex items-center gap-1.5 font-mono text-[10px] text-slate-300 transition-colors uppercase no-underline hover:no-underline">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>Launch Article</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-auto text-slate-500" />
                          </a>
                        )}
                        {resolvedDetails.linksDetails.wikipedia && (
                          <a href={resolvedDetails.linksDetails.wikipedia} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 rounded flex items-center gap-1.5 font-mono text-[10px] text-slate-300 transition-colors uppercase no-underline hover:no-underline">
                            <Globe className="w-3.5 h-3.5 text-[#00e7ff]" />
                            <span>Wikipedia</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-auto text-slate-500" />
                          </a>
                        )}
                        {resolvedDetails.linksDetails.redditCampaign && (
                          <a href={resolvedDetails.linksDetails.redditCampaign} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#ff4500]/5 border border-[#ff4500]/20 hover:border-[#ff4500]/40 rounded flex items-center gap-1.5 font-mono text-[10px] text-[#ff4500]/90 transition-colors uppercase no-underline hover:no-underline">
                            <Globe className="w-3.5 h-3.5" />
                            <span>Reddit Campaign</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-auto" />
                          </a>
                        )}
                        {resolvedDetails.linksDetails.redditMedia && (
                          <a href={resolvedDetails.linksDetails.redditMedia} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 rounded flex items-center gap-1.5 font-mono text-[10px] text-slate-300 transition-colors uppercase no-underline hover:no-underline">
                            <Camera className="w-3.5 h-3.5 text-purple-400" />
                            <span>Reddit Media</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-auto text-slate-500" />
                          </a>
                        )}
                        {resolvedDetails.linksDetails.redditRecovery && (
                          <a href={resolvedDetails.linksDetails.redditRecovery} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 rounded flex items-center gap-1.5 font-mono text-[10px] text-slate-300 transition-colors uppercase no-underline hover:no-underline">
                            <Anchor className="w-3.5 h-3.5 text-blue-400" />
                            <span>Booster Thread</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-auto text-slate-500" />
                          </a>
                        )}
                        {selectedLaunch.links?.presskit && (
                          <a href={selectedLaunch.links.presskit} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-950/50 border border-slate-800 hover:border-cyan-500/30 rounded flex items-center gap-1.5 font-mono text-[10px] text-slate-300 transition-colors uppercase no-underline hover:no-underline">
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Press Kit</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-auto text-slate-500" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </section>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 font-mono text-center">
                Select a SpaceX mission from lists to load real-time telemetry.
              </div>
            )}
          </article>

          {/* Right Column: Upcoming Feed (Forward queue) */}
          <UpcomingMissionsPanel 
            loading={loading}
            filteredUpcoming={filteredUpcoming}
            selectedLaunch={selectedUpcomingLaunch}
            selectMission={selectMission}
          />

          {/* Bottom Grid Panels Row Removed per user request */}

        </section>

        {/* Navigation Tabs (File Cabinet Style) */}
        <div className="flex gap-2 sm:gap-4 mt-6 mb-[-16px] relative z-20 w-full" style={{ borderBottom: '1px solid rgba(0, 231, 255, 0.15)' }}>
          <button 
            onClick={() => {
              setLowerTab('news');
              setTimeout(() => document.getElementById('lower-features-area')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }} 
            className={`flex-1 flex items-center justify-center py-2 rounded-t-lg font-space text-[10px] sm:text-xs uppercase tracking-widest font-bold border-t border-l border-r transition-all ${
              lowerTab === 'news' 
                ? 'bg-[#0b101a] border-[#00e7ff]/30 text-[#00e7ff]' 
                : 'bg-[#121826] border-white/5 text-slate-400 hover:text-white/90 hover:bg-[#1a2235]'
            }`}
            style={{ marginBottom: '-1px' }}
          >
            Intelligence Feed
          </button>
          <button 
            onClick={() => {
              setLowerTab('giveaway');
              setTimeout(() => document.getElementById('lower-features-area')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }} 
            className={`flex-1 flex items-center justify-center py-2 rounded-t-lg font-space text-[10px] sm:text-xs uppercase tracking-widest font-bold border-t border-l border-r transition-all ${
              lowerTab === 'giveaway' 
                ? 'bg-[#0b101a] border-[#00e7ff]/30 text-[#00e7ff]' 
                : 'bg-[#121826] border-white/5 text-slate-400 hover:text-white/90 hover:bg-[#1a2235]'
            }`}
            style={{ marginBottom: '-1px' }}
          >
            Giveaways
          </button>
          <button 
            onClick={() => {
              setView('pro');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-t-lg font-space text-[10px] sm:text-xs uppercase tracking-widest font-bold border-t border-l border-r transition-all bg-[#121826] border-white/5 text-slate-400 hover:text-[#ff6b2b] hover:bg-[#1a2235]"
            style={{ marginBottom: '-1px' }}
          >
            <Lock size={12} />
            <span className="truncate">Tracker Pro</span>
          </button>
        </div>

        {/* Global Live Parameters Countdown Section */}
        <section className="panel countdown-panel mt-4 relative lg:static">
          <div className="scroll-panel-wrapper">
            <div className="telemetry-left-empty">
              <section className="dynamic-landings-header-module">
              <div className="dynamic-landings-inline-title">
                Dynamic Landings
                <span className="badge animate-pulse" style={{ display: "inline-block", fontSize: "9px", padding: "1px 4px", float: "right" }}>REPLAYS</span>
              </div>
              
              {/* Landing filters */}
              <div className="flex gap-1 items-center justify-between px-1 py-1 border-b border-white/5 bg-slate-950/40 mb-1 rounded-sm select-none">
                <select 
                  value={filterVehicle} 
                  onChange={(e) => setFilterVehicle(e.target.value)} 
                  className="py-1 px-1 bg-[#0a0f1d] border border-slate-800 rounded font-sans text-[9px] text-[#8fe9ff] focus:border-cyan-400 focus:ring-0 outline-none w-[48%]"
                  style={{ padding: "2px 4px" }}
                >
                  <option value="all">Vehicle: All</option>
                  <option value="Falcon 9">Falcon 9</option>
                  <option value="Falcon Heavy">Falcon Heavy</option>
                  <option value="Starship">Starship</option>
                </select>
                <select 
                  value={filterSuccess} 
                  onChange={(e) => setFilterSuccess(e.target.value)} 
                  className="py-1 px-1 bg-[#0a0f1d] border border-slate-800 rounded font-sans text-[9px] text-[#ff7a18] focus:border-amber-400 focus:ring-0 outline-none w-[48%]"
                  style={{ padding: "2px 4px" }}
                >
                  <option value="all">Status: All</option>
                  <option value="success">Landed</option>
                  <option value="fail">Off-nominal</option>
                </select>
              </div>

              <div className="dynamic-landings-header-feed">
                {/* Spotlight Card */}
                {filterVehicle === "all" && filterSuccess === "all" && (
                  <div 
                    className="p-1 px-1.5 mb-1.5 border border-amber-500/20 bg-amber-500/5 rounded text-left relative overflow-hidden flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(0,0,0,0.3))" }}
                  >
                    <span className="text-[7.5px] text-amber-400 font-mono tracking-widest font-bold uppercase block mb-0.5 animate-pulse">⭐ FEATURED REPLAY</span>
                    <button 
                      onClick={() => playLandingVideo(LANDING_VIDEOS[0])}
                      style={{ background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', cursor: 'pointer', outline: 'none' }}
                      className="w-full"
                    >
                      <strong className="text-[10px] text-amber-200 block truncate hover:text-cyan-400 transition-colors">
                        {LANDING_VIDEOS[0].title}
                      </strong>
                      <span className="text-[7.5px] text-slate-400 block mt-0.5 uppercase">
                        {LANDING_VIDEOS[0].landingType} • {LANDING_VIDEOS[0].booster}
                      </span>
                    </button>
                  </div>
                )}

                {LANDING_VIDEOS.filter(v => {
                  if (filterVehicle !== "all" && v.vehicle !== filterVehicle) return false;
                  if (filterSuccess !== "all") {
                    const wantsSuccess = filterSuccess === "success";
                    if (v.success !== wantsSuccess) return false;
                  }
                  return true;
                }).map((video) => {
                  const isLandingActive = activeLowerReplay?.id === video.id || activeLowerReplay?.video_id === video.id;
                  return (
                    <div
                      key={video.id}
                      className={`dynamic-landings-header-card ${isLandingActive ? 'active' : ''}`}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: isLandingActive ? "1px solid var(--cyan)" : "1px solid rgba(0, 231, 255, 0.10)",
                        background: isLandingActive ? "rgba(0, 231, 255, 0.08)" : "rgba(0, 0, 0, 0.22)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        margin: "0 0 3px 0",
                        padding: "4px 6px"
                      }}
                    >
                      <button 
                        onClick={() => playLandingVideo(video)} 
                        style={{ background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', flex: 1, overflow: 'hidden', cursor: 'pointer', outline: 'none' }}
                      >
                        <div className="flex justify-between items-center mr-1">
                          <span style={{ fontSize: "8px", color: "var(--cyan)", textTransform: "uppercase" }}>{video.type}</span>
                          <span className={`text-[7px] px-1 font-mono uppercase rounded-[2px] ${video.success ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                            {video.success ? "Landed" : "Off-Nom"}
                          </span>
                        </div>
                        <strong style={{ fontSize: "10px", color: "#eef8ff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{video.title}</strong>
                      </button>
                      <a 
                        href={`https://www.youtube.com/watch?v=${video.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ flexShrink: 0, padding: "4px", color: "var(--muted)" }}
                        title="Open YouTube Media Link in new tab"
                      >
                         <Tv size={12} className="hover:text-cyan-400 transition-colors" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          </div>

          <div className="countdown-core overflow-hidden relative border-l-0 border-r-0 sm:border-l sm:border-r border-slate-800/60 p-0 flex flex-col justify-start items-stretch min-h-[380px] h-auto">
            {/* Lower Middle Panel Header */}
            <div className="flex w-full items-center justify-between border-b border-white/5 px-3 py-2 bg-slate-950/40 shrink-0 select-none z-20">
              <span className="text-[8px] font-mono font-bold tracking-widest text-[#ff7a18] uppercase">CORE COMMAND</span>
              <span className="text-[8px] font-space font-bold tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-[3px]">
                MISSION DISPLAY
              </span>
            </div>

            {activeLowerReplay ? (
              <div className="w-full flex-1 flex flex-col justify-start text-left text-slate-100 font-sans text-xs relative z-10 select-none p-3 pr-4 space-y-3.5 core-display-scroller">
                  {/* Header Row */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
                    <div>
                      <span className="text-[7.5px] text-cyan-400 font-mono tracking-widest uppercase block font-semibold">
                        {activeLowerReplay.type === 'landing' ? 'DYNAMIC LANDING REPLAY' : 
                         activeLowerReplay.type === 'upcoming' ? 'UPCOMING MISSION DETAIL' : 'HISTORIC ARCHIVE DETAIL'}
                      </span>
                      <h3 className="font-space text-[11px] font-bold text-white tracking-wide truncate max-w-[210px] sm:max-w-[240px] mt-0.5" title={activeLowerReplay.title}>
                        {activeLowerReplay.title}
                      </h3>
                    </div>
                  </div>

                  {/* Embedded Webcast Player */}
                  {(activeLowerReplay.id || activeLowerReplay.video_id) ? (
                    <div className="relative aspect-video w-full rounded-md overflow-hidden border border-slate-900 bg-black flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                      <iframe 
                        src={`https://www.youtube.com/embed/${activeLowerReplay.id || activeLowerReplay.video_id}?autoplay=1&rel=0&modestbranding=1`} 
                        title="Lower Mission webcast player" 
                        allowFullScreen 
                        loading="lazy" 
                        className="w-full h-full border-0 absolute inset-0 z-10"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      ></iframe>
                    </div>
                  ) : (
                    <div className="relative aspect-video w-full rounded-md overflow-hidden border border-slate-800/40 bg-slate-950 flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-slate-500 font-mono text-[10px] p-4 text-center select-none">
                      <div className="fallback-art z-0 absolute inset-0 opacity-10 pointer-events-none"></div>
                      <Tv className="w-6 h-6 text-slate-600 mb-1.5 z-10 animate-pulse" />
                      <span className="text-slate-400 font-semibold uppercase tracking-wider z-10">Webcast Standby</span>
                      <span className="text-[8px] text-slate-500 mt-1 z-10">Live coverage will begin closer to launch time.</span>
                    </div>
                  )}

                  {/* Event Details */}
                  <div className="space-y-2.5">
                    <p className="text-[9.5px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded border border-white/5 font-sans">
                      {activeLowerReplay.details || "Launch operations, telemetry replay parameters, and historic webcast details."}
                    </p>

                    {/* Telemetry Matrix Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                      <div className="bg-slate-950/60 p-1.5 rounded border border-white/5 flex flex-col justify-between">
                        <span className="text-[7px] text-slate-400 uppercase font-mono tracking-wider block">VEHICLE</span>
                        <strong className="text-white font-semibold truncate mt-0.5">{activeLowerReplay.vehicle || "SpaceX Vehicle"}</strong>
                      </div>
                      <div className="bg-slate-950/60 p-1.5 rounded border border-white/5 flex flex-col justify-between">
                        <span className="text-[7px] text-slate-400 uppercase font-mono tracking-wider block">BOOSTER / CORE</span>
                        <strong className="text-amber-400 font-semibold truncate mt-0.5">{activeLowerReplay.booster || activeLowerReplay.coreSerial || "N/A"}</strong>
                      </div>
                      <div className="bg-slate-950/60 p-1.5 rounded border border-white/5 flex flex-col justify-between col-span-2">
                        <span className="text-[7px] text-slate-400 uppercase font-mono tracking-wider block">LAUNCH / LAND PAD</span>
                        <strong className="text-cyan-400 font-semibold truncate mt-0.5" title={activeLowerReplay.pad || activeLowerReplay.launchpad}>
                          {activeLowerReplay.pad || activeLowerReplay.launchpad || "N/A"}
                        </strong>
                      </div>
                    </div>

                    {/* Landing timeline Propulsion sequence */}
                    {activeLowerReplay.type === 'landing' && activeLowerReplay.timeline && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-[7.5px] text-slate-400 font-mono tracking-wider uppercase block font-semibold">
                          PROPULSION PROFILE SEQUENCE
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {activeLowerReplay.timeline.map((step: any, i: number) => (
                            <div 
                              key={i}
                              className="bg-slate-950/40 p-1.5 rounded border border-white/5 flex items-center justify-between gap-1 text-[7.5px] font-mono"
                            >
                              <span className="text-slate-400 truncate max-w-[70px] uppercase" title={step.label}>{step.label}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`w-1 h-1 rounded-full ${step.status === 'Nominal' ? 'bg-emerald-400 shadow-[0_0_4px_#10b981]' : step.status === 'Skipped' ? 'bg-slate-500' : 'bg-amber-500 animate-pulse'}`} />
                                <span className="text-slate-300 font-bold">{step.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
                  <div className="w-10 h-10 rounded-full border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center text-cyan-400">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-space text-xs font-bold text-white uppercase tracking-wider">No Replay Selected</h4>
                    <p className="text-[10px] text-slate-400 max-w-[200px] mt-1.5 leading-relaxed">
                      Select any video webcast from the **Dynamic Landings** or **Historic Landings** feeds to display full telemetry stats and webcast.
                    </p>
                  </div>
                </div>
              )}
          </div>

          <div className="scroll-panel-wrapper">
            <div className="telemetry-left-empty">
              <section className="dynamic-landings-header-module">
              <div className="dynamic-landings-inline-title">
                SpaceX Historic Events
                <span className="badge animate-pulse" style={{ display: "inline-block", fontSize: "9px", padding: "1px 4px", float: "right" }}>VIDEO ARCHIVE</span>
              </div>
              <div className="dynamic-landings-header-feed">
                {SPACEX_HISTORIC_EVENTS.map((event) => {
                  const isActive = activeLowerReplay?.id === event.id || activeLowerReplay?.video_id === event.video_id;
                  return (
                    <div
                      key={event.id}
                      className={`dynamic-landings-header-card ${isActive ? 'active' : ''}`}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: isActive ? "1px solid var(--cyan)" : "1px solid rgba(0, 231, 255, 0.10)",
                        background: isActive ? "rgba(0, 231, 255, 0.08)" : "rgba(0, 0, 0, 0.22)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        margin: "0 0 3px 0",
                        padding: "4px 6px"
                      }}
                    >
                      <button 
                        onClick={() => {
                          setActiveLowerReplay({ ...event, type: 'historic' });
                          addLog(`Loading historic flight archive webcast: ${event.title}`);
                        }}
                        style={{ background: 'none', border: 'none', padding: 0, margin: 0, textAlign: 'left', flex: 1, overflow: 'hidden', cursor: 'pointer', outline: 'none' }}
                      >
                        <span style={{ fontSize: "8px", color: "var(--cyan)", textTransform: "uppercase" }}>{event.date}</span>
                        <strong style={{ fontSize: "10px", color: isActive ? "var(--cyan)" : "#eef8ff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</strong>
                      </button>
                      <a 
                        href={`https://www.youtube.com/watch?v=${event.video_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ flexShrink: 0, padding: "4px", color: "var(--muted)" }}
                        title="Open YouTube Media Link in new tab"
                      >
                         <Tv size={12} className="hover:text-cyan-400 transition-colors" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          </div>
        </section>







        {/* Development News / Intelligence Briefings bento module */}
        
        <LowerFeaturesArea
          lowerTab={lowerTab}
          news={news}
          giveawayName={giveawayName}
          setGiveawayName={setGiveawayName}
          giveawayEmail={giveawayEmail}
          setGiveawayEmail={setGiveawayEmail}
          giveawayEntries={giveawayEntries}
          currentWinner={currentWinner}
          handleGiveawaySubmit={handleGiveawaySubmit}
          handleDrawWinner={handleDrawWinner}
          needsAuth={needsAuth}
          isLoggingIn={isLoggingIn}
          isBackingUp={isBackingUp}
          handleLogin={handleLogin}
          handleBackupToDrive={handleBackupToDrive}
        />
      </main>
    </div>
  );
}
