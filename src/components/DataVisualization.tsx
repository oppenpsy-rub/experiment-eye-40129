import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataVisualizationProps {
  data: any[];
}

export const DataVisualization = ({ data }: DataVisualizationProps) => {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]);
  const numericKeys = keys.filter(key => typeof data[0][key] === 'number');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datenvisualisierung</CardTitle>
        <CardDescription>Interaktive Diagramme Ihrer Experimentdaten</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="line" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="line">Liniendiagramm</TabsTrigger>
            <TabsTrigger value="bar">Balkendiagramm</TabsTrigger>
            <TabsTrigger value="scatter">Streudiagramm</TabsTrigger>
          </TabsList>
          
          <TabsContent value="line" className="h-[400px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey={keys[0]} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Legend />
                {numericKeys.slice(0, 3).map((key, index) => (
                  <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={`hsl(var(--chart-${index + 1}))`}
                    strokeWidth={2}
                    dot={{ fill: `hsl(var(--chart-${index + 1}))` }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="bar" className="h-[400px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey={keys[0]} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Legend />
                {numericKeys.slice(0, 3).map((key, index) => (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    fill={`hsl(var(--chart-${index + 1}))`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="scatter" className="h-[400px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey={numericKeys[0]} name={numericKeys[0]} className="text-xs" />
                <YAxis dataKey={numericKeys[1]} name={numericKeys[1]} className="text-xs" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Legend />
                <Scatter 
                  name={`${numericKeys[0]} vs ${numericKeys[1]}`} 
                  data={data} 
                  fill="hsl(var(--chart-1))"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
