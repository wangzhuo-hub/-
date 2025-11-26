
export interface Building {
  id: string;
  name: string;
  area: number; // Area in sqm
}

export interface Park {
  id: string;
  name: string;
  address: string;
  buildings: Building[];
  description?: string;
  tags?: string[];
  totalArea: number; // Total GFA in sqm (sum of buildings)
  createdAt: number;
  isOwnPark?: boolean; // Flag to identify our own park
}

export interface SurveyRecord {
  id: string;
  parkId: string;
  buildingId: string; // Relates to a specific building
  date: string; // YYYY-MM-DD
  occupancyRate: number; // 0-100
  rentPrice: number; // CNY/day/sqm
  commission: string; // e.g., "1 month", "1.5 months"
  deliveryStandard: string; // e.g., "Bare shell", "Fitted"
  photos: string[]; // Base64 strings or URLs
  responsiblePerson: string;
  marketAnalysis: string; // AI or Manual analysis of this specific record
  significantEvents?: string; // Major updates or events
  timestamp: number;
}

export interface MarketStats {
  totalParks: number;
  avgOccupancy: number;
  avgRentPrice: number;
  totalVacancyArea: number;
  recentTrends: string;
}

export interface AppSettings {
  quarterlyTarget: number; // Target surveys per park per quarter
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  PARK_LIST = 'PARK_LIST',
  PARK_DETAIL = 'PARK_DETAIL',
}
