import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantData } from "@/types/experiment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TrendingUp, Users, BarChart3 } from "lucide-react";

interface AdvancedAnalysisProps {
  participants: ParticipantData[];
}

export const AdvancedAnalysis = ({ participants }: AdvancedAnalysisProps) => {
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
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Altersverteilung
            </h4>
            <div className="h-[300px]">
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
            <h4 className="font-medium mb-4">Geschlechterverteilung</h4>
            <div className="h-[300px]">
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
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Bewertungen nach Alter
            </h4>
            <div className="h-[400px]">
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
            <h4 className="font-medium mb-4">Bildungsverteilung</h4>
            <div className="h-[400px]">
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
