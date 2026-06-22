/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LaunchPayload {
  name: string;
  type: string;
  mass_kg: number | null;
  orbit: string;
  customer?: string;
  manufacturer?: string;
}

export interface LaunchCore {
  core: string; // core ID
  flight: number;
  gridfins: boolean;
  legs: boolean;
  reused: boolean;
  landing_attempt: boolean;
  landing_success: boolean | null;
  landing_type: string | null;
  landpad: string | null;
  serial?: string;
}

export interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  rocket: string; // rocket ID or object
  success: boolean | null;
  upcoming: boolean;
  details: string | null;
  flight_number: number;
  links: {
    patch: {
      small: string | null;
      large: string | null;
    };
    reddit: {
      campaign: string | null;
      launch: string | null;
      recovery: string | null;
    };
    webcast: string | null;
    article: string | null;
    wikipedia: string | null;
  };
  cores: LaunchCore[];
  payloads: string[] | LaunchPayload[];
  launchpad: string; // launchpad ID
  static_fire_date_utc?: string | null;
}

export interface SpaceXRocket {
  id: string;
  name: string;
  type: string;
  active: boolean;
  stages: number;
  boosters: number;
  cost_per_launch: number;
  success_rate_pct: number;
  first_flight: string;
  country: string;
  company: string;
  height: { meters: number; feet: number };
  diameter: { meters: number; feet: number };
  mass: { kg: number; lb: number };
  payload_weights: { id: string; name: string; kg: number; lb: number }[];
  description: string;
  engines: {
    number: number;
    type: string;
    version: string;
    layout: string;
    propellant_1: string;
    propellant_2: string;
  };
}

export interface SpaceXLaunchpad {
  id: string;
  name: string;
  full_name: string;
  locality: string;
  region: string;
  latitude: number;
  longitude: number;
  launch_attempts: number;
  launch_successes: number;
  status: string;
  details: string;
}

export interface SpaceXDroneship {
  id: string;
  name: string;
  type: string;
  status: string;
  launches: string[];
  image?: string;
  home_port: string;
  successful_landings: number;
  attempted_landings: number;
}
