import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ParticipantData, AccentCategory } from "@/types/experiment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

interface AccentPreferencesViewProps {
  participants: ParticipantData[];
}

type CategoryCounts = Record<AccentCategory, number>;

const allCategories: AccentCategory[] = [
  'parisien',
  'québécois',
  'du sud de la france',
  'alsacien',
  'breton',
  'africain',
  'autre',
];
const displayCategories: AccentCategory[] = allCategories.filter(c => c !== 'autre');

export const AccentPreferencesView = ({ participants }: AccentPreferencesViewProps) => {
  const allChoices = participants.flatMap(p => p.accentPreferences ?? []);

  if (!allChoices.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Akzentpräferenzen</CardTitle>
          <CardDescription>Keine Daten zu Akzentpräferenzen gefunden.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bitte prüfen Sie, ob die 14 Akzentfragen im Fragebogen vorhanden sind und korrekt importiert wurden.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Farbzuordnung je Kategorie (konsistent in beiden Diagrammen)
  const categoryColor: Record<AccentCategory, string> = {
    parisien: 'hsl(var(--chart-1))',
    québécois: 'hsl(var(--chart-2))',
    'du sud de la france': 'hsl(var(--chart-3))',
    alsacien: 'hsl(var(--chart-4))',
    breton: 'hsl(var(--chart-5))',
    africain: 'hsl(var(--chart-6, var(--primary)))',
    autre: 'hsl(var(--muted-foreground))',
    canadien: "",
    nord: "",
    banlieue: "",
    picard: "",
    normand: "",
    aucun: ""
  };

  // Gesamtverteilung über alle Antworten (sortiert)
  const totalCounts: CategoryCounts = allCategories.reduce((acc, cat) => {
    acc[cat] = 0;
    return acc;
  }, {} as CategoryCounts);

  for (const choice of allChoices) {
    totalCounts[choice.accentCategory] = (totalCounts[choice.accentCategory] || 0) + 1;
  }

  const totalSum = Object.entries(totalCounts)
    .filter(([cat]) => cat !== 'autre')
    .reduce((s, [, v]) => s + (v || 0), 0);
  const totalData = displayCategories
    .map(cat => ({
      kategorie: cat,
      anzahl: totalCounts[cat] || 0,
      prozent: totalSum ? Math.round(((totalCounts[cat] || 0) / totalSum) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.anzahl - a.anzahl);

  // Verteilung pro Frage
  const perQuestionMap = new Map<string, CategoryCounts>();
  for (const choice of allChoices) {
    const q = choice.questionLabel || choice.questionKey;
    if (!perQuestionMap.has(q)) {
      const init: CategoryCounts = allCategories.reduce((acc, cat) => {
        acc[cat] = 0;
        return acc;
      }, {} as CategoryCounts);
      perQuestionMap.set(q, init);
    }
    const counts = perQuestionMap.get(q)!;
    counts[choice.accentCategory] = (counts[choice.accentCategory] || 0) + 1;
  }
  const questionList = useMemo(() => Array.from(perQuestionMap.keys()), [perQuestionMap]);
  const [selectedQuestion, setSelectedQuestion] = useState<string | undefined>(questionList[0]);
  const [radarDetailMode, setRadarDetailMode] = useState<'genau' | 'vereinfacht'>('genau');
  const valueMode: 'prozent' = 'prozent';

  const radarRefs = useRef<Partial<Record<AccentCategory, HTMLDivElement | null>>>({});

  const exportRadarSvg = (cat: AccentCategory) => {
    const container = radarRefs.current[cat];
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.startsWith('<?xml')) {
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cat}-radar-${radarDetailMode}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportRadarPng = (cat: AccentCategory) => {
    const container = radarRefs.current[cat];
    if (!container) return;
    const svg = container.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(source)));
    const image64 = `data:image/svg+xml;base64,${svg64}`;
    const img = new Image();
    const width = svg.viewBox?.baseVal?.width || svg.clientWidth || 600;
    const height = svg.viewBox?.baseVal?.height || svg.clientHeight || 320;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${cat}-radar-${radarDetailMode}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    img.src = image64;
  };

  const selectedCounts = selectedQuestion ? perQuestionMap.get(selectedQuestion) : undefined;
  const selectedSum = selectedCounts ? Object.values(selectedCounts).reduce((s, v) => s + v, 0) : 0;
  const selectedData = selectedCounts
    ? displayCategories
        .map(cat => ({
          kategorie: cat,
          anzahl: selectedCounts[cat] || 0,
          prozent: selectedSum ? Math.round(((selectedCounts[cat] || 0) / selectedSum) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.anzahl - a.anzahl)
    : [];

  // Matrix: Varietäten × Fragen
  const extractQuestion = (q: string) => {
    const label = q.replace(/Lequel des accents suivants est pour vous\s*/i, '')
      .replace(/\s*\?+$/i, '')
      .trim();
    const key = label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return { key, label };
  };

  const matrixByQuestion = new Map<string, { label: string; counts: CategoryCounts }>();
  for (const choice of allChoices) {
    const { key, label } = extractQuestion(choice.questionLabel || choice.questionKey);
    if (!matrixByQuestion.has(key)) {
      const init: CategoryCounts = allCategories.reduce((acc, cat) => {
        acc[cat] = 0;
        return acc;
      }, {} as CategoryCounts);
      matrixByQuestion.set(key, { label, counts: init });
    }
    const entry = matrixByQuestion.get(key)!;
    entry.counts[choice.accentCategory] = (entry.counts[choice.accentCategory] || 0) + 1;
  }

  const matrixColumns = Array.from(matrixByQuestion.entries()).map(([key, v]) => ({ key, label: v.label, counts: v.counts }));
  const matrixMode: 'prozent' = 'prozent';

  const colMaxByKey: Record<string, number> = {};
  const colTotalsByKey: Record<string, number> = {};
  for (const col of matrixColumns) {
    const values = displayCategories.map(cat => col.counts[cat] || 0);
    colMaxByKey[col.key] = values.length ? Math.max(...values) : 0;
    colTotalsByKey[col.key] = values.reduce((s, v) => s + v, 0);
  }

  // Regionale Sektionen: Helfer für Export und Datenaufbereitung
  const regionalChartRefs: Partial<Record<AccentCategory, HTMLDivElement | null>> = {
    'du sud de la france': null,
    québécois: null,
    parisien: null,
  };

  const setRegionalRef = (cat: AccentCategory) => (el: HTMLDivElement | null) => {
    regionalChartRefs[cat] = el;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportRegionalSvg = (cat: AccentCategory, filenameBase: string) => {
    const container = regionalChartRefs[cat] || null;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.startsWith('<?xml')) {
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${filenameBase}.svg`);
  };

  const exportRegionalPng = async (cat: AccentCategory, filenameBase: string) => {
    const container = regionalChartRefs[cat] || null;
    if (!container) return;
    try {
      const dataUrl = await toPng(container, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filenameBase}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('PNG-Export fehlgeschlagen:', err);
    }
  };

  const exportRegionalCsv = (cat: AccentCategory, filenameBase: string) => {
    const rows = [['Frage', 'Prozent', 'Anzahl']];
    for (const col of matrixColumns) {
      const raw = col.counts[cat] || 0;
      const total = colTotalsByKey[col.key] || 0;
      const percent = total ? Math.round((raw / total) * 1000) / 10 : 0;
      rows.push([col.label, String(percent).replace('.', ','), String(raw)]);
    }
    const csv = rows.map(r => r.join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `${filenameBase}.csv`);
  };

  const regionalLabel = (cat: AccentCategory) => {
    if (cat === 'du sud de la france') return 'Südfrankreich';
    if (cat === 'québécois') return 'Kanada (Québec)';
    if (cat === 'parisien') return 'Nordfrankreich/Paris';
    return String(cat);
  };

  const buildRegionalSeries = (cat: AccentCategory) => {
    return matrixColumns
      .map(col => {
        const raw = col.counts[cat] || 0;
        const total = colTotalsByKey[col.key] || 0;
        const percent = total ? Math.round((raw / total) * 1000) / 10 : 0;
        return { frage: col.label, prozent: percent, anzahl: raw };
      })
      .sort((a, b) => b.prozent - a.prozent);
  };

  const cellColor = (value: number, colKey: string) => {
    const max = 100;
    const intensity = max > 0 ? value / max : 0;
    const alpha = Math.min(0.85, 0.15 + intensity * 0.7);
    return `hsla(210, 85%, 55%, ${alpha})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Akzentpräferenzen</CardTitle>
        <CardDescription>Übersicht und Verteilung nach Frage</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gesamt" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="gesamt">Gesamtverteilung</TabsTrigger>
            <TabsTrigger value="fragen">Nach Frage</TabsTrigger>
            <TabsTrigger value="matrix">Matrix</TabsTrigger>
            <TabsTrigger value="radar">Radar</TabsTrigger>
            <TabsTrigger value="sud">Südfrankreich</TabsTrigger>
            <TabsTrigger value="kanada">Kanada</TabsTrigger>
            <TabsTrigger value="paris">Paris</TabsTrigger>
          </TabsList>

          {/* Übersicht: horizontale Balken, sortiert, mit Prozent/Anzahl umschaltbar */}
          <TabsContent value="gesamt" className="h-[460px] mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{totalSum} Antworten insgesamt</div>
              <div className="text-sm">Anzeige: Prozent</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" dataKey="prozent" className="text-xs" />
                <YAxis type="category" dataKey="kategorie" className="text-xs" width={160} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="prozent">
                  {totalData.map((entry) => (
                    <Cell key={`cell-${entry.kategorie}`} fill={categoryColor[entry.kategorie as AccentCategory]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Region: Südfrankreich */}
          <TabsContent value="sud" className="h-[520px] mt-6 space-y-3">
            {(() => {
              const cat: AccentCategory = 'du sud de la france';
              const series = buildRegionalSeries(cat);
              const label = regionalLabel(cat);
              const filenameBase = `${label.replace(/\s+/g, '_')}_pro_Frage`;
              return (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{label}: Anteil je Frage</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => exportRegionalSvg(cat, filenameBase)}>SVG</Button>
                      <Button variant="outline" size="sm" onClick={() => exportRegionalPng(cat, filenameBase)}>PNG</Button>
                      <Button variant="outline" size="sm" onClick={() => exportRegionalCsv(cat, filenameBase)}>CSV</Button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" dataKey="prozent" className="text-xs" />
                      <YAxis type="category" dataKey="frage" className="text-xs" width={260} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                      <Bar dataKey="prozent" fill={categoryColor[cat]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="h-0" ref={setRegionalRef(cat)} />
                </>
              );
            })()}
          </TabsContent>

          {/* Region: Kanada (Québec) */}
          <TabsContent value="kanada" className="h-[520px] mt-6 space-y-3">
            {(() => {
              const cat: AccentCategory = 'québécois';
              const series = buildRegionalSeries(cat);
              const label = regionalLabel(cat);
              const filenameBase = `${label.replace(/\s+/g, '_')}_pro_Frage`;
              return (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{label}: Anteil je Frage</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => exportRegionalSvg(cat, filenameBase)}>SVG</Button>
                      <Button variant="outline" size="sm" onClick={() => exportRegionalPng(cat, filenameBase)}>PNG</Button>
                      <Button variant="outline" size="sm" onClick={() => exportRegionalCsv(cat, filenameBase)}>CSV</Button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" dataKey="prozent" className="text-xs" />
                      <YAxis type="category" dataKey="frage" className="text-xs" width={260} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                      <Bar dataKey="prozent" fill={categoryColor[cat]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="h-0" ref={setRegionalRef(cat)} />
                </>
              );
            })()}
          </TabsContent>

          {/* Region: Nordfrankreich/Paris */}
          <TabsContent value="paris" className="h-[520px] mt-6 space-y-3">
            {(() => {
              const cat: AccentCategory = 'parisien';
              const series = buildRegionalSeries(cat);
              const label = regionalLabel(cat);
              const filenameBase = `${label.replace(/\s+/g, '_')}_pro_Frage`;
              return (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{label}: Anteil je Frage</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => exportRegionalSvg(cat, filenameBase)}>SVG</Button>
                      <Button variant="outline" size="sm" onClick={() => exportRegionalPng(cat, filenameBase)}>PNG</Button>
                      <Button variant="outline" size="sm" onClick={() => exportRegionalCsv(cat, filenameBase)}>CSV</Button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" dataKey="prozent" className="text-xs" />
                      <YAxis type="category" dataKey="frage" className="text-xs" width={260} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                      <Bar dataKey="prozent" fill={categoryColor[cat]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="h-0" ref={setRegionalRef(cat)} />
                </>
              );
            })()}
          </TabsContent>

          {/* Nach Frage: Auswahl der Frage und horizontale Balken */}
          <TabsContent value="fragen" className="h-[520px] mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <Select value={selectedQuestion} onValueChange={setSelectedQuestion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Frage auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {questionList.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm">Anzeige: Prozent</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" dataKey="prozent" className="text-xs" />
                <YAxis type="category" dataKey="kategorie" className="text-xs" width={220} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="prozent">
                  {selectedData.map((entry) => (
                    <Cell key={`cell-q-${entry.kategorie}`} fill={categoryColor[entry.kategorie as AccentCategory]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          {/* Matrix: Varietäten × Fragen mit Farbskala */}
          <TabsContent value="matrix" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Matrix der Antworten über alle Fragen</div>
              <div className="text-sm">Anzeige: Prozent</div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full border rounded-md">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-card p-2 text-left border">Varietät</th>
                    {matrixColumns.map(col => (
                      <th key={col.key} className="p-2 text-left border whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayCategories.map(cat => (
                    <tr key={cat}>
                      <td className="sticky left-0 bg-card p-2 border font-medium">{cat}</td>
                      {matrixColumns.map(col => {
                        const raw = col.counts[cat] || 0;
                        const percent = colTotalsByKey[col.key] ? Math.round((raw / colTotalsByKey[col.key]) * 1000) / 10 : 0;
                        const display = percent;
                        const bg = cellColor(percent, col.key);
                        return (
                          <td key={`${col.key}-${cat}`} className="p-2 border text-center" style={{ backgroundColor: bg }} title={`${cat} → ${col.label}: ${raw} (${percent}%)`}>
                            <span className="text-sm font-medium">{display}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Radar: Spinnennetz je Varietät über alle Fragen (genau/vereinfacht) */}
          <TabsContent value="radar" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Spinnennetze je Varietät</div>
              <div className="flex items-center gap-3">
                <div className="text-sm">Anzeige: Prozent</div>
                <Tabs value={radarDetailMode} onValueChange={(v) => setRadarDetailMode(v as 'genau' | 'vereinfacht')}>
                  <TabsList>
                    <TabsTrigger value="genau" id="radar-detail-genau">Genau</TabsTrigger>
                    <TabsTrigger value="vereinfacht" id="radar-detail-vereinfacht">Vereinfacht</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Globale Skalenberechnung für Radar-Ansichten */}
            {(() => {
              // Mapping-Funktion für vereinfachte Attribute (7 Paare)
              const mapLabelToGroup = (label: string) => {
                const n = label
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toLowerCase();
                // Schönheit
                if (n.includes('beau') || n.includes('belle')) return { group: 'Schönheit', dir: +1 };
                if (n.includes('laid') || n.includes('laide')) return { group: 'Schönheit', dir: -1 };
                // Sympathie
                if (n.includes('sympathique')) return { group: 'Sympathie', dir: n.includes('moins') ? -1 : +1 };
                // Ernsthaftigkeit
                if (n.includes('serieux')) return { group: 'Ernsthaftigkeit', dir: +1 };
                if (n.includes('ridicule')) return { group: 'Ernsthaftigkeit', dir: -1 };
                // Raffinesse
                if (n.includes('raffine')) return { group: 'Raffinesse', dir: n.includes('moins') ? -1 : +1 };
                // Korrektheit
                if (n.includes('correct')) return { group: 'Korrektheit', dir: n.includes('moins') ? -1 : +1 };
                // Wärme
                if (n.includes('chaud')) return { group: 'Wärme', dir: +1 };
                if (n.includes('froid')) return { group: 'Wärme', dir: -1 };
                // Weichheit
                if (n.includes('doux')) return { group: 'Weichheit', dir: +1 };
                if (n.includes('dur')) return { group: 'Weichheit', dir: -1 };
                return { group: label, dir: +1 };
              };
              const simplifiedOrder = ['Schönheit','Sympathie','Ernsthaftigkeit','Raffinesse','Korrektheit','Wärme','Weichheit'];

              // Exakt: immer prozentbasierte Geometrie, äußerster Ring = 100%
              let globalExactMax = 100;

              // Vereinfacht: immer prozentbasierte Geometrie, äußerster Ring = ±100%
              let globalSimplifiedMaxAbs = 100;

              // Übergabe der Hilfsfunktionen und Maxima via Closure
              (window as any).__radarHelpers = { mapLabelToGroup, simplifiedOrder, globalExactMax, globalSimplifiedMaxAbs };
              return null;
            })()}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayCategories.map(cat => {
                const { mapLabelToGroup, simplifiedOrder, globalExactMax, globalSimplifiedMaxAbs } = (window as any).__radarHelpers;

                // Erzeuge exakte Serie pro Frage
                const exactSeries = matrixColumns.map(col => {
                  const raw = col.counts[cat] || 0;
                  const total = colTotalsByKey[col.key] || 0;
                  const percent = total ? Math.round((raw / total) * 1000) / 10 : 0;
                  return { frage: col.label, wert: percent };
                });

                // Erzeuge vereinfachte Serie über Attribute-Gruppen
                const agg: Record<string, number> = {};
                for (const col of matrixColumns) {
                  const raw = col.counts[cat] || 0;
                  const total = colTotalsByKey[col.key] || 0;
                  const percent = total ? Math.round((raw / total) * 1000) / 10 : 0;
                  const { group, dir } = mapLabelToGroup(col.label);
                  const val = percent; // prozentbasierte Geometrie in beiden Modi
                  agg[group] = (agg[group] || 0) + dir * val;
                }
                const simplifiedSeries = simplifiedOrder
                  .filter(k => agg[k] !== undefined)
                  .map(k => ({ frage: k, wert: agg[k] }));

                const isSimplified = radarDetailMode === 'vereinfacht';
                const data = isSimplified ? simplifiedSeries : exactSeries;
                const dataWithZero = data.map(d => ({ ...d, zero: 0 }));

                const domain = isSimplified ? [-globalSimplifiedMaxAbs, globalSimplifiedMaxAbs] : [0, globalExactMax];

                return (
                  <Card key={`radar-${cat}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm">{cat}</CardTitle>
                          <CardDescription className="text-xs">{isSimplified ? 'Vereinfacht (globale Skala)' : 'Genau (globale Skala)'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="text-xs px-2 py-1 border rounded hover:bg-muted" onClick={() => exportRadarSvg(cat)}>SVG</button>
                          <button className="text-xs px-2 py-1 border rounded hover:bg-muted" onClick={() => exportRadarPng(cat)}>PNG</button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[320px]" ref={(el) => { radarRefs.current[cat] = el; }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={dataWithZero}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="frage" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis angle={90} domain={domain as any} tick={{ fontSize: 10 }} />
                            <Radar dataKey="wert" stroke={categoryColor[cat]} fill={categoryColor[cat]} fillOpacity={0.4} />
                            {/* Markiere 0 mit rotem Ring */}
                            <Radar dataKey="zero" stroke="#ef4444" fillOpacity={0} dot={false} isAnimationActive={false} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};