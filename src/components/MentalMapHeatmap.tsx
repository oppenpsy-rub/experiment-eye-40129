import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toPng } from 'html-to-image';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Flame, Maximize2, Minimize2 } from "lucide-react";
import { MentalMapData } from '@/types/experiment';

interface MentalMapHeatmapProps {
  mentalMapData: MentalMapData;
  participantCodes: string[];
}

const QUESTION_LABELS: Record<string, string> = {
  'question_1759182137760': 'Q1: Français standard',
  'question_1759182173682': 'Q2: Français du Sud',
  'question_1759182174190': 'Q3: Français le plus correct',
  'question_1759182174807': 'Q4: Français le plus agréable',
  'question_1759182175101': 'Q5: Français le plus sympathique',
  'question_1759182175387': 'Q6: Français le plus joli',
  'question_1759182175638': 'Q7: Français le plus laid',
  'question_1759182175890': 'Q8: Français le plus compréhensible',
  'question_1759182176276': 'Q9: Français sans accent',
};

// Create a grid-based heatmap by counting overlaps
const createHeatmapData = (features: any[], gridSize: number = 0.5) => {
  const grid: Record<string, number> = {};
  
  features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0];
      
      // Get bounding box
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      
      coords.forEach((coord: number[]) => {
        const [lng, lat] = coord;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
      
      // Fill grid cells within polygon
      for (let lat = minLat; lat <= maxLat; lat += gridSize) {
        for (let lng = minLng; lng <= maxLng; lng += gridSize) {
          // Check if point is inside polygon using ray casting
          const point: [number, number] = [lng, lat];
          if (isPointInPolygon(point, coords)) {
            const key = `${Math.round(lat / gridSize)}_${Math.round(lng / gridSize)}`;
            grid[key] = (grid[key] || 0) + 1;
          }
        }
      }
    }
  });
  
  return grid;
};

// Einfache Glättung: Mittelwert der Nachbarzellen (3x3 Kernel)
const smoothGrid = (grid: Record<string, number>): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const key in grid) {
    const [latKey, lngKey] = key.split('_').map(Number);
    let sum = 0;
    let count = 0;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const nkey = `${latKey + di}_${lngKey + dj}`;
        if (grid[nkey] !== undefined) {
          sum += grid[nkey];
          count++;
        }
      }
    }
    result[key] = count ? sum / count : grid[key];
  }
  return result;
};

// Ray casting algorithm to check if point is in polygon
const isPointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
};

