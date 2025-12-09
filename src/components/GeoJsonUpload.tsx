import { Upload, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MentalMapDataSchema } from "@/schemas/experiment";
import type { MentalMapData } from "@/types/experiment";

interface GeoJsonUploadProps {
  onMentalMapsLoaded: (data: MentalMapData) => void;
}

export const GeoJsonUpload = ({ onMentalMapsLoaded }: GeoJsonUploadProps) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);
        const validated = MentalMapDataSchema.parse(json) as MentalMapData;
        onMentalMapsLoaded(validated);
        toast.success(`${validated.features.length} Mental Maps aus GeoJSON geladen`);
      } catch (error) {
        console.error(error);
        toast.error("Fehler beim Laden/Validieren der GeoJSON-Datei");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="p-8 border-2 border-dashed border-border hover:border-primary transition-colors">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-primary/10 rounded-full">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">GeoJSON (Mental Maps) hochladen</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Unterstützt: `.geojson` oder `.json` im GeoJSON-Format
          </p>
        </div>
        <label htmlFor="geojson-upload">
          <Button asChild>
            <span className="cursor-pointer">
              <FileJson className="mr-2 h-4 w-4" />
              Datei auswählen
            </span>
          </Button>
        </label>
        <input
          id="geojson-upload"
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </Card>
  );
};