import { NextResponse } from 'next/server';
import { getDisplayPerspectives } from '@/lib/perspectiveDb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const campaign = searchParams.get('campaign') || 'vis-2027';

    const result = await getDisplayPerspectives(campaign);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=60',
        'ETag': `W/"version-${result.campaign.content_version}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
