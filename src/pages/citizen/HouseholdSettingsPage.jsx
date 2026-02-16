// src/pages/citizen/HouseholdSettingsPage.jsx
import L from "leaflet";
import toast from "react-hot-toast";

import { useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";

import { sdk } from "../../lib/sdk";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { EmptyState } from "../../components/ui/empty";
import { Input, Label } from "../../components/ui/input";
import { PageHeader } from "../../components/layout/PageHeader";
import { pickErrorMessage, formatDateTime } from "../../lib/utils";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Table, THead, TH, TR, TD } from "../../components/ui/table";

/* ------------------------------------------------------------------ */
/* Leaflet marker fix (Leaflet 1.9 + Vite)                             */
/* ------------------------------------------------------------------ */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ------------------------------------------------------------------ */
/* Map picker                                                          */
/* ------------------------------------------------------------------ */
const DEFAULT_CENTER = [27.65407, 85.373695]; // Kathmandu [lat,lng]
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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        map.flyTo([la, ln], 16, { animate: true, duration: 0.6 });
        onPick(la.toFixed(6), ln.toFixed(6), { silent: true });
      },
      () => {},
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
        <FlyToOnChange lat={lat} lng={lng} zoom={16} />
        <AutoLocateOnOpen enabled={!hasCoords} onPick={onPick} />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}

function toPoint(lng, lat) {
  return { type: "Point", coordinates: [Number(lng), Number(lat)] };
}

function safeId(x) {
  return x?._id || x?.id;
}

function statusBadgeVariant(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE") return "success";
  if (s === "INACTIVE") return "warning";
  if (s === "SUSPENDED") return "danger";
  return "secondary";
}

// ✅ Handles Mongo EJSON like: { "$date": "2026-02-09T17:15:45.437Z" }
function normalizeDate(v) {
  if (!v) return null;
  if (typeof v === "string") return v;

  if (typeof v === "object") {
    if (v.$date) return v.$date;
    if (v.$date?.$numberLong) {
      const ms = Number(v.$date.$numberLong);
      if (Number.isFinite(ms)) return new Date(ms).toISOString();
    }
  }

  try {
    return String(v);
  } catch {
    return null;
  }
}

