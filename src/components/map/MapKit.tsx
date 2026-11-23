import { useEffect, type ReactNode } from "react";
import { LayersControl, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { HARYANA_CENTER, type LatLng } from "../../data/haryanaMaster";

// Street map from OpenStreetMap, imagery from Esri World Imagery. Both need internet access.
export function BaseMap({
  children,
  height = 480,
  center = HARYANA_CENTER,
  zoom = 7,
  satelliteFirst = false,
}: {
  children?: ReactNode;
  height?: number | string;
  center?: LatLng;
  zoom?: number;
  satelliteFirst?: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-border relative z-0" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked={!satelliteFirst} name="Map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked={satelliteFirst} name="Satellite">
            <TileLayer attribution="Imagery &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
          </LayersControl.BaseLayer>
        </LayersControl>
        {children}
      </MapContainer>
    </div>
  );
}

export function FitBounds({ points, maxZoom = 16 }: { points: LatLng[]; maxZoom?: number }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    const bounds: LatLngBoundsExpression = points.map((p) => [p.lat, p.lng] as LatLngTuple);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, maxZoom]);
  return null;
}

export function MapClick({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export const toTuple = (p: LatLng): LatLngTuple => [p.lat, p.lng];
