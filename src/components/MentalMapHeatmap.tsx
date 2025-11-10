import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";
import { MentalMapData } from '@/types/experiment';

interface MentalMapHeatmapProps {
  mentalMapData: MentalMapData;
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

export const MentalMapHeatmap = ({ mentalMapData }: MentalMapHeatmapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('all');

  const uniqueQuestions = Array.from(new Set(mentalMapData.features.map(m => m.properties.question_id)));
  
  const filteredFeatures = selectedQuestion === 'all' 
    ? mentalMapData.features 
    : mentalMapData.features.filter(m => m.properties.question_id === selectedQuestion);

  useEffect(() => {
    if (!containerRef.current || filteredFeatures.length === 0) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([47.5, 2.5], 5);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }

    // Clear existing layers except the tile layer
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Rectangle || layer instanceof L.Polygon) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Create heatmap data
    const heatmapData = createHeatmapData(filteredFeatures, 0.5);
    const maxCount = Math.max(...Object.values(heatmapData));

    // Draw heatmap rectangles
    Object.entries(heatmapData).forEach(([key, count]) => {
      const [latKey, lngKey] = key.split('_').map(Number);
      const lat = latKey * 0.5;
      const lng = lngKey * 0.5;
      
      const opacity = count / maxCount;
      const color = getHeatColor(opacity);
      
      if (mapRef.current) {
        const rectangle = L.rectangle(
          [[lat, lng], [lat + 0.5, lng + 0.5]],
          {
            color: color,
            fillColor: color,
            fillOpacity: opacity * 0.6,
            weight: 0,
          }
        ).addTo(mapRef.current);

        rectangle.bindPopup(`
          <div>
            <strong>Überlappungen: ${count}</strong><br/>
            Intensität: ${(opacity * 100).toFixed(0)}%
          </div>
        `);
      }
    });

    // Also add original polygons with low opacity for reference
    filteredFeatures.forEach((feature) => {
      if (feature.geometry.type === 'Polygon' && mapRef.current) {
        const coordinates = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number]);
        
        L.polygon(coordinates, {
          color: '#000000',
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 1,
          opacity: 0.2,
        }).addTo(mapRef.current);
      }
    });

    // Fit bounds
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

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [filteredFeatures]);

  const getHeatColor = (intensity: number): string => {
    // Color gradient from blue (low) to red (high)
    if (intensity < 0.2) return '#3b82f6'; // blue
    if (intensity < 0.4) return '#22c55e'; // green
    if (intensity < 0.6) return '#eab308'; // yellow
    if (intensity < 0.8) return '#f97316'; // orange
    return '#ef4444'; // red
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
    <Card className="p-6">
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
        <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Frage auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Fragen ({mentalMapData.features.length})</SelectItem>
            {uniqueQuestions.map(qId => (
              <SelectItem key={qId} value={qId}>
                {QUESTION_LABELS[qId] || qId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div 
        ref={containerRef} 
        className="w-full h-[500px] rounded-lg overflow-hidden border mb-4"
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
