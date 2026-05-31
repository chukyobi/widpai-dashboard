import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query('SELECT * FROM app_settings LIMIT 1');
    if (res.rows.length === 0) {
      await query('INSERT INTO app_settings (id, is_closed, no_shillings) VALUES (1, false, false) ON CONFLICT DO NOTHING');
      return NextResponse.json({ is_closed: false, no_shillings: false });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err) {
    console.error('Failed to get settings:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    if (typeof body.is_closed === 'boolean') {
      await query('UPDATE app_settings SET is_closed = $1, updated_at = NOW() WHERE id = 1', [body.is_closed]);
    }
    
    if (typeof body.no_shillings === 'boolean') {
      await query('UPDATE app_settings SET no_shillings = $1, updated_at = NOW() WHERE id = 1', [body.no_shillings]);
    }

    const res = await query('SELECT * FROM app_settings LIMIT 1');
    return NextResponse.json(res.rows[0]);
  } catch (err) {
    console.error('Failed to update settings:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
