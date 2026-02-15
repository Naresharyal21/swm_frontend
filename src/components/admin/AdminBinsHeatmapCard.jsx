// src/components/admin/AdminBinsHeatmapCard.jsx
import React from "react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import HeatmapLayer from "../maps/HeatmapLayer";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { sdk } from "../../lib/sdk";

const zoomNormal = 16; // dashboard zoom
const zoomFullscreen = 16; // fullscreen zoom

/* ---------------------------------
   Helpers
--------------------------------- */
function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function getLatLngFromBin(b) {
  const c1 = b?.location?.coordinates;
  if (Array.isArray(c1) && c1.length >= 2) {
    const lng = toNum(c1[0]);
    const lat = toNum(c1[1]);
    if (lat != null && lng != null) return { lat, lng };
  }

  const c2 = b?.geo?.coordinates || b?.point?.coordinates || b?.position?.coordinates;
  if (Array.isArray(c2) && c2.length >= 2) {
    const lng = toNum(c2[0]);
    const lat = toNum(c2[1]);
    if (lat != null && lng != null) return { lat, lng };
  }

  const lat = toNum(b?.lat ?? b?.latitude);
  const lng = toNum(b?.lng ?? b?.lon ?? b?.longitude);
  if (lat != null && lng != null) return { lat, lng };

  return null;
}

function intensityForBin(b) {
  const fill = Math.min(Math.max(Number(b?.fillPercent ?? 0) / 100, 0), 1);
  const offlineBoost = b?.isOffline ? 0.25 : 0;
  const lowBatteryBoost = Number(b?.batteryPercent ?? 100) < 20 ? 0.15 : 0;
  const base = 0.2;
  return Math.min(base + fill + offlineBoost + lowBatteryBoost, 1);
}

/* ---------------------------------
   Pin Marker Icons (your thresholds + OFF label)
--------------------------------- */
function markerKindForBin(b) {
  const fill = Number(b?.fillPercent ?? 0);
  const offline = !!b?.isOffline;

  // offline always wins
  if (offline) return "offline";

  // thresholds
  if (fill >=70) return "red";
  if (fill >= 40) return "yellow";
  
  if (fill >= 11) return "green";
  return "blue"; // <= 10
}

function makeDivIcon(kind) {
  const bg =
    kind === "offline"
      ? "#6b7280" // grey
      : kind === "red"
      ? "#ef4444" // red
      : kind === "yellow"
      ? "#facc15" // yellow
      : kind === "orange"
      ? "#f59e0b" // orange
      : kind === "green"
      ? "#22c55e" // green
      : "#3b82f6"; // blue

  // ✅ show OFF keyword only for offline markers
  const label = kind === "offline" ? "OFF" : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:22px;height:22px;border-radius:999px;
        background:${bg};
        border:2px solid white;
        box-shadow:0 2px 10px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;
        font-size:9px;
        font-weight:800;
        color:white;
        letter-spacing:0.2px;
        text-transform:uppercase;
      ">${label}</div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

const iconCache = new Map();
function getIcon(kind) {
  if (!iconCache.has(kind)) iconCache.set(kind, makeDivIcon(kind));
  return iconCache.get(kind);
}

/**
 * Fit map to points when enabled (ONLY once)
 * points = array of [lat, lng]
 */
function FitToPoints({ points, enabled = true, padding = [30, 30] }) {
  const map = useMap();

  React.useEffect(() => {
    if (!enabled) return;
    if (!points?.length) return;

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom?.() || 1, 16), { animate: false });
      return;
    }

    map.fitBounds(points, { padding });
  }, [map, points, enabled, padding]);

  return null;
}

/**
 * Sync center+zoom together (prevents zoom being overridden after refresh)
 */
function SyncView({ center, zoom }) {
  const map = useMap();

  React.useEffect(() => {
    if (!center || !Array.isArray(center) || center.length < 2) return;
    if (!Number.isFinite(zoom)) return;
    map.setView(center, zoom, { animate: false });
  }, [map, center, zoom]);

  return null;
}

