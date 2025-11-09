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
