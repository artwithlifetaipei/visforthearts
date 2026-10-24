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
    question_zh: '你覺得什麼樣的人，很有品味？',
    question_en: 'In your opinion, what kind of person truly has great taste?',
    short_label_zh: '品味的特質',
    short_label_en: 'Qualities of Taste',
    placeholder_zh: '請分享你認為什麼樣的人很有品味，他們身上有哪些吸引你的特質或生活細節...',
    placeholder_en: 'Share what kind of person you think has great taste and what defines them...',
  },
  {
    id: 'q2',
    order: 2,
    question_zh: '如果可以讓生活中，或是台灣的一個地方變得更美，你會先選哪裡？',
    question_en: 'If you could make a place in your daily life or in Taiwan more beautiful, which would you choose first?',
    short_label_zh: '地方的改變',
    short_label_en: 'Transforming a Place',
    placeholder_zh: '請分享如果可以讓生活中，或是台灣的一個地方變得更美，你會先選哪裡？你希望那裡發生什麼改變...',
    placeholder_en: 'Share which place in your life or in Taiwan you would choose to make more beautiful and why...',
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
  question_en: 'HOW CAN AESTHETICS BECOME OUR SHARED VALUE?',
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
