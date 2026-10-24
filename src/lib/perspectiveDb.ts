import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

import { 
  DEFAULT_CAMPAIGN, 
  PerspectiveSubmission, 
  PerspectiveDisplaySettings,
  PerspectiveCampaign,
  AnnualSubQuestion,
  ANNUAL_SUB_QUESTIONS
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
  // Try writing to project directory, fallback to /tmp
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

interface LocalStoreSchema {
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

// Supabase client instance
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

// ==========================================
// Public Database APIs
// ==========================================

export async function getActiveCampaign(slug: string = 'vis-2027'): Promise<PerspectiveCampaign> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('perspective_campaigns')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      return data as PerspectiveCampaign;
    }
  } catch (err) {
    console.warn('Supabase getActiveCampaign fallback:', err);
  }

  const local = readLocalStore();
  return local.campaign;
}

export async function getDisplaySettings(campaignSlug: string = 'vis-2027'): Promise<PerspectiveDisplaySettings> {
  const supabase = getSupabaseClient();
  try {
    const campaign = await getActiveCampaign(campaignSlug);
    const { data, error } = await supabase
      .from('perspective_display_settings')
      .select('*')
      .eq('campaign_id', campaign.id)
      .maybeSingle();

    if (!error && data) {
      return data as PerspectiveDisplaySettings;
    }
  } catch (err) {
    console.warn('Supabase getDisplaySettings fallback:', err);
  }

  const local = readLocalStore();
  return local.displaySettings;
}

