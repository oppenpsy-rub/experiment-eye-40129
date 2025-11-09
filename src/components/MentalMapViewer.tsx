import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from "@/components/ui/card";
import { Map } from "lucide-react";
import { MentalMapFeature } from '@/types/experiment';

interface MentalMapViewerProps {
  mentalMaps: MentalMapFeature[];
  participantCode: string;
}

export const MentalMapViewer = ({ mentalMaps, participantCode }: MentalMapViewerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mentalMaps.length === 0) return;

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

    // Add mental map polygons
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    
    mentalMaps.forEach((feature, index) => {
      if (feature.geometry.type === 'Polygon' && mapRef.current) {
        const coordinates = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number]);
        
        const polygon = L.polygon(coordinates, {
          color: colors[index % colors.length],
          fillColor: colors[index % colors.length],
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(mapRef.current);

        polygon.bindPopup(`
          <div>
            <strong>Mental Map ${feature.properties.id}</strong><br/>
            Erstellt: ${new Date(feature.properties.created_at).toLocaleString('de-DE')}<br/>
            Frage-ID: ${feature.properties.question_id}
          </div>
        `);
      }
    });

    // Fit bounds to show all polygons
    if (mentalMaps.length > 0 && mapRef.current) {
      const bounds = mentalMaps.reduce((acc, feature) => {
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
  }, [mentalMaps]);

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
        <div>
          <h3 className="font-semibold">Mental Maps</h3>
          <p className="text-sm text-muted-foreground">
            {mentalMaps.length} Karte{mentalMaps.length !== 1 ? 'n' : ''} für {participantCode}
          </p>
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="w-full h-[500px] rounded-lg overflow-hidden border"
      />
    </Card>
  );
};
