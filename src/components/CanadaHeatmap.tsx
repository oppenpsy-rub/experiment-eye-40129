import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';

interface CanadaHeatmapProps {
  labels: string[];
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const KEY_TO_COORDS: Record<string, { label: string; lat: number; lng: number }> = {
  'montreal': { label: 'Montréal', lat: 45.5017, lng: -73.5673 },
  'quebec (ville)': { label: 'Québec (Ville)', lat: 46.8139, lng: -71.2080 },
  'quebec (province)': { label: 'Québec (Province)', lat: 52.0, lng: -71.5 },
  'ontario': { label: 'Ontario', lat: 50.0, lng: -85.0 },
  'new brunswick': { label: 'New Brunswick', lat: 46.5, lng: -66.5 },
  'nova scotia': { label: 'Nova Scotia', lat: 45.0, lng: -63.0 },
  'prince edward island': { label: 'Prince Edward Island', lat: 46.4, lng: -63.0 },
  'newfoundland and labrador': { label: 'Newfoundland & Labrador', lat: 53.0, lng: -59.0 },
  'manitoba': { label: 'Manitoba', lat: 50.0, lng: -97.0 },
  'saskatchewan': { label: 'Saskatchewan', lat: 52.0, lng: -106.0 },
  'alberta': { label: 'Alberta', lat: 53.9, lng: -114.0 },
  'british columbia': { label: 'British Columbia', lat: 53.7, lng: -123.0 },
  'yukon': { label: 'Yukon', lat: 64.0, lng: -135.0 },
  'northwest territories': { label: 'Northwest Territories', lat: 64.0, lng: -120.0 },
  'nunavut': { label: 'Nunavut', lat: 66.0, lng: -90.0 },
};

const getHeatColor = (intensity: number): string => {
  const clamped = Math.max(0, Math.min(1, intensity));
  const hue = (1 - clamped) * 220; // 220 (Blau) bis 0 (Rot)
  return `hsl(${hue}, 85%, 55%)`;
};

// Mappe französische/kanonische Labels auf unsere Schlüssel
const toKey = (label: string): string | null => {
  const ns = norm(label);
  if (!ns) return null;
  // Städte
  if (ns.includes('montreal')) return 'montreal';
  if (ns.includes('quebec') && ns.includes('ville')) return 'quebec (ville)';
  // Provinzen (fr/de/en Varianten)
  if (ns.includes('quebec') && ns.includes('province')) return 'quebec (province)';
  if (ns.includes('ontario')) return 'ontario';
  if (ns.includes('nouveau brunswick') || ns.includes('new brunswick')) return 'new brunswick';
  if (ns.includes('nouvelle ecosse') || ns.includes('nova scotia')) return 'nova scotia';
  if (ns.includes('ile du prince') || ns.includes('prince edward')) return 'prince edward island';
  if (ns.includes('terre neuve') || ns.includes('labrador')) return 'newfoundland and labrador';
  if (ns.includes('manitoba')) return 'manitoba';
  if (ns.includes('saskatchewan')) return 'saskatchewan';
  if (ns.includes('alberta')) return 'alberta';
  if (ns.includes('colombie britannique') || ns.includes('british columbia')) return 'british columbia';
  if (ns.includes('yukon')) return 'yukon';
  if (ns.includes('territoires du nord ouest') || ns.includes('northwest territories')) return 'northwest territories';
  if (ns.includes('nunavut')) return 'nunavut';
  return null;
};

// Zähle Oui-Nennungen pro Ort/Provinz
const buildCounts = (labels: string[]) => {
  const counts: Record<string, number> = {};
  Object.keys(KEY_TO_COORDS).forEach(k => { counts[k] = 0; });
  labels.forEach(s => {
    const key = toKey(s);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};

// Provinz-Grenzen (GeoJSON): zuerst lokal, dann Fallback externe Quelle
const PROVINCES_GEOJSON_URLS = [
  '/data/canada_provinces.geojson',
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson',
];

const nameToKey = (name: string): string | null => {
  const n = norm(name);
  if (n.includes('quebec')) return 'quebec (province)';
  if (n.includes('ontario')) return 'ontario';
  if (n.includes('new brunswick') || n.includes('nouveau brunswick')) return 'new brunswick';
  if (n.includes('nova scotia') || n.includes('nouvelle ecosse')) return 'nova scotia';
  if (n.includes('prince edward')) return 'prince edward island';
  if (n.includes('newfoundland') || n.includes('labrador') || n.includes('terre neuve')) return 'newfoundland and labrador';
  if (n.includes('manitoba')) return 'manitoba';
  if (n.includes('saskatchewan')) return 'saskatchewan';
  if (n.includes('alberta')) return 'alberta';
  if (n.includes('british columbia') || n.includes('colombie britannique')) return 'british columbia';
  if (n.includes('yukon')) return 'yukon';
  if (n.includes('northwest territories') || n.includes('territoires du nord ouest')) return 'northwest territories';
  if (n.includes('nunavut')) return 'nunavut';
  return null;
};

export const CanadaHeatmap = ({ labels }: CanadaHeatmapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const provincesLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const provincesGeoJsonRef = useRef<any | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomSnap: 0, zoomDelta: 0.25, renderer: L.svg() }).setView([55, -100], 3.5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
      overlayRef.current = L.layerGroup().addTo(mapRef.current);
    }

    overlayRef.current?.clearLayers();

    // 1) Aggregiere Oui-Zählungen je Ort/Provinz
    const counts = buildCounts(labels);
    // 2) Choropleth: echte Provinzgrenzen via GeoJSON
    const ensureProvincesGeoJson = async (): Promise<any | null> => {
      if (provincesGeoJsonRef.current) return provincesGeoJsonRef.current;
      for (const url of PROVINCES_GEOJSON_URLS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = await res.json();
          const features = Array.isArray(json?.features) ? json.features : [];
          if (features.length === 0) {
            // leere Sammlung ignorieren
            continue;
          }
          provincesGeoJsonRef.current = json;
          return json;
        } catch (_) {
          // probiere nächste URL
          continue;
        }
      }
      console.warn('Province GeoJSON laden fehlgeschlagen, fallback auf Städte');
      return null;
    };

