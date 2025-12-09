import * as XLSX from 'xlsx';
import { z } from 'zod';
import { ParticipantData, StimulusRating, MentalMapData, AccentPreferenceChoice, RegionalResponse, QuebecPlaces } from '@/types/experiment';
import { ExcelRowsSchema, MentalMapDataSchema } from '@/schemas/experiment';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Extrahiere die erste Zahl (inkl. Komma/Dezimalpunkt) aus Strings wie "7", "7,5", "7 (sympathisch)", "7/10"
    const match = value.match(/[0-9]+(?:[\.,][0-9]+)?/);
    if (match) {
      const n = parseFloat(match[0].replace(',', '.'));
      return isNaN(n) ? 0 : n;
    }
    return 0;
  }
  return 0;
};

// Kanonisierung von Texten: Kleinbuchstaben, Diakritika entfernen, Whitespace/Binder vereinheitlichen
const canonText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[’'`´]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-–—]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

const splitFreeList = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split(/[;,\n]+/)
    .map(s => s.trim())
    .filter(Boolean);
};

// sehr einfache Tokenisierung mit Stoppwörtern
const tokenize = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  const stop: Set<string> = new Set([
    'le','la','les','de','du','des','et','a','au','aux','en','un','une','pour','que','qui','ne','pas','se','sur','dans','avec','sans','plus','moins','tres','tres','est','cest','ce','ca','il','elle','on','nous','vous','ils','elles'
  ]);
  return canonText(value)
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 2 && !stop.has(t));
};

// Synonym-Mapping für Bezeichnungen
const canonicalLabel = (s: string): string => {
  const c = canonText(s);
  if (!c) return '';
  if (c.includes('occitan') || c.includes('meridional') || c.includes('langue doc') || c.includes('midi') || c.includes('accent du sud')) {
    return 'Sud (Midi/Occitan)';
  }
  if (c.includes('quebec') || c.includes('québec') || c.includes('quebecois') || c.includes('canadien') || c.includes('canada') || c.includes('nord-americain')) {
    // Unterscheidung grob
    if (c.includes('quebec') || c.includes('quebecois')) return 'québécois';
    return 'canadien';
  }
  if (c.includes('paris')) return 'parisien';
  if (c.includes('banlieue')) return 'banlieue';
  if (c.includes('chti') || c.includes('chtimi') || c.includes('picard')) return 'picard';
  if (c.includes('normand')) return 'normand';
  if (c.includes('aucun')) return 'aucun';
  return c;
};

// Extrahiere kanadische Provinz/Stadt aus Checkbox-Schlüsseln zu "Selon vous, où parle-t-on le québécois ..."
const canonicalQuebecPlace = (s: string): string => {
  const c = canonText(s);
  if (!c) return '';
  // spezielle Optionen
  if (c.includes('partout') && c.includes('canada')) return 'Partout au Canada francophone';
  if (c.includes('je ne sais pas')) return 'Je ne sais pas';
  if (c.includes('je ne connais pas bien le quebecois')) return 'Je ne connais pas bien le québécois';

  // Städte
  if (c.includes('montreal')) return 'Montréal';
  if (c.includes('quebec') && c.includes('ville')) return 'Québec (Ville)';

  // Provinzen (de/fr/en Varianten)
  if (c.includes('quebec') && c.includes('province')) return 'Québec (Province)';
  if (c.includes('ontario')) return 'Ontario';
  if (c.includes('nouveau brunswick') || c.includes('new brunswick')) return 'New Brunswick';
  if (c.includes('nouvelle ecosse') || c.includes('nova scotia')) return 'Nova Scotia';
  if (c.includes('ile du prince') || c.includes('prince edward')) return 'Prince Edward Island';
  if (c.includes('terre neuve') || c.includes('labrador')) return 'Newfoundland and Labrador';
  if (c.includes('manitoba')) return 'Manitoba';
  if (c.includes('saskatchewan')) return 'Saskatchewan';
  if (c.includes('alberta')) return 'Alberta';
  if (c.includes('colombie britannique') || c.includes('british columbia')) return 'British Columbia';
  if (c.includes('yukon')) return 'Yukon';
  if (c.includes('territoires du nord ouest') || c.includes('northwest territories')) return 'Northwest Territories';
  if (c.includes('nunavut')) return 'Nunavut';
  return c;
};

