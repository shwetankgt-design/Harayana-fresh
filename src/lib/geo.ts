// Geometry and location helpers. Area and distance maths are ported from the arecanut app's
// plotBoundary.ts so every capture method (draw / GPS corners / GPS walk / file) measures the same way.

import { HARYANA_BOUNDS, HARYANA_VILLAGES, PG_LOCATIONS, type LatLng } from "../data/haryanaMaster";
import type { FarmerMember, LandParcel } from "../data/types";

export type { LatLng };
export type Boundary = LatLng[];

const EARTH_RADIUS_M = 6378137;
const SQM_PER_ACRE = 4046.8564224;

export function polygonAreaSqMeters(points: Boundary): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lng1 = (p1.lng * Math.PI) / 180;
    const lng2 = (p2.lng * Math.PI) / 180;
    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function areaInAcres(points: Boundary): number {
  return Math.round((polygonAreaSqMeters(points) / SQM_PER_ACRE) * 100) / 100;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function validateBoundary(points: Boundary): string | null {
  if (points.length < 3) return "A plot boundary needs at least 3 points.";
  if (points.some((p) => Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180)) return "One or more points have an invalid latitude or longitude.";
  return null;
}

export function inHaryana(p: LatLng): boolean {
  const b = HARYANA_BOUNDS;
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}

export function formatLatLng(p: LatLng): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

// Reported vs mapped area differ by more than this share: flagged for field re-check.
export const AREA_MISMATCH_SHARE = 0.15;

export function areaMismatch(reported: number, mapped: number): boolean {
  if (!reported || !mapped) return false;
  return Math.abs(mapped - reported) / reported > AREA_MISMATCH_SHARE;
}

// ---------- Deterministic simulated locations for seeded farmers ----------
// Seeded farmers have no captured GPS. They are placed near their village with a stable offset
// derived from their ID, so the map is identical on every run. Always labelled as simulated.

function hash01(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

const METERS_PER_DEG_LAT = 111320;
const metersPerDegLng = (lat: number) => METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

export function villageLocation(village: string): LatLng | null {
  const v = HARYANA_VILLAGES.find((x) => x.name === village);
  return v ? { lat: v.lat, lng: v.lng } : null;
}

export function seededFarmerHome(f: FarmerMember): LatLng | null {
  const base = villageLocation(f.village) ?? PG_LOCATIONS[f.pg_id] ?? null;
  if (!base) return null;
  const spread = 0.025; // about 2.5 km either way
  return {
    lat: base.lat + (hash01(`${f.farmer_id}:lat`) - 0.5) * 2 * spread,
    lng: base.lng + (hash01(`${f.farmer_id}:lng`) - 0.5) * 2 * spread,
  };
}

// A square of the parcel's recorded area, a few hundred metres from the farmer's home.
export function seededParcelBoundary(parcel: LandParcel, home: LatLng): Boundary {
  const side = Math.sqrt(parcel.area_acres * SQM_PER_ACRE);
  const offN = 150 + hash01(`${parcel.parcel_id}:n`) * 350;
  const offE = 150 + hash01(`${parcel.parcel_id}:e`) * 350;
  const sign = hash01(`${parcel.parcel_id}:s`) > 0.5 ? 1 : -1;
  const sw = {
    lat: home.lat + (sign * offN) / METERS_PER_DEG_LAT,
    lng: home.lng + (sign * offE) / metersPerDegLng(home.lat),
  };
  const dLat = side / METERS_PER_DEG_LAT;
  const dLng = side / metersPerDegLng(sw.lat);
  return [sw, { lat: sw.lat + dLat, lng: sw.lng }, { lat: sw.lat + dLat, lng: sw.lng + dLng }, { lat: sw.lat, lng: sw.lng + dLng }];
}

// ---------- Device location (best-of-sample, ported from the arecanut GPS capture) ----------

export interface Fix {
  point: LatLng;
  accuracy: number;
}

const MAX_WAIT_MS = 20000;
export const TARGET_ACCURACY_M = 6;
export const WARN_ACCURACY_M = 20;

// Watches for up to 20 s, keeps the best (lowest-accuracy) reading, and accepts early once
// one is within 6 m. A single first fix is often a coarse network estimate.
export function bestFix(onProgress?: (accuracy: number) => void): { promise: Promise<Fix>; stop: () => void } {
  let stop = () => {};
  const promise = new Promise<Fix>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This device or browser does not provide location."));
      return;
    }
    if (!window.isSecureContext) {
      reject(new Error("Location needs a secure (HTTPS) connection."));
      return;
    }
    let best: Fix | null = null;
    const finish = () => {
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(new Error("No GPS fix was obtained. Try again in an open area."));
    };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { point: { lat: pos.coords.latitude, lng: pos.coords.longitude }, accuracy: pos.coords.accuracy };
        if (!best || fix.accuracy < best.accuracy) best = fix;
        onProgress?.(fix.accuracy);
        if (fix.accuracy <= TARGET_ACCURACY_M) finish();
      },
      (err) => {
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        reject(new Error(err.code === err.PERMISSION_DENIED ? "Location permission denied. Enable it in browser settings." : err.message));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: MAX_WAIT_MS }
    );
    const timer = setTimeout(finish, MAX_WAIT_MS);
    stop = finish;
  });
  return { promise, stop: () => stop() };
}
