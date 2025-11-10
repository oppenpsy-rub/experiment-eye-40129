import { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, TrendingUp, Layers } from "lucide-react";
import { MentalMapData, ParticipantData } from '@/types/experiment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';

interface MentalMapAnalysisProps {
  mentalMapData: MentalMapData;
  participants: ParticipantData[];
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

const calculatePolygonArea = (coordinates: number[][][]): number => {
  const coords = coordinates[0];
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += (coords[i][0] * coords[i + 1][1]) - (coords[i + 1][0] * coords[i][1]);
  }
  return Math.abs(area / 2);
};

const calculatePolygonCenter = (coordinates: number[][][]): [number, number] => {
  const coords = coordinates[0];
  let x = 0, y = 0;
  coords.forEach(coord => {
    x += coord[0];
    y += coord[1];
  });
  return [x / coords.length, y / coords.length];
};

export const MentalMapAnalysis = ({ mentalMapData, participants }: MentalMapAnalysisProps) => {
  const [selectedQuestion, setSelectedQuestion] = useState<string>('all');

  const questionStats = useMemo(() => {
    const stats: Record<string, { count: number; avgArea: number; centers: [number, number][] }> = {};
    
    mentalMapData.features.forEach(feature => {
      const qId = feature.properties.question_id;
      if (!stats[qId]) {
        stats[qId] = { count: 0, avgArea: 0, centers: [] };
      }
      stats[qId].count++;
      stats[qId].avgArea += calculatePolygonArea(feature.geometry.coordinates);
      stats[qId].centers.push(calculatePolygonCenter(feature.geometry.coordinates));
    });

    Object.keys(stats).forEach(qId => {
      stats[qId].avgArea = stats[qId].avgArea / stats[qId].count;
    });

    return stats;
  }, [mentalMapData]);

  const chartData = useMemo(() => {
    return Object.entries(questionStats).map(([qId, data]) => ({
      question: QUESTION_LABELS[qId] || qId,
      questionId: qId,
      count: data.count,
      avgArea: data.avgArea.toFixed(2),
    }));
  }, [questionStats]);

  const participantMapCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mentalMapData.features.forEach(feature => {
      const pCode = feature.properties.participant_code;
      counts[pCode] = (counts[pCode] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([code, count]) => ({ participantCode: code, count }))
      .sort((a, b) => b.count - a.count);
  }, [mentalMapData]);

  const questionOverlapData = useMemo(() => {
    const overlap: Record<string, Set<string>> = {};
    mentalMapData.features.forEach(feature => {
      const qId = feature.properties.question_id;
      const pCode = feature.properties.participant_code;
      if (!overlap[qId]) {
        overlap[qId] = new Set();
      }
      overlap[qId].add(pCode);
    });

    return Object.entries(overlap).map(([qId, participants]) => ({
      question: QUESTION_LABELS[qId] || qId,
      questionId: qId,
      uniqueParticipants: participants.size,
    }));
  }, [mentalMapData]);

  const selectedQuestionData = useMemo(() => {
    if (selectedQuestion === 'all') return null;
    
    const features = mentalMapData.features.filter(f => f.properties.question_id === selectedQuestion);
    const centers = features.map(f => {
      const center = calculatePolygonCenter(f.geometry.coordinates);
      return {
        lng: center[0],
        lat: center[1],
        participant: f.properties.participant_code,
      };
    });

    return {
      features,
      centers,
      avgCenter: {
        lng: centers.reduce((sum, c) => sum + c.lng, 0) / centers.length,
        lat: centers.reduce((sum, c) => sum + c.lat, 0) / centers.length,
      },
    };
  }, [selectedQuestion, mentalMapData]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Mental Map Analysen</h2>
              <p className="text-sm text-muted-foreground">
                Detaillierte Analyse nach Fragen und Probanden
              </p>
            </div>
          </div>
          <Badge variant="outline">{mentalMapData.features.length} Mental Maps</Badge>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="questions">Nach Frage</TabsTrigger>
            <TabsTrigger value="participants">Nach Proband</TabsTrigger>
            <TabsTrigger value="spatial">Räumliche Analyse</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-primary/5">
                <p className="text-sm font-medium text-muted-foreground">Gesamt Mental Maps</p>
                <p className="text-3xl font-bold">{mentalMapData.features.length}</p>
              </Card>
              <Card className="p-4 bg-primary/5">
                <p className="text-sm font-medium text-muted-foreground">Anzahl Fragen</p>
                <p className="text-3xl font-bold">{Object.keys(questionStats).length}</p>
              </Card>
              <Card className="p-4 bg-primary/5">
                <p className="text-sm font-medium text-muted-foreground">Teilnehmende Probanden</p>
                <p className="text-3xl font-bold">{new Set(mentalMapData.features.map(f => f.properties.participant_code)).size}</p>
              </Card>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Mental Maps pro Frage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="question" angle={-45} textAnchor="end" height={120} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 mt-4">
            <div className="flex items-center gap-4 mb-4">
              <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Frage auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Fragen</SelectItem>
                  {Object.keys(questionStats).map(qId => (
                    <SelectItem key={qId} value={qId}>
                      {QUESTION_LABELS[qId] || qId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedQuestion === 'all' ? (
              <div className="space-y-3">
                {Object.entries(questionStats).map(([qId, data]) => (
                  <Card key={qId} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{QUESTION_LABELS[qId] || qId}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Anzahl Antworten: {data.count} | Ø Fläche: {data.avgArea.toFixed(2)}
                        </p>
                      </div>
                      <Badge>{data.count} Maps</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : selectedQuestionData ? (
              <div className="space-y-4">
                <Card className="p-4 bg-primary/5">
                  <h4 className="font-semibold mb-2">{QUESTION_LABELS[selectedQuestion]}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Anzahl Antworten</p>
                      <p className="text-2xl font-bold">{selectedQuestionData.features.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Durchschn. Zentrum</p>
                      <p className="text-sm font-mono">
                        {selectedQuestionData.avgCenter.lat.toFixed(2)}°N, {selectedQuestionData.avgCenter.lng.toFixed(2)}°E
                      </p>
                    </div>
                  </div>
                </Card>

                <div>
                  <h4 className="font-semibold mb-3">Teilnehmer für diese Frage</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuestionData.features.map(f => (
                      <Badge key={f.properties.id} variant="secondary">
                        {f.properties.participant_code}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="participants" className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold mb-3">Mental Maps pro Proband</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {participantMapCounts.map(({ participantCode, count }) => (
                  <Card key={participantCode} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{participantCode}</span>
                      <Badge variant="outline">{count} Maps</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spatial" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Unique Teilnehmer pro Frage</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={questionOverlapData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="question" angle={-45} textAnchor="end" height={120} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="uniqueParticipants" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {selectedQuestion !== 'all' && selectedQuestionData && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Zentren der Mental Maps - {QUESTION_LABELS[selectedQuestion]}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="lng" name="Längengrad" />
                      <YAxis type="number" dataKey="lat" name="Breitengrad" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Mental Map Zentren" data={selectedQuestionData.centers} fill="hsl(var(--primary))">
                        {selectedQuestionData.centers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
