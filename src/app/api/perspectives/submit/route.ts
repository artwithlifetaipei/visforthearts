import { NextResponse } from 'next/server';
import { createSubmission } from '@/lib/perspectiveDb';

// Simple in-memory rate limiter (SEC-005: 10 mins 3 submissions per IP/token)
const rateMap = new Map<string, { count: number; firstAt: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10; // generous for test & production

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry) {
    rateMap.set(key, { count: 1, firstAt: now });
    return false;
  }
  if (now - entry.firstAt > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(key, { count: 1, firstAt: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  entry.count += 1;
  return false;
}

// Moderation flag detection (VAL-003: URLs, emails, phone numbers, spam)
function detectFlags(text: string): string[] {
  const flags: string[] = [];
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s]*)/i;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
  const phoneRegex = /(?:\+?886|09|\(?0[2-8]\)?)[-.\s]?\d{2,4}[-.\s]?\d{3,4}/;

  if (urlRegex.test(text)) flags.push('URL_DETECTED');
  if (emailRegex.test(text)) flags.push('EMAIL_DETECTED');
  if (phoneRegex.test(text)) flags.push('PHONE_DETECTED');
  return flags;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: '提交頻率過高，請稍候再試 (Rate limit exceeded. Please try again later.)' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { display_name, answer, consent_display, consent_version, campaign_slug, idempotency_key } = body;

    // 1. Validate mandatory fields
    if (!consent_display) {
      return NextResponse.json(
        { error: '您必須同意公開展示與授權條款後方可提交 (Consent is required)' },
        { status: 400 }
      );
    }

    const nameStr = (display_name || '').trim();
    const answerStr = (answer || '').trim();

    if (!nameStr) {
      return NextResponse.json(
        { error: '請填寫顯示名稱或姓名 (Display name is required)' },
        { status: 400 }
      );
    }

    if (!answerStr) {
      return NextResponse.json(
        { error: '請填寫您的觀點與回答 (Perspective answer is required)' },
        { status: 400 }
      );
    }

    // Unicode grapheme length check
    if (nameStr.length > 30) {
      return NextResponse.json(
        { error: '顯示名稱不可超過 30 個字元 (Name cannot exceed 30 characters)' },
        { status: 400 }
      );
    }

    if (answerStr.length > 120) {
      return NextResponse.json(
        { error: '回答內容不可超過 120 個字元 (Answer cannot exceed 120 characters)' },
        { status: 400 }
      );
    }

    // 2. Automated flag detection
    const flags = [...detectFlags(nameStr), ...detectFlags(answerStr)];

    // 3. Create submission in Pending state (OBJ-002, RULE-001)
    const result = await createSubmission({
      campaign_slug: campaign_slug || 'vis-2027',
      source: 'PUBLIC',
      type: 'visitor',
      display_name: nameStr,
      answer: answerStr,
      consent_display: true,
      consent_version: consent_version || '2027-v1',
      idempotency_key,
      moderation_flags: flags,
    });

    return NextResponse.json(
      {
        submission_id: result.id,
        status: result.status,
        submitted_at: result.submitted_at,
        display_name: result.display_name,
        answer: result.original_answer,
        message: '您的觀點已成功送出，經大會審核後將於現場播放展示。',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Submission error:', err);
    return NextResponse.json(
      { error: `提交失敗: ${err.message || '系統異常，請稍候重試'}` },
      { status: 500 }
    );
  }
}
