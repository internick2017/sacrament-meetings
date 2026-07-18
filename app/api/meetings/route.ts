import { NextRequest, NextResponse } from 'next/server';
import { getMeetings } from '@/lib/meetings-db';
import type { SacramentMeeting } from '@/lib/types';

export async function GET(request: NextRequest): Promise<NextResponse<SacramentMeeting[]>> {
  const date = request.nextUrl.searchParams.get('date') ?? undefined;
  const meetings = await getMeetings({ date });
  return NextResponse.json(meetings);
}
