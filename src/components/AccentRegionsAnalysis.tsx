import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParticipantData, RegionalResponse } from "@/types/experiment";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import CanadaHeatmap from "./CanadaHeatmap";
import { toPng } from "html-to-image";

interface AccentRegionsAnalysisProps {
  participants: ParticipantData[];
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportPng = async (container: HTMLElement | null, filename: string) => {
  if (!container) return;
  try {
    const dataUrl = await toPng(container, { backgroundColor: "#ffffff" });
    const data = await fetch(dataUrl).then(r => r.blob());
    downloadBlob(data, filename);
  } catch (e) {
    console.error("PNG Export fehlgeschlagen", e);
  }
};

const exportCsv = (rows: Array<Record<string, any>>, filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(";")].concat(
    rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(";"))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
};

const countBy = (items: string[]) => {
  const map: Record<string, number> = {};
  items.forEach(s => { if (!s) return; map[s] = (map[s] || 0) + 1; });
  return Object.entries(map).map(([name, count]) => ({ name, count }));
};

const topN = (items: Array<{ name: string; count: number }>, n = 20) => {
  return [...items].sort((a, b) => b.count - a.count).slice(0, n);
};

type Matrix = { labels: string[]; values: number[][] };
const buildCoOccurrence = (lists: string[][]): Matrix => {
  const labelSet = new Set<string>();
  lists.forEach(list => list.forEach(x => labelSet.add(x)));
  const labels = Array.from(labelSet).sort();
  const index: Record<string, number> = {};
  labels.forEach((l, i) => { index[l] = i; });
  const values = Array.from({ length: labels.length }, () => Array(labels.length).fill(0));
  lists.forEach(list => {
    const unique = Array.from(new Set(list.filter(Boolean)));
    for (let i = 0; i < unique.length; i++) {
      for (let j = i; j < unique.length; j++) {
        const a = index[unique[i]];
        const b = index[unique[j]];
        values[a][b] += 1;
        if (a !== b) values[b][a] += 1;
      }
    }
  });
  return { labels, values };
};

const colorForCount = (count: number, max: number) => {
  if (max <= 0) return 'rgba(0,0,0,0)';
  const t = Math.max(0, Math.min(1, count / max));
  // HSL(var(--primary)) ist nicht direkt berechenbar; nutzen wir abgestuftes Blau
  const alpha = 0.15 + t * 0.75;
  return `rgba(30, 64, 175, ${alpha.toFixed(3)})`; // Tailwind blue-700 RGBA
};

const exportCoOccCsv = (m: Matrix, filename: string) => {
  const rows: Array<{ source: string; target: string; count: number }> = [];
  for (let i = 0; i < m.labels.length; i++) {
    for (let j = i; j < m.labels.length; j++) {
      const c = m.values[i][j];
      if (c > 0) rows.push({ source: m.labels[i], target: m.labels[j], count: c });
    }
  }
  exportCsv(rows as any, filename);
};

const filterParticipants = (participants: ParticipantData[], gender: string | null) => {
  if (!gender || gender === "all") return participants;
  return participants.filter(p => (p.gender || "").toLowerCase().includes(gender));
};

const useRegionData = (participants: ParticipantData[], region: RegionalResponse["region_key"]) => {
  return useMemo(() => {
    const all: RegionalResponse[] = [];
    participants.forEach(p => {
      (p.regionalResponses || []).forEach(r => {
        if (r.region_key === region) all.push(r);
      });
    });

    const names = countBy(all.map(r => (r.name_canonical || r.name_raw || "").trim()).filter(Boolean));
    const liking = countBy(all.map(r => (typeof r.liking === "number" ? String(r.liking) : "")).filter(Boolean));
    const tokensWords = countBy(all.flatMap(r => r.tokens_words || []));
    const tokensPron = countBy(all.flatMap(r => r.tokens_pronunciation || []));
    const tokensGram = countBy(all.flatMap(r => r.tokens_grammar || []));
    const accents = countBy(all.flatMap(r => r.accents_listed || []));
    const alsoTerms = countBy(all.flatMap(r => r.also_terms || []));

    const quebecPlaces = countBy(all.flatMap(r => r.quebecPlaces?.selected || []));
    const acadienPlaces = countBy(all.flatMap(r => r.acadienPlaces || []));

    return { all, names, liking, tokensWords, tokensPron, tokensGram, accents, alsoTerms, quebecPlaces, acadienPlaces };
  }, [participants, region]);
};

// Wortwolke Helfer: konvertiert Zähldaten in visuelle Größen
const wordCloudItems = (items: Array<{ name: string; count: number }>, maxItems = 50) => {
  const top = topN(items, maxItems);
  const max = top.reduce((m, x) => Math.max(m, x.count), 0);
  return top.map(x => {
    const t = max > 0 ? x.count / max : 0;
    const size = 12 + Math.round(Math.sqrt(t) * 24); // 12px .. 36px
    return { text: x.name, size, count: x.count };
  }).sort((a, b) => b.size - a.size);
};


