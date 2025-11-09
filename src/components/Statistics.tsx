import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, Activity, Database } from "lucide-react";

interface StatisticsProps {
  data: any[];
}

export const Statistics = ({ data }: StatisticsProps) => {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);
  const numericKeys = keys.filter(key => typeof data[0][key] === 'number');
  
  const calculateStats = (key: string) => {
    const values = data.map(row => row[key]).filter(v => typeof v === 'number');
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    return { mean, min, max, median };
  };

  const stats = numericKeys.length > 0 ? calculateStats(numericKeys[0]) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Datenpunkte</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.length}</div>
          <p className="text-xs text-muted-foreground">
            Gesamtanzahl der Einträge
          </p>
        </CardContent>
      </Card>

      {stats && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mittelwert</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mean.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {numericKeys[0]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Median</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.median.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {numericKeys[0]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bereich</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Min - Max
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
