import { useEffect, useRef, useState } from "react";
import { CircleMarker, Polygon, Polyline } from "react-leaflet";
import { AlertCircle, MapPinned, Navigation, Play, RotateCcw, Square, Undo2, Upload, Download, Footprints } from "lucide-react";
import { BaseMap, FitBounds, MapClick, toTuple } from "./MapKit";
import type { CaptureMethod, PlotRecord } from "../../data/registry";
import type { LatLng } from "../../data/haryanaMaster";
import { areaInAcres, areaMismatch, bestFix, haversineMeters, inHaryana, validateBoundary, WARN_ACCURACY_M } from "../../lib/geo";

type Tab = CaptureMethod;

const TABS: { key: Tab; label: string; icon: typeof MapPinned }[] = [
  { key: "draw", label: "Draw on map", icon: MapPinned },
  { key: "gps-corners", label: "Tap each corner (GPS)", icon: Navigation },
  { key: "gps-walk", label: "Walk the perimeter (GPS)", icon: Footprints },
  { key: "file", label: "Upload file (CSV)", icon: Upload },
];

// Walk mode keeps a point only after moving this far from the last kept one, and drops noisy
// readings, so standing still does not flood the boundary (ported from the arecanut app).
const STEP_OPTIONS_M = [5, 10, 15, 25, 30, 50];
const MAX_TRACK_ACCURACY_M = 25;

export function PlotCapture({ plot, onChange, center }: { plot: PlotRecord; onChange: (p: PlotRecord) => void; center: LatLng }) {
  const [tab, setTab] = useState<Tab>(plot.capture_method ?? "draw");
  const points = plot.boundary;
  const setPoints = (boundary: LatLng[], method: CaptureMethod) => onChange({ ...plot, boundary, capture_method: boundary.length ? method : null });

  const mapped = points.length >= 3 ? areaInAcres(points) : 0;
  const reported = parseFloat(plot.reported_area_acres) || 0;
  const outside = points.some((p) => !inHaryana(p));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
              tab === t.key ? "bg-gt-purple text-white border-gt-purple" : "bg-white text-muted border-border hover:border-gt-purple/40"
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "draw" && <DrawTab points={points} onChange={(b) => setPoints(b, "draw")} center={center} />}
      {tab === "gps-corners" && <CornersTab points={points} onChange={(b) => setPoints(b, "gps-corners")} center={center} />}
      {tab === "gps-walk" && <WalkTab points={points} onChange={(b) => setPoints(b, "gps-walk")} center={center} />}
      {tab === "file" && <FileTab onChange={(b) => setPoints(b, "file")} />}

      <div className="rounded-lg bg-surface px-3 py-2 text-xs text-ink flex flex-wrap gap-x-4 gap-y-1">
        <span>Points: <b>{points.length}</b></span>
        <span>Mapped area: <b>{mapped ? `${mapped.toFixed(2)} acres` : "-"}</b></span>
        <span>Reported area: <b>{reported ? `${reported.toFixed(2)} acres` : "-"}</b></span>
        {plot.capture_method && <span>Method: <b>{TABS.find((t) => t.key === plot.capture_method)?.label}</b></span>}
      </div>
      {areaMismatch(reported, mapped) && (
        <div className="flex items-start gap-2 rounded-lg bg-warn/5 border border-warn/20 p-2.5 text-xs text-ink">
          <AlertCircle size={14} className="text-warn shrink-0 mt-0.5" />
          Reported and mapped areas differ by more than 15%. Re-check the boundary or the reported area.
        </div>
      )}
      {outside && (
        <div className="flex items-start gap-2 rounded-lg bg-bad/5 border border-bad/20 p-2.5 text-xs text-ink">
          <AlertCircle size={14} className="text-bad shrink-0 mt-0.5" />
          Some points fall outside Haryana. Check the boundary.
        </div>
      )}
    </div>
  );
}

function BoundaryLayer({ points, closed = true }: { points: LatLng[]; closed?: boolean }) {
  return (
    <>
      {points.length >= 3 && closed && <Polygon positions={points.map(toTuple)} pathOptions={{ color: "#F5A623", weight: 2, fillOpacity: 0.25 }} />}
      {points.length >= 2 && !closed && <Polyline positions={points.map(toTuple)} pathOptions={{ color: "#F5A623", weight: 3 }} />}
      {points.map((p, i) => (
        <CircleMarker key={i} center={toTuple(p)} radius={4} pathOptions={{ color: "#4E2A84", fillColor: "#fff", fillOpacity: 1, weight: 2 }} />
      ))}
    </>
  );
}

