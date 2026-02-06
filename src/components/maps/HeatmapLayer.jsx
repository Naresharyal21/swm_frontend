// src/components/maps/HeatmapLayer.jsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ points = [], options = {} }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // points format: [[lat, lng, intensity], ...]
    const layer = L.heatLayer(points, {
      radius: 18,
      blur: 10,
      maxZoom: 10,
      ...options,
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(points), JSON.stringify(options)]);

  return null;
}
