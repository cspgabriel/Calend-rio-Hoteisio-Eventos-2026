export interface EventData {
  id: string;
  name: string;
  venue: string;
  type: string;
  startDate: string; // DD/MM/YYYY
  endDate: string; // DD/MM/YYYY
  month: string;
  neighborhood: string;
  region: string; // Field for macro-region or classification
  year: string;
  lat: number;
  lng: number;
  parsedStartDate: Date;
  parsedEndDate: Date;
  inclusionDate: string; // DD/MM/YYYY
  city?: string;
  state?: string;
  country?: string;
}

export interface FilterState {
  searchTerm: string;
  selectedTypes: string[];
  selectedNeighborhoods: string[];
  year: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  LIST = 'LIST',
  CALENDAR = 'CALENDAR'
}