export const AccentRegionsAnalysis = ({ participants }: AccentRegionsAnalysisProps) => {
  const [genderFilter, setGenderFilter] = useState<string | null>("all");
  const filtered = useMemo(() => filterParticipants(participants, genderFilter), [participants, genderFilter]);

  const sudRef = useRef<HTMLDivElement | null>(null);
  const canadaRef = useRef<HTMLDivElement | null>(null);
  const nordParisRef = useRef<HTMLDivElement | null>(null);

  const sud = useRegionData(filtered, 'sud');
  const canada = useRegionData(filtered, 'canada');
  const nord = useRegionData(filtered, 'nord');
  const paris = useRegionData(filtered, 'paris');

  const exportRegionCsv = (regionKey: string, dataset: ReturnType<typeof useRegionData>) => {
    const rows: Record<string, any>[] = [];
    dataset.all.forEach(r => {
      rows.push({
        participant_code: r.participant_code,
        region_key: r.region_key,
        name_canonical: r.name_canonical || '',
        liking: typeof r.liking === 'number' ? r.liking : '',
        accents: (r.accents_listed || []).join(','),
        tokens_words: (r.tokens_words || []).join(','),
        tokens_pronunciation: (r.tokens_pronunciation || []).join(','),
        tokens_grammar: (r.tokens_grammar || []).join(','),
        quebecPlaces: (r.quebecPlaces?.selected || []).join(','),
        parisiansHaveAccent: typeof r.parisiansHaveAccent === 'boolean' ? r.parisiansHaveAccent : '',
        parisStandard: typeof r.parisStandard === 'boolean' ? r.parisStandard : '',
      });
    });
    exportCsv(rows, `region-${regionKey}.csv`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Akzent- und Regionsanalyse</h2>
            <p className="text-sm text-muted-foreground">Filtere Probanden und untersuche Regionen & Präferenzen</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={genderFilter ?? 'all'} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Geschlecht" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Geschlechter</SelectItem>
                <SelectItem value="fem">weiblich</SelectItem>
                <SelectItem value="mas">männlich</SelectItem>
                <SelectItem value="div">divers/sonstiges</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{filtered.length} Probanden</Badge>
          </div>
        </div>


        <Tabs defaultValue="sud">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sud">Südfrankreich</TabsTrigger>
            <TabsTrigger value="canada">Kanada</TabsTrigger>
            <TabsTrigger value="nordparis">Nord/Paris</TabsTrigger>
          </TabsList>

          <TabsContent value="sud" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bezeichnungen & Beliebtheit</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => exportPng(sudRef.current, 'sud.png')}>PNG</Button>
                <Button variant="outline" onClick={() => exportRegionCsv('sud', sud)}>CSV</Button>
              </div>
            </div>
            <div ref={sudRef} className="space-y-6">
              <Card className="p-4">
                <h4 className="font-medium mb-2">Bezeichnungen</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sud.names}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Zusatzlabels (Diriez-vous aussi…)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sud.alsoTerms}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Likert (Aimez-vous l'accent...)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sud.liking}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Distinguez-vous des accents…? (Ja/Nein)</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={countBy(sud.all.map(r => (r.accents_listed && r.accents_listed.length > 0) ? 'Ja' : 'Nein'))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Lesquels? (genannte Akzente im Süden)</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topN(sud.accents)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Akzent anders: Süd-Ouest vs. Süd-Est?</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={countBy(sud.all.map(r => (typeof r.diff_so_se === 'boolean' ? (r.diff_so_se ? 'Ja' : 'Nein') : '')).filter(Boolean))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--chart-4))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Akzent anders: Marseille vs. Toulouse?</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={countBy(sud.all.map(r => (typeof r.diff_marseille_toulouse === 'boolean' ? (r.diff_marseille_toulouse ? 'Ja' : 'Nein') : '')).filter(Boolean))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--chart-5))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Ko-Okkurrenz (Diriez-vous aussi…)</h4>
                  <Button variant="outline" onClick={() => exportCoOccCsv(buildCoOccurrence(sud.all.map(r => r.also_terms || [])), 'sud-cooccurrence.csv')}>CSV</Button>
                </div>
                {(() => {
                  const m = buildCoOccurrence(sud.all.map(r => r.also_terms || []));
                  const max = m.values.reduce((mx, row) => Math.max(mx, ...row), 0);
                  return (
                    <div className="overflow-x-auto">
                      <div className="min-w-[640px]">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${m.labels.length}, 40px)` }}>
                          <div />
                          {m.labels.map(l => (
                            <div key={`col-${l}`} className="text-xs text-muted-foreground rotate-[-45deg] origin-left h-8 flex items-end">{l}</div>
                          ))}
                          {m.labels.map((rowLabel, i) => (
                            <>
                              <div key={`row-label-${rowLabel}`} className="text-xs font-medium h-10 flex items-center pr-2">{rowLabel}</div>
                              {m.values[i].map((v, j) => (
                                <div key={`cell-${i}-${j}`} className="h-10 w-10 border border-muted/30" style={{ backgroundColor: colorForCount(v, max) }} title={`${rowLabel} × ${m.labels[j]} = ${v}`} />
                              ))}
                            </>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
              {/* Tokens-Panels entfernt (Wörter/Aussprache/Grammatik) */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Wortwolke (Bezeichnungen)</h4>
                  <Button variant="outline" onClick={() => exportPng(sudRef.current, 'sud-wordcloud.png')}>PNG</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wordCloudItems(sud.names).map((w, idx) => (
                    <span key={idx} className="text-blue-700" style={{ fontSize: `${w.size}px` }} title={`${w.text} (${w.count})`}>
                      {w.text}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="canada" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bezeichnungen, Québec-Orte & Beliebtheit</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => exportPng(canadaRef.current, 'canada.png')}>PNG</Button>
                <Button variant="outline" onClick={() => exportRegionCsv('canada', canada)}>CSV</Button>
              </div>
            </div>
            <div ref={canadaRef} className="space-y-6">
              <Card className="p-4">
                <h4 className="font-medium mb-2">Bezeichnungen</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={canada.names}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Wortwolke (Bezeichnungen)</h4>
                  <Button variant="outline" onClick={() => exportPng(canadaRef.current, 'canada-wordcloud.png')}>PNG</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wordCloudItems(canada.names).map((w, idx) => (
                    <span key={idx} className="text-blue-700" style={{ fontSize: `${w.size}px` }} title={`${w.text} (${w.count})`}>
                      {w.text}
                    </span>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Zusatzlabels (Diriez-vous aussi…)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={canada.alsoTerms}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Orte (Selon vous, où parle-t-on le québécois…)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={canada.quebecPlaces}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              {(() => {
                const sel = canada.all.flatMap(r => r.quebecPlaces?.selected || []);
                return <CanadaHeatmap labels={sel} />;
              })()}
              <Card className="p-4">
                <h4 className="font-medium mb-2">Likert (Aimez-vous l'accent…)</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={canada.liking}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Ko-Okkurrenz (Diriez-vous aussi…)</h4>
                  <Button variant="outline" onClick={() => exportCoOccCsv(buildCoOccurrence(canada.all.map(r => r.also_terms || [])), 'canada-cooccurrence.csv')}>CSV</Button>
                </div>
                {(() => {
                  const m = buildCoOccurrence(canada.all.map(r => r.also_terms || []));
                  const max = m.values.reduce((mx, row) => Math.max(mx, ...row), 0);
                  return (
                    <div className="overflow-x-auto">
                      <div className="min-w-[640px]">
                        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${m.labels.length}, 40px)` }}>
                          <div />
                          {m.labels.map(l => (
                            <div key={`col-${l}`} className="text-xs text-muted-foreground rotate-[-45deg] origin-left h-8 flex items-end">{l}</div>
                          ))}
                          {m.labels.map((rowLabel, i) => (
                            <>
                              <div key={`row-label-${rowLabel}`} className="text-xs font-medium h-10 flex items-center pr-2">{rowLabel}</div>
                              {m.values[i].map((v, j) => (
                                <div key={`cell-${i}-${j}`} className="h-10 w-10 border border-muted/30" style={{ backgroundColor: colorForCount(v, max) }} title={`${rowLabel} × ${m.labels[j]} = ${v}`} />
                              ))}
                            </>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
              {/* Tokens-Panels entfernt (Wörter/Aussprache/Grammatik) */}
            </div>
          </TabsContent>

          <TabsContent value="nordparis" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nord: Bezeichnungen; Paris: Akzent & Standard</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => exportPng(nordParisRef.current, 'nord-paris.png')}>PNG</Button>
                <Button variant="outline" onClick={() => exportRegionCsv('nordparis', { ...nord, all: [...nord.all, ...paris.all] } as any)}>CSV</Button>
              </div>
            </div>
            <div ref={nordParisRef} className="space-y-6">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Nord – Wortwolke (Bezeichnungen)</h4>
                  <Button variant="outline" onClick={() => exportPng(nordParisRef.current, 'nord-wordcloud.png')}>PNG</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wordCloudItems(nord.names).map((w, idx) => (
                    <span key={idx} className="text-blue-700" style={{ fontSize: `${w.size}px` }} title={`${w.text} (${w.count})`}>
                      {w.text}
                    </span>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Nord – Bezeichnungen</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={nord.names}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Nord – Distinguez-vous des accents…? (Ja/Nein)</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={countBy(nord.all.map(r => (r.accents_listed && r.accents_listed.length > 0) ? 'Ja' : 'Nein'))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Nord – Lesquels? (genannte Akzente)</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topN(nord.accents)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Paris – Haben Pariser einen Akzent?</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={countBy(paris.all.map(r => typeof r.parisiansHaveAccent === 'boolean' ? (r.parisiansHaveAccent ? 'Ja' : 'Nein') : '').filter(Boolean))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-4))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Paris – Bezeichnungen</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={paris.names}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Paris – Spricht man Standard?</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={countBy(paris.all.map(r => typeof r.parisStandard === 'boolean' ? (r.parisStandard ? 'Ja' : 'Nein') : '').filter(Boolean))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--chart-5))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              {/* Tokens-Panels entfernt (Wörter/Aussprache/Grammatik) */}
            </div>
          </TabsContent>

        </Tabs>
      </Card>
    </div>
  );
};