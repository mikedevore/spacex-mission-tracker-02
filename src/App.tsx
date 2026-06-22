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



// Client-side local storage cache helpers with a 10-minute TTL to respect API rate limits
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache lifetime

function getCachedData<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    const now = Date.now();
    if (now - item.timestamp < CACHE_TTL) {
      return item.data;
    }
  } catch (_) {
    // Graceful fail
  }
  return null;
}

function getStaleCachedData<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    return item.data;
  } catch (_) {
    // Graceful fail
  }
  return null;
}

function setCachedData<T>(key: string, data: T) {
  try {
    const item = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (_) {
    // Safely ignore space limits
  }
}

// Helper functions in sync with master requirements
function formatDate(value: string | number) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString([], { 
    year: "numeric", 
    month: "short", 
    day: "numeric", 
    hour: "numeric", 
    minute: "2-digit" 
  });
}

function normalizeYouTubeUrl(value: any): string {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  if (/^[A-Za-z0-9_-]{8,20}$/.test(raw) && !raw.includes("/") && !raw.includes(".")) {
    return `https://www.youtube.com/watch?v=${raw}`;
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/watch?v=${id}` : "";
    }

    if (url.hostname.includes("youtube.com")) {
      const watchId = url.searchParams.get("v");
      if (watchId) return `https://www.youtube.com/watch?v=${watchId}`;

      const embedMatch = url.pathname.match(/\/embed\/([A-Za-z0-9_-]+)/);
      if (embedMatch) return `https://www.youtube.com/watch?v=${embedMatch[1]}`;

      const shortsMatch = url.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/);
      if (shortsMatch) return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
    }
  } catch (error) {
    return "";
  }

  return "";
}

function youtubeUrl(launch: any): string {
  const fromId = normalizeYouTubeUrl(launch?.links?.youtube_id);
  if (fromId) return fromId;

  const fromWebcast = normalizeYouTubeUrl(launch?.links?.webcast);
  if (fromWebcast) return fromWebcast;

  const fromLL2 = normalizeYouTubeUrl(launch?.ll2?.webcast);
  if (fromLL2) return fromLL2;

  return "";
}

function extractYoutubeId(url: string | null | undefined): string {
  if (!url) return "";
  const normalized = normalizeYouTubeUrl(url);
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    return parsed.searchParams.get("v") || "";
  } catch (_) {
    return "";
  }
}

function patchImage(launch: any): string {
  return launch?.links?.patch?.large || launch?.links?.patch?.small || "";
}

function inferVehicle(name = "") {
  const n = name.toLowerCase();
  if (n.includes("starship") || n.includes("ift")) return "Starship";
  if (n.includes("heavy")) return "Falcon Heavy";
  return "Falcon 9";
}

function launchStatusLabel(mission: any) {
  if (mission.success === true) return "SUCCESS";
  if (mission.success === false) return "FAILURE";
  return (mission?.ll2?.status || mission?.rll?.status || "SCHEDULED").toUpperCase();
}

function launchSourceLabel(mission: any) {
  if (mission.rll) return "RocketLaunch.Live Backup";
  if (mission.ll2) return "Launch Library 2";
  return "SpaceXData Archive";
}

function missionRocketName(mission: any) {
  return mission?.ll2?.rocket || mission?.rll?.vehicle || mission?.rocket_name || "Falcon 9";
}

function missionPadName(mission: any) {
  return mission?.ll2?.padName || mission?.rll?.padName || mission?.launchpad_name || "SLC-40, Cape Canaveral";
}

