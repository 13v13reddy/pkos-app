// app/components/CommandPalette.tsx
'use client';

import { Command } from 'cmdk';
import { useEffect, useState } from 'react';

interface CommandPaletteProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    notes: any[];
    onSelectNote: (note: any) => void;
    onNewNote: () => void;
}

export default function CommandPalette({ open, setOpen, notes, onSelectNote, onNewNote }: CommandPaletteProps) {
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(!open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [open, setOpen]);

    return (
        <Command.Dialog open={open} onOpenChange={setOpen} label="Command Menu">
            <Command.Input />
            <Command.List>
                <Command.Empty>No results found.</Command.Empty>

                <Command.Group heading="Notes">
                    {notes.map((note) => (
                        <Command.Item key={note.id} onSelect={() => onSelectNote(note)}>
                            {note.name}
                        </Command.Item>
                    ))}
                </Command.Group>

                <Command.Group heading="Actions">
                    <Command.Item onSelect={onNewNote}>New Note</Command.Item>
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
}