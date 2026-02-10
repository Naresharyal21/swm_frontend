// src/components/admin/AdminBinsHeatmapCard.jsx
import React from "react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import HeatmapLayer from "../maps/HeatmapLayer";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { sdk } from "../../lib/sdk";

/* ---------------------------------
   Helpers
--------------------------------- */
function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Supports:
 * - location.coordinates = [lng, lat] (GeoJSON)
 * - geo/point/position coordinates
 * - lat/lng fields
 */
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

/**
 * Heatmap weight:
 * - ensure non-zero base so points are visible even at 0% fill
 * - keep within [0,1]
 */
function intensityForBin(b) {
  const fill = Math.min(Math.max(Number(b?.fillPercent ?? 0) / 100, 0), 1);
  const offlineBoost = b?.isOffline ? 0.25 : 0;
  const lowBatteryBoost = Number(b?.batteryPercent ?? 100) < 20 ? 0.15 : 0;

  const base = 0.2; // ✅ key for visibility
  return Math.min(base + fill + offlineBoost + lowBatteryBoost, 1);
}

/**
 * Fit map to points once we have them (and after size changes).
 * Works without importing leaflet (uses react-leaflet map API).
 */
function FitToPoints({ points, enabled = true }) {
  const map = useMap();

  React.useEffect(() => {
    if (!enabled) return;
    if (!points?.length) return;

    const latLngs = points.map((p) => [p[0], p[1]]);
    // If only 1 point, use setView instead of fitBounds (better UX)
    if (latLngs.length === 1) {
      map.setView(latLngs[0], Math.max(map.getZoom?.() || 13, 14));
      return;
    }
    map.fitBounds(latLngs, { padding: [30, 30] });
  }, [map, points, enabled]);

  return null;
}

/* ---------------------------------
   Component
--------------------------------- */
export default function AdminBinsHeatmapCard() {
  const [bins, setBins] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const mapRef = React.useRef(null);
  const abortRef = React.useRef(null);

  const load = React.useCallback(async () => {
    // cancel any in-flight request (prevents race conditions)
    try {
      abortRef.current?.abort?.();
    } catch {}
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const res = await sdk.admin.listBins({ limit: 500, signal: controller.signal });
      const items = res?.items || [];
      setBins(items);
    } catch (e) {
      // ignore abort errors
      const msg = e?.name === "AbortError" ? null : (e?.response?.data?.message || e?.message);
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

  // Prevent background scroll in fullscreen
  React.useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  // Recompute map size after fullscreen toggle
  React.useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize?.();
    }, 120);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  const { points, center } = React.useMemo(() => {
    const pts = (bins || [])
      .map((b) => {
        const ll = getLatLngFromBin(b);
        if (!ll) return null;
        return [ll.lat, ll.lng, intensityForBin(b)];
      })
      .filter(Boolean);

    const c = pts.length ? [pts[0][0], pts[0][1]] : [27.7172, 85.324];
    return { points: pts, center: c };
  }, [bins]);

  // Heatmap options: make it more visible when bins are few
  const heatOptions = React.useMemo(() => {
    const few = points.length && points.length <= 20;
    return {
      radius: few ? 50 : 28,
      blur: few ? 30 : 18,
      maxZoom: 18,
    };
  }, [points.length]);

  const MapBlock = React.useCallback(
    ({ heightClass }) => (
      <div className={`relative z-0 rounded-2xl overflow-hidden border border-[rgb(var(--border))] w-full ${heightClass}`}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(m) => {
            mapRef.current = m;
          }}
        >
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Zoom to bins automatically */}
          <FitToPoints points={points} enabled />

          {/* Heatmap */}
          <HeatmapLayer points={points} options={heatOptions} />

          {/* Always-visible bin dots (so "bins are visible" even with low intensity) */}
          {points.map((p, i) => (
            <CircleMarker key={i} center={[p[0], p[1]]} radius={7} pathOptions={{ weight: 2 }}>
              <Popup>
                <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                  <div><b>Bin</b></div>
                  <div>{p[0].toFixed(6)}, {p[1].toFixed(6)}</div>
                  <div>Weight: {Number(p[2]).toFixed(2)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Small status badge */}
        <div className="absolute left-3 bottom-3 z-[500] rounded-lg bg-black/70 text-white text-xs px-2 py-1">
          bins: {bins.length} | plotted: {points.length}
        </div>
      </div>
    ),
    [bins.length, center, heatOptions, points]
  );

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
          {/* Normal view height (85vh is heavy; 60vh is smoother on dashboards.
              Keep your 85vh if you want. */}
          <MapBlock heightClass="h-[60vh]" />
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
                <MapBlock heightClass="h-full" />
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
