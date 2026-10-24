import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

import { 
  DEFAULT_CAMPAIGN, 
  PerspectiveSubmission, 
  PerspectiveDisplaySettings,
  PerspectiveCampaign,
  AnnualSubQuestion,
  ANNUAL_SUB_QUESTIONS,
  SubmissionSource,
  SubmissionType
} from './perspectiveTypes';

// Re-export for server callers
export * from './perspectiveTypes';

// Default Display Settings
export const DEFAULT_DISPLAY_SETTINGS: PerspectiveDisplaySettings = {
  id: 'disp-2027-001',
  campaign_id: DEFAULT_CAMPAIGN.id,
  mode: 'normal',
  filter_type: null,
  duration_seconds: 8,
  transition: 'fade',
  emergency_message_en: 'VIS 2027 — HOW CAN AESTHETICS BECOME OUR SHARED VALUE?',
  emergency_message_zh: 'VIS 2027 當代生活文化大展 · 美，如何成為我們共同的價值？',
  content_version: 1,
  updated_at: new Date().toISOString(),
  updated_by: 'system',
};

// Curated Initial Perspectives (Approved & Display On)
export const SEED_PERSPECTIVES: PerspectiveSubmission[] = [
  {
    id: 'sub-003',
    campaign_id: DEFAULT_CAMPAIGN.id,
    source: 'EDITORIAL',
    type: 'vis_people',
    original_name: 'VIS Curatorial Team',
    display_name: 'VIS 策展小組',
    original_answer: '對歷史紋理的敬畏，以及在古蹟中山堂中重新萌芽的原創文化勇氣。',
    display_answer: '對歷史紋理的敬畏，以及在古蹟中山堂中重新萌芽的原創文化勇氣。',
    role_title: 'VIS 2027 策展團隊',
    status: 'approved',
    display_enabled: true,
    display_order: 1,
    featured: true,
    question_id: 'q3',
    question_prompt: '如果希望台灣成為一個更有美感的地方，你最希望大家開始重視什麼？',
    moderation_flags: [],
    consent_version: '2027-v2',
    consented_at: '2026-10-21T09:00:00Z',
    submitted_at: '2026-10-21T09:00:00Z',
    created_at: '2026-10-21T09:00:00Z',
    updated_at: '2026-10-21T09:00:00Z',
  },
  {
    id: 'sub-004',
    campaign_id: DEFAULT_CAMPAIGN.id,
    source: 'INTERVIEW',
    type: 'exhibitor',
    original_name: 'Norman',
    display_name: 'Norman',
    original_answer: '在講求速度與效率的當代，依然願意緩慢打磨、專注雕琢一件事的執著。',
    display_answer: '在講求速度與效率的當代，依然願意緩慢打磨、專注雕琢一件事的執著。',
    role_title: '參展品牌設計總監',
    status: 'approved',
    display_enabled: true,
    display_order: 2,
    featured: true,
    question_id: 'q1',
    question_prompt: '你認為，一個真正懂得欣賞美的社會，應該具備什麼樣的特質？',
    moderation_flags: [],
    consent_version: '2027-v2',
    consented_at: '2026-10-21T09:30:00Z',
    submitted_at: '2026-10-21T09:30:00Z',
    created_at: '2026-10-21T09:30:00Z',
    updated_at: '2026-10-21T09:30:00Z',
  },
  {
    id: 'sub-009',
    campaign_id: DEFAULT_CAMPAIGN.id,
    source: 'PUBLIC',
    type: 'visitor',
    original_name: '匿名觀展者',
    display_name: '匿名觀展者',
    original_answer: '孩子眼眸中對世界純粹的好奇心，以及對大自然原始森林的敬畏之情。',
    display_answer: '孩子眼眸中對世界純粹的好奇心，以及對大自然原始森林的敬畏之情。',
    role_title: null,
    status: 'approved',
    display_enabled: true,
    display_order: 3,
    featured: false,
    question_id: 'q3',
    question_prompt: '如果希望台灣成為一個更有美感的地方，你最希望大家開始重視什麼？',
    moderation_flags: [],
    consent_version: '2027-v2',
    consented_at: '2026-10-21T12:00:00Z',
    submitted_at: '2026-10-21T12:00:00Z',
    created_at: '2026-10-21T12:00:00Z',
    updated_at: '2026-10-21T12:00:00Z',
  },
];

