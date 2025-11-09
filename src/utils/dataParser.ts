import * as XLSX from 'xlsx';
import { ParticipantData, StimulusRating, MentalMapData } from '@/types/experiment';

export const parseExperimentData = (excelData: any[]): ParticipantData[] => {
  return excelData.map((row, index) => {
    const stimulusRatings: StimulusRating[] = [];
    
    // Parse stimulus ratings (7 stimuli)
    for (let i = 1; i <= 7; i++) {
      const originKey = `D'après vous, d'où vient${i === 1 || i === 2 ? 'ent ces locuteurs ou ces locutrices' : ' ce locuteur ou cette locutrice'} ?`;
      const sympathyKey = `[Dans quelle mesure estimez-vous le langage de cette personne sympathique ?]`;
      const correctnessKey = `[Dans quelle mesure estimez-vous le langage de cette personne correct ?]`;
      const teacherKey = `[Dans quelle mesure cette personne conviendrait-elle pour occuper un poste de professeur de français ?]`;
      
      stimulusRatings.push({
        stimulusNumber: i,
        origin: row[originKey] || '',
        sympathyRating: parseFloat(row[sympathyKey]) || 0,
        correctnessRating: parseFloat(row[correctnessKey]) || 0,
        teacherSuitabilityRating: parseFloat(row[teacherKey]) || 0,
      });
    }

    return {
      id: row['ID de la réponse'] || String(index + 1),
      participantCode: row['Veuillez saisir ici votre code participant indiqué dans l\'outil Mental Maps.'] || '',
      submissionDate: row['Date de soumission'] || '',
      gender: row['Veuillez indiquer votre genre'] || '',
      age: parseInt(row['Veuillez indiquer votre âge']) || 0,
      birthplace: row['Qù êtes-vous né et où avez-vous grandi ?'] || '',
      currentResidence: row['Où habitez-vous actuellement (hors d\'Allemagne) et depuis combien de mois / combien d\'années ? [Où ?]'] || '',
      education: row['Quel est le dernier diplôme que vous avez obtenu ?'] || '',
      fatherOrigin: row['Quel est l\'origine de votre père ?'] || '',
      motherOrigin: row['Quel est l\'origine de votre mère ?'] || '',
      nativeLanguages: [
        row['Quelle est ou quelles sont votre/vos langue(s) maternelle(s) ? [français]'],
        row['Quelle est ou quelles sont votre/vos langue(s) maternelle(s) ? [Autre]']
      ].filter(Boolean),
      otherLanguages: (row['Quelle(s) autre(s) langue(s) maîtrisez-vous ?A quel niveau (environ) ?'] || '').split(',').filter(Boolean),
      knownAccents: (row['Quels accents du français connaissez-vous ?'] || '').split(',').filter(Boolean),
      hasAccent: row['Avez-vous un accent ?'] === 'Oui',
      ownAccent: row['Avez-vous un accent ? [Autre]'] || '',
      responses: row,
      stimulusRatings,
    };
  });
};

export const parseMentalMapData = async (geojsonPath: string): Promise<MentalMapData> => {
  const response = await fetch(geojsonPath);
  return await response.json();
};

export const getParticipantMentalMaps = (participantCode: string, mentalMapData: MentalMapData) => {
  return mentalMapData.features.filter(
    feature => feature.properties.participant_code === participantCode
  );
};

export const calculateParticipantStats = (participant: ParticipantData) => {
  const ratings = participant.stimulusRatings.filter(r => r.sympathyRating > 0);
  
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
