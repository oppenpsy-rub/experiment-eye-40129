import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Map } from "lucide-react";
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

  const uniqueQuestions = Array.from(new Set(mentalMaps.map(m => m.properties.question_id)));
  
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

    // Add mental map polygons with distinct colors
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];
    
    filteredMaps.forEach((feature, index) => {
      if (feature.geometry.type === 'Polygon' && mapRef.current) {
        const coordinates = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number]);
        
        const color = colors[index % colors.length];
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [filteredMaps]);

  if (mentalMaps.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Map className="h-5 w-5 text-primary" />
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
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Map className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Mental Maps</h3>
          <p className="text-sm text-muted-foreground">
            {mentalMaps.length} Karte{mentalMaps.length !== 1 ? 'n' : ''} für {participantCode}
          </p>
        </div>
        <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Frage auswählen" />
          </SelectTrigger>
          <SelectContent>
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
        className="w-full h-[500px] rounded-lg overflow-hidden border mb-4"
      />

      {/* Legend */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Legende</h4>
        <div className="grid grid-cols-2 gap-2">
          {filteredMaps.map((feature, index) => {
            const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];
            const color = colors[index % colors.length];
            const questionLabel = QUESTION_LABELS[feature.properties.question_id] || feature.properties.question_id;
            
            return (
              <div key={feature.properties.id} className="flex items-center gap-2 text-sm">
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
