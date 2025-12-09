import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Activity, Database } from "lucide-react";
import { ParticipantData } from "@/types/experiment";

interface StatisticsProps {
  participants: ParticipantData[];
}

export const Statistics = ({ participants }: StatisticsProps) => {
  if (!participants || participants.length === 0) return null;

  const ages = participants.map(p => p.age).filter(a => typeof a === 'number' && !isNaN(a));
  const sum = ages.reduce((a, b) => a + b, 0);
  const mean = ages.length ? sum / ages.length : 0;
  const min = ages.length ? Math.min(...ages) : 0;
  const max = ages.length ? Math.max(...ages) : 0;
  const sorted = [...ages].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Probanden</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{participants.length}</div>
          <p className="text-xs text-muted-foreground">Gesamtanzahl</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ø Alter</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mean.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Durchschnitt</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Median Alter</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{median.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Verteilung</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Altersbereich</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{min.toFixed(0)} - {max.toFixed(0)}</div>
          <p className="text-xs text-muted-foreground">Min - Max</p>
        </CardContent>
      </Card>
    </div>
  );
};
