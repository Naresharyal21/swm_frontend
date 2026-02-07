import React from "react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import HeatmapLayer from "../maps/HeatmapLayer";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { sdk } from "../../lib/sdk";

function geoToLatLng(location) {
  const c = location?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function intensityForBin(b) {
  const fill = Math.min(Math.max(Number(b.fillPercent || 0) / 100, 0), 1);
  const offlineBoost = b.isOffline ? 0.25 : 0;
  const lowBatteryBoost = Number(b.batteryPercent || 100) < 20 ? 0.15 : 0;
  return Math.min(fill + offlineBoost + lowBatteryBoost, 1);
}

export default function AdminBinsHeatmapCard() {
  const [bins, setBins] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Keep a handle to the map instance so we can invalidateSize on toggle
  const mapRef = React.useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await sdk.admin.listBins({ limit: 500 });
      setBins(res?.items || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load bins");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  // Prevent background scroll while fullscreen is open
  React.useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  // After layout changes, tell Leaflet to recalc size
  React.useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize?.();
    }, 80);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  const points = React.useMemo(() => {
    return bins
      .map((b) => {
        const ll = geoToLatLng(b.location);
        if (!ll) return null;
        return [ll.lat, ll.lng, intensityForBin(b)];
      })
      .filter(Boolean);
  }, [bins]);

  const center = React.useMemo(() => {
    return points.length ? [points[0][0], points[0][1]] : [27.7172, 85.324];
  }, [points]);

  const MapBlock = ({ heightClass }) => (
    <div
      className={`relative z-0 rounded-2xl overflow-hidden border border-[rgb(var(--border))] w-full ${heightClass}`}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(m) => {
          mapRef.current = m;
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatmapLayer points={points} options={{ radius: 28, blur: 18, maxZoom: 16 }} />
      </MapContainer>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="text-base font-semibold">Bin Heatmap</div>
            <div className="text-sm text-muted">
              Hotter = higher fill%, offline bins, or low battery.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFullscreen(true)}
              disabled={loading}
            >
              Fullscreen
            </Button>

            <Button variant="secondary" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Normal view height */}
          <MapBlock heightClass="h-[85vh]" />
        </CardContent>
      </Card>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
          {/* Keep it below navbar if navbar is z-50 */}
          <div className="h-full w-full p-3 sm:p-4">
            <div className="h-full w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-[rgb(var(--border))]">
              <div className="flex items-center justify-between p-3 border-b border-[rgb(var(--border))]">
                <div className="font-semibold">Bin Heatmap (Fullscreen)</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={load}
                    disabled={loading}
                  >
                    {loading ? "Loading…" : "Refresh"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsFullscreen(false)}>
                    Exit
                  </Button>
                </div>
              </div>

              {/* Full viewport map inside overlay */}
              <div className="h-[calc(100%-52px)]">
                <MapBlock heightClass="h-full" />
              </div>
            </div>
          </div>

          {/* click outside to close (optional) */}
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
