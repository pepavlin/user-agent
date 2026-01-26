// Predefined personas for quick testing
export type PersonaPreset = {
  name: string;
  description: string;
  persona: string;
  sampleIntents: string[];
};

export const PERSONA_PRESETS: Record<string, PersonaPreset> = {
  'elderly': {
    name: 'Elderly User',
    description: 'Senior citizen with limited tech experience',
    persona: 'Marie, 68 let, důchodkyně, velmi špatně ovládá počítač, poprvé používá tuto stránku, má problémy s malým písmem',
    sampleIntents: [
      'Chci najít kontakt na zákaznickou podporu',
      'Potřebuji najít informace o cenách',
      'Chci se zaregistrovat',
    ],
  },

  'gen-z': {
    name: 'Gen-Z Mobile User',
    description: 'Young user accustomed to modern apps',
    persona: 'Eliška, 19 let, studentka, používá hlavně mobil, netrpělivá, zvyklá na Instagram, TikTok a moderní aplikace',
    sampleIntents: [
      'Hledám něco zajímavého',
      'Chci rychle najít hlavní funkce',
      'Potřebuji něco sdílet s kamarády',
    ],
  },

  'designer': {
    name: 'UX Designer',
    description: 'Professional critical of design and UX',
    persona: 'Jan, 32 let, UX designer, velmi kritický k vizuálnímu designu, konzistenci rozhraní a použitelnosti',
    sampleIntents: [
      'Chci zhodnotit celkový design a použitelnost',
      'Potřebuji projít hlavní user flow',
      'Chci otestovat responzivitu a přístupnost',
    ],
  },

  'developer': {
    name: 'Developer',
    description: 'Technical user focused on performance',
    persona: 'Tomáš, 28 let, softwarový vývojář, zvyklý na rychlé a responzivní weby, kriticky hodnotí výkon a technickou kvalitu',
    sampleIntents: [
      'Chci otestovat rychlost načítání a odezvu',
      'Potřebuji projít formuláře a validace',
      'Chci zjistit jak funguje vyhledávání',
    ],
  },

  'accessibility': {
    name: 'Accessibility User',
    description: 'User with visual impairment using assistive tech',
    persona: 'Pavel, 45 let, částečně nevidomý, používá zvětšovací software a čtečku obrazovky, potřebuje dobře strukturovaný obsah',
    sampleIntents: [
      'Potřebuji navigovat pouze pomocí klávesnice',
      'Chci najít hlavní obsah stránky',
      'Potřebuji přečíst všechny informace',
    ],
  },

  'business': {
    name: 'Business User',
    description: 'Professional looking for efficiency',
    persona: 'Petra, 42 let, manažerka, má málo času, potřebuje rychle najít informace a dokončit úkoly bez zdržování',
    sampleIntents: [
      'Potřebuji rychle najít ceny a podmínky',
      'Chci kontaktovat obchodní oddělení',
      'Potřebuji porovnat možnosti',
    ],
  },

  'first-time': {
    name: 'First-time Visitor',
    description: 'New user unfamiliar with the site',
    persona: 'Lucie, 35 let, první návštěva webu, neví co očekávat, hledá orientaci a základní informace',
    sampleIntents: [
      'Chci pochopit o čem tento web je',
      'Potřebuji najít základní informace',
      'Chci vyzkoušet hlavní funkce',
    ],
  },

  'power-user': {
    name: 'Power User',
    description: 'Experienced user expecting advanced features',
    persona: 'Martin, 30 let, zkušený uživatel, zná podobné aplikace, očekává pokročilé funkce a klávesové zkratky',
    sampleIntents: [
      'Chci najít pokročilé nastavení',
      'Potřebuji rychle ovládat pomocí klávesnice',
      'Chci využít všechny dostupné funkce',
    ],
  },
};

export const getPersonaPreset = (key: string): PersonaPreset | undefined => {
  return PERSONA_PRESETS[key.toLowerCase()];
};

export const listPersonaPresets = (): string[] => {
  return Object.keys(PERSONA_PRESETS);
};
