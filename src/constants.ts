import { System, Region, Demand } from './types';
import { POPULATION_DATA } from './population';

export const SYSTEMS: System[] = [
  { id: 1, code: 'S01', name: 'Torto-Santa Maria-Bananal' },
  { id: 2, code: 'S02', name: 'Descoberto-Corumbá' },
  { id: 3, code: 'S03', name: 'Brazlândia' },
  { id: 4, code: 'S04', name: 'Sobradinho-Planaltina' },
  { id: 5, code: 'S05', name: 'Paranoá Norte' },
  { id: 6, code: 'S06', name: 'Paranoá Sul' },
];

export const REGIONS: Region[] = [
  { id: 1, name: 'RA 01 - Brasília', systemId: 1, code: 'RA_01' },
  { id: 2, name: 'RA 02 - Gama', systemId: 2, code: 'RA_02' },
  { id: 3, name: 'RA 03 - Taguatinga', systemId: 2, code: 'RA_03' },
  { id: 4, name: 'RA 04 - Brazlândia', systemId: 3, code: 'RA_04' },
  { id: 5, name: 'RA 05 - Sobradinho', systemId: 4, code: 'RA_05' },
  { id: 6, name: 'RA 06 - Planaltina', systemId: 4, code: 'RA_06' },
  { id: 7, name: 'RA 07 - Paranoá', systemId: 5, code: 'RA_07' },
  { id: 8, name: 'RA 08 - Núcleo Bandeirante', systemId: 2, code: 'RA_08' },
  { id: 9, name: 'RA 09 - Ceilândia', systemId: 2, code: 'RA_09' },
  { id: 10, name: 'RA 10 - Guará', systemId: 1, code: 'RA_10' },
  { id: 11, name: 'RA 11 - Cruzeiro', systemId: 1, code: 'RA_11' },
  { id: 12, name: 'RA 12 - Samambaia', systemId: 2, code: 'RA_12' },
  { id: 13, name: 'RA 13 - Santa Maria', systemId: 2, code: 'RA_13' },
  { id: 14, name: 'RA 14 - São Sebastião', systemId: 6, code: 'RA_14' },
  { id: 15, name: 'RA 15 - Recanto das Emas', systemId: 2, code: 'RA_15' },
  { id: 16, name: 'RA 16 - Lago Sul', systemId: 1, code: 'RA_16' },
  { id: 17, name: 'RA 17 - Riacho Fundo', systemId: 2, code: 'RA_17' },
  { id: 18, name: 'RA 18 - Lago Norte', systemId: 5, code: 'RA_18' },
  { id: 19, name: 'RA 19 - Candangolândia', systemId: 2, code: 'RA_19' },
  { id: 20, name: 'RA 20 - Águas Claras', systemId: 2, code: 'RA_20' },
  { id: 21, name: 'RA 21 - Riacho Fundo II', systemId: 2, code: 'RA_21' },
  { id: 22, name: 'RA 22 - Sudoeste/Octogonal', systemId: 1, code: 'RA_22' },
  { id: 23, name: 'RA 23 - Varjão', systemId: 5, code: 'RA_23' },
  { id: 24, name: 'RA 24 - Park Way', systemId: 2, code: 'RA_24' },
  { id: 25, name: 'RA 25 - SCIA/Estrutural', systemId: 1, code: 'RA_25' },
  { id: 26, name: 'RA 26 - Sobradinho II', systemId: 4, code: 'RA_26' },
  { id: 27, name: 'RA 27 - Jardim Botânico', systemId: 6, code: 'RA_27' },
  { id: 28, name: 'RA 28 - Itapoã', systemId: 5, code: 'RA_28' },
  { id: 29, name: 'RA 29 - SIA', systemId: 1, code: 'RA_29' },
  { id: 30, name: 'RA 30 - Vicente Pires', systemId: 1, code: 'RA_30' },
  { id: 31, name: 'RA 31 - Fercal', systemId: 4, code: 'RA_31' },
];

const CONSUMO_BASE: Record<string, number> = {
  'RA_01': 254, 'RA_02': 149, 'RA_03': 160, 'RA_04': 141, 'RA_05': 162,
  'RA_06': 142, 'RA_07': 146, 'RA_08': 165, 'RA_09': 138, 'RA_10': 155,
  'RA_11': 150, 'RA_12': 136, 'RA_13': 141, 'RA_14': 170, 'RA_15': 142,
  'RA_16': 433, 'RA_17': 147, 'RA_18': 247, 'RA_19': 152, 'RA_20': 157,
  'RA_21': 128, 'RA_22': 165, 'RA_23': 137, 'RA_24': 256, 'RA_25': 174,
  'RA_26': 150, 'RA_27': 214, 'RA_28': 126, 'RA_29': 452, 'RA_30': 185,
  'RA_31': 153
};