// Synonyme für Akzentnamen in Listen
const mapAccentSynonym = (s: string): string => {
  const c = canonText(s);
  if (!c) return '';
  if (c.includes('paris')) return 'parisien';
  if (c.includes('quebec')) return 'québécois';
  if (c.includes('canad')) return 'canadien';
  if (c.includes('midi') || c.includes('sud')) return 'du sud de la france';
  if (c.includes('alsac')) return 'alsacien';
  if (c.includes('bret')) return 'breton';
  if (c.includes('afric')) return 'africain';
  if (c.includes('banlieue')) return 'banlieue';
  if (c.includes('chti') || c.includes('picard')) return 'picard';
  if (c.includes('normand')) return 'normand';
  if (c.includes('acadien')) return 'acadien';
  if (c.includes('aucun')) return 'aucun';
  return c;
};

// Mappe 5-Punkt-Likert (pas du tout, pas trop, peut-être, un peu, absolument) → 1..5
const toLikert = (value: unknown): number => {
  if (typeof value === 'number') {
    const clamped = Math.max(1, Math.min(5, value));
    return clamped;
  }
  if (typeof value === 'string') {
    const s = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Diakritika entfernen
      .toLowerCase()
      .trim();

    if (s.includes('pas du tout')) return 1;
    if (s.includes('pas trop')) return 2;
    if (s.includes('peut-etre')) return 3;
    if (s.includes('un peu')) return 4;
    if (s.includes('absolument')) return 5;

    // Fallback: Zahl im String, dann clampen
    const n = toNumber(value);
    if (!isNaN(n) && n > 0) {
      return Math.max(1, Math.min(5, n));
    }
    // Unbekannt → NaN, damit aus Statistik herausgefiltert
    return Number.NaN;
  }
  return Number.NaN;
};

// Oui/Non → boolean
const toYes = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const s = value
      .normalize('NFD')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .toLowerCase()
      .trim();
    if (s === 'oui' || s === 'yes' || s === 'true') return true;
    if (s === 'non' || s === 'no' || s === 'false') return false;
  }
  return false;
};

// Antwortoptionen der 14 Akzentfragen kanonisieren
const toAccentCategory = (value: unknown): AccentPreferenceChoice['accentCategory'] => {
  if (typeof value !== 'string') return 'autre';
  const s = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (s === 'parisien' || s.includes('paris')) return 'parisien';
  if (s === 'quebecois' || s === 'québécois' || s.includes('quebec')) return 'québécois';
  if (s === 'du sud de la france' || s.includes('sud de la france') || s.includes('midi')) return 'du sud de la france';
  if (s === 'alsacien' || s.includes('alsac')) return 'alsacien';
  if (s === 'breton' || s.includes('bret')) return 'breton';
  if (s === 'africain' || s.includes('afric')) return 'africain';
  return 'autre';
};

