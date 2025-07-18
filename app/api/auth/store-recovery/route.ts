// app/api/auth/store-recovery/route.ts

import { NextResponse } from 'next/server';
import { users } from '../../../../lib/db';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, hashes } = body;

    if (!email || !Array.isArray(hashes) || hashes.length === 0) {
      return NextResponse.json({ message: 'Email and recovery code hashes are required.' }, { status: 400 });
    }

    const user = users.get(email);

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Store the hashes on the user's record
    user.recoveryCodeHashes = hashes;
    users.set(email, user);

    console.log(`Stored ${hashes.length} recovery code hashes for ${email}.`);

    return NextResponse.json({ message: 'Recovery codes secured.' }, { status: 200 });

  } catch (error) {
    console.error('Store Recovery Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}