function getConsumoForYear(base: number, year: number): number {
  if (year === 2017) return base;
  if (year === 2018) return base + 2;
  if (year === 2019) return base + 3;
  if (year === 2020) return base + 6;
  if (year === 2021) return base + 7;
  return base + 8; // 2022 to 2053
}

function getPerdasForYear(year: number): number {
  switch (year) {
    case 2017: return 0.32;
    case 2018: return 0.31;
    case 2019: return 0.30;
    case 2020: return 0.28;
    case 2021: return 0.35;
    case 2022: return 0.35;
    case 2023: return 0.3325;
    case 2024: return 0.3325;
    case 2025: return 0.315;
    case 2026: return 0.31;
    case 2027: return 0.2975;
    case 2028: return 0.2975;
    case 2029: return 0.28;
    case 2030: return 0.28;
    case 2031: return 0.2625;
    case 2032: return 0.2625;
    default: return 0.25; // 2033 to 2053
  }
}

// Initial data from spreadsheet
export const INITIAL_DEMAND: Demand = {
  id: 1,
  name: 'Demanda Base',
  description: 'Projeção inicial com dados carregados via planilha',
  modifiers: {
    population: 0,
    coverage: null,
    perCapitaConsumption: 0,
    losses: null,
  },
  entries: REGIONS.flatMap(region => {
    const lookupKey = region.code || `RA_${String(region.id).padStart(2, '0')}`;
    const baseConsumo = CONSUMO_BASE[lookupKey] || 160;
    const popArray = POPULATION_DATA[lookupKey] || [];
    
    return Array.from({ length: 2053 - 2017 + 1 }, (_, i) => {
      const year = 2017 + i;
      return {
        regionId: region.id,
        year,
        population: popArray[i] || 0,
        coverage: 0.99, // default 99%
        perCapitaConsumption: getConsumoForYear(baseConsumo, year),
        losses: getPerdasForYear(year)
      };
    });
  }),
};