// Fallback Local File Storage Helper (Server-side resilience)
function getLocalStorePath(): string {
  try {
    const dir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'perspectives_store.json');
  } catch {
    return path.join('/tmp', 'perspectives_store.json');
  }
}

export interface LocalStoreSchema {
  campaign: PerspectiveCampaign;
  displaySettings: PerspectiveDisplaySettings;
  submissions: PerspectiveSubmission[];
}

function readLocalStore(): LocalStoreSchema {
  try {
    const filePath = getLocalStorePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const store: LocalStoreSchema = JSON.parse(content);
      if (store && Array.isArray(store.submissions)) {
        store.submissions = store.submissions.filter(
          s =>
            s.id !== 'sub-001' &&
            !s.original_answer?.includes('工藝的溫度與觸感') &&
            !s.display_answer?.includes('工藝的溫度與觸感')
        );
      }
      return store;
    }
  } catch (err) {
    console.warn('Error reading local perspective store:', err);
  }

  // Initial defaults
  return {
    campaign: DEFAULT_CAMPAIGN,
    displaySettings: DEFAULT_DISPLAY_SETTINGS,
    submissions: [...SEED_PERSPECTIVES],
  };
}

function writeLocalStore(store: LocalStoreSchema): void {
  try {
    const filePath = getLocalStorePath();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error writing local perspective store:', err);
  }
}

// Cached authenticated Supabase client for persistent cross-lambda storage
let cachedAuthClient: any = null;
let cachedAuthExpiry = 0;

async function getAuthenticatedSupabaseClient() {
  const now = Date.now();
  if (cachedAuthClient && now < cachedAuthExpiry) {
    return cachedAuthClient;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const client = createClient(url, key);
  try {
    await client.auth.signInWithPassword({
      email: 'artwithlifetaipei@gmail.com',
      password: 'Kuo76443173'
    });
    cachedAuthClient = client;
    cachedAuthExpiry = now + 30 * 60 * 1000;
  } catch (err) {
    console.warn('Auth signIn error in perspectiveDb:', err);
  }
  return client;
}

// Master Cloud Persistence via Supabase (ensures real-time sync across all Vercel serverless containers)
export async function loadMasterStore(): Promise<LocalStoreSchema> {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data } = await supabase
      .from('exhibitor_media_assets')
      .select('file_url')
      .eq('file_type', 'perspective_store_master')
      .maybeSingle();

    if (data && data.file_url) {
      const parsed: LocalStoreSchema = JSON.parse(data.file_url);
      if (parsed && Array.isArray(parsed.submissions)) {
        parsed.submissions = parsed.submissions.filter(
          s =>
            s.id !== 'sub-001' &&
            !s.original_answer?.includes('工藝的溫度與觸感') &&
            !s.display_answer?.includes('工藝的溫度與觸感')
        );
        writeLocalStore(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('loadMasterStore error:', err);
  }

  return readLocalStore();
}

export async function saveMasterStore(store: LocalStoreSchema): Promise<void> {
  writeLocalStore(store);
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data: existing } = await supabase
      .from('exhibitor_media_assets')
      .select('id')
      .eq('file_type', 'perspective_store_master')
      .maybeSingle();

    const content = JSON.stringify(store);
    if (existing && existing.id) {
      await supabase
        .from('exhibitor_media_assets')
        .update({ file_url: content, file_name: 'perspectives_data.json' })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('exhibitor_media_assets')
        .insert({
          brand_id: '444b6097-1c93-4629-8863-c655a3f5a9d3',
          file_type: 'perspective_store_master',
          file_name: 'perspectives_data.json',
          file_url: content,
        });
    }
  } catch (err) {
    console.warn('saveMasterStore error:', err);
  }
}

// ==========================================
// Public Database APIs
// ==========================================

export async function getActiveCampaign(slug: string = 'vis-2027'): Promise<PerspectiveCampaign> {
  const local = await loadMasterStore();
  return local.campaign || DEFAULT_CAMPAIGN;
}

export async function getDisplaySettings(campaignSlug: string = 'vis-2027'): Promise<PerspectiveDisplaySettings> {
  const local = await loadMasterStore();
  return local.displaySettings || DEFAULT_DISPLAY_SETTINGS;
}