export async function updateDisplaySettings(
  patch: Partial<PerspectiveDisplaySettings>,
  actor: string = 'admin'
): Promise<PerspectiveDisplaySettings> {
  const local = readLocalStore();
  const newContentVersion = (local.displaySettings.content_version || 1) + 1;
  const updatedSettings: PerspectiveDisplaySettings = {
    ...local.displaySettings,
    ...patch,
    content_version: newContentVersion,
    updated_at: new Date().toISOString(),
    updated_by: actor,
  };

  const supabase = getSupabaseClient();
  try {
    await supabase
      .from('perspective_display_settings')
      .update({
        mode: updatedSettings.mode,
        filter_type: updatedSettings.filter_type,
        duration_seconds: updatedSettings.duration_seconds,
        transition: updatedSettings.transition,
        emergency_message_en: updatedSettings.emergency_message_en,
        emergency_message_zh: updatedSettings.emergency_message_zh,
        content_version: newContentVersion,
        updated_at: updatedSettings.updated_at,
        updated_by: actor,
      })
      .eq('campaign_id', updatedSettings.campaign_id);
  } catch (err) {
    console.warn('Supabase updateDisplaySettings warning:', err);
  }

  local.displaySettings = updatedSettings;
  writeLocalStore(local);
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
    updated_at: string;
  }>;
}> {
  const campaign = await getActiveCampaign(campaignSlug);
  const settings = await getDisplaySettings(campaignSlug);

  let approvedItems: PerspectiveSubmission[] = [];
  const supabase = getSupabaseClient();

  try {
    let query = supabase
      .from('perspective_submissions')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('status', 'approved')
      .eq('display_enabled', true)
      .is('withdrawn_at', null)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (settings.mode === 'filtered' && settings.filter_type) {
      query = query.eq('type', settings.filter_type);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      approvedItems = data as PerspectiveSubmission[];
    }
  } catch (err) {
    console.warn('Supabase getDisplayPerspectives fallback:', err);
  }

  // Fallback to local store if DB returned empty or wasn't configured
  if (approvedItems.length === 0) {
    const local = readLocalStore();
    approvedItems = local.submissions.filter(
      s => s.status === 'approved' && s.display_enabled && !s.withdrawn_at
    );
    if (settings.mode === 'filtered' && settings.filter_type) {
      approvedItems = approvedItems.filter(s => s.type === settings.filter_type);
    }
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

  const newSubmission: PerspectiveSubmission = {
    id,
    campaign_id: campaign.id,
    source: payload.source || 'PUBLIC',
    type: payload.type || 'visitor',
    original_name: cleanName,
    display_name: cleanName,
    original_answer: cleanAnswer,
    display_answer: payload.source === 'EDITORIAL' || payload.source === 'INTERVIEW' ? cleanAnswer : null,
    role_title: payload.role_title ? payload.role_title.trim().substring(0, 80) : null,
    status: payload.source === 'EDITORIAL' || payload.source === 'INTERVIEW' ? 'approved' : 'pending',
    display_enabled: payload.source === 'EDITORIAL' || payload.source === 'INTERVIEW',
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

  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('perspective_submissions')
      .insert({
        campaign_id: newSubmission.campaign_id,
        source: newSubmission.source,
        type: newSubmission.type,
        original_name: newSubmission.original_name,
        display_name: newSubmission.display_name,
        original_answer: newSubmission.original_answer,
        display_answer: newSubmission.display_answer,
        role_title: newSubmission.role_title,
        status: newSubmission.status,
        display_enabled: newSubmission.display_enabled,
        display_order: newSubmission.display_order,
        featured: newSubmission.featured,
        question_id: newSubmission.question_id,
        question_prompt: newSubmission.question_prompt,
        moderation_flags: newSubmission.moderation_flags,
        consent_version: newSubmission.consent_version,
        consented_at: newSubmission.consented_at,
        submitted_at: newSubmission.submitted_at,
        idempotency_key: newSubmission.idempotency_key,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      newSubmission.id = data.id;
    }
  } catch (err) {
    console.warn('Supabase createSubmission fallback:', err);
  }

  // Cache locally
  const local = readLocalStore();
  local.submissions.unshift(newSubmission);
  writeLocalStore(local);

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
  const supabase = getSupabaseClient();
  let list: PerspectiveSubmission[] = [];

  try {
    let query = supabase
      .from('perspective_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.source && filters.source !== 'all') {
      query = query.eq('source', filters.source);
    }
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }
    if (filters?.display === 'on') {
      query = query.eq('display_enabled', true);
    } else if (filters?.display === 'off') {
      query = query.eq('display_enabled', false);
    }

    const { data, error } = await query;
    if (!error && data) {
      list = data as PerspectiveSubmission[];
    }
  } catch (err) {
    console.warn('Supabase getAllSubmissions fallback:', err);
  }

  if (list.length === 0) {
    const local = readLocalStore();
    list = local.submissions;
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
  const local = readLocalStore();
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
  // Increment display content version if display state or content changed
  local.displaySettings.content_version = (local.displaySettings.content_version || 1) + 1;
  local.displaySettings.updated_at = nowIso;
  writeLocalStore(local);

  const supabase = getSupabaseClient();
  try {
    await supabase
      .from('perspective_submissions')
      .update({
        display_name: updated.display_name,
        display_answer: updated.display_answer,
        role_title: updated.role_title,
        type: updated.type,
        status: updated.status,
        display_enabled: updated.display_enabled,
        display_order: updated.display_order,
        featured: updated.featured,
        rejection_reason: updated.rejection_reason,
        withdrawn_at: updated.withdrawn_at,
        reviewed_at: updated.reviewed_at,
        reviewed_by: updated.reviewed_by,
        updated_at: nowIso,
      })
      .eq('id', id);

    // Update settings version
    await supabase
      .from('perspective_display_settings')
      .update({
        content_version: local.displaySettings.content_version,
        updated_at: nowIso,
        updated_by: actor,
      })
      .eq('campaign_id', current.campaign_id);
  } catch (err) {
    console.warn('Supabase updateSubmission warning:', err);
  }

  return updated;
}

// Permanently delete a single submission
export async function deleteSubmission(id: string): Promise<boolean> {
  const local = readLocalStore();
  const index = local.submissions.findIndex(s => s.id === id);
  if (index !== -1) {
    local.submissions.splice(index, 1);
    local.displaySettings.content_version = (local.displaySettings.content_version || 1) + 1;
    local.displaySettings.updated_at = new Date().toISOString();
    writeLocalStore(local);
  }

  const supabase = getSupabaseClient();
  try {
    await supabase.from('perspective_submissions').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deleteSubmission warning:', err);
  }

  return true;
}
