// app/api/auth/register/route.ts

import { NextResponse } from 'next/server';
import { users } from '../../../../lib/db'; // <-- Import from the new file

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, salt } = body;

    if (!email || !salt) {
      return NextResponse.json({ message: 'Email and salt are required.' }, { status: 400 });
    }

    if (users.has(email)) {
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
    }

    users.set(email, { email, salt });
    console.log('Registered Users:', Array.from(users.values()));

    return NextResponse.json({ message: 'User registered successfully.' }, { status: 201 });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}