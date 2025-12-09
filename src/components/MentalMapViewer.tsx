import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toPng } from 'html-to-image';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import { MentalMapFeature } from '@/types/experiment';

interface MentalMapViewerProps {
  mentalMaps: MentalMapFeature[];
  participantCode: string;
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

export const MentalMapViewer = ({ mentalMaps, participantCode }: MentalMapViewerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>(() => 'all');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const uniqueQuestions = Array.from(new Set(mentalMaps.map(m => m.properties.question_id)));
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];
  const questionColorMap = new Map<string, string>(
    uniqueQuestions.map((qId, idx) => [qId, COLORS[idx % COLORS.length]])
  );
  
  const filteredMaps = selectedQuestion === 'all' 
    ? mentalMaps 
    : mentalMaps.filter(m => m.properties.question_id === selectedQuestion);

  useEffect(() => {
    if (!containerRef.current || filteredMaps.length === 0) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([47.5, 2.5], 5);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }

    // Clear existing layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add mental map polygons with consistent color per question
    filteredMaps.forEach((feature) => {
      if (feature.geometry.type === 'Polygon' && mapRef.current) {
        const coordinates = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number]);
        const color = questionColorMap.get(feature.properties.question_id) || COLORS[0];
        const polygon = L.polygon(coordinates, {
          color: color,
          fillColor: color,
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(mapRef.current);

        const questionLabel = QUESTION_LABELS[feature.properties.question_id] || feature.properties.question_id;
        polygon.bindPopup(`
          <div>
            <strong>${questionLabel}</strong><br/>
            Mental Map ID: ${feature.properties.id}<br/>
            Erstellt: ${new Date(feature.properties.created_at).toLocaleString('de-DE')}
          </div>
        `);
      }
    });

    // Fit bounds to show all polygons
    if (filteredMaps.length > 0 && mapRef.current) {
      const bounds = filteredMaps.reduce((acc, feature) => {
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
      // Map bestehen lassen; wird durch Änderungen neu gezeichnet
    };
  }, [filteredMaps]);

  // Invalidate size when toggling fullscreen
  useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  // ESC exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // PNG-Export inklusive Basiskarte: Screenshot des Map-Containers
  const exportViewerPngWithBasemap = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      const questionName = selectedQuestion === 'all' ? 'Alle' : (QUESTION_LABELS[selectedQuestion] || selectedQuestion);
      const file = `MentalMap_${participantCode}_${questionName.replace(/[^a-zA-Z0-9_-]+/g, '_')}_mit_Karte.png`;
      a.href = dataUrl;
      a.download = file;
      a.click();
    } catch (err) {
      console.error('PNG-Export mit Karte (Viewer) fehlgeschlagen:', err);
    }
  };

  if (mentalMaps.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapIcon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold">Mental Maps</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Keine Mental Maps für diesen Probanden verfügbar.
        </p>
      </Card>
    );
  }

  return (
    <Card className={isFullscreen ? "p-2 fixed inset-0 z-50 bg-background" : "p-6"}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MapIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Mental Maps</h3>
          <p className="text-sm text-muted-foreground">
            {mentalMaps.length} Karte{mentalMaps.length !== 1 ? 'n' : ''} für {participantCode}
          </p>
        </div>
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
        <button
          type="button"
          onClick={exportViewerPngWithBasemap}
          className="inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted ml-2"
          aria-label="PNG mit Karte exportieren"
        >
          PNG Karte
        </button>
        <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
          <SelectTrigger className="w-[280px] relative z-50">
            <SelectValue placeholder="Frage auswählen" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="all">Alle Fragen ({mentalMaps.length})</SelectItem>
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
        className={isFullscreen ? "w-full h-[calc(100vh-150px)] rounded-lg overflow-hidden border mb-4" : "w-full h-[500px] rounded-lg overflow-hidden border mb-4"}
        style={{ zIndex: 0 }}
      />

      {/* Legend */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Legende</h4>
        <div className="grid grid-cols-2 gap-2">
          {Array.from(new Set(filteredMaps.map(f => f.properties.question_id))).map(qId => {
            const color = questionColorMap.get(qId) || COLORS[0];
            const questionLabel = QUESTION_LABELS[qId] || qId;
            return (
              <div key={qId} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-4 h-4 rounded border-2 flex-shrink-0" 
                  style={{ 
                    backgroundColor: color + '40',
                    borderColor: color 
                  }}
                />
                <span className="text-muted-foreground truncate">{questionLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
