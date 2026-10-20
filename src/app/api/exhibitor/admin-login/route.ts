import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = [
  'artwithlifetaipei@gmail.com',
  'ameliecykuo@gmail.com',
  'amelie@theartpressasia.com',
  'visvipteam@gmail.com',
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail || !ADMIN_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json(
        { error: '權限不足：此信箱非 2027 VIS 授權之大會管理員帳號。' },
        { status: 403 }
      );
    }

    if (!password) {
      return NextResponse.json({ error: '請輸入管理員密碼' }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await sb.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.session) {
      const msg = error?.message === 'Invalid login credentials'
        ? '管理員密碼錯誤，請確認密碼或使用 Magic Link 免密登入。'
        : (error?.message || '登入失敗');
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      session: data.session,
      user: data.user,
    });
  } catch (err: any) {
    console.error('Admin login API error:', err);
    return NextResponse.json({ error: `伺服器連線異常: ${err.message || err}` }, { status: 500 });
  }
}
