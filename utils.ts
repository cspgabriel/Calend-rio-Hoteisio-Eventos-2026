import { EventData } from './types';

export const parseDate = (dateStr: string): Date => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    // DD/MM/YYYY
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date();
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export const formatInclusionDate = (dateStr: string): string => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const yearStr = parts[2];
    const year = parseInt(yearStr);
    if (year < 2026) {
      return yearStr;
    }
  }
  return dateStr;
};

export const getDurationDays = (start: Date, end: Date): number => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive
};

export const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const calculateDemandLevel = (event: EventData): 'Baixa' | 'Média' | 'Alta' | 'Muito Alta' => {
  const nameLower = event.name.toLowerCase();

  // EXCLUSIONS: Specific events requested to not be High Demand
  if (nameLower.includes('universo spanta')) {
    return 'Média';
  }

  // Heuristic based on event type, duration, and specific keywords
  const highDemandTypes = ['Festival', 'Congresso', 'Show', 'Competição', 'Esporte', 'Festa'];
  const megaEvents = ['rock in rio', 'reveillon', 'carnaval', 'copa do mundo', 'web summit', 'rio oil', 'rog.e'];
  
  const duration = getDurationDays(event.parsedStartDate, event.parsedEndDate);
  
  let score = 0;

  // Keyword score (Mega events)
  if (megaEvents.some(k => nameLower.includes(k))) score += 5;

  // Type score
  if (highDemandTypes.some(t => event.type.toLowerCase().includes(t.toLowerCase()))) score += 2;
  
  // Duration score
  if (duration > 3) score += 1;
  
  // Venue score (Large venues)
  if (event.venue.toLowerCase().includes('riocentro') || 
      event.venue.toLowerCase().includes('olimpico') || 
      event.venue.toLowerCase().includes('maracanã') ||
      event.venue.toLowerCase().includes('sambódromo') ||
      event.venue.toLowerCase().includes('engenhão')
     ) score += 1;
  
  if (score >= 5) return 'Muito Alta';
  if (score >= 3) return 'Alta';
  if (score === 2) return 'Média';
  return 'Baixa';
};