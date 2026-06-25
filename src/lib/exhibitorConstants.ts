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
}

// ─── Zone I – 藝蕙品牌展區 ────────────────────────────────

export const ZONE_I: Zone = {
  id: 'artsy',
  numeral: 'I',
  nameZh: '藝蕙品牌展區',
  nameEn: 'Artsy Brand Sector',
  sectorLabel: 'Zone I',
  booths: [
    {
      label: 'S 頂級位 (S7-8, S11-13)',
      code: 'S7-8, S11-13',
      price: 45000,
      qty: 5,
      hasStorage: true,
      note: '附倉儲區',
    },
    {
      label: 'S 優選位 (S9-10, S14-15)',
      code: 'S9-10, S14-15',
      price: 42000,
      qty: 4,
      hasStorage: true,
      note: '附倉儲區',
    },
    {
      label: 'S 標準位 (S01-S06)',
      code: 'S01-S06',
      price: 38000,
      qty: 6,
      hasStorage: true,
      note: '附倉儲區',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 30,
    exhibitorPasses: 4,
    storageArea: '附倉儲區',
  },
  note: '可現場銷售，附額外倉儲區。銷售成果無抽成制度。',
};

// ─── Zone II – 精鑑品牌展區 ───────────────────────────────

export const ZONE_II: Zone = {
  id: 'premier',
  numeral: 'II',
  nameZh: '精鑑品牌展區',
  nameEn: 'Premier Brand Sector',
  sectorLabel: 'Zone II',
  booths: [
    {
      label: 'M 精選位 (M9-M15)',
      code: 'M9-M15',
      price: 42000,
      qty: 7,
      hasStorage: false,
      note: '無倉儲',
    },
    {
      label: 'M 標準位 (M1-M8)',
      code: 'M1-M8',
      price: 35000,
      qty: 8,
      hasStorage: false,
      note: '無倉儲',
    },
    {
      label: 'T 微型曝光 (純產品曝光+IG標籤)',
      code: 'T',
      price: 9000,
      qty: 10,
      hasStorage: false,
      microExposure: true,
      note: '無倉儲・T區不包含VIP卡',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 30, // T-zone gets 0; enforced in business logic
    exhibitorPasses: 4,
  },
  note: '可現場銷售，無抽成制度。T區不包含VIP卡',
};

// ─── Zone III – 匠心藝藏品牌展區 ─────────────────────────

export const ZONE_III: Zone = {
  id: 'atelier',
  numeral: 'III',
  nameZh: '匠心藝藏品牌展區',
  nameEn: 'Designer & Atelier Brand Sector',
  sectorLabel: 'Zone III',
  booths: [
    {
      label: 'A 入口旗艦位 (500×460cm 入口處兩側)',
      code: 'A-ENTRANCE',
      dimensions: '500×460cm',
      price: 108000,
      qty: 2,
      hasStorage: true,
      note: '入口處兩側',
    },
    {
      label: 'A 中央展位 (500×460cm 中間區域)',
      code: 'A-CENTER',
      dimensions: '500×460cm',
      price: 88000,
      qty: 4,
      hasStorage: true,
      note: '中間區域',
    },
    {
      label: 'A 打通超大展位 (1000×920cm 兩展位打通)',
      code: 'A-DOUBLE',
      dimensions: '1000×920cm',
      price: 158000,
      qty: 2,
      hasStorage: true,
      note: '兩展位打通',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 30,
    exhibitorPasses: 4,
    storageArea: '倉儲區300×300cm',
    vipLoungeSeating: '2F貴賓商談區2桌4椅',
  },
  note: '頂級獨立展位，打通展位可洽詢',
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