function formatCreated(v) {
  const iso = normalizeDate(v);
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function HouseholdSettingsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();

  // -----------------------
  // Form state
  // -----------------------
  const [zoneId, setZoneId] = useState("");
  const [virtualBinId, setVirtualBinId] = useState("");
  const [address, setAddress] = useState("");

  const [binId, setBinId] = useState("");
  const [binSearch, setBinSearch] = useState("");

  // ✅ Device fields (required) - CONTROLLED ONLY
  const [deviceId, setDeviceId] = useState("");
  const [deviceKey, setDeviceKey] = useState("");

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(true);

  // -----------------------
  // Queries
  // -----------------------
  const zonesQ = useQuery({
    queryKey: ["citizen_zones"],
    queryFn: () => sdk.citizen.listZones(),
  });
  const zones = zonesQ.data?.items || [];

  const vbsQ = useQuery({
    queryKey: ["citizen_virtual_bins", zoneId],
    queryFn: () => sdk.citizen.listVirtualBins(zoneId ? { zoneId } : {}),
    enabled: true,
  });
  const vbs = vbsQ.data?.items || [];

  const availableBinIdsQ = useQuery({
    queryKey: ["citizen_available_binids", binSearch],
    queryFn: () => sdk.citizen.listAvailableBinIds({ q: binSearch || undefined, limit: 50 }),
    enabled: true,
  });
  const availableBinIds = availableBinIdsQ.data?.items || [];

  const myHouseholdsQ = useQuery({
    queryKey: ["citizen_my_households"],
    queryFn: () => sdk.citizen.getMyHouseholds(),
  });
  const myHouseholds = myHouseholdsQ.data?.items || [];

  useEffect(() => {
    if (!zoneId && zones.length) setZoneId(safeId(zones[0]));
  }, [zones, zoneId]);

  useEffect(() => {
    setVirtualBinId("");
  }, [zoneId]);

  useEffect(() => {
    if (!virtualBinId && vbs.length) setVirtualBinId(safeId(vbs[0]));
  }, [vbs, virtualBinId]);

  // -----------------------
  // Coordinate validation
  // -----------------------
  const coordsOk = useMemo(() => {
    const la = Number(lat);
    const ln = Number(lng);
    return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180;
  }, [lat, lng]);

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

  // -----------------------
  // Submit
  // -----------------------
  const create = useMutation({
    mutationFn: async () => {
      const did = String(deviceId || "").trim();
      const dkey = String(deviceKey || "").trim();

      if (!zoneId) throw new Error("Zone is required");
      if (!virtualBinId) throw new Error("Virtual bin is required");
      if (!address.trim()) throw new Error("Household name is required");
      if (!binId.trim()) throw new Error("Bin ID is required (select from list)");
      if (!did) throw new Error("Device ID is required");
      if (!dkey) throw new Error("Device Key is required");
      if (!coordsOk) throw new Error("Valid coordinates required");

      return sdk.citizen.createHouseholdWithBin({
        zoneId,
        virtualBinId,
        address: address.trim(),
        binId: binId.trim(),
        deviceId: did,
        deviceKey: dkey,
        location: toPoint(lng, lat),
      });
    },
    onSuccess: () => {
      toast.success("Household + Bin created (Bin is INACTIVE until activation)");
      setAddress("");
      setBinId("");
      setBinSearch("");
      setDeviceId("");
      setDeviceKey("");
      setLat("");
      setLng("");
      qc.invalidateQueries({ queryKey: ["citizen_my_households"] });
      qc.invalidateQueries({ queryKey: ["citizen_available_binids"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  // -----------------------
  // ✅ Delete household (+ bins cascade=1) + backend deletes device docs
  // -----------------------
  const del = useMutation({
    mutationFn: async (h) => {
      const id = safeId(h);
      if (!id) throw new Error("Missing household id");
      return sdk.citizen.deleteHouseholdWithBins(id);
    },
    onSuccess: (res) => {
      const deletedBins = Number(res?.deletedBins || 0);
      const deletedDevices = Number(res?.deletedDevices || 0);
      toast.success(`Deleted. bins=${deletedBins}, devices=${deletedDevices}`);

      qc.invalidateQueries({ queryKey: ["citizen_my_households"] });
      qc.invalidateQueries({ queryKey: ["citizen_available_binids"] });
    },
    onError: (e) => toast.error(pickErrorMessage(e)),
  });

  const mapHref = coordsOk
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : null;

  const zoneNameById = useMemo(() => {
    const m = {};
    for (const z of zones) m[safeId(z)] = z?.name || z?.wardCode || safeId(z);
    return m;
  }, [zones]);

  function householdStatus(h) {
    const s = h?.bin?.status || h?.binStatus || h?.status;
    if (s) return String(s).toUpperCase();
    return h?.planId ? "ACTIVE" : "INACTIVE";
  }

  const deviceIdOk = String(deviceId || "").trim();
  const deviceKeyOk = String(deviceKey || "").trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Household + Bin Setup"
        subtitle="Create household + bin in one step. Activate from Billing Plans."
      />

      <Card>
        <CardHeader>
          <div className="text-base font-semibold">Create (one-step)</div>
          <div className="text-sm text-muted">
            Bin will start as <b>INACTIVE</b>. You can activate it from <b>Billing Plans</b>.
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Zone *</Label>
              <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">{zonesQ.isLoading ? "Loading zones..." : "Select zone"}</option>
                {zones.map((z) => (
                  <option key={safeId(z)} value={safeId(z)}>
                    {z.name} {z.wardCode ? `(${z.wardCode})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Virtual bin *</Label>
              <Select value={virtualBinId} onChange={(e) => setVirtualBinId(e.target.value)}>
                <option value="">
                  {vbsQ.isLoading
                    ? "Loading virtual bins..."
                    : zoneId
                      ? "Select virtual bin"
                      : "Select zone first"}
                </option>
                {vbs.map((vb) => (
                  <option key={safeId(vb)} value={safeId(vb)}>
                    {vb.name || safeId(vb)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Household Name *</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g myhome01 " />
            </div>

            <div className="space-y-2">
              <Label>Bin ID *</Label>

              <Input
                value={binSearch}
                onChange={(e) => setBinSearch(e.target.value)}
                placeholder="Search available BIN IDs (e.g., 0001)"
              />

              <Select value={binId} onChange={(e) => setBinId(e.target.value)}>
                <option value="">
                  {availableBinIdsQ.isLoading
                    ? "Loading available bins..."
                    : availableBinIds.length
                      ? "Select BIN ID"
                      : "No BIN IDs available (ask admin to generate)"}
                </option>
                {availableBinIds.map((b) => (
                  <option key={safeId(b) || b.code} value={b.code}>
                    {b.code}
                  </option>
                ))}
              </Select>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => availableBinIdsQ.refetch()}
                  disabled={availableBinIdsQ.isFetching}
                >
                  {availableBinIdsQ.isFetching ? "Refreshing..." : "Refresh Bin IDs"}
                </Button>

                <span className="text-xs text-muted">
                  {availableBinIdsQ.isLoading ? "…" : `${availableBinIds.length} shown`}
                </span>
              </div>

              {binId ? (
                <div className="text-xs text-muted">
                  Selected: <b>{binId}</b>
                </div>
              ) : null}
            </div>
          </div>

          {/* ✅ Device fields (required) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Device ID *</Label>
              <Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g DEV-KTM-0001" />
            </div>

            <div>
              <Label>Device Key *</Label>
              <Input
                type="text"
                value={deviceKey}
                onChange={(e) => setDeviceKey(e.target.value)}
                placeholder="Enter key printed on device"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitude *</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="27.7172" />
            </div>
            <div>
              <Label>Longitude *</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="85.3240" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={useMyLocation} disabled={geoLoading}>
              {geoLoading ? "Detecting…" : "Use my location"}
            </Button>

            <Button variant="outline" onClick={() => setShowMapPicker((v) => !v)}>
              {showMapPicker ? "Close map picker" : "Open map picker"}
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

          <div className="flex justify-end">
            <Button
              disabled={
                !zoneId ||
                !virtualBinId ||
                !address.trim() ||
                !binId.trim() ||
                !deviceIdOk ||
                !deviceKeyOk ||
                !coordsOk ||
                create.isPending
              }
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create Household + Bin"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold">My Households</div>
            <span className="text-sm text-muted">Status shows whether bin is active/inactive.</span>

            <Button
              type="button"
              className="ml-auto"
              variant="secondary"
              onClick={() => nav("/app/citizen/billing-plans")}
            >
              Go to Activate Bin
            </Button>
          </div>

          <div className="text-sm text-muted mt-1">
            To activate your bin, purchase a monthly/yearly plan from <b>Billing Plans</b>.
          </div>
        </CardHeader>

        <CardContent className="py-4">
          {myHouseholdsQ.isLoading ? (
            <div className="text-sm text-muted">Loading households...</div>
          ) : myHouseholds.length === 0 ? (
            <EmptyState title="No households" description="Create your first household + bin using the form above." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Household Name</TH>
                  <TH>Zone</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <tbody>
                {myHouseholds.map((h) => {
                  const status = householdStatus(h);
                  return (
                    <TR key={safeId(h)}>
                      <TD className="font-medium">{h.address || safeId(h)}</TD>
                      <TD className="text-sm">{zoneNameById[h.zoneId] || h.zoneId || <span className="text-muted">—</span>}</TD>
                      <TD>
                        <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
                      </TD>
                      <TD className="text-xs text-muted">
                        {formatDateTime?.(normalizeDate(h.createdAt)) || formatCreated(h.createdAt)}
                      </TD>
                      <TD className="text-right">
                        <Button
                          variant="danger"
                          disabled={del.isPending}
                          onClick={() => {
                            const msg =
                              `Delete household "${h.address}"?\n\n` +
                              `This will also delete:\n` +
                              `• Bin records\n` +
                              `• Paired device document (iot_devices)\n\n` +
                              `Continue?`;
                            if (confirm(msg)) del.mutate(h);
                          }}
                        >
                          {del.isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
