import { NextResponse } from 'next/server';
import { createSubmission } from '@/lib/perspectiveDb';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { display_name, answer, consent_display, consent_version, idempotency_key } = body;

    if (!consent_display) {
      return NextResponse.json(
        { error: 'Consent is required' },
        { status: 400 }
      );
    }

    const nameStr = (display_name || '').trim();
    const answerStr = (answer || '').trim();

    if (!nameStr || !answerStr) {
      return NextResponse.json(
        { error: 'Both display_name and answer are required' },
        { status: 400 }
      );
    }

    if (nameStr.length > 30 || answerStr.length > 120) {
      return NextResponse.json(
        { error: 'Field length exceeds maximum limit' },
        { status: 400 }
      );
    }

    const result = await createSubmission({
      campaign_slug: slug,
      source: 'PUBLIC',
      type: 'visitor',
      display_name: nameStr,
      answer: answerStr,
      consent_display: true,
      consent_version: consent_version || '2027-v1',
      idempotency_key,
    });

    return NextResponse.json(
      {
        submission_id: result.id,
        status: result.status,
        submitted_at: result.submitted_at,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