export const MentalMapHeatmap = ({ mentalMapData, participantCodes }: MentalMapHeatmapProps) => {
  const INTERACTIVE_THRESHOLD = 0.1; // Ab diesem Raster sind per-Zelle Listener vertretbar
  const CANVAS_THRESHOLD = 0.05; // Unter diesem Raster als Canvas zeichnen
  const mapRef = useRef<L.Map | null>(null);
  const overlaysRef = useRef<L.LayerGroup | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const mapClickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
  const finalGridRef = useRef<Float32Array | null>(null);
  const gridExtentRef = useRef<{ minLatKey: number; minLngKey: number; width: number; height: number } | null>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasActiveRef = useRef<boolean>(false);
  const redrawCanvasRef = useRef<(() => void) | null>(null);
  const hoverDivRef = useRef<HTMLDivElement | null>(null);
  const maxCountRef = useRef<number>(1);
  const reverseGeocodeCacheRef = useRef<Map<string, { region?: string; departement?: string; commune?: string }>>(new Map());
  const hoverFetchTimerRef = useRef<number | null>(null);
  const lastFetchAtRef = useRef<number>(0);
  const lastHoverKeyRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('all');
  const initialQuestionSetRef = useRef<boolean>(false);
  const [showOutlines, setShowOutlines] = useState<boolean>(false);
  const [outlineLevel, setOutlineLevel] = useState<"regions" | "departements" | "communes">("regions");
const [gridSizeInput, setGridSizeInput] = useState<number>(0.05);
const [gridSize, setGridSize] = useState<number>(0.05);
  const [smoothing, setSmoothing] = useState<boolean>(true);
  const [filterParticipants, setFilterParticipants] = useState<boolean>(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mapHeight, setMapHeight] = useState<number>(500);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [phase, setPhase] = useState<string>("");
  const [smoothingStrength, setSmoothingStrength] = useState<number>(2);
  const frRegionsRef = useRef<any[] | null>(null);
  const frRegionsLoadingRef = useRef<boolean>(false);
  const frDepartementsRef = useRef<any[] | null>(null);
  const frDepartementsLoadingRef = useRef<boolean>(false);
  const frCommunesRef = useRef<any[] | null>(null);
  const frCommunesLoadingRef = useRef<boolean>(false);

  // Export-Helfer: SVG aus dem Overlay-Pane extrahieren
  const exportHeatmapSvg = () => {
    const map = mapRef.current;
    if (!map) return;
    const overlayPane = map.getPane('overlayPane');
    const svgEl = overlayPane?.querySelector('svg');
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const questionName = selectedQuestion === 'all' ? 'Alle' : (QUESTION_LABELS[selectedQuestion] || selectedQuestion);
    const file = `Heatmap_${questionName.replace(/[^a-zA-Z0-9_-]+/g, '_')}_grid${gridSize.toFixed(2)}_${smoothing ? 'glatt' : 'roh'}.svg`;
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export-Helfer: PNG aus dem Overlay-SVG rendern
  const exportHeatmapPng = () => {
    const map = mapRef.current;
    if (!map) return;
    const overlayPane = map.getPane('overlayPane');
    const svgEl = overlayPane?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgEl.clientWidth || map.getSize().x;
      canvas.height = svgEl.clientHeight || map.getSize().y;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Weißer Hintergrund
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const questionName = selectedQuestion === 'all' ? 'Alle' : (QUESTION_LABELS[selectedQuestion] || selectedQuestion);
        const file = `Heatmap_${questionName.replace(/[^a-zA-Z0-9_-]+/g, '_')}_grid${gridSize.toFixed(2)}_${smoothing ? 'glatt' : 'roh'}.png`;
        a.href = pngUrl;
        a.download = file;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // PNG-Export inklusive Basiskarte: Screenshot des Map-Containers
  const exportHeatmapPngWithBasemap = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      const questionName = selectedQuestion === 'all' ? 'Alle' : (QUESTION_LABELS[selectedQuestion] || selectedQuestion);
      const file = `Heatmap_${questionName.replace(/[^a-zA-Z0-9_-]+/g, '_')}_grid${gridSize.toFixed(2)}_${smoothing ? 'glatt' : 'roh'}_mit_Karte.png`;
      a.href = dataUrl;
      a.download = file;
      a.click();
    } catch (err) {
      console.error('PNG-Export mit Karte fehlgeschlagen:', err);
      // Fallback: nur Overlay exportieren
      exportHeatmapPng();
    }
  };

  // Debounce Rastergröße, um Neuberechnungen zu reduzieren
  useEffect(() => {
    const t = setTimeout(() => setGridSize(gridSizeInput), 200);
    return () => clearTimeout(t);
  }, [gridSizeInput]);

  const uniqueQuestions = useMemo(
    () => Array.from(new Set(mentalMapData.features.map(m => m.properties.question_id))),
    [mentalMapData.features]
  );

  // Bei neuem Datensatz standardmäßig mit der ersten Frage starten
  useEffect(() => {
    initialQuestionSetRef.current = false;
  }, [mentalMapData]);

  useEffect(() => {
    if (!initialQuestionSetRef.current && uniqueQuestions.length > 0) {
      setSelectedQuestion(uniqueQuestions[0]);
      initialQuestionSetRef.current = true;
    }
  }, [uniqueQuestions]);

  const baseFeatures = useMemo(
    () => (selectedQuestion === 'all'
      ? mentalMapData.features
      : mentalMapData.features.filter(m => m.properties.question_id === selectedQuestion)),
    [mentalMapData.features, selectedQuestion]
  );

  const availableCodes = useMemo(
    () => Array.from(new Set(
      baseFeatures
        .map(f => (f.properties.participant_code || '').trim())
        .filter(code => code.length > 0)
    )),
    [baseFeatures]
  );

  const validCodeSet = useMemo(() => new Set(availableCodes), [availableCodes]);

  const filteredValidFeatures = useMemo(
    () => baseFeatures.filter(f => {
      const code = (f.properties.participant_code || '').trim();
      return f.geometry.type === 'Polygon' && code.length > 0 && validCodeSet.has(code);
    }),
    [baseFeatures, validCodeSet]
  );

  const selectedSet = useMemo(() => new Set(selectedParticipants), [selectedParticipants]);

  const filteredFeatures = useMemo(
    () => (filterParticipants && selectedParticipants.length > 0
      ? filteredValidFeatures.filter(f => selectedSet.has((f.properties.participant_code || '').trim()))
      : filteredValidFeatures),
    [filteredValidFeatures, filterParticipants, selectedSet, selectedParticipants.length]
  );

  useEffect(() => {
    if (!containerRef.current || filteredFeatures.length === 0) return;

    const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
    let cancelled = false;

    const run = async () => {
      setIsComputing(true);
      setPhase('Berechne Heatmap…');
      setProgress(0);

      if (!mapRef.current) {
        // Canvas-Renderer ist deutlich performanter bei vielen Vektorobjekten
        mapRef.current = L.map(containerRef.current, { preferCanvas: true, zoomSnap: 0, zoomDelta: 0.25, renderer: L.canvas() }).setView([47.5, 2.5], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapRef.current);
        overlaysRef.current = L.layerGroup().addTo(mapRef.current);
        popupRef.current = L.popup();
      }

      overlaysRef.current?.clearLayers();

      // Ermittele globale Raster-Grenzen und nutze Typed Arrays für schnelleres Zählen
      let gMinLat = Infinity, gMaxLat = -Infinity;
      let gMinLng = Infinity, gMaxLng = -Infinity;
      for (const feature of filteredFeatures) {
        if (feature.geometry.type !== 'Polygon') continue;
        const coords = feature.geometry.coordinates[0];
        for (const coord of coords) {
          const [lng, lat] = coord;
          if (lat < gMinLat) gMinLat = lat;
          if (lat > gMaxLat) gMaxLat = lat;
          if (lng < gMinLng) gMinLng = lng;
          if (lng > gMaxLng) gMaxLng = lng;
        }
      }

      const minLatKey = Math.floor(gMinLat / gridSize);
      const maxLatKey = Math.ceil(gMaxLat / gridSize);
      const minLngKey = Math.floor(gMinLng / gridSize);
      const maxLngKey = Math.ceil(gMaxLng / gridSize);
      const width = Math.max(1, maxLngKey - minLngKey + 1);
      const height = Math.max(1, maxLatKey - minLatKey + 1);
      const gridArr = new Float32Array(width * height);

      const total = filteredFeatures.length;
      const batchSize = 2;

      for (let i = 0; i < filteredFeatures.length; i++) {
        const feature = filteredFeatures[i];
        if (feature.geometry.type === 'Polygon') {
          const coords = feature.geometry.coordinates[0];
          let fMinLat = Infinity, fMaxLat = -Infinity;
          let fMinLng = Infinity, fMaxLng = -Infinity;
          for (const coord of coords) {
            const [lng, lat] = coord;
            if (lat < fMinLat) fMinLat = lat;
            if (lat > fMaxLat) fMaxLat = lat;
            if (lng < fMinLng) fMinLng = lng;
            if (lng > fMaxLng) fMaxLng = lng;
          }
          const startLatKey = Math.max(minLatKey, Math.floor(fMinLat / gridSize));
          const endLatKey = Math.min(maxLatKey, Math.ceil(fMaxLat / gridSize));
          const startLngKey = Math.max(minLngKey, Math.floor(fMinLng / gridSize));
          const endLngKey = Math.min(maxLngKey, Math.ceil(fMaxLng / gridSize));
          for (let latKey = startLatKey; latKey <= endLatKey; latKey++) {
            const lat = latKey * gridSize;
            for (let lngKey = startLngKey; lngKey <= endLngKey; lngKey++) {
              const lng = lngKey * gridSize;
              if (isPointInPolygon([lng, lat], coords)) {
                const r = latKey - minLatKey;
                const c = lngKey - minLngKey;
                const idx = r * width + c;
                gridArr[idx] += 1;
              }
            }
          }
        }
        if (i % batchSize === 0) {
          setProgress(Math.round(((i + 1) / total) * 60));
          await tick();
          if (cancelled) return;
        }
      }

      setPhase('Glätte Raster…');
      const smoothedArr = new Float32Array(width * height);
      const radius = Math.max(0, Math.min(3, smoothingStrength));
      if (radius > 0) {
        const kernelSize = (radius * 2 + 1) * (radius * 2 + 1);
        for (let r = 0; r < height; r++) {
          for (let c = 0; c < width; c++) {
            let sum = 0;
            for (let di = -radius; di <= radius; di++) {
              for (let dj = -radius; dj <= radius; dj++) {
                const rr = Math.max(0, Math.min(height - 1, r + di));
                const cc = Math.max(0, Math.min(width - 1, c + dj));
                sum += gridArr[rr * width + cc];
              }
            }
            smoothedArr[r * width + c] = sum / kernelSize;
          }
          if (r % 25 === 0) {
            setProgress(60 + Math.round((r / height) * 20));
            await tick();
            if (cancelled) return;
          }
        }
      } else {
        // kein Radius: keine Glättung nötig
        smoothedArr.set(gridArr);
      }

      setPhase('Zeichne Raster…');
      const finalArr = smoothing ? smoothedArr : gridArr;
      finalGridRef.current = finalArr;
      gridExtentRef.current = { minLatKey, minLngKey, width, height };

      let maxCount = 1;
      for (let i = 0; i < finalArr.length; i++) {
        if (finalArr[i] > maxCount) maxCount = finalArr[i];
      }
      maxCountRef.current = maxCount;

      if (mapRef.current) {
        const map = mapRef.current;
        if (gridSize < CANVAS_THRESHOLD) {
          // Canvas-Modus für sehr feines Raster
          canvasActiveRef.current = true;
          const pane = map.getPane('overlayPane');
          let canvas = heatCanvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            heatCanvasRef.current = canvas;
            pane?.appendChild(canvas);
          }
          const draw = () => {
            if (!heatCanvasRef.current) return;
            const size = map.getSize();
            heatCanvasRef.current.width = size.x;
            heatCanvasRef.current.height = size.y;
            const ctx = heatCanvasRef.current.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, heatCanvasRef.current.width, heatCanvasRef.current.height);
            for (let r = 0; r < height; r++) {
              for (let c = 0; c < width; c++) {
                const count = finalArr[r * width + c];
                if (count <= 0) continue;
                const latKey = minLatKey + r;
                const lngKey = minLngKey + c;
                const lat = latKey * gridSize;
                const lng = lngKey * gridSize;
                const intensity = count / maxCount;
                ctx.fillStyle = getHeatColor(intensity);
                const p1 = map.latLngToLayerPoint([lat, lng]);
                const p2 = map.latLngToLayerPoint([lat + gridSize, lng + gridSize]);
                const w = Math.max(1, p2.x - p1.x);
                const h = Math.max(1, p2.y - p1.y);
                ctx.globalAlpha = Math.min(0.8, 0.4 + intensity * 0.6);
                ctx.fillRect(p1.x, p1.y, w, h);
              }
            }
            ctx.globalAlpha = 1;
          };
          draw();
          redrawCanvasRef.current = draw;
        } else {
          // Rechteck-Modus (wie bisher)
          canvasActiveRef.current = false;
          // ggf. vorhandenes Canvas entfernen
          const pane = map.getPane('overlayPane');
          if (heatCanvasRef.current && pane?.contains(heatCanvasRef.current)) {
            pane.removeChild(heatCanvasRef.current);
            heatCanvasRef.current = null;
          }
          const dBatch = 1000;
          const batchGroup = L.layerGroup();
          let eCount = 0;
          for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
              const count = finalArr[r * width + c];
              if (count <= 0) continue;
              const latKey = minLatKey + r;
              const lngKey = minLngKey + c;
              const lat = latKey * gridSize;
              const lng = lngKey * gridSize;
              const intensity = count / maxCount;
              const color = getHeatColor(intensity);
              const isInteractive = gridSize >= INTERACTIVE_THRESHOLD;
              const rectangle = L.rectangle(
                [[lat, lng], [lat + gridSize, lng + gridSize]],
                {
                  color: color,
                  fillColor: color,
                  fillOpacity: Math.min(0.8, 0.4 + intensity * 0.6),
                  weight: 0,
                  interactive: isInteractive,
                }
              );
              if (isInteractive) {
                rectangle.on('click', () => {
                  const content = `
                    <div>
                      <strong>Überlappungen: ${count.toFixed(2)}</strong><br/>
                      Intensität: ${(intensity * 100).toFixed(0)}%
                    </div>
                  `;
                  const centerLat = lat + gridSize / 2;
                  const centerLng = lng + gridSize / 2;
                  popupRef.current?.setLatLng([centerLat, centerLng])
                    .setContent(content)
                    .openOn(map);
                });
              }
              batchGroup.addLayer(rectangle);
              if (eCount % dBatch === 0) {
                setProgress(80 + Math.round((eCount / finalArr.length) * 20));
                await tick();
                if (cancelled) return;
              }
              eCount++;
            }
          }
          overlaysRef.current?.clearLayers();
          if (overlaysRef.current) {
            batchGroup.addTo(overlaysRef.current);
          }
        }
      }
      // Anzeige wurde oben je nach Modus gesetzt

      // Globaler Klick-Handler: ermittelt die angeklickte Rasterzelle anhand von lat/lng
      if (mapRef.current) {
        if (mapClickHandlerRef.current) {
          mapRef.current.off('click', mapClickHandlerRef.current);
        }
        const handler = (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          const latKey = Math.round(lat / gridSize);
          const lngKey = Math.round(lng / gridSize);
          const key = `${latKey}_${lngKey}`;
          const count = finalGrid[key];
          if (count !== undefined) {
            const intensity = count / maxCount;
            const content = `
              <div>
                <strong>Überlappungen: ${count.toFixed(2)}</strong><br/>
                Intensität: ${(intensity * 100).toFixed(0)}%
              </div>
            `;
            const centerLat = latKey * gridSize + gridSize / 2;
            const centerLng = lngKey * gridSize + gridSize / 2;
            popupRef.current?.setLatLng([centerLat, centerLng])
              .setContent(content)
              .openOn(mapRef.current!);
          }
        };
        mapRef.current.on('click', handler);
        mapClickHandlerRef.current = handler;
      }

      if (showOutlines && overlaysRef.current && mapRef.current) {
        const addGeoLayer = (features: any[]) => {
          const gj = { type: 'FeatureCollection', features } as any;
          L.geoJSON(gj, { style: () => ({ color: '#000', weight: 0.8, opacity: 0.3, fillOpacity: 0 }) }).addTo(overlaysRef.current!);
        };
        if (outlineLevel === 'regions') {
          await loadFranceRegions();
          if (frRegionsRef.current) addGeoLayer(frRegionsRef.current);
        } else if (outlineLevel === 'departements') {
          await loadFranceDepartements();
          if (frDepartementsRef.current) addGeoLayer(frDepartementsRef.current);
        } else if (outlineLevel === 'communes') {
          const map = mapRef.current;
          if (map.getZoom() < 8) map.setZoom(8);
          await loadFranceCommunes();
          if (frCommunesRef.current) addGeoLayer(frCommunesRef.current);
        }
      }

      if (filteredFeatures.length > 0 && mapRef.current) {
        const bounds = filteredFeatures.reduce((acc, feature) => {
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => {
              acc.extend([coord[1], coord[0]]);
            });
          }
          return acc;
        }, L.latLngBounds([]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }

      setProgress(100);
      setIsComputing(false);
      setPhase('');
    };

    run();
    return () => { cancelled = true; };
  }, [filteredFeatures, gridSize, showOutlines, smoothing, smoothingStrength]);

  // Recompute map size when toggling fullscreen
  useEffect(() => {
    const update = () => {
      if (isFullscreen) {
        const padding = 160; // Platz für Header/Controls im Vollbild
        const h = Math.max(300, window.innerHeight - padding);
        setMapHeight(h);
      } else {
        setMapHeight(500);
      }
      // Nach Größenänderung Leaflet neu berechnen lassen
      setTimeout(() => mapRef.current?.invalidateSize(), 200);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isFullscreen]);

  // ESC exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Hover-Overlay: zeigt Zellwerte an der Mausposition
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!hoverDivRef.current) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.pointerEvents = 'none';
      div.style.background = 'rgba(0,0,0,0.6)';
      div.style.color = '#fff';
      div.style.padding = '4px 6px';
      div.style.borderRadius = '4px';
      div.style.fontSize = '12px';
      div.style.zIndex = '1000';
      div.style.display = 'none';
      hoverDivRef.current = div;
      map.getContainer().appendChild(div);
    }

    const loadFranceRegions = async () => {
      if (frRegionsRef.current || frRegionsLoadingRef.current) return;
      frRegionsLoadingRef.current = true;
      const urls = [
        '/data/france_regions.geojson',
        'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions.geojson',
      ];
      for (const u of urls) {
        try {
          const resp = await fetch(u, { headers: { 'Accept': 'application/json' } });
          if (!resp.ok) continue;
          const gj = await resp.json();
          const feats = Array.isArray(gj?.features) ? gj.features : [];
          if (feats.length > 0) {
            frRegionsRef.current = feats;
            break;
          }
        } catch {}
      }
      frRegionsLoadingRef.current = false;
    };

    const loadFranceDepartements = async () => {
      if (frDepartementsRef.current || frDepartementsLoadingRef.current) return;
      frDepartementsLoadingRef.current = true;
      const urls = [
        '/data/france_departements.geojson',
        'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson',
      ];
      for (const u of urls) {
        try {
          const resp = await fetch(u, { headers: { 'Accept': 'application/json' } });
          if (!resp.ok) continue;
          const gj = await resp.json();
          const feats = Array.isArray(gj?.features) ? gj.features : [];
          if (feats.length > 0) {
            frDepartementsRef.current = feats;
            break;
          }
        } catch {}
      }
      frDepartementsLoadingRef.current = false;
    };

    const loadFranceCommunes = async () => {
      if (frCommunesRef.current || frCommunesLoadingRef.current) return;
      frCommunesLoadingRef.current = true;
      const urls = [
        '/data/france_communes.geojson',
        'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/communes.geojson',
      ];
      for (const u of urls) {
        try {
          const resp = await fetch(u, { headers: { 'Accept': 'application/json' } });
          if (!resp.ok) continue;
          const gj = await resp.json();
          const feats = Array.isArray(gj?.features) ? gj.features : [];
          if (feats.length > 0) {
            frCommunesRef.current = feats;
            break;
          }
        } catch {}
      }
      frCommunesLoadingRef.current = false;
    };

    const pointInPoly = (ptLng: number, ptLat: number, coords: any): boolean => {
      // Unterstützt Polygon und MultiPolygon mit Außenring [lng,lat]
      const rings: number[][][] = Array.isArray(coords?.[0]?.[0]) ? coords : [coords];
      const inRing = (ring: number[][]) => {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const xi = ring[i][0], yi = ring[i][1];
          const xj = ring[j][0], yj = ring[j][1];
          const intersect = ((yi > ptLat) !== (yj > ptLat)) &&
            (ptLng < (xj - xi) * (ptLat - yi) / (yj - yi + 1e-12) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      };
      // Prüfe nur den Außenring pro Polygon
      for (const poly of rings) {
        const outer = Array.isArray(poly?.[0]?.[0]) ? poly[0] : poly;
        if (Array.isArray(outer) && outer.length >= 3 && inRing(outer)) return true;
      }
      return false;
    };

    const findFranceRegion = async (lat: number, lng: number): Promise<string | undefined> => {
      await loadFranceRegions();
      const feats = frRegionsRef.current;
      if (!feats) return undefined;
      for (const f of feats) {
        const g = f?.geometry;
        if (!g) continue;
        const type = g.type;
        const coords = g.coordinates;
        const hit = type === 'Polygon' || type === 'MultiPolygon' ? pointInPoly(lng, lat, coords) : false;
        if (hit) {
          const props = f?.properties || {};
          return props.nom || props.name || props.NAME || props.NOM || undefined;
        }
      }
      return undefined;
    };

    const onMove = (e: L.LeafletMouseEvent) => {
      const arr = finalGridRef.current;
      const ext = gridExtentRef.current;
      const div = hoverDivRef.current;
      if (!arr || !ext || !div) return;
      const { lat, lng } = e.latlng;
      const latKey = Math.floor(lat / gridSize);
      const lngKey = Math.floor(lng / gridSize);
      const r = latKey - ext.minLatKey;
      const c = lngKey - ext.minLngKey;
      if (r < 0 || c < 0 || r >= ext.height || c >= ext.width) { div.style.display = 'none'; return; }
      const count = arr[r * ext.width + c];
      if (count <= 0) { div.style.display = 'none'; return; }
      const intensity = count / (maxCountRef.current || 1);
      const key = `${latKey}_${lngKey}`;
      lastHoverKeyRef.current = key;
      const cached = reverseGeocodeCacheRef.current.get(key);
      // Offline-Regionsermittlung für Frankreich (Régions)
      let frRegionName: string | undefined = cached?.region;
      if (!frRegionName) {
        // Nicht-blockierend starten; Overlay sofort mit Count/Intensität zeigen
        findFranceRegion(lat, lng).then(name => {
          if (!name) return;
          const prev = reverseGeocodeCacheRef.current.get(key) || {} as any;
          const next = { ...prev, region: name };
          reverseGeocodeCacheRef.current.set(key, next);
          if (lastHoverKeyRef.current === key && hoverDivRef.current) {
            const adminLine3 = `<br/>Region: ${next.region || '-'} · Département: ${next.departement || '-'} · Gemeinde: ${next.commune || '-'}`;
            hoverDivRef.current.innerHTML = `<strong>Überlappungen: ${count.toFixed(2)}</strong><br/>Intensität: ${(intensity * 100).toFixed(0)}%${adminLine3}`;
          }
        }).catch(() => {});
      }
      const adminLine = cached
        ? `<br/>Region: ${cached.region || '-'} · Département: ${cached.departement || '-'} · Gemeinde: ${cached.commune || '-'}`
        : '';
      div.innerHTML = `<strong>Überlappungen: ${count.toFixed(2)}</strong><br/>Intensität: ${(intensity * 100).toFixed(0)}%${adminLine}`;
      const pt = e.containerPoint;
      div.style.left = `${pt.x + 12}px`;
      div.style.top = `${pt.y + 12}px`;
      div.style.display = 'block';

      // Reverse-Geocoding nur, wenn nicht im Cache und Rate-Limit beachtet
      if (!cached) {
        if (hoverFetchTimerRef.current) {
          window.clearTimeout(hoverFetchTimerRef.current);
        }
        hoverFetchTimerRef.current = window.setTimeout(async () => {
          const now = Date.now();
          if (now - lastFetchAtRef.current < 1000) return; // max ~1 Req/s
          lastFetchAtRef.current = now;
          try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=jsonv2&zoom=12&addressdetails=1`;
            const resp = await fetch(url, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Forschungsdaten-Analyseplattform/0.1 (macOS app)'
              }
            });
            if (!resp.ok) return;
            const data = await resp.json();
            const addr = data?.address || {};
            const cc = (addr.country_code || data?.country_code || '').toLowerCase();
            let region: string | undefined;
            let departement: string | undefined;
            let commune: string | undefined;

            if (cc === 'fr') {
              // Frankreich: Region (Région), Département, Commune
              // Wenn Offline-Ermittlung bereits Region gesetzt hat, nutze sie als bevorzugt
              region = reverseGeocodeCacheRef.current.get(key)?.region || addr.region || addr.state || undefined;
              departement = addr.county || undefined;
              commune = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.suburb || addr.locality || undefined;
            } else {
              // Fallback für andere Länder
              region = addr.region || addr.state || addr.state_district || undefined;
              departement = addr.county || addr.state_district || undefined;
              commune = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.suburb || addr.locality || undefined;
            }
            reverseGeocodeCacheRef.current.set(key, { region, departement, commune });
            // Falls Nutzer noch über derselben Zelle ist, Overlay aktualisieren
            if (lastHoverKeyRef.current === key && hoverDivRef.current) {
              const adminLine2 = `<br/>Region: ${region || '-'} · Département: ${departement || '-'} · Gemeinde: ${commune || '-'}`;
              hoverDivRef.current.innerHTML = `<strong>Überlappungen: ${count.toFixed(2)}</strong><br/>Intensität: ${(intensity * 100).toFixed(0)}%${adminLine2}`;
            }
          } catch (err) {
            // Ignoriere Fehler still
          }
        }, 250);
      }
    };
    const onOut = () => { const div = hoverDivRef.current; if (div) div.style.display = 'none'; };

    map.on('mousemove', onMove);
    map.on('mouseout', onOut);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
    };
  }, [gridSize]);

  // Globaler Klick-Handler: Hole Zellwerte aus Typed Array
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mapClickHandlerRef.current) {
      map.off('click', mapClickHandlerRef.current);
      mapClickHandlerRef.current = null;
    }
    const handler = (e: L.LeafletMouseEvent) => {
      const arr = finalGridRef.current;
      const ext = gridExtentRef.current;
      if (!arr || !ext) return;
      const { lat, lng } = e.latlng;
      // floor statt round vermeidet Off-by-One an Zellgrenzen
      const latKey = Math.floor(lat / gridSize);
      const lngKey = Math.floor(lng / gridSize);
      const r = latKey - ext.minLatKey;
      const c = lngKey - ext.minLngKey;
      if (r < 0 || c < 0 || r >= ext.height || c >= ext.width) return;
      const count = arr[r * ext.width + c];
      if (count > 0) {
        const intensity = count / (maxCountRef.current || 1);
        const content = `
          <div>
            <strong>Überlappungen: ${count.toFixed(2)}</strong><br/>
            Intensität: ${(intensity * 100).toFixed(0)}%
          </div>
        `;
        const centerLat = latKey * gridSize + gridSize / 2;
        const centerLng = lngKey * gridSize + gridSize / 2;
        popupRef.current?.setLatLng([centerLat, centerLng])
          .setContent(content)
          .openOn(map);
      }
    };
    map.on('click', handler);
    mapClickHandlerRef.current = handler;
    return () => {
      if (mapClickHandlerRef.current) {
        map.off('click', mapClickHandlerRef.current);
        mapClickHandlerRef.current = null;
      }
    };
  }, [gridSize]);

  // Overlay-Pane Pointer-Events: bei feinem Raster Klicks zur Karte durchreichen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const overlayPane = map.getPane('overlayPane');
    if (!overlayPane) return;
    overlayPane.style.pointerEvents = gridSize < INTERACTIVE_THRESHOLD ? 'none' : 'auto';
  }, [gridSize]);

  // Redraw des Canvas bei Bewegungen/Zoom, falls aktiv
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => redrawCanvasRef.current?.();
    map.on('moveend zoomend resize', draw);
    return () => {
      map.off('moveend zoomend resize', draw);
    };
  }, []);

  const getHeatColor = (intensity: number): string => {
    // Kontinuierlicher Verlauf: Blau (niedrig) → Rot (hoch)
    const clamped = Math.max(0, Math.min(1, intensity));
    const hue = (1 - clamped) * 220; // 220 (Blau) bis 0 (Rot)
    return `hsl(${hue}, 85%, 55%)`;
  };

  if (filteredFeatures.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold">Mental Map Heatmap</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Keine Mental Maps verfügbar.
        </p>
      </Card>
    );
  }

  return (
    <Card className={isFullscreen ? "p-2 fixed inset-0 z-50 bg-background" : "p-6"}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Flame className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Mental Map Heatmap</h3>
          <p className="text-sm text-muted-foreground">
            Überlappungsanalyse von {filteredFeatures.length} Mental Maps
          </p>
        </div>
        {isComputing && (
          <div className="w-64">
            <div className="text-xs text-muted-foreground mb-1">{phase}</div>
            <div className="w-full h-2 bg-muted rounded">
              <div
                className="h-2 bg-primary rounded"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsFullscreen(v => !v)}
          className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
          aria-label={isFullscreen ? "Vollbild verlassen" : "Vollbild aktivieren"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
        <div className="flex items-center gap-2 ml-2">
          <button
            type="button"
            onClick={exportHeatmapSvg}
            className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
            aria-label="Heatmap als SVG exportieren"
          >
            SVG
          </button>
          <button
            type="button"
            onClick={exportHeatmapPng}
            className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
            aria-label="Heatmap als PNG exportieren"
          >
            PNG
          </button>
          <button
            type="button"
            onClick={exportHeatmapPngWithBasemap}
            className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted"
            aria-label="Heatmap als PNG mit Karte exportieren"
          >
            PNG Karte
          </button>
        </div>
        <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
          <SelectTrigger className="w-[280px] relative z-50">
            <SelectValue placeholder="Frage auswählen" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="all">Alle Fragen ({mentalMapData.features.length})</SelectItem>
            {uniqueQuestions.map(qId => (
              <SelectItem key={qId} value={qId}>
                {QUESTION_LABELS[qId] || qId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2 ml-4">
          <Checkbox id="smoothing" checked={smoothing} onCheckedChange={(v) => setSmoothing(!!v)} />
          <Label htmlFor="smoothing" className="text-sm">Glätten</Label>
        </div>
        <div className="flex items-center gap-3 ml-4 w-[240px]">
          <div className="flex-1">
            <Label htmlFor="smooth-strength" className="text-sm">Glättung (Stärke)</Label>
            <Slider id="smooth-strength" value={[smoothingStrength]} min={0} max={3} step={1} onValueChange={(vals) => setSmoothingStrength(vals[0])} disabled={!smoothing} />
          </div>
          <div className="text-xs text-muted-foreground w-6 text-right">{smoothingStrength}</div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Checkbox id="filter-participants" checked={filterParticipants} onCheckedChange={(v) => setFilterParticipants(!!v)} />
          <Label htmlFor="filter-participants" className="text-sm">Probanden filtern</Label>
        </div>
        <div className="flex items-center gap-3 ml-4 w-[280px]">
          <div className="flex-1">
            <Label htmlFor="grid-size" className="text-sm">Rastergröße (°)</Label>
            <Slider id="grid-size" value={[gridSizeInput]} min={0.01} max={0.5} step={0.01} onValueChange={(vals) => setGridSizeInput(vals[0])} />
          </div>
          <div className="text-xs text-muted-foreground w-10 text-right">{gridSize.toFixed(2)}</div>
        </div>
      </div>

      {filterParticipants && (
        <div className="mb-4 mt-2 border rounded p-3 max-h-40 overflow-y-auto">
          <div className="text-xs text-muted-foreground mb-2">Auswahl Probanden (optional)</div>
          <div className="grid grid-cols-2 gap-2">
            {availableCodes.map(code => {
              const isChecked = selectedParticipants.includes(code);
              return (
                <label key={code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedParticipants(prev => {
                        const set = new Set(prev);
                        if (checked) set.add(code); else set.delete(code);
                        return Array.from(set);
                      });
                    }}
                  />
                  <span>{code}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      
      <div
        ref={containerRef}
        className={isFullscreen ? "w-full rounded-lg overflow-hidden border mb-4" : "w-full rounded-lg overflow-hidden border mb-4"}
        style={{ zIndex: 0, height: `${mapHeight}px` }}
      />

      {/* Legend */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Intensitäts-Legende</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Niedrig</span>
          <div className="flex-1 h-6 rounded" style={{
            background: 'linear-gradient(to right, #3b82f6, #22c55e, #eab308, #f97316, #ef4444)'
          }} />
          <span className="text-xs text-muted-foreground">Hoch</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Die Heatmap zeigt, wo sich Mental Maps überlappen. Je intensiver die Farbe, desto mehr Probanden haben diese Region markiert.
        </p>
      </div>
    </Card>
  );
};
