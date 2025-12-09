import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantData } from "@/types/experiment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TrendingUp, Users, BarChart3 } from "lucide-react";
import { useRef } from "react";
import { toPng } from "html-to-image";

interface AdvancedAnalysisProps {
  participants: ParticipantData[];
}

export const AdvancedAnalysis = ({ participants }: AdvancedAnalysisProps) => {
  // Refs für die einzelnen Chart-Container
  const ageChartRef = useRef<HTMLDivElement | null>(null);
  const genderChartRef = useRef<HTMLDivElement | null>(null);
  const ratingsChartRef = useRef<HTMLDivElement | null>(null);
  const educationChartRef = useRef<HTMLDivElement | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportChartSvg = (container: HTMLDivElement | null, filename: string) => {
    if (!container) return;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, filename.endsWith(".svg") ? filename : `${filename}.svg`);
  };

  const exportChartPng = async (container: HTMLDivElement | null, filename: string) => {
    if (!container) return;
    try {
      const dataUrl = await toPng(container, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("PNG-Export fehlgeschlagen:", err);
    }
  };
  // Age distribution
  const ageDistribution = participants.reduce((acc, p) => {
    const ageGroup = Math.floor(p.age / 10) * 10;
    const key = `${ageGroup}-${ageGroup + 9}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ageData = Object.entries(ageDistribution).map(([range, count]) => ({
    age: range,
    anzahl: count,
  }));

  // Gender distribution
  const genderDistribution = participants.reduce((acc, p) => {
    acc[p.gender] = (acc[p.gender] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const genderData = Object.entries(genderDistribution).map(([gender, count]) => ({
    geschlecht: gender,
    anzahl: count,
  }));

  // Average ratings by age
  const ratingsByAge = participants.map(p => {
    const avgSympathy = p.stimulusRatings.reduce((sum, r) => sum + r.sympathyRating, 0) / p.stimulusRatings.length;
    const avgCorrectness = p.stimulusRatings.reduce((sum, r) => sum + r.correctnessRating, 0) / p.stimulusRatings.length;
    
    return {
      age: p.age,
      sympathie: avgSympathy,
      korrektheit: avgCorrectness,
    };
  }).filter(d => d.sympathie > 0);

  // Education levels
  const educationDistribution = participants.reduce((acc, p) => {
    acc[p.education] = (acc[p.education] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const educationData = Object.entries(educationDistribution).map(([education, count]) => ({
    bildung: education || 'Keine Angabe',
    anzahl: count,
  }));

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Erweiterte Analysen</h3>
          <p className="text-sm text-muted-foreground">
            Demografische Verteilungen und Korrelationen
          </p>
        </div>
      </div>

      <Tabs defaultValue="demographics">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demographics">Demografie</TabsTrigger>
          <TabsTrigger value="correlations">Korrelationen</TabsTrigger>
          <TabsTrigger value="education">Bildung</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics" className="space-y-6 mt-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Altersverteilung
              </h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => exportChartSvg(ageChartRef.current, "Altersverteilung")}>SVG</Button>
                <Button variant="outline" size="sm" onClick={() => exportChartPng(ageChartRef.current, "Altersverteilung")}>PNG</Button>
              </div>
            </div>
            <div className="h-[300px]" ref={ageChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="anzahl" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Geschlechterverteilung</h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => exportChartSvg(genderChartRef.current, "Geschlechterverteilung")}>SVG</Button>
                <Button variant="outline" size="sm" onClick={() => exportChartPng(genderChartRef.current, "Geschlechterverteilung")}>PNG</Button>
              </div>
            </div>
            <div className="h-[300px]" ref={genderChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="geschlecht" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="anzahl" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6 mt-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Bewertungen nach Alter
              </h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => exportChartSvg(ratingsChartRef.current, "Bewertungen_nach_Alter")}>SVG</Button>
                <Button variant="outline" size="sm" onClick={() => exportChartPng(ratingsChartRef.current, "Bewertungen_nach_Alter")}>PNG</Button>
              </div>
            </div>
            <div className="h-[400px]" ref={ratingsChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" name="Alter" />
                  <YAxis name="Bewertung" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter name="Sympathie" data={ratingsByAge} fill="hsl(var(--primary))" />
                  <Scatter name="Korrektheit" data={ratingsByAge.map(d => ({ age: d.age, korrektheit: d.korrektheit }))} fill="hsl(var(--chart-2))" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="education" className="space-y-6 mt-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Bildungsverteilung</h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => exportChartSvg(educationChartRef.current, "Bildungsverteilung")}>SVG</Button>
                <Button variant="outline" size="sm" onClick={() => exportChartPng(educationChartRef.current, "Bildungsverteilung")}>PNG</Button>
              </div>
            </div>
            <div className="h-[400px]" ref={educationChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={educationData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="bildung" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="anzahl" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