/* ---------------------------------
   Stable Map Component
--------------------------------- */
const MapBlock = React.memo(function MapBlock({
  heightClass,
  center,
  zoom,
  fitPoints,
  heatPoints,
  heatOptions,
  markerPoints,
  onMapCreated,
  enableFit,
  enableSyncView,
}) {
  return (
    <div
      className={`relative z-0 rounded-2xl overflow-hidden border border-[rgb(var(--border))] w-full ${heightClass}`}
    >
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} whenCreated={onMapCreated}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <FitToPoints points={fitPoints} enabled={enableFit} />
        {enableSyncView ? <SyncView center={center} zoom={zoom} /> : null}

        <HeatmapLayer points={heatPoints} options={heatOptions} />

        {/* ✅ color pins by fill thresholds + OFF label for offline */}
        {markerPoints.map((p) => {
          const kind = markerKindForBin(p.bin);
          return (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={getIcon(kind)}>
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                  <div>
                    <b>Bin</b>
                  </div>
                  <div>ID: {p.bin?.binId || p.bin?._id}</div>
                  <div>
                    {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
                  </div>
                  <div>Status: {p.bin?.status || "-"}</div>
                  <div>Fill: {p.bin?.fillPercent ?? "-"}%</div>
                  <div>Battery: {p.bin?.batteryPercent ?? "-"}%</div>
                  <div>Offline: {p.bin?.isOffline ? "YES" : "NO"}</div>
                  <div>Last Telemetry: {p.bin?.lastTelemetryAt ? String(p.bin.lastTelemetryAt) : "-"}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute left-3 bottom-3 z-[500] rounded-lg bg-black/70 text-white text-xs px-2 py-1">
        active bins: {markerPoints.length} | heat: {heatPoints.length}
      </div>
    </div>
  );
});

/* ---------------------------------
   Component
--------------------------------- */
export default function AdminBinsHeatmapCard() {
  const [bins, setBins] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const mapRef = React.useRef(null);
  const abortRef = React.useRef(null);

  // fit only once
  const didFitRef = React.useRef(false);

  // lock center so polling doesn't change it
  const [centerState, setCenterState] = React.useState([27.7172, 85.324]);
  const centerLockedRef = React.useRef(false);

  const load = React.useCallback(async () => {
    try {
      abortRef.current?.abort?.();
    } catch {}

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const res = await sdk.admin.listBins({
        limit: 500,
        onlyActive: true,
        signal: controller.signal,
      });
      setBins(res?.items || []);
    } catch (e) {
      const msg = e?.name === "AbortError" ? null : e?.response?.data?.message || e?.message;
      if (msg) toast.error(msg || "Failed to load bins");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {}
    };
  }, [load]);

  React.useEffect(() => {
    const id = setInterval(() => load(), 4000);
    return () => clearInterval(id);
  }, [load]);

  React.useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize?.();
    }, 120);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  const heatPoints = React.useMemo(() => {
    return (bins || [])
      .map((b) => {
        const ll = getLatLngFromBin(b);
        if (!ll) return null;
        return [ll.lat, ll.lng, intensityForBin(b)];
      })
      .filter(Boolean);
  }, [bins]);

  const fitPoints = React.useMemo(() => heatPoints.map((p) => [p[0], p[1]]), [heatPoints]);

  const markerPoints = React.useMemo(() => {
    return (bins || [])
      .map((b) => {
        const ll = getLatLngFromBin(b);
        if (!ll) return null;
        return { id: String(b?._id || b?.binId || `${ll.lat},${ll.lng}`), lat: ll.lat, lng: ll.lng, bin: b };
      })
      .filter(Boolean);
  }, [bins]);

  // set center only once when first data arrives
  React.useEffect(() => {
    if (centerLockedRef.current) return;
    if (!fitPoints.length) return;
    setCenterState(fitPoints[0]);
    centerLockedRef.current = true;
  }, [fitPoints]);

  const heatOptions = React.useMemo(() => {
    const few = heatPoints.length && heatPoints.length <= 20;
    return { radius: few ? 50 : 28, blur: few ? 30 : 18, maxZoom: 18 };
  }, [heatPoints.length]);

  const enableFit = React.useMemo(() => {
    if (didFitRef.current) return false;
    if (!fitPoints.length) return false;
    return true;
  }, [fitPoints.length]);

  React.useEffect(() => {
    if (enableFit) didFitRef.current = true;
  }, [enableFit]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="text-base font-semibold">Bin Heatmap</div>
            <div className="text-sm text-muted">Hotter = higher fill%, offline bins, or low battery.</div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsFullscreen(true)} disabled={loading}>
              Fullscreen
            </Button>
            <Button variant="secondary" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <MapBlock
            heightClass="h-[60vh]"
            center={centerState}
            zoom={zoomNormal}
            fitPoints={fitPoints}
            heatPoints={heatPoints}
            heatOptions={heatOptions}
            markerPoints={markerPoints}
            onMapCreated={(m) => (mapRef.current = m)}
            enableFit={false}
            enableSyncView={true}
          />
        </CardContent>
      </Card>

      {isFullscreen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full p-3 sm:p-4">
            <div className="h-full w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-[rgb(var(--border))]">
              <div className="flex items-center justify-between p-3 border-b border-[rgb(var(--border))]">
                <div className="font-semibold">Bin Heatmap (Fullscreen)</div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={load} disabled={loading}>
                    {loading ? "Loading…" : "Refresh"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsFullscreen(false)}>
                    Exit
                  </Button>
                </div>
              </div>

              <div className="h-[calc(100%-52px)]">
                <MapBlock
                  heightClass="h-full"
                  center={centerState}
                  zoom={zoomFullscreen}
                  fitPoints={fitPoints}
                  heatPoints={heatPoints}
                  heatOptions={heatOptions}
                  markerPoints={markerPoints}
                  onMapCreated={(m) => (mapRef.current = m)}
                  enableFit={false}
                  enableSyncView={true}
                />
              </div>
            </div>
          </div>

          <button
            aria-label="Close fullscreen"
            className="absolute inset-0 -z-10"
            onClick={() => setIsFullscreen(false)}
          />
        </div>
      )}
    </>
  );
}
