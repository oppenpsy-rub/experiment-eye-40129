export interface ParticipantData {
  id: string;
  participantCode: string;
  submissionDate: string;
  gender: string;
  age: number;
  birthplace: string;
  currentResidence: string;
  education: string;
  fatherOrigin: string;
  motherOrigin: string;
  nativeLanguages: string[];
  otherLanguages: string[];
  knownAccents: string[];
  hasAccent: boolean;
  ownAccent: string;
  responses: Record<string, any>;
  stimulusRatings: StimulusRating[];
  accentPreferences?: AccentPreferenceChoice[];
  regionalResponses?: RegionalResponse[];
}

export interface StimulusRating {
  stimulusNumber: number;
  origin: string;
  sympathyRating: number;
  correctnessRating: number;
  teacherSuitabilityRating: number;
}

export interface MentalMapFeature {
  type: string;
  properties: {
    id: string;
    question_id: string;
    participant_code: string;
    audio_file: string | null;
    created_at: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export interface MentalMapData {
  type: string;
  features: MentalMapFeature[];
}

export interface ParticipantProfile {
  participant: ParticipantData;
  mentalMaps: MentalMapFeature[];
  stats: {
    averageSympathy: number;
    averageCorrectness: number;
    averageTeacherSuitability: number;
    mostAppreciatedAccent: string;
    leastAppreciatedAccent: string;
  };
}

export interface AccentPreferenceChoice {
  questionLabel: string;
  questionKey: string;
  accentCategory: AccentCategory;
  participantCode: string;
}

export type AccentCategory =
  | 'parisien'
  | 'québécois'
  | 'du sud de la france'
  | 'alsacien'
  | 'breton'
  | 'africain'
  | 'canadien'
  | 'nord'
  | 'banlieue'
  | 'picard'
  | 'normand'
  | 'aucun'
  | 'autre';

export type RegionKey = 'sud' | 'canada' | 'nord' | 'paris';

export interface QuebecPlaces {
  selected: string[];
  partout?: boolean;
  jeNeSaisPas?: boolean;
}

export interface RegionalResponse {
  participant_code: string;
  region_key: RegionKey;
  name_raw?: string;
  name_canonical?: string;
  also_terms?: string[];
  personalities?: string[];
  tokens_words?: string[];
  tokens_pronunciation?: string[];
  tokens_grammar?: string[];
  accents_listed?: string[];
  diff_so_se?: boolean;
  diff_marseille_toulouse?: boolean;
  liking?: number;
  // Kanada-spezifisch
  quebecPlaces?: QuebecPlaces;
  acadienKnown?: boolean;
  acadienPlaces?: string[];
  acadienTokens?: string[];
  // Paris-spezifisch
  parisiansHaveAccent?: boolean;
  parisStandard?: boolean;
}
