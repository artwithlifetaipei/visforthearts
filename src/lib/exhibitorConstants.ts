// ============================================================
// VIS 2027 Exhibitor Platform – Exhibition Constants
// ============================================================

export const DEPOSIT_AMOUNT = 20000; // NT$

// ─── Types ────────────────────────────────────────────────

export type ZoneId = 'artsy' | 'premier' | 'atelier';

export interface BoothOption {
  /** Display label for the booth code / position */
  label: string;
  /** Booth code(s) e.g. 'S7-8, S11-13' */
  code: string;
  /** Price in NT$ */
  price: number;
  /** Available quantity */
  qty: number;
  /** Whether this booth has storage area */
  hasStorage: boolean;
  /** Whether this is a micro-exposure (T-zone) booth */
  microExposure?: boolean;
  /** Optional additional note about this booth */
  note?: string;
  /** Dimensions (for Zone III) */
  dimensions?: string;
}

export interface ZoneIncludes {
  exhibitDays: number;
  installDays: number;
  vipPasses: number | null;
  exhibitorPasses: number;
  storageArea?: string;
  vipLoungeSeating?: string;
}

export interface Zone {
  id: ZoneId;
  numeral: 'I' | 'II' | 'III';
  nameZh: string;
  nameEn: string;
  sectorLabel: string;
  booths: BoothOption[];
  includes: ZoneIncludes;
  note: string;
  description?: string;
}

// ─── Zone I – 明日經典展區 ────────────────────────────────

export const ZONE_I: Zone = {
  id: 'artsy',
  numeral: 'I',
  nameZh: '明日經典展區',
  nameEn: 'Future Classics Sector',
  sectorLabel: 'Zone I',
  description: '明日經典展區 Future Classics Sector。最適合新銳品牌：適合產品較小、或產品較少之微型精緻展出的潛力舞台。',
  booths: [
    {
      label: '展台式展位 - A01 (近主入口處)',
      code: 'A01',
      price: 42000,
      qty: 5,
      hasStorage: false,
      note: '近主入口處',
    },
    {
      label: '展台式展位 - A02 (非入口處)',
      code: 'A02',
      price: 38000,
      qty: 5,
      hasStorage: false,
      note: '非入口處',
    },
    {
      label: '展台式展位 - A03 (距主入口處較遠)',
      code: 'A03',
      price: 32000,
      qty: 5,
      hasStorage: false,
      note: '距主入口處較遠',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 30,
    exhibitorPasses: 4,
  },
  note: '大會提供各展位 1展台，尺寸為 H90.5 * W60.5 * 60.5cm，下方可置物。\n參展品牌人員皆可於現場進行銷售，不抽成。\n額外需求：倉儲區收費為每平方米 1000元/四日。',
};

// ─── Zone II – 文化實體展區 ───────────────────────────────

export const ZONE_II: Zone = {
  id: 'premier',
  numeral: 'II',
  nameZh: '文化實體展區',
  nameEn: 'Cultural Entities Sector',
  sectorLabel: 'Zone II',
  description: '文化實體展區 Cultural Entities Sector。成熟品牌首選：加大展位與主入口高曝光。',
  booths: [
    {
      label: '展台式展位 - A04 (離主入口最近)',
      code: 'A04',
      price: 42000,
      qty: 7,
      hasStorage: false,
      note: '離主入口最近',
    },
    {
      label: '展台式展位 - A05 (兩倍面寬展台)',
      code: 'A05',
      price: 45000,
      qty: 8,
      hasStorage: false,
      note: '兩倍面寬展台',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 30,
    exhibitorPasses: 4,
  },
  note: '參展品牌人員皆可於現場進行銷售，不抽成。\n大會提供各展位 1展台，尺寸為 H90.5 * W60.5 * 60.5cm，下方可置物。\nM1-M8展台數2，分別為：H90.5 * W97.3 * 47.5與H90.5 * W60.5 * 60.5cm。\n額外需求：倉儲區收費為每平方米 1000元/四日。',
};

// ─── Zone III – 匠心藝藏展區 ─────────────────────────

export const ZONE_III: Zone = {
  id: 'atelier',
  numeral: 'III',
  nameZh: '匠心藝藏展區',
  nameEn: 'Designer & Atelier Brand Sector',
  sectorLabel: 'Zone III',
  description: '匠心藝藏展區 Designer & Atelier Brand Sector。適合需要專屬獨立空間，來聚焦表現品牌工藝美學者，同時，亦有全大展唯二的雙倍大器格局展位，完整構築沈浸式體驗。',
  booths: [
    {
      label: '500*460cm 獨立展位 B01 - 入口處兩側',
      code: 'B01',
      dimensions: '500*460cm',
      price: 108000,
      qty: 2,
      hasStorage: true,
      note: '入口處兩側',
    },
    {
      label: '500*460cm 獨立展位 B02 - 中間區域',
      code: 'B02',
      dimensions: '500*460cm',
      price: 88000,
      qty: 4,
      hasStorage: true,
      note: '中間區域',
    },
    {
      label: '1000*920cm 最大獨立展位 B03 - 兩展位打通',
      code: 'B03',
      dimensions: '1000*920cm',
      price: 158000,
      qty: 2,
      hasStorage: true,
      note: '兩展位打通',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 50,
    exhibitorPasses: 4,
    storageArea: '另享 倉儲區300*300cm',
    vipLoungeSeating: '另享 2F貴賓商談區2桌4椅',
  },
  note: '*備註：該展區，全展位挑高皆為460cm。',
};

// ─── All Zones ────────────────────────────────────────────

export const ALL_ZONES: Zone[] = [ZONE_I, ZONE_II, ZONE_III];

export const ZONE_MAP: Record<ZoneId, Zone> = {
  artsy: ZONE_I,
  premier: ZONE_II,
  atelier: ZONE_III,
};

// ─── Key Dates ────────────────────────────────────────────

export interface KeyDate {
  dateStr: string; // ISO-like 'YYYY/MM/DD'
  labelZh: string;
  labelEn: string;
}

export const KEY_DATES: KeyDate[] = [
  {
    dateStr: '2026/10/15',
    labelZh: '線上申請截止',
    labelEn: 'Application Deadline',
  },
  {
    dateStr: '2026/10/20',
    labelZh: '評選結果公告',
    labelEn: 'Selection Results Announced',
  },
  {
    dateStr: '2026/10/27',
    labelZh: '展位費繳清截止',
    labelEn: 'Booth Fee Payment Deadline',
  },
  {
    dateStr: '2026/11/05',
    labelZh: '參展品牌公告',
    labelEn: 'Exhibitor Roster Announced',
  },
];

/** Countdown target: 線上申請截止 2026/10/15 midnight (UTC+8) */
export const APPLICATION_DEADLINE = new Date('2026-10-15T00:00:00+08:00');
