/*
* 2. UPDATE: app/api/notes/route.ts
* This file is updated to handle tags.
*/
import { NextResponse } from 'next/server';
import { notes } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid'; // Import the UUID generator

// GET handler remains the same
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ message: 'Email query parameter is required.' }, { status: 400 });
  }
  const userNotes = notes.get(email) || [];
  return NextResponse.json(userNotes, { status: 200 });
}

// POST handler now uses UUID for a guaranteed unique ID
export async function POST(request: Request) {
  const body = await request.json();
  const { email, encryptedNote, type, parentId, name, tags } = body;
  if (!email || !encryptedNote || !type || !name) {
    return NextResponse.json({ message: 'Email, encryptedNote, type, and name are required.' }, { status: 400 });
  }

  const userNotes = notes.get(email) || [];
  // FIX: Use uuidv4() to generate a robust, unique ID.
  const newNote = { ...encryptedNote, id: uuidv4(), type, parentId, name, tags };
  userNotes.push(newNote);
  notes.set(email, userNotes);

  return NextResponse.json(newNote, { status: 201 }); // Return the new note with its ID
}

// PUT handler for updating an existing note now handles tags
export async function PUT(request: Request) {
    const body = await request.json();
    const { email, noteId, encryptedNote, parentId, tags } = body;

    if (!email || !noteId) {
        return NextResponse.json({ message: 'Email and noteId are required.' }, { status: 400 });
    }

    const userNotes = notes.get(email) || [];
    const noteIndex = userNotes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
        return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }

    // Update the note in the array
    const updatedNote = { ...userNotes[noteIndex], ...encryptedNote };
    if (parentId !== undefined) {
        updatedNote.parentId = parentId;
    }
    if (tags) {
        updatedNote.tags = tags;
    }
    userNotes[noteIndex] = updatedNote;
    notes.set(email, userNotes);

    return NextResponse.json(updatedNote, { status: 200 });
}