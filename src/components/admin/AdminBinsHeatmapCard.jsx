import React from "react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

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

  const load = async () => {
    try {
      setLoading(true);
      const res = await sdk.admin.listBins({ limit: 500 }); // params optional
      const items = res?.items || [];
      setBins(items);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load bins");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const points = bins
    .map((b) => {
      const ll = geoToLatLng(b.location);
      if (!ll) return null;
      return [ll.lat, ll.lng, intensityForBin(b)];
    })
    .filter(Boolean);

  const center = points.length ? [points[0][0], points[0][1]] : [27.7172, 85.324];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="text-base font-semibold">Bin Heatmap</div>
          <div className="text-sm text-muted">
            Hotter = higher fill%, offline bins, or low battery.
          </div>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </CardHeader>

      <CardContent>
        {/* <div className="rounded-2xl overflow-hidden border border-[rgb(var(--border))] h-[420px]"> */}
        <div className="rounded-2xl overflow-hidden border border-[rgb(var(--border))] h-[85vh] w-full">
    
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <HeatmapLayer points={points} options={{ radius: 28, blur: 18, maxZoom: 16 }} />

            {/* Optional click markers */}
            {/* {bins.map((b) => {
              const ll = geoToLatLng(b.location);
              if (!ll) return null;
              return (
                <CircleMarker key={b._id} center={[ll.lat, ll.lng]} radius={6}>
                  <Popup>
                    <div className="text-sm space-y-1">
                      <div className="font-semibold">{b.binId || b._id}</div>
                      <div>Fill: {b.fillPercent ?? 0}%</div>
                      <div>Battery: {b.batteryPercent ?? "—"}% ({b.batteryState || "—"})</div>
                      <div>Offline: {b.isOffline ? "Yes" : "No"}</div>
                      <div>Status: {b.status || "—"}</div>
                      <div className="text-xs text-muted">Household: {b.householdId}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })} */}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
