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
      label: '展台式展位 - A01 (主入口隔壁)',
      code: 'A01',
      price: 40000,
      qty: 5,
      hasStorage: false,
      note: '主入口隔壁',
    },
    {
      label: '展台式展位 - A02 (中央展區周圍)',
      code: 'A02',
      price: 38000,
      qty: 5,
      hasStorage: false,
      note: '中央展區周圍',
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
      label: '展台式展位 - A05 (雙展台展位)',
      code: 'A05',
      price: 45000,
      qty: 8,
      hasStorage: false,
      note: '雙展台展位',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 30,
    exhibitorPasses: 4,
  },
  note: '參展品牌人員皆可於現場進行銷售，不抽成。\n大會提供各展位 1 展台，尺寸為 H90.5 * W60.5 * 60.5cm，下方可置物。\nA05 雙展台展位展台數為 2，分別為：H90.5 * W97.3 * 47.5 與 H90.5 * W60.5 * 60.5cm。\n額外需求：倉儲區收費為每平方米 1000元/四日。',
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
      label: '500*460cm 獨立展位 L3 & L4 - 入口處兩側',
      code: 'L3&L4',
      dimensions: '500*460cm',
      price: 108000,
      qty: 2,
      hasStorage: true,
      note: '入口處兩側 (另享倉儲區與2F貴賓區)',
    },
    {
      label: '500*460cm 獨立展位 L2, L6, L7',
      code: 'L2, L6, L7',
      dimensions: '500*460cm',
      price: 88000,
      qty: 3,
      hasStorage: true,
      note: '獨立展位空間',
    },
    {
      label: '1000*500cm 最大獨立展位 L1 & L5 - 兩展位打通',
      code: 'L1 & L5',
      dimensions: '1000*500cm',
      price: 158000,
      qty: 2,
      hasStorage: true,
      note: '兩展位打通大器格局',
    },
  ],
  includes: {
    exhibitDays: 3,
    installDays: 1,
    vipPasses: 50,
    exhibitorPasses: 4,
    storageArea: '另享 倉儲區 300*300cm (僅 L3 & L4 享有)',
    vipLoungeSeating: '另享 2F 貴賓商談區 2 桌 4 椅 (僅 L3 & L4 享有)',
  },
  note: '*備註：該展區，全展位挑高皆為 460cm。',
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
  noteZh?: string;
  noteEn?: string;
  targetIso?: string;
  statusOverride?: 'completed' | 'active' | 'pending';
}

export const KEY_DATES: KeyDate[] = [
  {
    dateStr: '2026/10/15 23:59',
    labelZh: '截止申請',
    labelEn: 'Application Deadline',
    noteZh: '因應需求特別加開至今日午夜',
    noteEn: 'Specially extended upon high demand',
    targetIso: '2026-10-15T23:59:59+08:00',
    statusOverride: 'completed',
  },
  {
    dateStr: '2026/10/20 18:00 前',
    labelZh: '評選結果公布',
    labelEn: 'Selection Results Announced',
    noteZh: '評選結果已正式公佈並發送通知',
    noteEn: 'Selection officially announced',
    targetIso: '2026-10-20T18:00:00+08:00',
    statusOverride: 'completed',
  },
  {
    dateStr: '2026/10/27 18:00',
    labelZh: '繳費期限',
    labelEn: 'Payment Deadline',
    noteZh: '第一期展位保證金匯款截止',
    noteEn: 'First installment deposit deadline',
    targetIso: '2026-10-27T18:00:00+08:00',
    statusOverride: 'active',
  },
  {
    dateStr: '2026/11月中旬',
    labelZh: '說明會與 MOU 簽署',
    labelEn: 'Briefing & MOU Signing',
    targetIso: '2026-11-15T18:00:00+08:00',
    statusOverride: 'pending',
  },
  {
    dateStr: '2027/01/06',
    labelZh: '佈展與 開幕晚會（僅限受邀貴賓）',
    labelEn: 'Setup & VIP Opening Night',
    targetIso: '2027-01-06T18:00:00+08:00',
    statusOverride: 'pending',
  },
  {
    dateStr: '2027/01/07 - 01/09',
    labelZh: '公眾展期與撤場',
    labelEn: 'Public Days & Move-Out',
    targetIso: '2027-01-07T10:00:00+08:00',
    statusOverride: 'pending',
  },
];

/** Countdown target: 線上申請截止 2026/10/15 23:59 (UTC+8) */
export const APPLICATION_DEADLINE = new Date('2026-10-15T23:59:59+08:00');

// ─── Booth Code Normalization & Display Helpers ──────────────