function DrawTab({ points, onChange, center }: { points: LatLng[]; onChange: (b: LatLng[]) => void; center: LatLng }) {
  // Fit only to the boundary that existed when the tab opened; re-fitting on every click would move the map mid-drawing.
  const [initial] = useState(points);
  return (
    <div className="space-y-2">
      <p className="subtle text-xs">Click each corner of the plot on the map, in order. Switch to Satellite (top right) to see field edges.</p>
      <BaseMap height={340} center={points[0] ?? center} zoom={points.length ? 17 : 14} satelliteFirst>
        <MapClick onClick={(p) => onChange([...points, p])} />
        <BoundaryLayer points={points} />
        {initial.length >= 3 && <FitBounds points={initial} maxZoom={18} />}
      </BaseMap>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost text-xs" disabled={!points.length} onClick={() => onChange(points.slice(0, -1))}><Undo2 size={13} /> Undo point</button>
        <button type="button" className="btn-ghost text-xs" disabled={!points.length} onClick={() => onChange([])}><RotateCcw size={13} /> Clear</button>
      </div>
    </div>
  );
}

function CornersTab({ points, onChange, center }: { points: LatLng[]; onChange: (b: LatLng[]) => void; center: LatLng }) {
  const [capturing, setCapturing] = useState(false);
  const [live, setLive] = useState<number | null>(null);
  const [accuracies, setAccuracies] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const capture = async () => {
    setError(null);
    setCapturing(true);
    const { promise, stop } = bestFix((a) => setLive(a));
    stopRef.current = stop;
    try {
      const fix = await promise;
      onChange([...points, fix.point]);
      setAccuracies((a) => [...a, fix.accuracy]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCapturing(false);
      setLive(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="subtle text-xs">Stand at each corner of the plot and tap Capture. The best reading within 20 seconds is kept.</p>
      <div className="flex flex-wrap gap-2 items-center">
        {!capturing ? (
          <button type="button" className="btn-primary text-xs" onClick={capture}><Navigation size={13} /> Capture corner {points.length + 1}</button>
        ) : (
          <button type="button" className="btn-orange text-xs" onClick={() => stopRef.current()}><Square size={13} /> Use best reading now</button>
        )}
        <button type="button" className="btn-ghost text-xs" disabled={!points.length || capturing} onClick={() => { onChange(points.slice(0, -1)); setAccuracies((a) => a.slice(0, -1)); }}><Undo2 size={13} /> Undo corner</button>
        {capturing && <span className="text-xs text-muted">Reading GPS{live !== null ? `: ±${Math.round(live)} m` : "..."}</span>}
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
      {accuracies.length > 0 && (
        <p className="text-xs text-muted">
          Corner accuracy: {accuracies.map((a, i) => <span key={i} className={a > WARN_ACCURACY_M ? "text-warn font-semibold" : ""}>{i ? ", " : ""}±{Math.round(a)} m</span>)}
        </p>
      )}
      <BaseMap height={280} center={points[0] ?? center} zoom={points.length ? 17 : 13} satelliteFirst>
        <BoundaryLayer points={points} />
        {points.length >= 1 && <FitBounds points={points} maxZoom={18} />}
      </BaseMap>
    </div>
  );
}

function WalkTab({ points, onChange, center }: { points: LatLng[]; onChange: (b: LatLng[]) => void; center: LatLng }) {
  const [tracking, setTracking] = useState(false);
  const [track, setTrack] = useState<LatLng[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [step, setStep] = useState(5);
  const [here, setHere] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastRef = useRef<LatLng | null>(null);
  const trackRef = useRef<LatLng[]>([]);

  useEffect(() => () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  const start = () => {
    setError(null);
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setError("Location needs a device with GPS and a secure (HTTPS) connection.");
      return;
    }
    trackRef.current = [];
    setTrack([]);
    setSkipped(0);
    lastRef.current = null;
    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHere(p);
        if (pos.coords.accuracy > MAX_TRACK_ACCURACY_M) {
          setSkipped((n) => n + 1);
          return;
        }
        if (!lastRef.current || haversineMeters(lastRef.current, p) >= step) {
          lastRef.current = p;
          trackRef.current = [...trackRef.current, p];
          setTrack(trackRef.current);
        }
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? "Location permission denied." : err.message);
        stop(false);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const stop = (keep = true) => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setTracking(false);
    if (keep) {
      const t = trackRef.current;
      if (t.length >= 3) onChange(t);
      else setError(`Only ${t.length} point(s) recorded. Walk further before finishing.`);
    }
  };

  const shown = tracking ? track : points;

  return (
    <div className="space-y-2">
      <p className="subtle text-xs">Start, then walk along the plot's edge back to where you began. A point is logged every few metres.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-muted flex items-center gap-1.5">
          Point spacing
          <select className="input !w-auto !py-1 text-xs" value={step} disabled={tracking} onChange={(e) => setStep(Number(e.target.value))}>
            {STEP_OPTIONS_M.map((m) => <option key={m} value={m}>{m} m</option>)}
          </select>
        </label>
        {!tracking ? (
          <button type="button" className="btn-primary text-xs" onClick={start}><Play size={13} /> Start walking</button>
        ) : (
          <button type="button" className="btn-orange text-xs" onClick={() => stop(true)}><Square size={13} /> Finish boundary</button>
        )}
        {tracking && <span className="text-xs text-muted">{track.length} point(s) logged{skipped ? `, ${skipped} noisy reading(s) skipped` : ""}</span>}
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
      <BaseMap height={280} center={here ?? points[0] ?? center} zoom={here || points.length ? 17 : 13} satelliteFirst>
        <BoundaryLayer points={shown} closed={!tracking} />
        {here && tracking && <CircleMarker center={toTuple(here)} radius={7} pathOptions={{ color: "#2563EB", fillColor: "#2563EB", fillOpacity: 0.6 }} />}
        {shown.length >= 1 && <FitBounds points={here && tracking ? [...shown, here] : shown} maxZoom={18} />}
      </BaseMap>
    </div>
  );
}

function FileTab({ onChange }: { onChange: (b: LatLng[]) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<number | null>(null);

  const parse = (text: string) => {
    const rows = text.split(/\r?\n/).map((r) => r.split(",").map((c) => c.trim())).filter((r) => r.some(Boolean));
    if (!rows.length) return setError("The file is empty.");
    const header = rows[0].map((h) => h.toLowerCase());
    const latCol = header.findIndex((h) => h.includes("lat"));
    const lngCol = header.findIndex((h) => h.includes("lon") || h.includes("lng"));
    if (latCol < 0 || lngCol < 0) return setError('The first row needs columns named like "Latitude" and "Longitude".');
    const pts = rows.slice(1).map((r) => ({ lat: Number(r[latCol]), lng: Number(r[lngCol]) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0));
    const invalid = validateBoundary(pts);
    if (invalid) return setError(`${invalid} Found ${pts.length} valid row(s).`);
    setError(null);
    setLoaded(pts.length);
    onChange(pts);
  };

  const template = () => {
    const csv = "Latitude,Longitude\n29.68650,76.99050\n29.68700,76.99120\n29.68640,76.99190\n29.68590,76.99110\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plot-boundary-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <p className="subtle text-xs">Upload a CSV with Latitude and Longitude columns, one corner per row, in order.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <input type="file" accept=".csv,text/csv" className="text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(parse); }} />
        <button type="button" className="btn-ghost text-xs" onClick={template}><Download size={13} /> Sample template</button>
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
      {loaded !== null && !error && <p className="text-xs text-good">Loaded {loaded} corner(s).</p>}
    </div>
  );
}

// Single-point location: GPS best-of-sample, a click on the map, or typed coordinates.
export function PointCapture({ value, onChange, center, accuracy }: { value: LatLng | null; onChange: (p: LatLng | null, accuracy: number | null) => void; center: LatLng; accuracy?: number | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState(value ? String(value.lat) : "");
  const [lng, setLng] = useState(value ? String(value.lng) : "");

  useEffect(() => {
    setLat(value ? value.lat.toFixed(6) : "");
    setLng(value ? value.lng.toFixed(6) : "");
  }, [value]);

  const useGps = async () => {
    setError(null);
    setBusy(true);
    try {
      const fix = await bestFix().promise;
      onChange(fix.point, fix.accuracy);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyTyped = () => {
    const p = { lat: Number(lat), lng: Number(lng) };
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) {
      setError("Enter a valid latitude and longitude.");
      return;
    }
    setError(null);
    onChange(p, null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        <button type="button" className="btn-primary text-xs" onClick={useGps} disabled={busy}><Navigation size={13} /> {busy ? "Reading GPS..." : "Use my location"}</button>
        <label className="text-xs text-muted">Latitude<input className="input !py-1 text-xs !w-32 block" value={lat} onChange={(e) => setLat(e.target.value)} /></label>
        <label className="text-xs text-muted">Longitude<input className="input !py-1 text-xs !w-32 block" value={lng} onChange={(e) => setLng(e.target.value)} /></label>
        <button type="button" className="btn-ghost text-xs" onClick={applyTyped}>Set</button>
        {value && <button type="button" className="btn-ghost text-xs" onClick={() => onChange(null, null)}>Clear</button>}
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
      {value && !inHaryana(value) && <p className="text-xs text-bad">This location is outside Haryana.</p>}
      {accuracy ? <p className="text-xs text-muted">GPS accuracy ±{Math.round(accuracy)} m</p> : null}
      <p className="subtle text-xs">Or click the map to place the point.</p>
      <BaseMap height={240} center={value ?? center} zoom={value ? 16 : 12}>
        <MapClick onClick={(p) => onChange(p, null)} />
        {value && <CircleMarker center={toTuple(value)} radius={8} pathOptions={{ color: "#4E2A84", fillColor: "#F5A623", fillOpacity: 0.9 }} />}
      </BaseMap>
    </div>
  );
}
