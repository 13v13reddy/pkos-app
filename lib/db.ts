/*
* 1. UPDATE: lib/db.ts 
* The structure remains the same, but it's important to remember 'id' will now be a UUID.
*/
import { EncryptedData } from './crypto';

// Add a unique ID to our note type
export interface Note extends EncryptedData {
  id: string; // This will now be a UUID string
}

declare global {
  var users: Map<string, { email: string; salt: string; recoveryCodeHashes?: string[] }>;
  var notes: Map<string, Note[]>; // The value is an array of 'Note' objects
}

const users = globalThis.users || new Map<string, { email: string; salt: string; recoveryCodeHashes?: string[] }>();
const notes = globalThis.notes || new Map<string, Note[]>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.users = users;
  globalThis.notes = notes;
}

export { users, notes };

