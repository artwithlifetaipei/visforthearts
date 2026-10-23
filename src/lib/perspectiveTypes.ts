// Types and client-safe constants for VIS Annual Cultural Question (Section 10 & 13)

export interface PerspectiveCampaign {
  id: string;
  slug: string;
  year: number;
  question_version: string;
  question_en: string;
  question_zh: string;
  identity_label: string;
  submission_open_at: string;
  submission_close_at: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  is_display_campaign: boolean;
  consent_version: string;
  created_at: string;
  updated_at: string;
}

export type SubmissionSource = 'PUBLIC' | 'EDITORIAL' | 'INTERVIEW';
export type SubmissionType = 'visitor' | 'vip' | 'vis_people' | 'artist' | 'exhibitor';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface AnnualSubQuestion {
  id: string;
  order: number;
  question_zh: string;
  question_en: string;
  short_label_zh: string;
  short_label_en: string;
  placeholder_zh: string;
  placeholder_en: string;
}

export const ANNUAL_SUB_QUESTIONS: AnnualSubQuestion[] = [
  {
    id: 'q1',
    order: 1,
    question_zh: '你認為，一個真正懂得欣賞美的社會，應該具備什麼樣的特質？',
    question_en: 'What qualities do you believe a society that truly appreciates beauty should possess?',
    short_label_zh: '社會特質',
    short_label_en: 'Societal Qualities',
    placeholder_zh: '請分享你認為一個懂得欣賞美的社會，應該具備什麼樣的特質與素養...',
    placeholder_en: 'Share what qualities an aesthetic society should possess...',
  },
  {
    id: 'q2',
    order: 2,
    question_zh: '對你來說，美的事物，它的價值是什麼？一個句話形容。',
    question_en: 'For you, what is the value of beautiful things? Describe it in one sentence.',
    short_label_zh: '美的價值（一句話）',
    short_label_en: 'Value of Beauty',
    placeholder_zh: '請用一句話形容：對你來說，美的事物它的真正價值是什麼...',
    placeholder_en: 'In one sentence, describe the value of beautiful things to you...',
  },
  {
    id: 'q3',
    order: 3,
    question_zh: '如果希望台灣成為一個更有美感的地方，你最希望大家開始重視什麼？',
    question_en: 'If we hope Taiwan becomes a more aesthetically conscious place, what do you most hope people begin to value?',
    short_label_zh: '台灣美感實踐',
    short_label_en: 'Aesthetic Taiwan',
    placeholder_zh: '若希望台灣更有美感，你最希望大家與社會開始重視什麼...',
    placeholder_en: 'What do you most hope people in Taiwan begin to value for aesthetics...',
  },
];

export interface PerspectiveSubmission {
  id: string;
  campaign_id: string;
  source: SubmissionSource;
  type: SubmissionType;
  original_name: string;
  display_name: string;
  original_answer: string;
  display_answer: string | null;
  role_title: string | null;
  language?: string;
  status: SubmissionStatus;
  display_enabled: boolean;
  display_order: number | null;
  featured: boolean;
  question_id?: string | null;
  question_prompt?: string | null;
  moderation_flags: string[];
  rejection_reason?: string | null;
  consent_version: string;
  consented_at: string;
  withdrawn_at?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
  idempotency_key?: string | null;
}

export interface PerspectiveDisplaySettings {
  id: string;
  campaign_id: string;
  mode: 'normal' | 'latest' | 'filtered' | 'emergency';
  filter_type: string | null;
  duration_seconds: number;
  transition: string;
  emergency_message_en: string;
  emergency_message_zh: string;
  content_version: number;
  updated_at: string;
  updated_by?: string | null;
}

export const DEFAULT_CAMPAIGN: PerspectiveCampaign = {
  id: 'e3c23114-61b9-4674-8898-0c367ad10827',
  slug: 'vis-2027',
  year: 2027,
  question_version: '2027-v2',
  question_en: 'HOW CAN BEAUTY BECOME OUR SHARED VALUE?',
  question_zh: '美，如何成為我們共同的價值？',
  identity_label: '2027 台北中山堂 · 年度文化命題',
  submission_open_at: '2027-01-01T00:00:00Z',
  submission_close_at: '2027-12-31T23:59:59Z',
  status: 'active',
  is_display_campaign: true,
  consent_version: 'v1.0-2027-zhongshan-hall',
  created_at: '2026-10-23T14:00:00Z',
  updated_at: '2026-10-23T14:00:00Z',
};
