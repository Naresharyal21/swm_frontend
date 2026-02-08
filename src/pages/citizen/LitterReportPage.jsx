// src/pages/citizen/LitterReportPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { sdk } from "../../lib/sdk";
import { pickErrorMessage, toPoint } from "../../lib/utils";

/* ------------------------------------------------------------------ */
/* FIX LEAFLET DEFAULT MARKER ICON (Leaflet 1.9 + Vite compatible)     */
/* ------------------------------------------------------------------ */
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ------------------------------------------------------------------ */
/* MAP PICKER COMPONENT                                                */
/* ------------------------------------------------------------------ */

// ✅ Better default for your users (Kathmandu). Change if needed.
const DEFAULT_CENTER = [27.654070, 85.373695]; // [lat,lng]
const DEFAULT_ZOOM = 14;

function FlyToOnChange({ lat, lng, zoom = 16 }) {
  const map = useMap();
  useEffect(() => {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
    map.flyTo([la, ln], zoom, { animate: true, duration: 0.6 });
  }, [lat, lng, zoom, map]);
  return null;
}

function AutoLocateOnOpen({ enabled, onPick }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) return;

    // Try once when map opens; no toast spam.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        map.flyTo([la, ln], 16, { animate: true, duration: 0.6 });
        // only set if user hasn't picked yet
        onPick(la.toFixed(6), ln.toFixed(6), { silent: true });
      },
      () => {
        // ignore; we keep DEFAULT_CENTER
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [enabled, map, onPick]);

  return null;
}

function MapPicker({ lat, lng, onPick }) {
  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  const position = hasCoords ? [Number(lat), Number(lng)] : DEFAULT_CENTER;
  const zoom = hasCoords ? 16 : DEFAULT_ZOOM;

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        const la = e.latlng.lat.toFixed(6);
        const ln = e.latlng.lng.toFixed(6);
        onPick(la, ln, { silent: false });
        map.flyTo([Number(la), Number(ln)], 16, { animate: true, duration: 0.4 });
      },
    });

    return hasCoords ? <Marker position={position} /> : null;
  }

  return (
    <div className="h-[350px] w-full overflow-hidden rounded-xl border border-app">
      <MapContainer center={position} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ✅ If coords are typed manually, fly to them */}
        <FlyToOnChange lat={lat} lng={lng} zoom={16} />

        {/* ✅ When opened with no coords, auto-locate once (still falls back to Kathmandu) */}
        <AutoLocateOnOpen
          enabled={!hasCoords}
          onPick={(la, ln, opts) => onPick(la, ln, opts)}
        />

        <LocationMarker />
      </MapContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function LitterReportPage() {
  const qc = useQueryClient();

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  /* ---------------- COORDINATE VALIDATION ---------------- */
  const coordsOk = useMemo(() => {
    const la = Number(lat);
    const ln = Number(lng);
    return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180;
  }, [lat, lng]);

  /* ---------------- USE MY LOCATION ---------------- */
  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
        toast.success("Location detected");
      },
      (err) => {
        toast.error(err?.message || "Unable to fetch location");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* ---------------- SUBMIT MUTATION ---------------- */
  const create = useMutation({
    mutationFn: () =>
      sdk.citizen.createLitterReport({
        location: toPoint(lng, lat),
        description: description || "",
      }),
    onSuccess: (res) => {
      setCreated(res?.case || res?.item || res);
      toast.success("Litter report submitted");
      qc.invalidateQueries({ queryKey: ["citizen_cases"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const mapHref = coordsOk
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Litter Report"
        subtitle="Report litter hotspots to help the city keep streets clean."
      />

      {/* ---------------- LOCATION ---------------- */}
      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Location</div>
          <div className="text-sm text-muted">
            Enter coordinates, use GPS, or pick directly from the map.
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitude</Label>
              <Input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                inputMode="decimal"
                placeholder="27.7172"
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                inputMode="decimal"
                placeholder="85.3240"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={useMyLocation} disabled={geoLoading}>
              {geoLoading ? "Detecting…" : "Use my location"}
            </Button>

            <Button variant="outline" onClick={() => setShowMapPicker((v) => !v)}>
              {showMapPicker ? "Close map picker" : "Add map picker"}
            </Button>

            {mapHref ? (
              <a
                className="ml-auto text-sm font-medium text-[rgb(var(--brand))] hover:underline"
                href={mapHref}
                target="_blank"
                rel="noreferrer"
              >
                Preview on map
              </a>
            ) : (
              <span className="ml-auto text-xs text-muted">Enter valid coordinates</span>
            )}
          </div>

          {showMapPicker && (
            <MapPicker
              lat={lat}
              lng={lng}
              onPick={(la, ln, opts) => {
                setLat(la);
                setLng(ln);
                if (!opts?.silent) toast.success("Location selected from map");
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* ---------------- DETAILS ---------------- */}
      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Details</div>
          <div className="text-sm text-muted">Optional description of the litter.</div>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Plastic waste near bus stop"
            />
          </div>

          <div className="flex justify-end">
            <Button disabled={!coordsOk || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- CONFIRMATION ---------------- */}
      {created && (
        <Card>
          <CardHeader>
            <div className="text-base font-semibold">Submitted</div>
            <div className="text-sm text-muted">Track this in Citizen → My Cases</div>
          </CardHeader>

          <CardContent>
            <div className="rounded-2xl border border-app bg-black/5 p-4 text-sm dark:bg-white/5">
              <div className="font-semibold">Case ID: {created._id || created.id}</div>
              <div className="mt-1 text-xs text-muted">
                Status: {created.status || "PENDING_VALIDATION"}
              </div>
              {created.description && <div className="mt-2">{created.description}</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