// Epic Landing Videos with detailed telemetry summaries
const LANDING_VIDEOS = [
  {
    id: "YC87WmFN_As",
    title: "Starship Flight 5 Booster Catch",
    channel: "SpaceX",
    type: "Mechazilla Catch",
    booster: "B12 Super Heavy",
    vehicle: "Starship",
    mission: "Flight 5",
    date: "2024-10-13",
    success: true,
    pad: "Launch Mount - Starbase, TX",
    weather: "Clear, wind 4 km/h",
    featured: true,
    landingType: "Mechazilla Tower Catch",
    timeline: [
      { id: "ascent", label: "Ascent Profile", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Hot-Stage Separation", status: "Nominal", time: "T+ 2:42" },
      { id: "boostback", label: "Boostback Burn", status: "Nominal", time: "T+ 3:05" },
      { id: "entry_burn", label: "Entry Burn", status: "Nominal", time: "T+ 6:40" },
      { id: "landing_burn", label: "Landing Burn Init", status: "Nominal", time: "T+ 7:31" },
      { id: "touchdown", label: "Super Heavy Tower Capture", status: "Nominal", time: "T+ 7:45" }
    ]
  },
  {
    id: "LHqLz9ni0Bo",
    title: "Falcon 9 Onboard Droneship Landing",
    channel: "SpaceX",
    type: "Onboard Droneship",
    booster: "B1046 Block 5",
    vehicle: "Falcon 9",
    mission: "Telstar 19V",
    date: "2018-07-22",
    success: true,
    pad: "Of Course I Still Love You (ASDS)",
    weather: "Moderate swells, misty",
    featured: false,
    landingType: "ASDS Sea Landing",
    timeline: [
      { id: "ascent", label: "Liftoff & Ascent", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:33" },
      { id: "boostback", label: "No Boostback (Downrange)", status: "Skipped", time: "N/A" },
      { id: "entry_burn", label: "Entry Burn Execution", status: "Nominal", time: "T+ 6:15" },
      { id: "landing_burn", label: "Single Engine Landing Burn", status: "Nominal", time: "T+ 8:08" },
      { id: "touchdown", label: "ASDS Deck Touchdown", status: "Nominal", time: "T+ 8:31" }
    ]
  },
  {
    id: "lXgLyCYuYA4",
    title: "CRS-8: First Successful Sea Landing",
    channel: "SpaceX",
    type: "Historic Droneship",
    booster: "B1021.1",
    vehicle: "Falcon 9",
    mission: "CRS-8",
    date: "2016-04-08",
    success: true,
    pad: "Of Course I Still Love You (ASDS)",
    weather: "Calm sea swell, light breeze",
    featured: false,
    landingType: "ASDS Sea Landing",
    timeline: [
      { id: "ascent", label: "Ascent Profile", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:30" },
      { id: "boostback", label: "Partial Boostback", status: "Nominal", time: "T+ 2:45" },
      { id: "entry_burn", label: "Atmospheric Entry Burn", status: "Nominal", time: "T+ 6:45" },
      { id: "landing_burn", label: "Landing Burn Init", status: "Nominal", time: "T+ 8:12" },
      { id: "touchdown", label: "Historic ASDS Touchdown", status: "Nominal", time: "T+ 8:35" }
    ]
  },
  {
    id: "Z4TXCZG_NEY",
    title: "Falcon Heavy Test Flight Dual Landing",
    channel: "SpaceX",
    type: "LZ-1 & LZ-2",
    booster: "B1023.1 & B1025.1",
    vehicle: "Falcon Heavy",
    mission: "Demo Flight",
    date: "2018-02-06",
    success: true,
    pad: "Landing Zone 1 & 2 (Ground)",
    weather: "Optimal, light crosswinds",
    featured: true,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Ascent Profile", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Dual Booster Separation", status: "Nominal", time: "T+ 2:33" },
      { id: "boostback", label: "Dual Boostback Burn", status: "Nominal", time: "T+ 3:11" },
      { id: "entry_burn", label: "Dual Entry Burn", status: "Nominal", time: "T+ 6:42" },
      { id: "landing_burn", label: "Dual Landing Burn", status: "Nominal", time: "T+ 7:58" },
      { id: "touchdown", label: "Synchronized Ground Landing", status: "Nominal", time: "T+ 8:15" }
    ]
  },
  {
    id: "wbSwFU6tY1c",
    title: "Falcon 9 First Stage LZ-1 Landing",
    channel: "SpaceX",
    type: "Historic LZ-1",
    booster: "B1019.1",
    vehicle: "Falcon 9",
    mission: "Orbcomm-2",
    date: "2015-12-21",
    success: true,
    pad: "Landing Zone 1 - Cape Canaveral",
    weather: "Clear, pristine nighttime",
    featured: false,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Liftoff & Ascent", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:24" },
      { id: "boostback", label: "Full Boostback Burn", status: "Nominal", time: "T+ 2:48" },
      { id: "entry_burn", label: "Atmospheric Entry Burn", status: "Nominal", time: "T+ 8:00" },
      { id: "landing_burn", label: "Landing Burn Init", status: "Nominal", time: "T+ 9:32" },
      { id: "touchdown", label: "Historic Ground Touchdown", status: "Nominal", time: "T+ 9:44" }
    ]
  },
  {
    id: "1_FXVjqZIQM",
    title: "SAOCOM 1A West Coast Landing",
    channel: "SpaceX",
    type: "LZ-4 Landing",
    booster: "B1048.1",
    vehicle: "Falcon 9",
    mission: "SAOCOM 1A",
    date: "2018-10-08",
    success: true,
    pad: "Landing Zone 4 - Vandenberg",
    weather: "Mild fog, low visibility",
    featured: false,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Ascent Profile", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:20" },
      { id: "boostback", label: "RTLS Boostback", status: "Nominal", time: "T+ 2:38" },
      { id: "entry_burn", label: "Atmospheric Entry Burn", status: "Nominal", time: "T+ 6:02" },
      { id: "landing_burn", label: "Center-Engine Landing Burn", status: "Nominal", time: "T+ 7:38" },
      { id: "touchdown", label: "Vandenberg Ground Touchdown", status: "Nominal", time: "T+ 7:45" }
    ]
  },
  {
    id: "OnoNITE-clc",
    title: "Falcon 9 Transporter-2 Landing",
    channel: "SpaceX",
    type: "LZ-1 Landing",
    booster: "B1060.8",
    vehicle: "Falcon 9",
    mission: "Transporter-2",
    date: "2021-06-30",
    success: true,
    pad: "Landing Zone 1 - Cape Canaveral",
    weather: "Scattered clouds, humid",
    featured: false,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Ascent Profile", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:28" },
      { id: "boostback", label: "Boostback Burn", status: "Nominal", time: "T+ 2:44" },
      { id: "entry_burn", label: "Atmospheric Entry", status: "Nominal", time: "T+ 6:21" },
      { id: "landing_burn", label: "Propulsive Deceleration", status: "Nominal", time: "T+ 7:51" },
      { id: "touchdown", label: "LZ-1 Ground Touchdown", status: "Nominal", time: "T+ 8:04" }
    ]
  },
  {
    id: "sB_nEtZxPOA",
    title: "Starship SN15 High-Altitude Landing",
    channel: "SpaceX",
    type: "Starship Landing",
    booster: "SN15 Upper Stage",
    vehicle: "Starship",
    mission: "SN15 Test Flight",
    date: "2021-05-05",
    success: true,
    pad: "Starbase Landing Pad, TX",
    weather: "Breezy gulf winds",
    featured: false,
    landingType: "Starbase Pad Ground touchdown",
    timeline: [
      { id: "ascent", label: "Raptor Powered Ascent", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Sequential Engine Cutdowns", status: "Nominal", time: "T+ 4:15" },
      { id: "boostback", label: "Bellyflop Descent Control", status: "Nominal", time: "T+ 5:20" },
      { id: "entry_burn", label: "Aerodynamic Maneuver", status: "Nominal", time: "T+ 5:45" },
      { id: "landing_burn", label: "Raptor Flip-up & Gimbals", status: "Nominal", time: "T+ 5:58" },
      { id: "touchdown", label: "Touchdown and Venting", status: "Nominal", time: "T+ 6:08" }
    ]
  },
  {
    id: "bvim4rsNHkQ",
    title: "Falcon Heavy Arabsat-6A Landing",
    channel: "SpaceX",
    type: "LZ-1 & LZ-2",
    booster: "B1052 & B1053 Side Boosters",
    vehicle: "Falcon Heavy",
    mission: "Arabsat-6A",
    date: "2019-04-11",
    success: true,
    pad: "Landing Zone 1 & 2 (Ground)",
    weather: "Cool, crystal clear night",
    featured: false,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Maximum Dynamic Pressure", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Dual Booster Separation", status: "Nominal", time: "T+ 2:38" },
      { id: "boostback", label: "Synchronized Boostback Burn", status: "Nominal", time: "T+ 3:20" },
      { id: "entry_burn", label: "Booster Atmospheric Entry", status: "Nominal", time: "T+ 6:48" },
      { id: "landing_burn", label: "Parallel Ground Land Burn", status: "Nominal", time: "T+ 8:02" },
      { id: "touchdown", label: "Perfect Dual Touchdown", status: "Nominal", time: "T+ 8:17" }
    ]
  },
  {
    id: "pYHQCxXIt3M",
    title: "Starship Flight 6 Super Heavy Catch",
    channel: "SpaceX",
    type: "Mechazilla Catch",
    booster: "B13 Super Heavy",
    vehicle: "Starship",
    mission: "Flight 6",
    date: "2024-11-19",
    success: false,
    pad: "Gulf of Mexico (Water Soft Catch)",
    weather: "Sunset, overcast, choppy waters",
    featured: false,
    landingType: "Water Catch (Catch Abort)",
    timeline: [
      { id: "ascent", label: "Super Heavy Ascent Boost", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Hot-Stage Separation", status: "Nominal", time: "T+ 2:40" },
      { id: "boostback", label: "Boostback Burn", status: "Nominal", time: "T+ 2:50" },
      { id: "entry_burn", label: "Entry Burn Segment", status: "Nominal", time: "T+ 6:23" },
      { id: "landing_burn", label: "Booster Catch Abort Decided", status: "Aborted", time: "T+ 7:00" },
      { id: "touchdown", label: "Indian Ocean Soft Splashdown", status: "Loss of Booster", time: "T+ 7:15" }
    ]
  },
  {
    id: "A0FZIwabctw",
    title: "Falcon 9 NROL-108 Landing",
    channel: "SpaceX",
    type: "LZ-1 Landing",
    booster: "B1059.5",
    vehicle: "Falcon 9",
    mission: "NROL-108",
    date: "2020-12-19",
    success: true,
    pad: "Landing Zone 1 - Cape Canaveral",
    weather: "Windy, heavy overcast",
    featured: false,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Asymmetrical Ascent", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:18" },
      { id: "boostback", label: "RTLS Boostback", status: "Nominal", time: "T+ 2:32" },
      { id: "entry_burn", label: "Re-entry Burn Profile", status: "Nominal", time: "T+ 5:54" },
      { id: "landing_burn", label: "Single Engine Landing", status: "Nominal", time: "T+ 8:05" },
      { id: "touchdown", label: "LZ-1 Ground Touchdown", status: "Nominal", time: "T+ 8:15" }
    ]
  },
  {
    id: "C3b2ZqS3X8Y",
    title: "Falcon 9 Crew-1 Landing",
    channel: "SpaceX",
    type: "Droneship Catch",
    booster: "B1061.1",
    vehicle: "Falcon 9",
    mission: "Crew-1",
    date: "2020-11-15",
    success: true,
    pad: "Just Read the Instructions (ASDS)",
    weather: "Breezy night sea state",
    featured: false,
    landingType: "ASDS Sea Landing",
    timeline: [
      { id: "ascent", label: "Manned Ascent Profile", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:36" },
      { id: "boostback", label: "Downrange Descent Coast", status: "Skipped", time: "N/A" },
      { id: "entry_burn", label: "Atmospheric Re-entry", status: "Nominal", time: "T+ 6:30" },
      { id: "landing_burn", label: "Plume Interaction Burn", status: "Nominal", time: "T+ 8:43" },
      { id: "touchdown", label: "Night Droneship Touchdown", status: "Nominal", time: "T+ 9:02" }
    ]
  },
  {
    id: "7v4k22WpWvo",
    title: "Falcon 9 GPS III SV04 Landing",
    channel: "SpaceX",
    type: "Droneship Catch",
    booster: "B1062.1",
    vehicle: "Falcon 9",
    mission: "GPS III SV04",
    date: "2020-11-05",
    success: true,
    pad: "Of Course I Still Love You (ASDS)",
    weather: "Overcast, slight waves",
    featured: false,
    landingType: "ASDS Sea Landing",
    timeline: [
      { id: "ascent", label: "High Energy Ascent", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Stage Separation", status: "Nominal", time: "T+ 2:42" },
      { id: "boostback", label: "Ascent Coast", status: "Skipped", time: "N/A" },
      { id: "entry_burn", label: "Dense Entry Burn", status: "Nominal", time: "T+ 6:41" },
      { id: "landing_burn", label: "Gimbal Ring Correction", status: "Nominal", time: "T+ 8:14" },
      { id: "touchdown", label: "Precision Sea Landing", status: "Nominal", time: "T+ 8:36" }
    ]
  },
  {
    id: "0a_00nJ_Y88",
    title: "Starship Flight 4 Splashdown",
    channel: "SpaceX",
    type: "Ocean Splashdown",
    booster: "B11 Super Heavy",
    vehicle: "Starship",
    mission: "Flight 4",
    date: "2024-06-06",
    success: true,
    pad: "Gulf of Mexico (Virtual Pad)",
    weather: "Heavy fog, clear waves",
    featured: false,
    landingType: "Soft Sea-Contact Splashdown",
    timeline: [
      { id: "ascent", label: "Super Heavy Booster Launch", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Hot-Staging Cutover", status: "Nominal", time: "T+ 2:40" },
      { id: "boostback", label: "Booster Boostback Burn", status: "Nominal", time: "T+ 3:12" },
      { id: "entry_burn", label: "Booster Entry Burn", status: "Nominal", time: "T+ 6:43" },
      { id: "landing_burn", label: "Trans-Landing Burn", status: "Nominal", time: "T+ 7:22" },
      { id: "touchdown", label: "Precision Hover Splashdown", status: "Nominal", time: "T+ 7:31" }
    ]
  },
  {
    id: "xYWzF_1d7A8",
    title: "Falcon 9 Sentinel-6 Michael Freilich Landing",
    channel: "SpaceX",
    type: "Vandenberg LZ-4",
    booster: "B1063.1",
    vehicle: "Falcon 9",
    mission: "Sentinel-6",
    date: "2020-11-21",
    success: true,
    pad: "Landing Zone 4 - Vandenberg SFB",
    weather: "Clear, pristine coastal winds",
    featured: false,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Pacific Orbit Path", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Inertial Separation", status: "Nominal", time: "T+ 2:24" },
      { id: "boostback", label: "Propulsive Reverse Burn", status: "Nominal", time: "T+ 2:45" },
      { id: "entry_burn", label: "Braking Core Burn", status: "Nominal", time: "T+ 6:13" },
      { id: "landing_burn", label: "Final Gravity Descent", status: "Nominal", time: "T+ 8:12" },
      { id: "touchdown", label: "LZ-4 Ground Touchdown", status: "Nominal", time: "T+ 8:27" }
    ]
  },
  {
    id: "_T74T7yPIfc",
    title: "Falcon Heavy USSF-44 Dual Landing",
    channel: "SpaceX",
    type: "LZ-1 & LZ-2",
    booster: "B1064 & B1065 Side Boosters",
    vehicle: "Falcon Heavy",
    mission: "USSF-44",
    date: "2022-11-01",
    success: true,
    pad: "Landing Zone 1 & 2 (Ground)",
    weather: "Overcast, slight tailwinds",
    featured: false,
    landingType: "RTLS Ground landing",
    timeline: [
      { id: "ascent", label: "Classified Profile Ascent", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Dual Booster Separation", status: "Nominal", time: "T+ 2:30" },
      { id: "boostback", label: "Dual Booster RTLS Ignite", status: "Nominal", time: "T+ 3:00" },
      { id: "entry_burn", label: "Simultaneous Core Braking", status: "Nominal", time: "T+ 6:35" },
      { id: "landing_burn", label: "Dual 3-Engine Retardation", status: "Nominal", time: "T+ 8:05" },
      { id: "touchdown", label: "Simultaneous LZ Touchdown", status: "Nominal", time: "T+ 8:22" }
    ]
  },
  {
    id: "ru1A11lmbA4",
    title: "Falcon 9 Iridium-1 Landing",
    channel: "SpaceX",
    type: "West Coast LZ",
    booster: "B1029.2",
    vehicle: "Falcon 9",
    mission: "Iridium-1",
    date: "2017-01-14",
    success: true,
    pad: "Just Read the Instructions (ASDS)",
    weather: "Heavy fog, medium waves",
    featured: false,
    landingType: "ASDS Sea Landing",
    timeline: [
      { id: "ascent", label: "Polar Route Liftoff", status: "Nominal", time: "T+ 0:00" },
      { id: "stage_sep", label: "Pristine Stage Separation", status: "Nominal", time: "T+ 2:27" },
      { id: "boostback", label: "Downrange Drift Phase", status: "Skipped", time: "N/A" },
      { id: "entry_burn", label: "Core Plume Braking", status: "Nominal", time: "T+ 6:21" },
      { id: "landing_burn", label: "Center-Engine Capture Spark", status: "Nominal", time: "T+ 8:14" },
      { id: "touchdown", label: "Pacific ASDS Sea Touchdown", status: "Nominal", time: "T+ 8:26" }
    ]
  }
];

const SPACEX_HISTORIC_EVENTS = [
  {
    id: "hist-starship-flight12",
    title: "Starship Flight 12 Dual Catch",
    date: "May 10, 2026",
    dateUtc: "2026-05-10T13:40:00.000Z",
    video_id: "YC87WmFN_As",
    vehicle: "Starship & Super Heavy V2",
    launchpad: "Starbase OLP-1, Boca Chica, TX",
    details: "Demonstrating full rapid reusability, Flight 12 achieved the unprecedented milestone of catching both the Super Heavy booster and the Starship upper stage back at the launch mount.",
    coreSerial: "B20 Booster & S36 Ship",
    flightNum: 2,
    reused: true,
    landingType: "Mechazilla Tower Catch"
  },
  {
    id: "hist-starship-flight11",
    title: "Starship Flight 11 Orbital Transfer",
    date: "Feb 22, 2026",
    dateUtc: "2026-02-22T14:00:00.000Z",
    video_id: "pYHQCxXIt3M",
    vehicle: "Starship & Super Heavy V2",
    launchpad: "Starbase OLP-1, Boca Chica, TX",
    details: "Flight 11 marked a major step towards Artemis by completing an orbital propellant transfer demonstration between Starship and a target vehicle.",
    coreSerial: "B18 Booster & S33 Ship",
    flightNum: 1,
    reused: false,
    landingType: "Mechazilla Tower Catch"
  },
  {
    id: "hist-starship-flight10",
    title: "Starship Flight 10 Payload Deployment",
    date: "Nov 30, 2025",
    dateUtc: "2025-11-30T13:15:00.000Z",
    video_id: "0a_00nJ_Y88",
    vehicle: "Starship & Super Heavy V1",
    launchpad: "Starbase OLP-1, Boca Chica, TX",
    details: "Flight 10 successfully opened its payload bay door in orbit, deploying the first batch of full-scale Starlink V2 satellites before re-entering the atmosphere.",
    coreSerial: "B17 Booster & S31 Ship",
    flightNum: 2,
    reused: true,
    landingType: "Mechazilla Tower Catch"
  },
  {
    id: "hist-starship-flight9",
    title: "Starship Flight 9 Dual Ship Catch Attempt",
    date: "Aug 15, 2025",
    dateUtc: "2025-08-15T12:00:00.000Z",
    video_id: "YC87WmFN_As",
    vehicle: "Starship & Super Heavy V1",
    launchpad: "Starbase OLP-1, Boca Chica, TX",
    details: "Flight 9 featured a full orbital profile and the first attempt to catch the Starship upper stage, paving the way for complete rapid reusability.",
    coreSerial: "B16 Booster & S30 Ship",
    flightNum: 1,
    reused: false,
    landingType: "Mechazilla Tower Catch"
  },
  {
    id: "hist-crew9",
    title: "Crew-9: ISS Expedition 72/73",
    date: "Sep 28, 2024",
    dateUtc: "2024-09-28T17:17:00.000Z",
    video_id: "7B_Wty9r4p4",
    vehicle: "Falcon 9 Block 5 (Crew Dragon Freedom)",
    launchpad: "SLC-40, Cape Canaveral, FL",
    details: "Crew-9 launched to the International Space Station, notable for launching from SLC-40 for the first time for a crewed mission and returning two Starliner astronauts.",
    coreSerial: "B1085",
    flightNum: 2,
    reused: true,
    landingType: "LZ-1 Ground Landing"
  },
  {
    id: "hist-polaris-dawn",
    title: "Polaris Dawn: First Commercial Spacewalk",
    date: "Sep 12, 2024",
    dateUtc: "2024-09-12T10:12:00.000Z",
    video_id: "7B_Wty9r4p4",
    vehicle: "Falcon 9 Block 5 (Crew Dragon Resilience)",
    launchpad: "LC-39A, Kennedy Space Center, FL",
    details: "The Polaris Dawn mission achieved the highest Earth orbit since the Apollo program and conducted the first-ever commercial Extravehicular Activity (EVA), using newly designed SpaceX EVA suits.",
    coreSerial: "B1083",
    flightNum: 4,
    reused: true,
    landingType: "Just Read the Instructions"
  },
  {
    id: "hist-crew8",
    title: "Crew-8: ISS Expedition 71",
    date: "Mar 3, 2024",
    dateUtc: "2024-03-03T03:53:00.000Z",
    video_id: "bnqqOBrPucA",
    vehicle: "Falcon 9 Block 5 (Crew Dragon Endeavour)",
    launchpad: "LC-39A, Kennedy Space Center, FL",
    details: "Crew-8 carried four astronauts to the International Space Station for a six-month science mission, marking the eighth operational crew flight for NASA.",
    coreSerial: "B1083",
    flightNum: 1,
    reused: false,
    landingType: "LZ-1 Ground Landing"
  },
  {
    id: "hist-starship-flight5",
    title: "Starship Flight 5 Tower Catch",
    date: "Oct 13, 2024",
    dateUtc: "2024-10-13T12:25:00.000Z",
    video_id: "YC87WmFN_As",
    vehicle: "Starship & Super Heavy B12",
    launchpad: "Starbase OLP-1, Boca Chica, TX",
    details: "During the Starship Flight 5 campaign, SpaceX achieved a breathtaking world-first by catching the 232-foot-tall Super Heavy booster back at the launch mount using the tower's 'Mechazilla' chopstick arms.",
    coreSerial: "B12 Booster",
    flightNum: 1,
    reused: false,
    landingType: "Mechazilla Tower Catch"
  },
  {
    id: "hist-crew1",
    title: "Crew-1: First Operational Crew Mission",
    date: "Nov 15, 2020",
    dateUtc: "2020-11-15T00:27:00.000Z",
    video_id: "bnqqOBrPucA",
    vehicle: "Falcon 9 Block 5 (Crew Dragon Resilience)",
    launchpad: "LC-39A, Kennedy Space Center, FL",
    details: "Following the successful Demo-2 test flight, Crew-1 marked the first operational crewed flight of the Dragon spacecraft, carrying four astronauts to the ISS for a full-duration six-month science mission.",
    coreSerial: "B1061",
    flightNum: 1,
    reused: false,
    landingType: "Just Read the Instructions"
  },
  {
    id: "hist-demo2",
    title: "Demo-2 First Crewed Flight",
    date: "May 30, 2020",
    dateUtc: "2020-05-30T19:22:00.000Z",
    video_id: "bZOPV5pU_bY",
    vehicle: "Falcon 9 Block 5 (Crew Dragon)",
    launchpad: "LC-39A, Kennedy Space Center, FL",
    details: "SpaceX successfully launched NASA astronauts Bob Behnken and Doug Hurley on Demo-2, restoring domestic astronaut launch capability to American soil for the first time since the Space Shuttle's retirement in 2011.",
    coreSerial: "B1058",
    flightNum: 1,
    reused: false,
    landingType: "Of Course I Still Love You"
  },
  {
    id: "hist-falconheavy-test",
    title: "Falcon Heavy Maiden Test Flight",
    date: "Feb 6, 2018",
    dateUtc: "2018-02-06T20:45:00.000Z",
    video_id: "Z4TXCZG_NEY",
    vehicle: "Falcon Heavy (B1033 / B1023 / B1025)",
    launchpad: "LC-39A, Kennedy Space Center, FL",
    details: "The highly anticipated inaugural launch of Falcon Heavy lifted Elon Musk's cherry red Tesla Roadster dummy payload into a heliocentric helio-orbit, featuring the famous synchronized dual landing of the side boosters at Landing Zones 1 and 2.",
    coreSerial: "B1023 / B1025 side boosters",
    flightNum: 2,
    reused: true,
    landingType: "LZ-1 & LZ-2 Dual Landing"
  },
  {
    id: "hist-arabsat6a",
    title: "Falcon Heavy: Arabsat-6A Triple Landing",
    date: "Apr 11, 2019",
    dateUtc: "2019-04-11T22:35:00.000Z",
    video_id: "TXMGu2d8c8g",
    vehicle: "Falcon Heavy (B1055/B1052/B1053)",
    launchpad: "LC-39A, Kennedy Space Center, FL",
    details: "The first commercial deployment for Falcon Heavy marked a massive milestone when both side boosters landed successfully at LZ-1 and LZ-2, shortly followed by the center core landing on the drone ship Of Course I Still Love You.",
    coreSerial: "B1055 (Center Core)",
    flightNum: 1,
    reused: false,
    landingType: "LZ-1, LZ-2, and OCISLY Drone Ship"
  },
  {
    id: "hist-sn15-landing",
    title: "Starship SN15 High-Altitude Landing",
    date: "May 5, 2021",
    dateUtc: "2021-05-05T22:24:00.000Z",
    video_id: "sB_nEtZxPOA",
    vehicle: "Starship Prototype SN15",
    launchpad: "Starbase Suborbital Pad A, TX",
    details: "Following several explosive suborbital flight lessons, Starship SN15 successfully launched to 10 km altitude, performed a belly-flop descent maneuver using aerodynamic flaps, and ignited three Raptor engines to achieve a perfect touchdown at Boca Chica.",
    coreSerial: "SN15 Prototype",
    flightNum: 1,
    reused: false,
    landingType: "Starbase Landing Pad"
  },
  {
    id: "hist-orbcomm2",
    title: "Orbcomm-2: First Ever Booster Return",
    date: "Dec 21, 2015",
    dateUtc: "2015-12-21T18:33:00.000Z",
    video_id: "ZCBE8ocOkAQ",
    vehicle: "Falcon 9 v1.1 Full Thrust",
    launchpad: "SLC-40, Cape Canaveral, FL",
    details: "SpaceX accomplished one of the most critical feats in reusable rocketry by returning the Falcon 9 Orbcomm-2 first stage back to earth for a ground landing at Landing Zone 1, verifying full booster reuse economics.",
    coreSerial: "B1019 First Lander",
    flightNum: 1,
    reused: false,
    landingType: "Landing Zone 1 Ground Touchdown"
  },
  {
    id: "hist-crs8",
    title: "CRS-8 First Drone Ship Sea landing",
    date: "Apr 8, 2016",
    dateUtc: "2016-04-08T18:33:00.000Z",
    video_id: "lXgLyCYuYA4",
    vehicle: "Falcon 9 v1.1 FT",
    launchpad: "SLC-40, Cape Canaveral, FL",
    details: "After multiple near-miss attempts, booster B1021 landed upright on the drone ship 'Of Course I Still Love You' during the CRS-8 mission, completing the first successful ocean recovery in history.",
    coreSerial: "B1021",
    flightNum: 1,
    reused: false,
    landingType: "OCISLY Ocean Recovery"
  },
  {
    id: "hist-falcon1-flight4",
    title: "Falcon 1 Flight 4 Maiden Success",
    date: "Sep 28, 2008",
    dateUtc: "2008-09-28T19:15:00.000Z",
    video_id: "dLQ5xgWyX_k",
    vehicle: "Falcon 1 Flight 4",
    launchpad: "Omelek Island, Kwajalein Atoll",
    details: "Facing complete corporate ruin, Elon Musk's small engineering crew successfully launched the fourth Falcon 1 vehicle into a stable orbit, creating the world's first liquid-propellant orbital rocket funded entirely by private enterprise.",
    coreSerial: "Falcon 1 Merlins",
    flightNum: 1,
    reused: false,
    landingType: "No Recovery Attempt (Expended)"
  },
  {
    id: "hist-inspiration4",
    title: "Inspiration4: All-Civilian Spaceflight",
    date: "Sep 15, 2021",
    dateUtc: "2021-09-15T22:02:00.000Z",
    video_id: "3pvDF_o3sc0",
    vehicle: "Falcon 9 Block 5 (Crew Dragon)",
    launchpad: "LC-39A, Kennedy Space Center, FL",
    details: "Inspiration4 flew four civilian crew members on a custom high-altitude orbital vacation without professional government pilots, raising hundreds of millions for pediatric cancer research and proving civilian space accessibility.",
    coreSerial: "B1062",
    flightNum: 3,
    reused: true,
    landingType: "Just Read the Instructions"
  },
  {
    id: "hist-starship-flight4",
    title: "Starship Flight 4 Ocean Splashdown",
    date: "Jun 6, 2024",
    dateUtc: "2024-06-06T12:50:00.000Z",
    video_id: "0a_00nJ_Y88",
    vehicle: "Starship & Super Heavy B11",
    launchpad: "Starbase OLP-1, Boca Chica, TX",
    details: "Starship completed its entire orbital test campaign, surviving severe atmospheric re-entry friction despite significant side flap erosion, and successfully executing a soft horizontal flip and vertical splashdown in the Indian Ocean.",
    coreSerial: "B11 Booster & S29 Ship",
    flightNum: 1,
    reused: false,
    landingType: "Indian Ocean soft sea-contact"
  }
];

function missionLandingSummary(mission: any) {
  if (!Array.isArray(mission.cores) || !mission.cores.length) return "Landing data pending";

  const core = mission.cores[0];

  if (core.land_success === true) {
    return `SUCCESS • ${core.landing_type || "Landing"} • ${core.landing_pad || "Pad Unknown"}`;
  }

  if (core.land_success === false) {
    return `FAILED • ${core.landing_type || "Landing"} • ${core.landing_pad || "Pad Unknown"}`;
  }

  return "Landing data pending";
}

// Local Fallback Data for Upcoming Launches in case of API speed latency or limits
const FALLBACK_UPCOMING = [
  {
    id: "starship-flight-6",
    name: "Starship Flight 6",
    date_utc: "2026-06-18T21:00:00.000Z",
    details: "Sixth test flight of the combined Starship and Super Heavy vehicle, targeting booster catch at Starbase and orbital stage ocean landing.",
    rocket_name: "Starship",
    launchpad_name: "Starbase OLP-1",
    upcoming: true,
    flight_number: 160,
    links: {
      patch: { large: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&q=80&w=400" },
      webcast: "https://www.youtube.com/watch?v=l_g2s8mIWeQ"
    }
  },
  {
    id: "crew-10",
    name: "Crew-10 (USCV-10)",
    date_utc: "2026-07-31T09:12:00.000Z",
    details: "SpaceX Crew-10 mission is scheduled to launch four crew members to the Area Orbit aboard a Crew Dragon spacecraft.",
    rocket_name: "Falcon 9 Block 5",
    launchpad_name: "LC-39A, Kennedy Space Center",
    upcoming: true,
    flight_number: 161,
    links: {
      patch: { large: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&q=80&w=400" },
      webcast: "https://www.youtube.com/watch?v=OnoNITE-CLg"
    }
  },
  {
    id: "starlink-12-1",
    name: "Starlink Group 12-1",
    date_utc: "2026-05-30T14:45:00.000Z",
    details: "SpaceX Falcon 9 will launch a batch of Starlink v2-mini satellites into low Earth orbit to expand internet coverage.",
    rocket_name: "Falcon 9 Block 5",
    launchpad_name: "SLC-40, Cape Canaveral",
    upcoming: true,
    flight_number: 162,
    links: {
      patch: { large: "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&q=80&w=400" },
      webcast: "https://www.youtube.com/watch?v=F3G8Dclg8eI"
    }
  }
];

// Local Fallback Data for aerospace blogs
const FALLBACK_NEWS = [
  {
    id: 1,
    title: "SpaceX Super Heavy Catch on Second Attempt Redefines Flight Reuse",
    news_site: "NASA Spaceflight",
    published_at: "2026-05-15T12:00:00.000Z",
    summary: "SpaceX has successfully caught the Super Heavy booster back at the launch tower during Flight 5, marking a monumental milestone in rocket reuse and fast-cycle flights.",
    url: "https://www.spacex.com/"
  },
  {
    id: 2,
    title: "Falcon Heavy Launches GOES-U Next-Gen Weather Satellite",
    news_site: "Spaceflight Now",
    published_at: "2026-05-12T18:30:00.000Z",
    summary: "A SpaceX Falcon Heavy successfully placed NOAA's advanced weather satellite into geostationary transfer orbit with dual booster recovery at Kennedy Space Center.",
    url: "https://www.spacex.com/"
  },
  {
    id: 3,
    title: "Starlink Surpasses 8 Million Subscribers Globally, Falcon 9 Fleet Expands",
    news_site: "Teslarati",
    published_at: "2026-05-09T09:15:00.000Z",
    summary: "With weekly Falcon launches, SpaceX’s satellite internet constellation Starlink now connects over eight million active users across more than 85 countries.",
    url: "https://www.spacex.com/"
  },
  {
    id: 4,
    title: "Starship Flight 6 Operational Targets Approved by FAA for Summer Launch",
    news_site: "Aerospace America",
    published_at: "2026-05-08T14:20:00.000Z",
    summary: "Federal regulators have cleared flight envelopes for Flight 6, approving operational plans for dual ship-tower recoveries and higher orbital thermal test loads.",
    url: "https://www.spacex.com/"
  },
  {
    id: 5,
    title: "Crew-10 Dragon Spacecraft Prepares for Long-Duration Orbital Run",
    news_site: "Space News",
    published_at: "2026-05-06T11:45:00.000Z",
    summary: "Engineers have concluded vacuum chamber leak checks on the Dragon capsule assigned to USCV-10, readying the spacecraft for cargo staging at LC-39A.",
    url: "https://www.spacex.com/"
  },
  {
    id: 6,
    title: "SpaceX Secures Landmark Deep Space Launch Contract for Uranus Probe",
    news_site: "NASA Mission Reports",
    published_at: "2026-05-04T16:10:00.000Z",
    summary: "A triple-core Falcon Heavy configuration will launch NASA's priority planetary probe on an outer solar system gravity-assist trajectory scheduled in late 2026.",
    url: "https://www.spacex.com/"
  },
  {
    id: 7,
    title: "Next-Gen Raptor 3 Engine Achieves Record Combustion Chamber Pressure",
    news_site: "TechCrunch Science",
    published_at: "2026-05-02T08:30:00.000Z",
    summary: "SpaceX's simplified build Raptor 3 rocket engine has logged over 350 bar peak chamber pressure on the McGregor test stand while improving thrust performance.",
    url: "https://www.spacex.com/"
  },
  {
    id: 8,
    title: "Reusable Fairings Set New Turnaround Record of 21 Days for Starlink Flights",
    news_site: "Booster Analytics",
    published_at: "2026-04-30T10:05:00.000Z",
    summary: "Fast cycle cleaning and structural inspections on recovery vessel Bob have enabled fairing halves to fly twice within one month, saving millions in manufacturing.",
    url: "https://www.spacex.com/"
  },
  {
    id: 9,
    title: "Robotic Arm Mechazilla Upgrade Slated to Accelerate Launch Operations",
    news_site: "Spaceflight Now",
    published_at: "2026-04-28T15:00:00.000Z",
    summary: "Installation of shock dampening cylinders and wider hinge bearings at Starbase OLP-1 will reduce turnaround time between Starship orbital stacking operations.",
    url: "https://www.spacex.com/"
  }
];

export default function App() {
  const [lowerTab, setLowerTab] = useState<'news' | 'giveaway' | 'premium'>('news');
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [filterSuccess, setFilterSuccess] = useState<string>("all");
  const [launches, setLaunches] = useState<any[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<any | null>(null);
  const [resolvedDetails, setResolvedDetails] = useState<{
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

  const [activeVideoId, setActiveVideoId] = useState<string>("");
  
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
    const targetLaunch = (selectedLaunch && selectedLaunch.upcoming) ? selectedLaunch : launches.find(l => l.upcoming);
    if (!targetLaunch) return "https://x.com/SpaceX";
    const youtubeId = targetLaunch.links?.youtube_id;
    const webcastUrl = targetLaunch.links?.webcast || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : "") || targetLaunch.ll2?.webcast || "";
    return webcastUrl || targetLaunch.links?.wikipedia || "https://x.com/SpaceX";
  }, [launches, selectedLaunch]);

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
    setSelectedLaunch(mission);
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
          const llPastRes = await fetch("https://lldev.thespacedevs.com/2.3.0/launches/previous/?search=SpaceX&limit=30&mode=detailed");
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
              const res = await fetch("https://api.spacexdata.com/v5/launches");
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
          const llRes = await fetch("https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?search=SpaceX&limit=12&mode=detailed");
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
            addLog("LL2 offline. Attempting backup sync via live SpaceX V5 upcoming API flight list...");
            try {
              const res = await fetch("https://api.spacexdata.com/v5/launches");
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
                addLog('SpaceX V5 fallback yielded 0 upcoming. Utilizing local backup calendar.');
                llUpcoming = FALLBACK_UPCOMING;
              }

              setCachedData("spacex-cache-upcoming-missions", llUpcoming);
              addLog(`Successfully parsed ${llUpcoming.length} real-time upcoming launches from SpaceX API.`);
            } catch (subErr: any) {
              addLog(`SpaceX V5 fallback failed: ${subErr.message}. Utilizing local backup calendar.`, true);
              llUpcoming = FALLBACK_UPCOMING;
            }
          }
        }
      }

      // Merge and store launches
      const allMissions = pastMissions.concat(llUpcoming);
      setLaunches(allMissions);

      // Set initial selected launch to first upcoming if exists, else first historical
      const initial = llUpcoming[0] || pastMissions[0];
      if (initial) {
        setSelectedLaunch(initial);
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
        const llRes = await fetch("https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?search=SpaceX&limit=12&mode=detailed");
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
          const res = await fetch("https://api.spacexdata.com/v5/launches");
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
        const text = selectedLaunch.upcoming ? "GO LIVE" : "MISSION ARCHIVE";
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
  }, [selectedLaunch]);

  // Telemetry Deep-Resolver for Selected Launch
  useEffect(() => {
    if (!selectedLaunch) {
      setResolvedDetails(null);
      return;
    }

    // If it is Launch Library 2 or a local fallback, instantly resolve basic fields
    if (selectedLaunch.id?.toString().startsWith('ll2-') || !selectedLaunch.id) {
      setResolvedDetails({
        rocketName: selectedLaunch.rocket_name || "Falcon 9",
        padFullName: selectedLaunch.launchpad_name || "SLC-40, Cape Canaveral",
        linksDetails: {
          article: selectedLaunch.links?.webcast || undefined
        },
        isLoading: false,
      });
      return;
    }

    let isCancelled = false;
    setResolvedDetails({ isLoading: true });
    addLog(`Initiating advanced telemetry lookup for "${selectedLaunch.name}"...`);

    const fetchExpandedInfo = async () => {
      try {
        // 1. Fetch Rocket Info
        let rocketName = "Falcon 9";
        let rocketType = "Falcon 9";
        if (selectedLaunch.rocket) {
          try {
            const rRes = await fetch(`https://api.spacexdata.com/v4/rockets/${selectedLaunch.rocket}`);
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
        if (selectedLaunch.launchpad) {
          try {
            const pRes = await fetch(`https://api.spacexdata.com/v4/launchpads/${selectedLaunch.launchpad}`);
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
        if (Array.isArray(selectedLaunch.payloads) && selectedLaunch.payloads.length > 0) {
          try {
            // Fetch first 3 payloads in parallel to display specific weights, customers, orbits
            const targets = selectedLaunch.payloads.slice(0, 3);
            const pPromises = targets.map(async (pId: string) => {
              const pRes = await fetch(`https://api.spacexdata.com/v4/payloads/${pId}`);
              return pRes.ok ? pRes.json() : null;
            });
            const pResults = await Promise.all(pPromises);
            payloadsList = pResults.filter(Boolean);
          } catch (_) {}
        }

        if (isCancelled) return;

        // 4. Fetch Cores & Landpads
        let coresList: any[] = [];
        if (Array.isArray(selectedLaunch.cores) && selectedLaunch.cores.length > 0) {
          try {
            const cPromises = selectedLaunch.cores.map(async (c: any) => {
              let coreData: any = null;
              let landpadData: any = null;

              if (c.core) {
                try {
                  const cRes = await fetch(`https://api.spacexdata.com/v4/cores/${c.core}`);
                  if (cRes.ok) coreData = await cRes.json();
                } catch (_) {}
              }

              if (c.landpad) {
                try {
                  const lpRes = await fetch(`https://api.spacexdata.com/v4/landpads/${c.landpad}`);
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
        const staticFireDate = selectedLaunch.static_fire_date_utc 
          ? new Date(selectedLaunch.static_fire_date_utc).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
          : undefined;

        const linksDetails = {
          redditCampaign: selectedLaunch.links?.reddit?.campaign || undefined,
          redditLaunch: selectedLaunch.links?.reddit?.launch || undefined,
          redditMedia: selectedLaunch.links?.reddit?.media || undefined,
          redditRecovery: selectedLaunch.links?.reddit?.recovery || undefined,
          wikipedia: selectedLaunch.links?.wikipedia || undefined,
          article: selectedLaunch.links?.article || undefined,
        };

        if (!isCancelled) {
          setResolvedDetails({
            rocketName,
            rocketType,
            padFullName,
            padLocality,
            payloadsList,
            coresList,
            failuresList: selectedLaunch.failures || [],
            staticFireDate,
            linksDetails,
            isLoading: false
          });
          addLog(`Advanced telemetry acquired for "${selectedLaunch.name}".`);
        }
      } catch (err: any) {
        addLog(`Deep resolver error: ${err.message}`, true);
        if (!isCancelled) {
          setResolvedDetails({
            rocketName: selectedLaunch.rocket_name || "Falcon 9",
            padFullName: selectedLaunch.launchpad_name || "SLC-40, Cape Canaveral",
            isLoading: false
          });
        }
      }
    };

    fetchExpandedInfo();

    return () => {
      isCancelled = true;
    };
  }, [selectedLaunch]);

  // Synchronize active video when a launch changes
  useEffect(() => {
    if (selectedLaunch) {
      const ytId = extractYoutubeId(youtubeUrl(selectedLaunch));
      setActiveVideoId(ytId);
    }
  }, [selectedLaunch]);

  const playLandingVideo = (video: any) => {
    setActiveVideoId(video.id);
    setSelectedLaunch({
      id: video.id,
      name: video.title,
      upcoming: false,
      date_utc: null,
      details: `Historical Archive Replay: ${video.title}. Displaying stored dynamic landing stream parameters and telemetry matrix.`,
      rocket_name: video.type,
      launchpad_name: "Archive Footage",
      links: {
        webcast: `https://www.youtube.com/watch?v=${video.id}`
      }
    });
    addLog(`Loading landing replay webcast: ${video.title}`);
  };

  // Render variables & helpers
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
          <div className="title-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="header-brand-inline">
              <div className="header-seo-tagline">
                Real-time SpaceX Launch Updates, Mission History, News &amp; Rocket Details
              </div>
              {/* Removed console-footer-text per user request */}
            </div>
            <div className="flex flex-col items-end ml-4">
              {/* Removed Watch Live Feed from header, moved to countdown panel */}
            </div>
          </div>
        </header>

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
              setLowerTab('premium');
              setTimeout(() => document.getElementById('lower-features-area')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-t-lg font-space text-[10px] sm:text-xs uppercase tracking-widest font-bold border-t border-l border-r transition-all ${
              lowerTab === 'premium' 
                ? 'bg-[#0b101a] border-[#ff6b2b]/40 text-[#ff6b2b]' 
                : 'bg-[#121826] border-white/5 text-slate-400 hover:text-[#ff6b2b] hover:bg-[#1a2235]'
            }`}
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
                }).map((video) => (
                  <div
                    key={video.id}
                    className={`dynamic-landings-header-card ${activeVideoId === video.id ? 'active' : ''}`}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: activeVideoId === video.id ? "1px solid var(--cyan)" : "1px solid rgba(0, 231, 255, 0.10)",
                      background: activeVideoId === video.id ? "rgba(0, 231, 255, 0.08)" : "rgba(0, 0, 0, 0.22)",
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
                ))}
              </div>
            </section>
          </div>
          </div>

          <div className="countdown-core overflow-hidden relative border-l-0 border-r-0 sm:border-l sm:border-r border-slate-800/60 p-1 flex flex-col justify-center items-center py-2 min-h-[160px]">
            {patch && (
              <div 
                className="absolute inset-0 pointer-events-none z-0" 
                style={{
                  backgroundImage: `url(${patch})`,
                  backgroundPosition: 'top center',
                  backgroundSize: '150%',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.3,
                  filter: 'grayscale(50%)'
                }} 
              />
            )}
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="text-sky-400 font-bold tracking-[0.2em] text-[10px] sm:text-xs uppercase mb-1 font-space text-center select-none font-semibold">
                {countdownText === "MISSION ARCHIVE" ? "MISSION ARCHIVE" : "TIME UNTIL LAUNCH"}
              </div>
              
              <div id="countdown" className="flex items-center gap-1 sm:gap-1.5 md:gap-2 justify-center select-none font-mono tracking-tight text-4xl sm:text-5xl md:text-[54px] lg:text-[62px] text-sky-400 font-semibold leading-none">
                <div className="flex flex-col items-center w-12 sm:w-14 md:w-[62px]">
                  <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.18] origin-center">
                    {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.days.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-1.5 font-space text-center leading-none">
                    DAYS
                  </span>
                </div>
                
                <span className="text-sky-400/90 leading-none -translate-y-2 select-none inline-block transform scale-y-[1.18]">
                  :
                </span>

                <div className="flex flex-col items-center w-12 sm:w-14 md:w-[62px]">
                  <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.18] origin-center">
                    {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.hours.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-1.5 font-space text-center leading-none">
                    HOURS
                  </span>
                </div>
                
                <span className="text-sky-400/90 leading-none -translate-y-2 select-none inline-block transform scale-y-[1.18]">
                  :
                </span>

                <div className="flex flex-col items-center w-12 sm:w-14 md:w-[62px]">
                  <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.18] origin-center">
                    {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.minutes.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-1.5 font-space text-center leading-none">
                    MINUTES
                  </span>
                </div>

                <span className="text-sky-400/90 leading-none -translate-y-2 select-none inline-block transform scale-y-[1.18]">
                  :
                </span>

                <div className="flex flex-col items-center w-12 sm:w-14 md:w-[62px]">
                  <span className="text-sky-400 font-bold leading-none select-none inline-block transform scale-y-[1.18] origin-center">
                    {timeLeft.isTbd || timeLeft.isPast ? "00" : timeLeft.seconds.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-white font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase mt-1.5 font-space text-center leading-none">
                    SECONDS
                  </span>
                </div>
              </div>

              <div id="nextName" className="mt-2 px-2 text-[11px] md:text-xs tracking-[0.15em] text-[#ff7a18] text-center font-bold font-space uppercase break-words max-w-full">
                {selectedLaunch ? selectedLaunch.name : "Syncing Mission State"}
              </div>

              {/* WATCH LIVE FEED BUTTON MOVED TO DECOUPLED POSITION IN COUNTDOWN */}
              <div className="mt-3.5 pb-1 z-20">
                {(() => {
                  const isNearLaunch = upcomingLaunchesList[0]?.date_utc && (new Date(upcomingLaunchesList[0].date_utc).getTime() - Date.now() > 0) && (new Date(upcomingLaunchesList[0].date_utc).getTime() - Date.now() <= 5 * 60 * 1000);
                  const isHistoric = selectedLaunch && !selectedLaunch.upcoming;
                  const rawLink = isHistoric 
                    ? (youtubeUrl(selectedLaunch) || selectedLaunch?.links?.webcast || "") 
                    : upcomingWebcastUrl;
                  const buttonLink = rawLink || "https://www.youtube.com/@SpaceX/streams";

                  return (
                    <a
                      href={buttonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        const targetLaunch = (selectedLaunch && selectedLaunch.upcoming) ? selectedLaunch : launches.find(l => l.upcoming);
                        if (targetLaunch && !isHistoric) {
                          setSelectedLaunch(targetLaunch);
                          addLog(`Selected upcoming mission: ${targetLaunch.name} for live feed`);
                        }
                        
                        // Extract video ID and present it in-app natively
                        const ytId = extractYoutubeId(buttonLink);
                        if (ytId) {
                          setActiveVideoId(ytId);
                          addLog(`Natively presenting video element for: ${selectedLaunch?.name || "SpaceX webcast"}`);
                          setTimeout(() => {
                            document.getElementById('displayArea')?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }
                      }}
                      className={`px-5 py-2 rounded-lg font-space text-xs tracking-widest font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                        isNearLaunch && !isHistoric
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-red-500/50 animate-pulse' 
                          : 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-850 hover:text-cyan-300 shadow-[0_0_10px_rgba(0,231,255,0.15)]'
                      }`}
                    >
                      <Tv className="w-4 h-4" />
                      <span>{isHistoric ? "WATCH REPLAY DECK" : "WATCH LIVE FEED"}</span>
                    </a>
                  );
                })()}

                {/* Rockets Image Display with optimized scale to ensure prominent visibility and elegant panel alignment */}
                <div className="flex justify-center mt-3 sm:mt-4 z-20 mx-auto pointer-events-none fade-in">
                  <img 
                    src="/rockets.png" 
                    alt="SpaceX Vehicles Structure" 
                    className="w-full max-w-[150px] max-h-[110px] md:max-h-[130px] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.18)] filter grayscale-[10%]" 
                  />
                </div>
              </div>
            </div>
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
                  const isActive = selectedLaunch?.id === event.id;
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
                          const customLaunch = {
                            id: event.id,
                            name: event.title,
                            upcoming: false,
                            date_utc: event.dateUtc || null,
                            details: event.details,
                            rocket_name: event.vehicle,
                            launchpad_name: event.launchpad,
                            links: {
                              webcast: `https://www.youtube.com/watch?v=${event.video_id}`
                            },
                            cores: [
                              {
                                core: { serial: event.coreSerial || "Historic Core" },
                                flight: event.flightNum || 1,
                                reused: event.reused || false,
                                landing_attempt: true,
                                landing_success: true,
                                landing_type: event.landingType || "LZ Landing",
                              }
                            ]
                          };
                          setSelectedLaunch(customLaunch);
                          setActiveVideoId(event.video_id);
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

        {/* Master Triple Column Dashboard Grid */}
        <section className="mission-grid">
          
          {/* Left Column: Archive Feed (Recent Missions) */}
          <RecentMissionsPanel 
            loading={loading}
            filteredPast={filteredPast}
            selectedLaunch={selectedLaunch}
            selectMission={selectMission}
          />

          {/* Center Column: Detailed Mission Display Block */}
          <article className="panel main-display">
            <div className="panel-title">
              <div>
                <small>Selected Launch</small>
                <h2 style={{ fontSize: '1.25rem' }}>Mission Display</h2>
              </div>
              <span className="badge">LIVE PANEL</span>
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
            selectedLaunch={selectedLaunch}
            selectMission={selectMission}
          />

          {/* Bottom Grid Panels Row Removed per user request */}

        </section>





        {/* Development News / Intelligence Briefings bento module */}
        <div id="lower-features-area">
        {lowerTab === 'news' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="mission-intel-news">
              <div className="flex border-b border-cyan-500/18 pb-2 mt-[-5px] mb-4 gap-3 items-start justify-between">
                <div>
                  <h2 className="m-0 text-base tracking-[0.16em] uppercase text-white shadow-none" style={{ fontFamily: '"Space Grotesk", sans-serif', textShadow: '0 0 12px rgba(127, 220, 255, 0.5)' }}>Spaceflight News API Feed</h2>
                  <p className="m-0 mt-1.5 text-[#88a7b8] text-[13px] leading-[1.45]" style={{ fontFamily: 'Inter, sans-serif' }}>Filtered for SpaceX, Starship, Falcon, Raptor, and Starlink mission intelligence.</p>
                </div>
                <a className="whitespace-nowrap px-[14px] py-[6px] shrink-0 border border-[rgba(0,231,255,0.3)] bg-transparent text-[#00e7ff] hover:bg-[rgba(0,231,255,0.1)] hover:text-[#fff] text-[11px] uppercase tracking-[0.15em] font-semibold transition-colors duration-200 uppercase inline-block rounded" href="https://www.spacex.com/updates/" target="_blank" rel="noopener noreferrer">SpaceX Updates ↗</a>
              </div>
              <div id="intelNewsGrid" className="news-intel-grid">
                {news.slice(0, 9).map((article) => {
                  const site = article.news_site || "NASA Spaceflight";
                  const title = article.title || "Spaceflight Mission Highlight";
                  const date = new Date(article.published_at || article.publishedAt || article.updated_at || article.published || Date.now()).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
                  const infoRaw = article.summary || "Latest development notes on SpaceX Falcon booster recoveries and launchpad operations.";
                  const info = infoRaw.length > 150 ? infoRaw.substring(0, 150) + "…" : infoRaw;
                  const imageUrl = article.image_url || article.imageUrl;
                  return (
                    <div key={article.id} className="news-intel-card" style={{ padding: imageUrl ? "12px" : "16px" }}>
                      {imageUrl && (
                        <a href={article.url || "https://www.spacex.com/"} target="_blank" rel="noopener noreferrer" className="news-intel-card-image mb-3 block overflow-hidden rounded-lg border border-white/10 opacity-80 hover:opacity-100 transition-opacity">
                          <img src={imageUrl} alt={title} className="w-full h-[140px] object-cover" loading="lazy" />
                        </a>
                      )}
                      <div className="flex-1 flex flex-col justify-between" style={{ padding: imageUrl ? "0 4px" : "0" }}>
                        <div>
                          <h3>{title}</h3>
                          <div className="news-meta">{site} • {date}</div>
                          <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: "1.45" }}>{info}</p>
                        </div>
                        <a href={article.url || "https://www.spacex.com/"} target="_blank" rel="noopener noreferrer" style={{ marginTop: imageUrl ? "12px" : "0" }}>
                          Read Article
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Ad Placeholders for Future Monetization */}
            <section className="ad-placeholders-section">
              <div className="ad-placeholders-grid">
                <div className="ad-cell">
                  <span>Future Advertising Block</span>
                </div>
                <div className="ad-cell">
                  <span>Future Advertising Block</span>
                </div>
                <div className="ad-cell">
                  <span>Future Advertising Block</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {lowerTab === 'giveaway' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Falcon Heavy die-cast giveaway module */}
            <section className="weekly-giveaway">
              <div className="weekly-giveaway-title">
                <div>
                  <h2>Falcon Heavy Desktop Mockup Giveaway</h2>
                  <p>Submit your transmission credentials to enter the queue for our monthly hand-crafted aerospace display drawing. Completely offline persistent state storage.</p>
                </div>
              </div>
              <form id="giveawayForm" className="giveaway-form" onSubmit={handleGiveawaySubmit}>
                <div>
                  <label htmlFor="gwName">Transmission Name</label>
                  <input 
                    type="text" 
                    id="gwName" 
                    placeholder="Contestant Identifier" 
                    required 
                    value={giveawayName}
                    onChange={(e) => setGiveawayName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="gwEmail">Datalink Address</label>
                  <input 
                    type="email" 
                    id="gwEmail" 
                    placeholder="you@domain.com" 
                    required 
                    value={giveawayEmail}
                    onChange={(e) => setGiveawayEmail(e.target.value)}
                  />
                </div>
                <button type="submit">Add Contestant</button>
              </form>

              {/* Winner Draw Display box */}
              <div className="last-winner-box">
                <div>
                  <span>Latest Monthly Drawing Winner</span>
                  <strong id="winnerDisplay">{currentWinner}</strong>
                  {giveawayEntries.length > 0 && (
                    <small style={{ color: "var(--muted)", fontStyle: "italic", marginTop: "2px", display: "inline-block" }}>
                      Active queue has {giveawayEntries.length} registrants inside.
                    </small>
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={handleDrawWinner} 
                  style={{ width: "auto", padding: "11px 18px" }}
                >
                  Draw Winner
                </button>
              </div>
              <p className="giveaway-note">* Winners are chosen directly from the local entries list. Records persist in the browser Cache.</p>
            </section>
          </div>
        )}

        {lowerTab === 'premium' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-5xl mx-auto px-4 sm:px-6 mt-8">
            <div className="bg-[#0b101a] border border-[#ff6b2b]/30 shadow-[0_0_40px_rgba(255,107,43,0.05)] rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Shield size={200} />
              </div>
              <div className="p-8 sm:p-12 relative z-10 border-b border-white/5 bg-gradient-to-br from-[#121826] to-transparent">
                <div className="flex items-center gap-3 mb-4 text-[#ff6b2b] font-space tracking-widest text-sm uppercase font-bold">
                  <Star size={18} className="animate-pulse" />
                  Premium Subscription Tier
                </div>
                <h2 className="text-3xl sm:text-5xl font-mono tracking-tighter text-white font-bold mb-4">
                  Mission Tracker <span className="text-[#ff6b2b]">Pro</span>
                </h2>
                <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
                  A premium tier designed for hardcore space enthusiasts, aerospace students, and industry professionals. Unlock deep technical data, real-time advanced telemetry, and personalized tracking features.
                </p>
                <div className="mt-8">
                  <button className="bg-[#ff6b2b]/10 hover:bg-[#ff6b2b]/20 text-[#ff6b2b] border border-[#ff6b2b]/50 px-6 py-3 rounded uppercase font-space text-sm tracking-widest font-bold transition-colors">
                    Join Waiting List
                  </button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-px bg-white/5">
                <div className="bg-[#0b101a] p-8 sm:p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20 text-blue-400">
                      <Gauge size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Advanced Control Center</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Custom Layouts:</strong> Draggable, resizable widgets allowing users to build their own personalized Mission Control view.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Multi-Mission:</strong> Ability to track multiple simultaneous historical or upcoming missions side-by-side.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Ad-Free Experience:</strong> A clean, premium environment without advertising interruptions.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#0b101a] p-8 sm:p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-500/10 rounded border border-purple-500/20 text-purple-400">
                      <Globe size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Trajectory Projections</h3>
                  </div>
                  
                  {/* Trajectory Simulation Widget for Pro Showcase */}
                  <div className="mb-6 pointer-events-none opacity-80" style={{ filter: 'grayscale(0.5)' }}>
                    <TrajectoryChart id="pro_preview" flightNumber={100} />
                  </div>

                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Trajectory Simulations:</strong> Accurate flight path predictions and post-launch trajectory analysis.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Mission Timelines:</strong> Advanced sequence of events estimations for future launches.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Historical Profiling:</strong> Visual breakdowns and charts of past flight profiles.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-[#0b101a] p-8 sm:p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400">
                      <Rocket size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Deep Analytics</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Rocket Metrics:</strong> Deep dives into booster reusability history, turnaround times, and payload capacity.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Proactive Alerts:</strong> SMS/email notifications for specific mission events (e.g., T-10 mins, weather changes).</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Launch Weather:</strong> Advanced localized forecasting modeling for targeted launch windows.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* SpaceX Media & Social Network hub */}
        <section className="social-hub">
          <div className="social-hub-title">
            <h2>Mission Social Network</h2>
            <span className="badge">CHANNELS</span>
          </div>
          <div id="socialHubGrid" className="social-grid social-logo-grid">
            <a className="social-card social-logo-card space-x-logo" href="https://www.spacex.com/" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Globe style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card x-logo" href="https://x.com/SpaceX" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Twitter style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card youtube-logo" href="https://www.youtube.com/@SpaceX" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Youtube style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card instagram-logo" href="https://www.instagram.com/spacex/" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Instagram style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card flickr-logo" href="https://www.flickr.com/photos/spacex/" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Camera style={{ width: "24px", height: "auto" }} />
            </a>
          </div>
        </section>

        {/* Drive Data Sync Section */}
        <section className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 md:p-8 mt-12 w-[min(1400px,94vw)] mx-auto shadow-lg relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_10px_rgba(0,231,255,0.4)]"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex-1">
              <h2 className="text-xl font-space font-medium text-white mb-2 flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-cyan-400" />
                System Source Backup
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                Securely stream a local working copy of the current Mission Control transmission directly to your Google Drive ecosystem. Data transfers require active Google Workspace credentials to proceed.
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
              {!authToken ? (
                 <button 
                   onClick={handleLogin}
                   disabled={isLoggingIn}
                   className="w-full md:w-auto gsi-material-button bg-white hover:bg-slate-50 transition-colors rounded-md shadow-md border border-slate-200 p-1 flex items-center pr-4 disabled:opacity-50"
                 >
                   <div className="p-2 bg-white rounded-l-md mr-3">
                     <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                       <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                       <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                       <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                       <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                       <path fill="none" d="M0 0h48v48H0z"></path>
                     </svg>
                   </div>
                   <span className="font-roboto text-sm font-medium text-slate-600 tracking-wide">
                     {isLoggingIn ? "Authenticating..." : "Sign in with Google"}
                   </span>
                 </button>
              ) : (
                 <button 
                   onClick={handleBackupToDrive}
                   disabled={isBackingUp}
                   className="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(0,231,255,0.2)] hover:shadow-[0_0_25px_rgba(0,231,255,0.4)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                 >
                   <DownloadCloud className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
                   {isBackingUp ? "Transmitting..." : "Push to Google Drive"}
                 </button>
              )}
            </div>
          </div>
        </section>

        {/* Dynamic Vector One Labs© subtler branding footer */}
        <footer className="vector-footer-logo-row pb-8">
          <img 
            src={`/vector_labs_logo.png?v=${Date.now()}`}
            alt="Vector One Labs AI Logo" 
            referrerPolicy="no-referrer"
          />
        </footer>

      </main>
    </div>
  );
}