    const renderProvinces = async () => {
      const geojson = await ensureProvincesGeoJson();
      const map = mapRef.current;
      if (!map) return;
      if (!geojson) {
        // Fallback: Städte anzeigen, wenn Provinzen-Grenzen fehlen
        const cityKeys = ['montreal', 'quebec (ville)'];
        const maxCity = Math.max(1, ...cityKeys.map(k => counts[k] || 0));
        cityKeys.forEach(k => {
          const c = counts[k] || 0;
          if (c <= 0) return;
          const { lat, lng, label } = KEY_TO_COORDS[k];
          const intensity = c / maxCity;
          const color = getHeatColor(intensity);
          L.circle([lat, lng], {
            radius: 20000 + Math.sqrt(c) * 40000,
            color,
            fillColor: color,
            fillOpacity: Math.min(0.85, 0.35 + intensity * 0.65),
            weight: 0,
          }).addTo(overlayRef.current!).bindPopup(`<strong>${label}</strong><br/>Nennungen: ${c}`);
        });
        return;
      }

      // Entferne alte Layer
      provincesLayerRef.current && map.removeLayer(provincesLayerRef.current);

      // Berechne Max-Wert für Intensität
      const provinceNames: string[] = (geojson.features || []).map((f: any) => String(f.properties?.name || f.properties?.NAME || ''));
      const provinceKeys = provinceNames.map(nameToKey).filter((k): k is string => !!k);
      const maxProvinceCount = Math.max(1, ...provinceKeys.map(k => counts[k] || 0));

      provincesLayerRef.current = L.geoJSON(geojson, {
        style: (feature: any) => {
          const rawName = String(feature.properties?.name || feature.properties?.NAME || '');
          const key = nameToKey(rawName);
          const c = key ? (counts[key] || 0) : 0;
          const intensity = maxProvinceCount > 0 ? (c / maxProvinceCount) : 0;
          const color = getHeatColor(intensity);
          return {
            color: color,
            fillColor: color,
            fillOpacity: c > 0 ? Math.min(0.85, 0.35 + intensity * 0.65) : 0,
            weight: c > 0 ? 1 : 0.5,
            opacity: c > 0 ? 0.8 : 0.3,
          } as L.PathOptions;
        },
        onEachFeature: (feature: any, layer: L.Layer) => {
          const rawName = String(feature.properties?.name || feature.properties?.NAME || '');
          const key = nameToKey(rawName);
          const label = key ? KEY_TO_COORDS[key]?.label || rawName : rawName;
          const c = key ? (counts[key] || 0) : 0;
          if ((layer as any).bindPopup) {
            (layer as any).bindPopup(`<strong>${label}</strong><br/>Nennungen: ${c}`);
          }
        }
      }).addTo(map);
    };

    renderProvinces();
  }, [labels]);

  return (
    <Card className="p-4">
      <h4 className="font-medium mb-2">Provinz-Choropleth – Oui-Antworten: Wo spricht man québécois?</h4>
      <div ref={containerRef} style={{ width: '100%', height: 360 }} />
    </Card>
  );
};

export default CanadaHeatmap;