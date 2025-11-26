
import { Park, SurveyRecord, Building, AppSettings } from '../types';

const KEYS = {
  PARKS: 'marketscope_parks',
  SURVEYS: 'marketscope_surveys',
  SETTINGS: 'marketscope_settings',
};

// Seed Data - Only keep Own Park template, remove competitors and surveys
const SEED_PARKS: Park[] = [
  {
    id: 'p-kingdee',
    name: '上海金蝶软件园',
    address: '浦东新区晨晖路88号',
    description: '本方园区。位于张江高科核心区域，拥有高品质办公环境及完善的配套设施。',
    buildings: [
        { id: 'bk-1', name: '主楼', area: 28000 },
        { id: 'bk-2', name: '研发楼', area: 15000 }
    ],
    tags: ['自持', '张江核心'],
    totalArea: 43000,
    createdAt: Date.now(),
    isOwnPark: true
  }
];

const SEED_SURVEYS: SurveyRecord[] = [];

const DEFAULT_SETTINGS: AppSettings = {
    quarterlyTarget: 12 // Default to approx 1 per week (12 per quarter)
};

export const StorageService = {
  init: () => {
    // Parks Init
    let existingParks: Park[] = [];
    const parksJson = localStorage.getItem(KEYS.PARKS);
    
    if (!parksJson) {
      localStorage.setItem(KEYS.PARKS, JSON.stringify(SEED_PARKS));
    } else {
        try {
            existingParks = JSON.parse(parksJson);
            if (!Array.isArray(existingParks)) throw new Error("Invalid format");
            
            // Migration: Check if Kingdee exists, if not add it
            const hasKingdee = existingParks.some(p => p && (p.id === 'p-kingdee' || (p.name && p.name.includes('金蝶'))));
            if (!hasKingdee) {
                existingParks.unshift(SEED_PARKS[0]); // Add Kingdee at top
                localStorage.setItem(KEYS.PARKS, JSON.stringify(existingParks));
            }
        } catch (e) {
            console.error("Failed to parse existing parks or migration error", e);
            if (existingParks.length === 0) existingParks = SEED_PARKS;
        }
    }

    if (!localStorage.getItem(KEYS.SURVEYS)) {
      localStorage.setItem(KEYS.SURVEYS, JSON.stringify(SEED_SURVEYS));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
  },

  getParks: (): Park[] => {
    const data = localStorage.getItem(KEYS.PARKS);
    if (!data) return [];
    try {
        const parks = JSON.parse(data);
        if (!Array.isArray(parks)) return [];
        // Sanitize data to ensure arrays and properties exist
        return parks
            .filter((p: any) => p && typeof p === 'object') // Filter out nulls or primitives
            .map((p: any) => ({
                ...p,
                id: p.id || `p-unknown-${Math.random()}`,
                name: p.name || 'Unknown Park',
                buildings: Array.isArray(p.buildings) ? p.buildings : [],
                tags: Array.isArray(p.tags) ? p.tags : [],
                totalArea: typeof p.totalArea === 'number' ? p.totalArea : 0,
                createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now()
            }));
    } catch (e) {
        console.error("Error parsing parks data", e);
        return [];
    }
  },

  savePark: (park: Park) => {
    const parks = StorageService.getParks();
    const index = parks.findIndex(p => p.id === park.id);
    
    // Ensure totalArea is synced with buildings if it's an update, 
    // but for new parks without buildings it might be 0.
    const calculatedArea = (park.buildings || []).reduce((sum, b) => sum + (b.area || 0), 0);
    const parkToSave = { ...park, totalArea: calculatedArea };

    if (index >= 0) {
      parks[index] = parkToSave;
    } else {
      parks.push(parkToSave);
    }
    localStorage.setItem(KEYS.PARKS, JSON.stringify(parks));
  },

  deletePark: (parkId: string) => {
    const parks = StorageService.getParks().filter(p => p.id !== parkId);
    localStorage.setItem(KEYS.PARKS, JSON.stringify(parks));
    // Also cleanup surveys
    const surveys = StorageService.getSurveys().filter(s => s.parkId !== parkId);
    localStorage.setItem(KEYS.SURVEYS, JSON.stringify(surveys));
  },

  getSurveys: (): SurveyRecord[] => {
    const data = localStorage.getItem(KEYS.SURVEYS);
    if (!data) return [];
    try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Error parsing surveys", e);
        return [];
    }
  },

  getSurveysByPark: (parkId: string): SurveyRecord[] => {
    return StorageService.getSurveys().filter(s => s.parkId === parkId).sort((a,b) => b.timestamp - a.timestamp);
  },

  saveSurvey: (survey: SurveyRecord) => {
    const surveys = StorageService.getSurveys();
    const index = surveys.findIndex(s => s.id === survey.id);
    if (index >= 0) {
      surveys[index] = survey;
    } else {
      surveys.push(survey);
    }
    localStorage.setItem(KEYS.SURVEYS, JSON.stringify(surveys));
  },

  deleteSurvey: (surveyId: string) => {
    const surveys = StorageService.getSurveys().filter(s => s.id !== surveyId);
    localStorage.setItem(KEYS.SURVEYS, JSON.stringify(surveys));
  },

  addBuildingToPark: (parkId: string, buildingName: string, buildingArea: number) => {
    const parks = StorageService.getParks();
    const parkIndex = parks.findIndex(p => p.id === parkId);
    if (parkIndex >= 0) {
        const newBuilding: Building = {
            id: `b-${Date.now()}`,
            name: buildingName,
            area: buildingArea
        };
        const park = parks[parkIndex];
        if (!Array.isArray(park.buildings)) park.buildings = [];
        park.buildings.push(newBuilding);
        // Recalculate total area
        park.totalArea = park.buildings.reduce((sum, b) => sum + (b.area || 0), 0);
        
        localStorage.setItem(KEYS.PARKS, JSON.stringify(parks));
    }
  },

  updateBuildingInPark: (parkId: string, buildingId: string, name: string, area: number) => {
    const parks = StorageService.getParks();
    const parkIndex = parks.findIndex(p => p.id === parkId);
    if (parkIndex >= 0) {
        const park = parks[parkIndex];
        if (!Array.isArray(park.buildings)) park.buildings = [];
        const buildingIndex = park.buildings.findIndex(b => b.id === buildingId);
        
        if (buildingIndex >= 0) {
            park.buildings[buildingIndex] = { ...park.buildings[buildingIndex], name, area };
            // Recalculate total area
            park.totalArea = park.buildings.reduce((sum, b) => sum + (b.area || 0), 0);
            localStorage.setItem(KEYS.PARKS, JSON.stringify(parks));
        }
    }
  },

  deleteBuildingFromPark: (parkId: string, buildingId: string) => {
    const parks = StorageService.getParks();
    const parkIndex = parks.findIndex(p => p.id === parkId);
    if (parkIndex >= 0) {
        const park = parks[parkIndex];
        if (!Array.isArray(park.buildings)) park.buildings = [];
        park.buildings = park.buildings.filter(b => b.id !== buildingId);
        // Recalculate total area
        park.totalArea = park.buildings.reduce((sum, b) => sum + (b.area || 0), 0);
        localStorage.setItem(KEYS.PARKS, JSON.stringify(parks));
    }
  },

  getAllData: () => {
    return {
        parks: StorageService.getParks(),
        surveys: StorageService.getSurveys(),
        settings: StorageService.getSettings()
    };
  },

  importData: (data: any) => {
      try {
        if (data.parks && Array.isArray(data.parks)) {
            localStorage.setItem(KEYS.PARKS, JSON.stringify(data.parks));
        }
        if (data.surveys && Array.isArray(data.surveys)) {
            localStorage.setItem(KEYS.SURVEYS, JSON.stringify(data.surveys));
        }
        if (data.settings) {
            localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
        }
        return true;
      } catch (e) {
          console.error("Import failed", e);
          return false;
      }
  },
  
  resetData: () => {
      localStorage.removeItem(KEYS.PARKS);
      localStorage.removeItem(KEYS.SURVEYS);
      localStorage.removeItem(KEYS.SETTINGS);
      StorageService.init(); // Re-seed with just the template
      return true;
  },

  getSettings: (): AppSettings => {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.quarterlyTarget && parsed.monthlyTarget) {
                parsed.quarterlyTarget = parsed.monthlyTarget * 3;
            }
            if (!parsed.quarterlyTarget) {
                parsed.quarterlyTarget = 12;
            }
            return parsed;
          } catch (e) {
              return DEFAULT_SETTINGS;
          }
      }
      return DEFAULT_SETTINGS;
  },

  saveSettings: (settings: AppSettings) => {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }
};
