import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataUpload } from "@/components/DataUpload";
import { DataVisualization } from "@/components/DataVisualization";
import { DataTable } from "@/components/DataTable";
import { Statistics } from "@/components/Statistics";
import { FlaskConical, Download } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [data, setData] = useState<any[]>([]);

  const handleDataLoaded = (newData: any[]) => {
    setData(newData);
  };

  const handleExport = () => {
    if (data.length === 0) {
      toast.error("Keine Daten zum Exportieren vorhanden");
      return;
    }
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "experiment-data.json";
    link.click();
    toast.success("Daten erfolgreich exportiert");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FlaskConical className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Research Data Platform</h1>
                <p className="text-sm text-muted-foreground">
                  Experimentdaten visualisieren und analysieren
                </p>
              </div>
            </div>
            {data.length > 0 && (
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {data.length === 0 ? (
            <div className="max-w-2xl mx-auto">
              <DataUpload onDataLoaded={handleDataLoaded} />
              <div className="mt-8 p-6 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Erste Schritte:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Laden Sie Ihre Experimentdaten im CSV oder JSON Format hoch</li>
                  <li>• Visualisieren Sie Ihre Daten mit interaktiven Diagrammen</li>
                  <li>• Analysieren Sie statistische Kennzahlen</li>
                  <li>• Exportieren Sie verarbeitete Daten für weitere Analysen</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <Statistics data={data} />
              <DataVisualization data={data} />
              <DataTable data={data} />
              <div className="flex justify-center">
                <Button 
                  onClick={() => setData([])} 
                  variant="outline"
                >
                  Neue Daten laden
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