export const INITIAL_SUPPLY_SOURCES: import('./types').SupplySource[] = [
  { id: 1, code: 'CAP.SMR.001', systemId: 1, name: 'Santa Maria (Lago Santa Maria)', type: 'Superficial', grantedFlow: 1478.0, operationalFlow: 1478.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 2, code: 'CAP.TOR.001', systemId: 1, name: 'Torto (Ribeirão do Torto)', type: 'Superficial', grantedFlow: 1647.0, operationalFlow: 1647.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 3, code: 'CAP.RBA.001', systemId: 1, name: 'Ribeirão Bananal (Ribeirão)', type: 'Superficial', grantedFlow: 600.0, operationalFlow: 600.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 4, code: 'CAP.RDE.001', systemId: 2, name: 'Descoberto (Rio Descoberto)', type: 'Superficial', grantedFlow: 4300.0, operationalFlow: 4300.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 5, code: 'CAP.PDR.001', systemId: 2, name: 'Pedras (Ribeirão)', type: 'Superficial', grantedFlow: 130.0, operationalFlow: 0, unavailableFlow: 130.0, unavailabilityReason: 'Desativada' },
  { id: 6, code: 'CAP.CRR.001', systemId: 2, name: 'Currais (Córrego Currais)', type: 'Superficial', grantedFlow: 184.0, operationalFlow: 0, unavailableFlow: 184.0, unavailabilityReason: 'Desativada' },
  { id: 7, code: 'CAP.CTB.001', systemId: 2, name: 'Catetinho Baixo 1 (Córrego)', type: 'Superficial', grantedFlow: 50.0, operationalFlow: 50.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 8, code: 'CAP.CRS.001-2', systemId: 2, name: 'Crispim 1-2 (Córrego Crispim 1)', type: 'Superficial', grantedFlow: 26.4, operationalFlow: 26.4, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 9, code: 'CAP.PTR.002', systemId: 2, name: 'Ponte de Terra 2 (Córrego)', type: 'Superficial', grantedFlow: 45.93, operationalFlow: 45.93, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 10, code: 'CAP.ALG.001', systemId: 2, name: 'Alagado (Córrego Alagado)', type: 'Superficial', grantedFlow: 67.9, operationalFlow: 0, unavailableFlow: 67.9, unavailabilityReason: 'Inoperante' },
  { id: 11, code: 'CAP.PTR.001', systemId: 2, name: 'Ponte de Terra 1 (Córrego)', type: 'Superficial', grantedFlow: 24.0, operationalFlow: 0, unavailableFlow: 24.0, unavailabilityReason: 'Desativada' },
  { id: 12, code: 'CAP.PTR.003', systemId: 2, name: 'Ponte de Terra 3 (Córrego)', type: 'Superficial', grantedFlow: 45.93, operationalFlow: 0, unavailableFlow: 45.93, unavailabilityReason: 'Inoperante' },
  { id: 13, code: 'CAP.ODG.001', systemId: 2, name: "Olho D'água (Córrego)", type: 'Superficial', grantedFlow: 27.6, operationalFlow: 0, unavailableFlow: 27.6, unavailabilityReason: 'Inoperante' },
  { id: 14, code: 'CAP.ENG.001', systemId: 2, name: 'Engenho das Lajes (Ribeirão)', type: 'Superficial', grantedFlow: 7.0, operationalFlow: 7.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 15, code: 'CAP.BCO.001', systemId: 2, name: 'Corumbá (Lago Corumbá IV)', type: 'Superficial', grantedFlow: 2800.0, operationalFlow: 1400.0, unavailableFlow: 1400.0, unavailabilityReason: 'Inoperante' },
  { id: 16, code: 'CAP.PRZ.001', systemId: 4, name: 'Paranoazinho (Córrego)', type: 'Superficial', grantedFlow: 29.2, operationalFlow: 29.2, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 17, code: 'CAP.CNT.001-2', systemId: 4, name: 'Contagem 1-2 (Ribeirão)', type: 'Superficial', grantedFlow: 44.0, operationalFlow: 44.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 18, code: 'CAP.CRG.001', systemId: 4, name: 'Corguinho (Córrego)', type: 'Superficial', grantedFlow: 55.0, operationalFlow: 55.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 19, code: 'CAP.MDR.001', systemId: 4, name: "Mestre D'Armas (Ribeirão)", type: 'Superficial', grantedFlow: 96.5, operationalFlow: 96.5, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 20, code: 'CAP.FUM.001', systemId: 4, name: 'Fumal (Córrego)', type: 'Superficial', grantedFlow: 208.0, operationalFlow: 208.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 21, code: 'CAP.BRJ.001', systemId: 4, name: 'Brejinho (Córrego)', type: 'Superficial', grantedFlow: 67.0, operationalFlow: 67.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 22, code: 'CAP.PIP.001', systemId: 4, name: 'Pipiripau (Ribeirão)', type: 'Superficial', grantedFlow: 360.0, operationalFlow: 360.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 23, code: 'CAP.CQZ.001', systemId: 4, name: 'Córrego Quinze (Córrego)', type: 'Superficial', grantedFlow: 60.0, operationalFlow: 60.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 24, code: 'CAP.LPA.002', systemId: 5, name: 'Lago Paranoá 02 (Captação Emergencial)', type: 'Superficial', grantedFlow: 700.0, operationalFlow: 700.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 25, code: 'CAP.LPA.001', systemId: 5, name: 'Lago Paranoá 01 (Lago)', type: 'Superficial', grantedFlow: 2100.0, operationalFlow: 0, unavailableFlow: 2100.0, unavailabilityReason: 'Inoperante' },
  { id: 26, code: 'CAP.TQR.001', systemId: 5, name: 'Taquari 1 (Córrego)', type: 'Superficial', grantedFlow: 10.0, operationalFlow: 0, unavailableFlow: 10.0, unavailabilityReason: 'Inoperante' },
  { id: 27, code: 'CAP.TQR.002', systemId: 5, name: 'Taquari 2 (Córrego)', type: 'Superficial', grantedFlow: 0.5, operationalFlow: 0, unavailableFlow: 0.5, unavailabilityReason: 'Inoperante' },
  { id: 28, code: 'CAP.CCH.001', systemId: 5, name: 'Cachoeirinha (Córrego dos Goianos)', type: 'Superficial', grantedFlow: 37.08, operationalFlow: 0, unavailableFlow: 37.08, unavailabilityReason: 'Inoperante' },
  { id: 29, code: 'CAP.CVD.001-4', systemId: 6, name: 'Cabeça do Veado 1-4 (Córrego)', type: 'Superficial', grantedFlow: 110.0, operationalFlow: 110.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 30, code: 'CAP.BRM.001', systemId: 6, name: 'Captação Borá Manso (Córrego Borá Manso)', type: 'Superficial', grantedFlow: 12.0, operationalFlow: 12.0, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 31, code: 'CAP.CON.001', systemId: 3, name: 'Capão da Onça (Córrego Capão da Onça)', type: 'Superficial', grantedFlow: 29.2, operationalFlow: 29.2, unavailableFlow: 0, unavailabilityReason: '' },
  { id: 32, code: 'CAP.BRC.001', systemId: 3, name: 'Barrocão (Córrego Barrocão)', type: 'Superficial', grantedFlow: 35.6, operationalFlow: 103.0, unavailableFlow: 0, unavailabilityReason: '' }
];
