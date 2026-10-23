import { NextResponse } from 'next/server';
import {
  getAllSubmissions,
  updateSubmission,
  createSubmission,
  getDisplaySettings,
  updateDisplaySettings,
  getActiveCampaign,
  PerspectiveSubmission,
} from '@/lib/perspectiveDb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const source = searchParams.get('source') || 'all';
    const type = searchParams.get('type') || 'all';
    const display = searchParams.get('display') || 'all';
    const search = searchParams.get('search') || '';
    const format = searchParams.get('format') || 'json';

    const items = await getAllSubmissions({ status, source, type, display, search });
    const all = await getAllSubmissions();
    const settings = await getDisplaySettings();
    const campaign = await getActiveCampaign();

    // Statistics
    const stats = {
      total: all.length,
      pending: all.filter(s => s.status === 'pending').length,
      approved: all.filter(s => s.status === 'approved').length,
      display_on: all.filter(s => s.display_enabled && s.status === 'approved').length,
      rejected: all.filter(s => s.status === 'rejected').length,
      archived: all.filter(s => s.status === 'archived').length,
    };

    if (format === 'csv') {
      // Export to CSV (Section 13.4 & 15)
      const headers = [
        'ID',
        '來源 Source',
        '分類 Type',
        '角色頭銜 Role',
        '原始姓名 Original Name',
        '展示姓名 Display Name',
        '原始回答 Original Answer',
        '展示回答 Display Answer',
        '審核狀態 Status',
        '播放開關 Display Enabled',
        '精選 Featured',
        '授權版本 Consent Version',
        '提報時間 Submitted At',
      ];

      const csvRows = [headers.join(',')];
      items.forEach(item => {
        const row = [
          `"${item.id}"`,
          `"${item.source}"`,
          `"${item.type}"`,
          `"${(item.role_title || '').replace(/"/g, '""')}"`,
          `"${item.original_name.replace(/"/g, '""')}"`,
          `"${item.display_name.replace(/"/g, '""')}"`,
          `"${item.original_answer.replace(/"/g, '""')}"`,
          `"${(item.display_answer || '').replace(/"/g, '""')}"`,
          `"${item.status}"`,
          `"${item.display_enabled ? 'ON' : 'OFF'}"`,
          `"${item.featured ? 'YES' : 'NO'}"`,
          `"${item.consent_version}"`,
          `"${item.submitted_at}"`,
        ];
        csvRows.push(row.join(','));
      });

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="vis-2027-perspectives-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      stats,
      settings,
      campaign,
      items,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, patch, settingsPatch, actor = 'admin' } = body;

    // Display settings update (e.g. toggle emergency mode or change duration)
    if (settingsPatch) {
      const updatedSettings = await updateDisplaySettings(settingsPatch, actor);
      return NextResponse.json({ success: true, settings: updatedSettings });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 });
    }

    let payload: Partial<PerspectiveSubmission> = {};

    if (action === 'approve') {
      payload = { 
        status: 'approved', 
        display_enabled: true,
        ...(patch?.featured !== undefined ? { featured: Boolean(patch.featured) } : {}),
      };
    } else if (action === 'toggle_featured') {
      payload = { featured: Boolean(patch?.featured) };
    } else if (action === 'approve_only') {
      payload = { 
        status: 'approved', 
        display_enabled: false,
        ...(patch?.featured !== undefined ? { featured: Boolean(patch.featured) } : {}),
      };
    } else if (action === 'reject') {
      payload = { status: 'rejected', display_enabled: false, rejection_reason: patch?.rejection_reason || 'Not aligned' };
    } else if (action === 'toggle_display') {
      payload = { display_enabled: patch?.display_enabled };
    } else if (action === 'archive') {
      payload = { status: 'archived', display_enabled: false };
    } else if (action === 'withdraw') {
      payload = { withdrawn_at: new Date().toISOString(), display_enabled: false };
    } else if (action === 'edit') {
      payload = {
        display_name: patch?.display_name,
        display_answer: patch?.display_answer,
        role_title: patch?.role_title,
        type: patch?.type,
        display_order: patch?.display_order !== undefined ? patch.display_order : undefined,
        featured: patch?.featured !== undefined ? patch.featured : undefined,
      };
    } else {
      payload = patch || {};
    }

    const updated = await updateSubmission(id, payload, actor);
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// Create Editorial / Interview Entry (Section 10.3)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { source = 'EDITORIAL', type = 'vis_people', display_name, answer, role_title, display_order } = body;

    if (!display_name || !answer) {
      return NextResponse.json(
        { error: 'Name and Answer are required for Editorial Entry' },
        { status: 400 }
      );
    }

    const created = await createSubmission({
      source,
      type,
      display_name,
      answer,
      role_title,
      consent_display: true,
      consent_version: 'editorial-curated-2027',
    });

    if (display_order !== undefined) {
      await updateSubmission(created.id, { display_order: Number(display_order) });
    }

    return NextResponse.json({ success: true, item: created });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