export async function updateDisplaySettings(
  patch: Partial<PerspectiveDisplaySettings>,
  actor: string = 'admin'
): Promise<PerspectiveDisplaySettings> {
  const local = await loadMasterStore();
  const newContentVersion = (local.displaySettings.content_version || 1) + 1;
  const updatedSettings: PerspectiveDisplaySettings = {
    ...local.displaySettings,
    ...patch,
    content_version: newContentVersion,
    updated_at: new Date().toISOString(),
    updated_by: actor,
  };

  local.displaySettings = updatedSettings;
  await saveMasterStore(local);
  return updatedSettings;
}

// LED Display query: Strictly Approved, Display On, Non-Withdrawn (OBJ-005, RULE-002)
export async function getDisplayPerspectives(campaignSlug: string = 'vis-2027'): Promise<{
  campaign: {
    slug: string;
    question_en: string;
    question_zh: string;
    content_version: number;
  };
  display: {
    mode: string;
    duration_seconds: number;
    transition: string;
    emergency_message_en: string;
    emergency_message_zh: string;
    updated_at: string;
  };
  items: Array<{
    id: string;
    name: string;
    answer: string;
    type: string;
    role_title: string | null;
    display_order: number | null;
    featured: boolean;
    question_id: string | null;
    question_prompt: string | null;
    updated_at: string;
  }>;
}> {
  const local = await loadMasterStore();
  const campaign = local.campaign || DEFAULT_CAMPAIGN;
  const settings = local.displaySettings || DEFAULT_DISPLAY_SETTINGS;

  let approvedItems = local.submissions.filter(
    s =>
      s.status === 'approved' &&
      s.display_enabled &&
      !s.withdrawn_at &&
      !s.original_answer?.includes('工藝的溫度與觸感') &&
      !s.display_answer?.includes('工藝的溫度與觸感')
  );

  if (settings.mode === 'filtered' && settings.filter_type) {
    approvedItems = approvedItems.filter(s => s.type === settings.filter_type);
  }

  // Map to safe, minimized public payload (OBJ-005, supporting featured enhanced display)
  const safeItems = approvedItems.map(item => ({
    id: item.id,
    name: item.display_name,
    answer: item.display_answer || item.original_answer,
    type: item.type,
    role_title: item.role_title || null,
    display_order: item.display_order,
    featured: Boolean(item.featured),
    question_id: item.question_id || null,
    question_prompt: item.question_prompt || null,
    updated_at: item.updated_at,
  }));

  return {
    campaign: {
      slug: campaign.slug,
      question_en: campaign.question_en,
      question_zh: campaign.question_zh,
      content_version: settings.content_version,
    },
    display: {
      mode: settings.mode,
      duration_seconds: settings.duration_seconds,
      transition: settings.transition,
      emergency_message_en: settings.emergency_message_en,
      emergency_message_zh: settings.emergency_message_zh,
      updated_at: settings.updated_at,
    },
    items: safeItems,
  };
}

// Create new submission (Public or Editorial)
export async function createSubmission(payload: {
  campaign_slug?: string;
  source?: SubmissionSource;
  type?: SubmissionType;
  display_name: string;
  answer: string;
  role_title?: string | null;
  question_id?: string | null;
  question_prompt?: string | null;
  consent_display: boolean;
  consent_version?: string;
  idempotency_key?: string;
  moderation_flags?: string[];
}): Promise<PerspectiveSubmission> {
  const campaign = await getActiveCampaign(payload.campaign_slug || 'vis-2027');
  const nowIso = new Date().toISOString();
  const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Strict sanitization & grapheme length rule
  const cleanName = (payload.display_name || '').trim().replace(/\s+/g, ' ').substring(0, 30);
  const cleanAnswer = (payload.answer || '').trim().replace(/[\r\n]+/g, ' ').substring(0, 120);

  // Auto-approve clean submissions from visitors so they immediately appear on the exhibition wall
  const isFlagged = Boolean(payload.moderation_flags && payload.moderation_flags.length > 0);
  const isApproved = !isFlagged;

  const newSubmission: PerspectiveSubmission = {
    id,
    campaign_id: campaign.id,
    source: payload.source || 'PUBLIC',
    type: payload.type || 'visitor',
    original_name: cleanName,
    display_name: cleanName,
    original_answer: cleanAnswer,
    display_answer: cleanAnswer,
    role_title: payload.role_title ? payload.role_title.trim().substring(0, 80) : null,
    status: isApproved ? 'approved' : 'pending',
    display_enabled: isApproved,
    display_order: null,
    featured: false,
    question_id: payload.question_id || null,
    question_prompt: payload.question_prompt || null,
    moderation_flags: payload.moderation_flags || [],
    consent_version: payload.consent_version || campaign.consent_version,
    consented_at: nowIso,
    withdrawn_at: null,
    submitted_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    idempotency_key: payload.idempotency_key || null,
  };

  const local = await loadMasterStore();
  local.submissions.unshift(newSubmission);
  local.displaySettings.content_version = (local.displaySettings.content_version || 1) + 1;
  local.displaySettings.updated_at = nowIso;
  await saveMasterStore(local);

  return newSubmission;
}

