import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface DataUploadProps {
  onDataLoaded: (data: any[]) => void;
}

export const DataUpload = ({ onDataLoaded }: DataUploadProps) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(content);
          onDataLoaded(Array.isArray(jsonData) ? jsonData : [jsonData]);
          toast.success("JSON-Daten erfolgreich geladen");
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',');
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = isNaN(Number(values[index])) ? values[index] : Number(values[index]);
            });
            return obj;
          });
          onDataLoaded(data);
          toast.success("CSV-Daten erfolgreich geladen");
        }
      } catch (error) {
        toast.error("Fehler beim Laden der Datei");
        console.error(error);
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
          <h3 className="text-lg font-semibold mb-2">Experimentdaten hochladen</h3>
          <p className="text-sm text-muted-foreground mb-4">
            CSV oder JSON Dateien unterstützt
          </p>
        </div>
        <label htmlFor="file-upload">
          <Button asChild>
            <span className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              Datei auswählen
            </span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".csv,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </Card>
  );
};