/**
 * Normalizes legacy booth codes (e.g. 'S01-03,S06-08', 'S01-S06', 'M9-M15', 'A-ENTRANCE', 'S-2x2')
 * into the modern official 2027 VIS booth scheme (A01-A05, L1-L7, S-02, MAKING-PROJECT, T).
 */
export function normalizeBoothCode(boothType?: string | null, zoneId?: string | null): string {
  if (!boothType || !boothType.trim()) {
    if (zoneId === 'artsy') return 'A01';
    if (zoneId === 'premier') return 'A04';
    if (zoneId === 'atelier') return 'L2, L6, L7';
    return 'A01';
  }

  const raw = boothType.trim();

  // Legacy mappings
  if (raw.includes('S01') || raw.includes('S06') || raw === 'S-2x2') {
    return 'A01';
  }
  if (raw.includes('M9') || raw.includes('M15') || raw.includes('M1-M8')) {
    return 'A04';
  }
  if (raw === 'A-ENTRANCE' || raw.toUpperCase().includes('ENTRANCE')) {
    return 'S-02';
  }
  if (raw === 'MAKING-PROJECT' || raw.includes('造物')) {
    return 'MAKING-PROJECT';
  }
  if (raw.includes('L2') && (raw.includes('L6') || raw.includes('L7'))) {
    return 'L2, L6, L7';
  }
  if (raw.includes('L1') && raw.includes('L5')) {
    return 'L1 & L5';
  }
  if (raw.includes('L3') && raw.includes('L4')) {
    return 'L3&L4';
  }

  return raw;
}

/**
 * Formats booth code into official curatorial name for badges, cards, and notification displays.
 * Completely eliminates any legacy codes from appearing on the front-end.
 */
export function formatBoothDisplay(boothType?: string | null, zoneId?: string | null): string {
  const code = normalizeBoothCode(boothType, zoneId);

  // Exact standard code mappings
  switch (code) {
    case 'A01':
      return 'A01 展台式展位';
    case 'A02':
      return 'A02 展台式展位';
    case 'A03':
      return 'A03 展台式展位';
    case 'A04':
      return 'A04 展台式展位';
    case 'A05':
      return 'A05 雙展台展位';
    case 'S-02':
      return 'S-02 迎賓展台位';
    case 'L1':
      return 'L1 最大獨立展位';
    case 'L2':
      return 'L2 獨立展位';
    case 'L3':
      return 'L3 獨立展位';
    case 'L4':
      return 'L4 獨立展位';
    case 'L3&L4':
    case 'L3 & L4':
      return 'L3 & L4 獨立展位';
    case 'L5':
    case 'MAKING-PROJECT':
      return 'L5「造物計畫」特展席位';
    case 'L6':
      return 'L6 獨立展位';
    case 'L7':
      return 'L7 獨立展位';
    case 'L2, L6, L7':
    case 'L2,L6,L7':
    case 'L2 & L6 & L7':
      return 'L2, L6, L7 獨立展位';
    case 'L6 & L7':
    case 'L6, L7':
    case 'L6&L7':
      return 'L6 & L7 獨立展位';
    case 'L1 & L5':
    case 'L1&L5':
      return 'L1 & L5 最大獨立展位';
    case 'T':
      return 'T區 微型曝光席位';
    default:
      if (code.startsWith('A01')) return 'A01 展台式展位';
      if (code.startsWith('A02')) return 'A02 展台式展位';
      if (code.startsWith('A03')) return 'A03 展台式展位';
      if (code.startsWith('A04')) return 'A04 展台式展位';
      if (code.startsWith('A05')) return 'A05 雙展台展位';
      return code;
  }
}

/**
 * Retrieves official booth fee according to modern 2027 VIS specs.
 */
export function getBoothPrice(boothType?: string | null, zoneId?: string | null): number {
  const code = normalizeBoothCode(boothType, zoneId);

  if (code === 'MAKING-PROJECT') return 12000;
  if (code === 'A01') return 40000;
  if (code === 'A02') return 38000;
  if (code === 'A03') return 32000;
  if (code === 'A04') return 42000;
  if (code === 'A05') return 45000;
  if (code === 'L3&L4' || code === 'L3 & L4' || code === 'L3' || code === 'L4') return 108000;
  if (code === 'L2, L6, L7' || code === 'L2,L6,L7' || code === 'L2' || code === 'L6' || code === 'L7') return 88000;
  if (code === 'L1 & L5' || code === 'L1&L5' || code === 'L1' || code === 'L5') return 158000;
  if (code === 'L6 & L7' || code === 'L6, L7' || code === 'L6&L7') return 88000;

  // Fallback by zone
  if (zoneId === 'artsy') return 40000;
  if (zoneId === 'premier') return 42000;
  if (zoneId === 'atelier') return 88000;
  return 40000;
}

