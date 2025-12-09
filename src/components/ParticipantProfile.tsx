import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, GraduationCap, Languages, Mic } from "lucide-react";
import { ParticipantData } from "@/types/experiment";
import { calculateParticipantStats } from "@/utils/dataParser";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface ParticipantProfileProps {
  participant: ParticipantData;
}

export const ParticipantProfile = ({ participant }: ParticipantProfileProps) => {
  const stats = calculateParticipantStats(participant);

  const radarData = [
    { subject: 'Sympathie', value: stats.averageSympathy },
    { subject: 'Korrektheit', value: stats.averageCorrectness },
    { subject: 'Lehreignung', value: stats.averageTeacherSuitability },
  ];

  const stimulusChartData = participant.stimulusRatings
    .filter(r => typeof r.sympathyRating === 'number' && !isNaN(r.sympathyRating))
    .map(rating => ({
      stimulus: `Stimulus ${rating.stimulusNumber}`,
      Sympathie: rating.sympathyRating,
      Korrektheit: rating.correctnessRating,
      Lehreignung: rating.teacherSuitabilityRating,
    }));

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{participant.participantCode || `Proband ${participant.id}`}</h2>
            <p className="text-sm text-muted-foreground">ID: {participant.id}</p>
          </div>
        </div>
        <Badge variant="outline">{participant.submissionDate}</Badge>
      </div>

      <Tabs defaultValue="demographics">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demographics">Demografie</TabsTrigger>
          <TabsTrigger value="languages">Sprachen</TabsTrigger>
          <TabsTrigger value="ratings">Bewertungen</TabsTrigger>
          <TabsTrigger value="responses">Antworten</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <User className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Geschlecht & Alter</p>
                <p className="text-lg">{participant.gender}, {participant.age} Jahre</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Geburtsort</p>
                <p className="text-lg">{participant.birthplace}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Aktueller Wohnort</p>
                <p className="text-lg">{participant.currentResidence || 'Keine Angabe'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <GraduationCap className="h-5 w-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Bildung</p>
                <p className="text-lg">{participant.education}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Herkunft Vater</p>
              <p>{participant.fatherOrigin}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Herkunft Mutter</p>
              <p>{participant.motherOrigin}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="languages" className="space-y-4 mt-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Languages className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Muttersprachen</p>
              <div className="flex flex-wrap gap-2">
                {participant.nativeLanguages.map((lang, idx) => (
                  <Badge key={idx} variant="secondary">{lang}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Languages className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Weitere Sprachen</p>
              <div className="flex flex-wrap gap-2">
                {participant.otherLanguages.map((lang, idx) => (
                  <Badge key={idx} variant="outline">{lang}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Mic className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Bekannte Akzente</p>
              <div className="flex flex-wrap gap-2">
                {participant.knownAccents.map((accent, idx) => (
                  <Badge key={idx} variant="outline">{accent}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Eigener Akzent</p>
            <p>{participant.hasAccent ? `Ja: ${participant.ownAccent || 'Nicht spezifiziert'}` : 'Nein'}</p>
          </div>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Ø Sympathie</p>
              <p className="text-2xl font-bold">{stats.averageSympathy.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Ø Korrektheit</p>
              <p className="text-2xl font-bold">{stats.averageCorrectness.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Ø Lehreignung</p>
              <p className="text-2xl font-bold">{stats.averageTeacherSuitability.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="text-sm font-semibold mb-3">Durchschnittliche Bewertungen</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <PolarRadiusAxis angle={90} domain={[1, 5]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar 
                      name="Bewertungen (Likert 1–5)" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.5} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Bewertungen nach Stimulus</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stimulusChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="stimulus" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis domain={[1, 5]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="Sympathie" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="Korrektheit" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="Lehreignung" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Stimulus-Bewertungen im Detail</h4>
            {participant.stimulusRatings.map((rating, idx) => (
              <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">Stimulus {rating.stimulusNumber}</p>
                  <Badge variant="outline">{rating.origin || 'Keine Angabe'}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sympathie:</span> {rating.sympathyRating}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Korrektheit:</span> {rating.correctnessRating}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lehreignung:</span> {rating.teacherSuitabilityRating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {Object.entries(participant.responses)
              .filter(([key]) => !key.includes('Durée') && !key.includes('Temps total'))
              .map(([key, value], idx) => (
                <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{key}</p>
                  <p className="text-sm">{String(value || 'Keine Antwort')}</p>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