export const parseExperimentData = (excelData: any[]): ParticipantData[] => {
  const validatedRows = ExcelRowsSchema.safeParse(excelData);
  const rows = validatedRows.success ? validatedRows.data : excelData;

  return rows.map((row: any, index: number) => {
    const stimulusRatings: StimulusRating[] = [];

    // Normalisierung und Gruppierung: pro Stimulus (2 leere Spalten, dann Herkunft, dann 3 Bewertungen)
    const normalize = (s: string) => s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'`´]/g, '')
      .toLowerCase();

    const isOriginKey = (s: string) => s.includes('dapres vous') && s.includes('dou');
    const isSympathyKey = (s: string) => s.includes('sympathique');
    const isCorrectnessKey = (s: string) => s.includes('correct');
    const isTeacherKey = (s: string) => s.includes('professeur de francais');

    const keys = Object.keys(row);
    const normKeys = keys.map(k => ({ key: k, norm: normalize(k) }));

    const getValByIncludes = (needle: string): unknown => {
      const n = needle;
      const found = normKeys.find(k => k.norm.includes(n));
      return found ? row[found.key] : undefined;
    };

    const participantCodeValue = row["Veuillez saisir ici votre code participant indiqué dans l'outil Mental Maps."] || '';

    for (let i = 0; i < normKeys.length && stimulusRatings.length < 7; i++) {
      if (!isOriginKey(normKeys[i].norm)) continue;

      const originVal = row[normKeys[i].key] || '';
      let sympathyVal: unknown = undefined;
      let correctnessVal: unknown = undefined;
      let teacherVal: unknown = undefined;

      for (let j = i + 1; j < normKeys.length; j++) {
        const n = normKeys[j].norm;
        if (isOriginKey(n)) break; // nächster Stimulus beginnt
        if (sympathyVal === undefined && isSympathyKey(n)) {
          sympathyVal = row[normKeys[j].key];
          continue;
        }
        if (correctnessVal === undefined && isCorrectnessKey(n)) {
          correctnessVal = row[normKeys[j].key];
          continue;
        }
        if (teacherVal === undefined && isTeacherKey(n)) {
          teacherVal = row[normKeys[j].key];
          continue;
        }
        // Falls alle drei gefunden, stoppen
        if (sympathyVal !== undefined && correctnessVal !== undefined && teacherVal !== undefined) break;
      }

      stimulusRatings.push({
        stimulusNumber: stimulusRatings.length + 1,
        origin: originVal || '',
        sympathyRating: toLikert(sympathyVal),
        correctnessRating: toLikert(correctnessVal),
        teacherSuitabilityRating: toLikert(teacherVal),
      });
    }

    // Akzentpräferenz-Fragen sammeln (14 Fragen):
    // Erkennung über Präfix "Lequel des accents suivants est pour vous"
    const accentPreferences: AccentPreferenceChoice[] = keys
      .filter(k => {
        const n = normalize(k);
        return n.startsWith('lequel des accents suivants est pour vous');
      })
      .map(k => {
        const val = row[k];
        const category = toAccentCategory(val);
        return {
          questionLabel: k,
          questionKey: k,
          accentCategory: category,
          participantCode: participantCodeValue,
        };
      })
      .filter(ap => !!ap.accentCategory);

    // Regionale Antworten vorbereiten
    const regionalResponses: RegionalResponse[] = [];

    // Südfrankreich
    const sudNameRaw = getValByIncludes('comment appelez-vous le francais parle dans le sud de la france');
    const sudAlsoTerms = normKeys
      .filter(k => k.norm.includes('diriez-vous aussi') && (k.norm.includes('sud') || k.norm.includes('midi') || k.norm.includes('merid') || k.norm.includes('occitan') || k.norm.includes('francitan') || k.norm.includes('aucun')))
      .map(k => (toYes(row[k.key]) ? k.key : null))
      .filter(Boolean)
      .map(k => canonicalLabel(String(k)));
    const sudPersonality = getValByIncludes('personnalite') || getValByIncludes('associee');
    const sudWords = getValByIncludes('mots') && String(getValByIncludes('mots')) || '';
    const sudPron = getValByIncludes('prononciation') && String(getValByIncludes('prononciation')) || '';
    const sudGram = getValByIncludes('grammaire') && String(getValByIncludes('grammaire')) || '';
    const sudDistinguish = toYes(getValByIncludes('distinguez-vous des accents'));
    const sudWhich = splitFreeList(getValByIncludes('lesquels'))
      .map(mapAccentSynonym)
      .filter(Boolean);
    const sudSOSE = toYes(getValByIncludes('sud-ouest')) || toYes(getValByIncludes('sud ouest')) || toYes(getValByIncludes('sud est'));
    const sudMT = toYes(getValByIncludes('marseille')) || toYes(getValByIncludes('toulouse'));
    const sudLiking = toLikert(getValByIncludes("aimez-vous laccent") || getValByIncludes('midi'));

    if (sudNameRaw || sudAlsoTerms.length || sudWhich.length || sudWords || sudPron || sudGram) {
      regionalResponses.push({
        participant_code: participantCodeValue,
        region_key: 'sud',
        name_raw: sudNameRaw ? String(sudNameRaw) : undefined,
        name_canonical: sudNameRaw ? canonicalLabel(String(sudNameRaw)) : undefined,
        also_terms: sudAlsoTerms,
        personalities: sudPersonality ? splitFreeList(String(sudPersonality)) : [],
        tokens_words: tokenize(sudWords),
        tokens_pronunciation: tokenize(sudPron),
        tokens_grammar: tokenize(sudGram),
        accents_listed: sudDistinguish ? sudWhich : [],
        diff_so_se: sudSOSE || undefined,
        diff_marseille_toulouse: sudMT || undefined,
        liking: !isNaN(sudLiking) ? sudLiking : undefined,
      });
    }

    // Kanada
    const canNameRaw = getValByIncludes('comment appelez-vous le francais parle au canada');
    const canAlsoTerms = normKeys
      .filter(k => k.norm.includes('pour le francais au canada, diriez-vous aussi') || (k.norm.includes('diriez-vous aussi') && k.norm.includes('canada')))
      .map(k => (toYes(row[k.key]) ? k.key : null))
      .filter(Boolean)
      .map(k => canonicalLabel(String(k)));
    const canWords = getValByIncludes('mots') && String(getValByIncludes('mots')) || '';
    const canPron = getValByIncludes('prononciation') && String(getValByIncludes('prononciation')) || '';
    const canGram = getValByIncludes('grammaire') && String(getValByIncludes('grammaire')) || '';
    const canWhichCanada = splitFreeList(getValByIncludes('lesquels'))
      .map(mapAccentSynonym);
    const canWhichQuebec = splitFreeList(getValByIncludes('lesquels'))
      .map(mapAccentSynonym);
    // Orte: Checkbox je Ort
    const quebecPlaces: QuebecPlaces = { selected: [], partout: false, jeNeSaisPas: false };
    normKeys
      .filter(k => k.norm.includes('selon vous, ou parle-t-on le quebecois') || k.norm.includes('selon vous ou parle-t-on le quebecois') || k.norm.includes('ou parle-t-on le quebecois') || k.norm.includes('parle t on le quebecois'))
      .forEach(k => {
        const original = k.key;
        const isYes = toYes(row[original]);
        if (!isYes) return;
        const label = canonicalQuebecPlace(original);
        const l = label.toLowerCase();
        if (l.includes('partout au canada')) {
          quebecPlaces.partout = true;
          return;
        }
        if (l.includes('je ne sais pas')) {
          quebecPlaces.jeNeSaisPas = true;
          return;
        }
        if (label) {
          quebecPlaces.selected.push(label);
        }
      });
    const acadienKnown = toYes(getValByIncludes('acadien'));
    const acadienPlaces = splitFreeList(getValByIncludes('acadien'));
    const acadienTokens = tokenize(getValByIncludes('acadien'));
    const canLiking = toLikert(getValByIncludes('aimez-vous laccent') || getValByIncludes('canada'));

    if (canNameRaw || canAlsoTerms.length || quebecPlaces.selected.length || canWhichCanada.length || canWhichQuebec.length) {
      regionalResponses.push({
        participant_code: participantCodeValue,
        region_key: 'canada',
        name_raw: canNameRaw ? String(canNameRaw) : undefined,
        name_canonical: canNameRaw ? canonicalLabel(String(canNameRaw)) : undefined,
        also_terms: canAlsoTerms,
        accents_listed: [...canWhichCanada, ...canWhichQuebec].filter(Boolean),
        tokens_words: tokenize(canWords),
        tokens_pronunciation: tokenize(canPron),
        tokens_grammar: tokenize(canGram),
        quebecPlaces,
        acadienKnown: acadienKnown || undefined,
        acadienPlaces,
        acadienTokens,
        liking: !isNaN(canLiking) ? canLiking : undefined,
      });
    }

    // Nordfrankreich
    const nordNameRaw = getValByIncludes('comment appelez-vous le francais parle dans le nord de la france');
    const nordWords = getValByIncludes('mots') && String(getValByIncludes('mots')) || '';
    const nordPron = getValByIncludes('prononciation') && String(getValByIncludes('prononciation')) || '';
    const nordGram = getValByIncludes('grammaire') && String(getValByIncludes('grammaire')) || '';
    const nordWhich = splitFreeList(getValByIncludes('lesquels')).map(mapAccentSynonym);
    if (nordNameRaw || nordWhich.length || nordWords || nordPron || nordGram) {
      regionalResponses.push({
        participant_code: participantCodeValue,
        region_key: 'nord',
        name_raw: nordNameRaw ? String(nordNameRaw) : undefined,
        name_canonical: nordNameRaw ? canonicalLabel(String(nordNameRaw)) : undefined,
        accents_listed: nordWhich,
        tokens_words: tokenize(nordWords),
        tokens_pronunciation: tokenize(nordPron),
        tokens_grammar: tokenize(nordGram),
      });
    }

    // Paris
    const parisNameRaw = getValByIncludes('comment appelez-vous le francais parle a paris');
    const parisHaveAccent = toYes(getValByIncludes('est-ce que les parisiens ont un accent'));
    const parisWords = getValByIncludes('mots') && String(getValByIncludes('mots')) || '';
    const parisPron = getValByIncludes('prononciation') && String(getValByIncludes('prononciation')) || '';
    const parisGram = getValByIncludes('grammaire') && String(getValByIncludes('grammaire')) || '';
    const parisStandard = toYes(getValByIncludes('a votre avis, a paris, parle-ton le francais standard'));
    if (parisNameRaw || parisHaveAccent || parisStandard || parisWords || parisPron || parisGram) {
      regionalResponses.push({
        participant_code: participantCodeValue,
        region_key: 'paris',
        name_raw: parisNameRaw ? String(parisNameRaw) : undefined,
        name_canonical: parisNameRaw ? canonicalLabel(String(parisNameRaw)) : undefined,
        parisiansHaveAccent: parisHaveAccent || undefined,
        tokens_words: tokenize(parisWords),
        tokens_pronunciation: tokenize(parisPron),
        tokens_grammar: tokenize(parisGram),
        parisStandard: parisStandard || undefined,
      });
    }

    return {
      id: (row['ID de la réponse'] != null ? String(row['ID de la réponse']) : String(index + 1)),
      participantCode: participantCodeValue,
      submissionDate: row['Date de soumission'] || '',
      gender: row['Veuillez indiquer votre genre'] || '',
      age: toNumber(row['Veuillez indiquer votre âge']) || 0,
      birthplace: row['Qù êtes-vous né et où avez-vous grandi ?'] || '',
      currentResidence: row['Où habitez-vous actuellement (hors d\'Allemagne) et depuis combien de mois / combien d\'années ? [Où ?]'] || '',
      education: row['Quel est le dernier diplôme que vous avez obtenu ?'] || '',
      fatherOrigin: row['Quel est l\'origine de votre père ?'] || '',
      motherOrigin: row['Quel est l\'origine de votre mère ?'] || '',
      nativeLanguages: (() => {
        const langs: string[] = [];
        const fr = row['Quelle est ou quelles sont votre/vos langue(s) maternelle(s) ? [français]'];
        if (typeof fr !== 'undefined' && String(fr).toLowerCase() === 'oui') {
          langs.push('Français');
        }
        const other = row['Quelle est ou quelles sont votre/vos langue(s) maternelle(s) ? [Autre]'];
        if (other) {
          // Falls mehrere durch Komma getrennt sind
          String(other).split(',').map(s => s.trim()).filter(Boolean).forEach(s => langs.push(s));
        }
        return langs;
      })(),
      otherLanguages: (row['Quelle(s) autre(s) langue(s) maîtrisez-vous ?A quel niveau (environ) ?'] || '').split(',').filter(Boolean),
      knownAccents: (row['Quels accents du français connaissez-vous ?'] || '').split(',').filter(Boolean),
      hasAccent: String(row['Avez-vous un accent ?']).toLowerCase() === 'oui',
      ownAccent: row['Avez-vous un accent ? [Autre]'] || '',
      responses: row,
      stimulusRatings,
      accentPreferences,
      regionalResponses,
    };
  });
};