// Query all submissions for Admin CMS
export async function getAllSubmissions(filters?: {
  status?: string;
  source?: string;
  type?: string;
  display?: string;
  search?: string;
}): Promise<PerspectiveSubmission[]> {
  const local = await loadMasterStore();
  let list = local.submissions.filter(
    s =>
      !s.original_answer?.includes('工藝的溫度與觸感') &&
      !s.display_answer?.includes('工藝的溫度與觸感')
  );

  if (filters?.status && filters.status !== 'all') {
    list = list.filter(s => s.status === filters.status);
  }
  if (filters?.source && filters.source !== 'all') {
    list = list.filter(s => s.source === filters.source);
  }
  if (filters?.type && filters.type !== 'all') {
    list = list.filter(s => s.type === filters.type);
  }
  if (filters?.display === 'on') {
    list = list.filter(s => s.display_enabled);
  } else if (filters?.display === 'off') {
    list = list.filter(s => !s.display_enabled);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      s =>
        (s.display_name && s.display_name.toLowerCase().includes(q)) ||
        (s.original_name && s.original_name.toLowerCase().includes(q)) ||
        (s.display_answer && s.display_answer.toLowerCase().includes(q)) ||
        (s.original_answer && s.original_answer.toLowerCase().includes(q)) ||
        (s.role_title && s.role_title.toLowerCase().includes(q))
    );
  }

  return list;
}

// Update single submission (Moderation, Display Toggle, Text Editing)
export async function updateSubmission(
  id: string,
  patch: Partial<PerspectiveSubmission>,
  actor: string = 'admin'
): Promise<PerspectiveSubmission | null> {
  const local = await loadMasterStore();
  const index = local.submissions.findIndex(s => s.id === id);
  if (index === -1) return null;

  const current = local.submissions[index];
  const nowIso = new Date().toISOString();

  // RULE-003: If changed to Rejected or Archived, force display_enabled = false
  let newDisplay = patch.display_enabled !== undefined ? patch.display_enabled : current.display_enabled;
  if (patch.status === 'rejected' || patch.status === 'archived') {
    newDisplay = false;
  }

  // RULE-004: Original name and answer CANNOT be overwritten
  const updated: PerspectiveSubmission = {
    ...current,
    ...patch,
    original_name: current.original_name,
    original_answer: current.original_answer,
    display_enabled: newDisplay,
    reviewed_at: patch.status ? nowIso : current.reviewed_at,
    reviewed_by: patch.status ? actor : current.reviewed_by,
    updated_at: nowIso,
  };

  local.submissions[index] = updated;
  local.displaySettings.content_version = (local.displaySettings.content_version || 1) + 1;
  local.displaySettings.updated_at = nowIso;
  await saveMasterStore(local);

  return updated;
}

// Permanently delete a single submission
export async function deleteSubmission(id: string): Promise<boolean> {
  const local = await loadMasterStore();
  const index = local.submissions.findIndex(s => s.id === id);
  if (index !== -1) {
    local.submissions.splice(index, 1);
    local.displaySettings.content_version = (local.displaySettings.content_version || 1) + 1;
    local.displaySettings.updated_at = new Date().toISOString();
    await saveMasterStore(local);
  }
  return true;
}
