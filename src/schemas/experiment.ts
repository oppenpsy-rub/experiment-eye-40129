import { z } from "zod";

// Minimal robust validation for Excel rows (French survey keys vary; keep optional)
export const ExcelRowSchema = z.object({
  // IDs can be string or number; coerce to string
  "ID de la réponse": z.union([z.string(), z.number()]).optional(),
  "Date de soumission": z.string().optional(),
  "Veuillez indiquer votre genre": z.string().optional(),
  "Veuillez indiquer votre âge": z.union([z.number(), z.string()]).optional(),
  "Qù êtes-vous né et où avez-vous grandi ?": z.string().optional(),
  "Où habitez-vous actuellement (hors d'Allemagne) et depuis combien de mois / combien d'années ? [Où ?]": z.string().optional(),
  "Quel est le dernier diplôme que vous avez obtenu ?": z.string().optional(),
  "Quel est l'origine de votre père ?": z.string().optional(),
  "Quel est l'origine de votre mère ?": z.string().optional(),
  "Quelle est ou quelles sont votre/vos langue(s) maternelle(s) ? [français]": z.string().optional(),
  "Quelle est ou quelles sont votre/vos langue(s) maternelle(s) ? [Autre]": z.string().optional(),
  "Quelle(s) autre(s) langue(s) maîtrisez-vous ?A quel niveau (environ) ?": z.string().optional(),
  "Quels accents du français connaissez-vous ?": z.string().optional(),
  "Avez-vous un accent ?": z.string().optional(),
  "Avez-vous un accent ? [Autre]": z.string().optional(),
  "Veuillez saisir ici votre code participant indiqué dans l'outil Mental Maps.": z.string().optional(),
}).passthrough();

export const ExcelRowsSchema = z.array(ExcelRowSchema);

// GeoJSON Mental Map schema with coercions
export const MentalMapFeatureSchema = z.object({
  type: z.string(),
  properties: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    question_id: z.string(),
    participant_code: z.string(),
    audio_file: z.union([z.string(), z.null()]).optional(),
    created_at: z.string(),
  }),
  geometry: z.object({
    type: z.string(),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
});

export const MentalMapDataSchema = z.object({
  type: z.string(),
  features: z.array(MentalMapFeatureSchema),
});