export const parseMentalMapData = async (geojsonPath: string): Promise<MentalMapData> => {
  const response = await fetch(geojsonPath);
  if (!response.ok) {
    throw new Error(`Fehler beim Laden der Mental Maps: ${response.status}`);
  }
  const json = await response.json();
  const validated = MentalMapDataSchema.parse(json);
  return validated as MentalMapData;
};

export const getParticipantMentalMaps = (participantCode: string, mentalMapData: MentalMapData) => {
  return mentalMapData.features.filter(
    feature => feature.properties.participant_code === participantCode
  );
};

export const calculateParticipantStats = (participant: ParticipantData) => {
  const ratings = participant.stimulusRatings.filter(r => typeof r.sympathyRating === 'number' && !isNaN(r.sympathyRating));
  
  if (ratings.length === 0) {
    return {
      averageSympathy: 0,
      averageCorrectness: 0,
      averageTeacherSuitability: 0,
      mostAppreciatedAccent: '',
      leastAppreciatedAccent: '',
    };
  }

  const avgSympathy = ratings.reduce((sum, r) => sum + r.sympathyRating, 0) / ratings.length;
  const avgCorrectness = ratings.reduce((sum, r) => sum + r.correctnessRating, 0) / ratings.length;
  const avgTeacher = ratings.reduce((sum, r) => sum + r.teacherSuitabilityRating, 0) / ratings.length;

  const sortedBySympathy = [...ratings].sort((a, b) => b.sympathyRating - a.sympathyRating);
  
  return {
    averageSympathy: avgSympathy,
    averageCorrectness: avgCorrectness,
    averageTeacherSuitability: avgTeacher,
    mostAppreciatedAccent: sortedBySympathy[0]?.origin || '',
    leastAppreciatedAccent: sortedBySympathy[sortedBySympathy.length - 1]?.origin || '',
  };
};
