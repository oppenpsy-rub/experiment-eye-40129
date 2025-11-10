import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Download, Users, Map, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { ParticipantData, MentalMapData } from "@/types/experiment";
import { parseExperimentData, parseMentalMapData, getParticipantMentalMaps } from "@/utils/dataParser";
import { ParticipantSelector } from "@/components/ParticipantSelector";
import { ParticipantProfile } from "@/components/ParticipantProfile";
import { MentalMapViewer } from "@/components/MentalMapViewer";
import { MentalMapAnalysis } from "@/components/MentalMapAnalysis";
import { MentalMapHeatmap } from "@/components/MentalMapHeatmap";
import { AdvancedAnalysis } from "@/components/AdvancedAnalysis";
import { DataTable } from "@/components/DataTable";
import { Statistics } from "@/components/Statistics";

const Index = () => {
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [mentalMapData, setMentalMapData] = useState<MentalMapData | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExperimentData();
  }, []);

  const loadExperimentData = async () => {
    try {
      setLoading(true);
      
      // Load Excel data
      const response = await fetch('/data/Gesamtdaten_harmonisiert.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      const parsedParticipants = parseExperimentData(jsonData);
      setParticipants(parsedParticipants);
      
      // Load Mental Maps
      const mentalMaps = await parseMentalMapData('/data/Export_Mental_Maps.geojson');
      setMentalMapData(mentalMaps);
      
      toast.success(`${parsedParticipants.length} Probanden und ${mentalMaps.features.length} Mental Maps geladen`);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Experimentdaten');
    } finally {
      setLoading(false);
    }
  };

  const selectedParticipant = participants.find(p => p.id === selectedParticipantId);
  const selectedMentalMaps = selectedParticipantId && mentalMapData 
    ? getParticipantMentalMaps(selectedParticipant?.participantCode || '', mentalMapData)
    : [];

  const handleExport = () => {
    if (participants.length === 0) {
      toast.error("Keine Daten zum Exportieren vorhanden");
      return;
    }
    
    const dataStr = JSON.stringify(participants, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "experiment-data.json";
    link.click();
    toast.success("Daten erfolgreich exportiert");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FlaskConical className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-lg font-medium">Lade Experimentdaten...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold">Forschungsdaten-Analyseplattform</h1>
                <p className="text-sm text-muted-foreground">
                  Französische Akzentwahrnehmung & Mental Maps
                </p>
              </div>
            </div>
            {participants.length > 0 && (
              <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Probanden
            </TabsTrigger>
            <TabsTrigger value="mental-maps" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Mental Maps
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="map-analysis" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Map Analyse
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Erweiterte Analyse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Statistics data={participants.map(p => p.responses)} />
            <DataTable data={participants.map(p => ({
              ID: p.id,
              Code: p.participantCode,
              Geschlecht: p.gender,
              Alter: p.age,
              Geburtsort: p.birthplace,
              Bildung: p.education,
            }))} />
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <ParticipantSelector 
              participants={participants}
              selectedParticipantId={selectedParticipantId}
              onSelectParticipant={setSelectedParticipantId}
            />
            
            {selectedParticipant && (
              <ParticipantProfile participant={selectedParticipant} />
            )}
          </TabsContent>

          <TabsContent value="mental-maps" className="space-y-6">
            <ParticipantSelector 
              participants={participants.filter(p => 
                mentalMapData && getParticipantMentalMaps(p.participantCode, mentalMapData).length > 0
              )}
              selectedParticipantId={selectedParticipantId}
              onSelectParticipant={setSelectedParticipantId}
            />
            
            {selectedParticipant && (
              <MentalMapViewer 
                mentalMaps={selectedMentalMaps}
                participantCode={selectedParticipant.participantCode}
              />
            )}
          </TabsContent>

          <TabsContent value="heatmap">
            {mentalMapData && (
              <MentalMapHeatmap mentalMapData={mentalMapData} />
            )}
          </TabsContent>

          <TabsContent value="map-analysis">
            {mentalMapData && (
              <MentalMapAnalysis 
                mentalMapData={mentalMapData}
                participants={participants}
              />
            )}
          </TabsContent>

          <TabsContent value="analysis">
            <AdvancedAnalysis participants={participants} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
