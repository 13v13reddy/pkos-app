// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useMemo, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import dynamic from 'next/dynamic';
import Fuse from 'fuse.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { EditorJSON } from '../components/BlockEditor';
import { convertJsonToMarkdown } from '../../lib/jsonToMarkdown';
import { convertMarkdownToJson } from '../../lib/markdownToJson';
import CommandPalette from '../components/CommandPalette';

// --- Icon Components ---
const MenuIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const NewNoteIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const FolderIcon = ({ className = "" }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);


const NoteIcon = ({ className = "" }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const AiIcon = ({ className = "" }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const ExportIcon = ({ className = "" }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ImportIcon = ({ className = "" }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const MoveIcon = ({ className = "" }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);


// --- Type Definitions ---
interface Note {
    id: string;
    ciphertext: string;
    iv: string;
    type: 'note' | 'folder';
    parentId: string | null;
    name: string;
    tags?: string[];
}

interface SearchableNote {
    id: string;
    content: string;
    jsonContent: EditorJSON;
    originalNote: Note;
    type: 'note' | 'folder';
    parentId: string | null;
    name: string;
    tags?: string[];
}

const BlockEditor = dynamic(() => import('../components/BlockEditor'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        </div>
    )
});

const emptyNoteJSON: EditorJSON = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
};

const getPlainTextFromJSON = (json: EditorJSON): string => {
    let text = '';
    const recurse = (node: any) => {
        if (node.type === 'text') text += node.text;
        if (node.content) {
            node.content.forEach(recurse);
            text += ' ';
        }
    };
    if (json && json.content) json.content.forEach(recurse);
    return text.trim();
};

export default function DashboardPage() {
    const { sessionKey, userEmail, logout, encrypt, decrypt } = useAuth();
    const router = useRouter();

    const [noteContent, setNoteContent] = useState<EditorJSON>(emptyNoteJSON);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [noteList, setNoteList] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [decryptedNotes, setDecryptedNotes] = useState<SearchableNote[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
    const [moveNote, setMoveNote] = useState<SearchableNote | null>(null);
    const [backlinks, setBacklinks] = useState<SearchableNote[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    const fuse = useMemo(() => new Fuse(decryptedNotes, {
        keys: ['name', 'content'],
        includeScore: true,
        threshold: 0.4,
        minMatchCharLength: 2
    }), [decryptedNotes]);

    const searchResults = searchQuery
        ? fuse.search(searchQuery).map(result => result.item)
        : activeTag
            ? decryptedNotes.filter(note => note.tags?.includes(activeTag))
            : decryptedNotes.filter(note => note.parentId === currentFolder);

    const breadcrumbs = useMemo(() => {
        const path = [];
        let folderId = currentFolder;
        while (folderId) {
            const folder = decryptedNotes.find(note => note.id === folderId);
            if (folder) {
                path.unshift(folder);
                folderId = folder.parentId;
            } else {
                folderId = null;
            }
        }
        return path;
    }, [currentFolder, decryptedNotes]);


    useEffect(() => {
        if (!sessionKey || !userEmail || !decrypt) {
            if (!sessionKey) router.push('/login');
            return;
        }

        const fetchAndDecryptNotes = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/notes?email=${encodeURIComponent(userEmail)}`);
                if (!response.ok) throw new Error('Failed to fetch notes.');
                const encryptedNotes: Note[] = await response.json();
                setNoteList(encryptedNotes);

                const decrypted = await Promise.all(encryptedNotes.map(async (note) => {
                    const stringifiedJSON = await decrypt(note);
                    const jsonContent = JSON.parse(stringifiedJSON || '{}') as EditorJSON;
                    const content = getPlainTextFromJSON(jsonContent);
                    return { ...note, content, jsonContent, originalNote: note };
                }));

                setDecryptedNotes(decrypted);

                const allTags = decrypted.reduce((acc, note) => {
                    note.tags?.forEach(tag => {
                        if (!acc.includes(tag)) {
                            acc.push(tag);
                        }
                    });
                    return acc;
                }, [] as string[]);
                setTags(allTags);
            } catch (error: any) {
                setMessage(`Error: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndDecryptNotes();
    }, [sessionKey, userEmail, router, decrypt]);

    useEffect(() => {
        if (activeNote) {
            const links = decryptedNotes.filter(note => note.content.includes(`[[${activeNote.name}]]`));
            setBacklinks(links);
        } else {
            setBacklinks([]);
        }
    }, [activeNote, decryptedNotes]);


    const handleSaveNote = async () => {
        const plainText = getPlainTextFromJSON(noteContent);
        if (!plainText) {
            setMessage('Cannot save an empty note.');
            return;
        }
        if (!encrypt || !userEmail) return;

        setMessage('Encrypting and saving...');
        const stringifiedJSON = JSON.stringify(noteContent);
        const encryptedData = await encrypt(stringifiedJSON);
        if (!encryptedData) {
            setMessage('Encryption failed.');
            return;
        }

        const noteTags = plainText.match(/#(\w+)/g)?.map(t => t.substring(1)) || [];

        try {
            let response;
            let savedNote: Note;

            if (activeNote) {
                response = await fetch('/api/notes', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, noteId: activeNote.id, encryptedNote: { ...encryptedData, name: plainText.substring(0, 30) }, tags: noteTags }),
                });
                savedNote = await response.json();
                setNoteList(noteList.map(n => n.id === savedNote.id ? savedNote : n));
                setDecryptedNotes(decryptedNotes.map(n => n.id === savedNote.id ? {
                    ...savedNote,
                    content: plainText,
                    jsonContent: noteContent,
                    originalNote: savedNote,
                    tags: noteTags
                } : n));
            } else {
                response = await fetch('/api/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, encryptedNote: encryptedData, type: 'note', parentId: currentFolder, name: plainText.substring(0, 30), tags: noteTags }),
                });
                savedNote = await response.json();
                setNoteList([...noteList, savedNote]);
                setDecryptedNotes([...decryptedNotes, {
                    ...savedNote,
                    content: plainText,
                    jsonContent: noteContent,
                    originalNote: savedNote,
                    tags: noteTags
                }]);
            }

            if (!response.ok) throw new Error('Failed to save note to server.');

            setActiveNote(savedNote);
            setMessage('Note saved successfully!');
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const handleNoteSelect = (noteToSelect: SearchableNote) => {
        if (noteToSelect.type === 'folder') {
            setCurrentFolder(noteToSelect.id);
        } else {
            setNoteContent(noteToSelect.jsonContent);
            setActiveNote(noteToSelect.originalNote);
        }
        setSearchQuery('');
        setAiSummary('');
        setIsSidebarOpen(false);
        setMessage('Note loaded.');
    };

    const handleNewNote = () => {
        setActiveNote(null);
        setNoteContent(emptyNoteJSON);
        setAiSummary('');
        setIsSidebarOpen(false);
        setMessage('Started a new note.');
    };

    const handleNewFolder = async () => {
        const folderName = prompt('Enter folder name:');
        if (!folderName || !encrypt || !userEmail) return;

        const encryptedData = await encrypt(JSON.stringify(emptyNoteJSON));
        if (!encryptedData) return;

        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, encryptedNote: encryptedData, type: 'folder', parentId: currentFolder, name: folderName }),
        });
        const newFolder = await response.json();
        setNoteList([...noteList, newFolder]);
        setDecryptedNotes([...decryptedNotes, {
            ...newFolder,
            content: '',
            jsonContent: emptyNoteJSON,
            originalNote: newFolder
        }]);
    };


    const handleSummarize = async () => {
        if (!noteContent) return;
        setIsAiLoading(true);
        setAiSummary('');
        const textForAi = getPlainTextFromJSON(noteContent);
        if (!textForAi) {
            setMessage('Note is empty, nothing to summarize.');
            setIsAiLoading(false);
            return;
        }
        try {
            const response = await fetch('/api/ai/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textContent: textForAi })
            });
            if (!response.ok) throw new Error('AI service failed.');
            const data = await response.json();
            setAiSummary(data.summary);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleExport = () => {
        if (decryptedNotes.length === 0) {
            setMessage('No notes to export.');
            return;
        }
        setMessage('Preparing export...');
        const zip = new JSZip();

        decryptedNotes.forEach(note => {
            const markdownContent = convertJsonToMarkdown(note.jsonContent);
            const title = (note.name || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            zip.file(`${title}_${note.id.substring(0, 8)}.md`, markdownContent);
        });

        zip.generateAsync({ type: 'blob' })
            .then(function (content) {
                saveAs(content, 'pkos_export.zip');
                setMessage('Export complete!');
            });
    };

    const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const markdown = e.target?.result as string;
            const jsonContent = convertMarkdownToJson(markdown);
            setNoteContent(jsonContent);
            setActiveNote(null);
            setMessage('Note imported. Save to add to your list.');
        };
        reader.readAsText(file);
    };

    const handleMoveNote = async (note: SearchableNote, newParentId: string | null) => {
        if (!userEmail) return;

        const response = await fetch('/api/notes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, noteId: note.id, parentId: newParentId }),
        });

        if (response.ok) {
            const updatedNote = await response.json();
            setNoteList(noteList.map(n => n.id === updatedNote.id ? updatedNote : n));
            setDecryptedNotes(decryptedNotes.map(n => n.id === updatedNote.id ? { ...n, parentId: newParentId } : n));
            setMoveNote(null);
        } else {
            setMessage('Failed to move note.');
        }
    };

    const handleWikiLinkClick = (noteName: string) => {
        const linkedNote = decryptedNotes.find(n => n.name === noteName);
        if (linkedNote) {
            handleNoteSelect(linkedNote);
        } else {
            handleNewNote();
            setNoteContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: noteName }] }] });
        }
    };


    if (!sessionKey) return null;

    return (
        <div className="relative h-screen overflow-hidden bg-gray-50 md:flex">
            <CommandPalette
                open={commandPaletteOpen}
                setOpen={setCommandPaletteOpen}
                notes={decryptedNotes.filter(n => n.type === 'note')}
                onSelectNote={handleNoteSelect}
                onNewNote={handleNewNote}
            />

            {/* Move Note Modal */}
            {moveNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl w-96">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-medium">Move "{moveNote.name}"</h3>
                        </div>
                        <div className="p-4 max-h-64 overflow-y-auto">
                            <ul>
                                <li
                                    onClick={() => handleMoveNote(moveNote, null)}
                                    className="p-2 rounded-lg cursor-pointer hover:bg-gray-100"
                                >
                                    Root
                                </li>
                                {decryptedNotes.filter(n => n.type === 'folder' && n.id !== moveNote.id).map(folder => (
                                    <li
                                        key={folder.id}
                                        onClick={() => handleMoveNote(moveNote, folder.id)}
                                        className="p-2 rounded-lg cursor-pointer hover:bg-gray-100"
                                    >
                                        {folder.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 border-t">
                            <button onClick={() => setMoveNote(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile sidebar overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-80 bg-white shadow-xl transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">My Notes</h2>
                        <div className="flex items-center">
                            <button
                                onClick={handleNewFolder}
                                className="flex items-center justify-center p-2 mr-2 text-white transition-all bg-green-600 rounded-lg hover:bg-green-700 active:scale-95"
                                title="New Folder"
                            >
                                <FolderIcon />
                            </button>
                            <button
                                onClick={handleNewNote}
                                className="flex items-center justify-center p-2 text-white transition-all bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-95"
                                title="New Note"
                            >
                                <NewNoteIcon />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notes..."
                            className="w-full px-4 py-2 pl-10 text-sm border rounded-lg bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Tags */}
                    <div className="p-2 text-sm text-gray-500">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                onClick={() => setActiveTag(tag)}
                                className={`inline-block px-2 py-1 mr-2 mb-2 rounded-full cursor-pointer ${activeTag === tag ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>

                    {/* Breadcrumbs */}
                    <div className="p-2 text-sm text-gray-500">
                        <span onClick={() => setCurrentFolder(null)} className="cursor-pointer hover:underline">Root</span>
                        {breadcrumbs.map(folder => (
                            <span key={folder.id}>
                                {' / '}
                                <span onClick={() => setCurrentFolder(folder.id)} className="cursor-pointer hover:underline">
                                    {folder.name}
                                </span>
                            </span>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="p-3 rounded-lg animate-pulse bg-gray-100">
                                    <div className="w-3/4 h-4 mb-2 bg-gray-200 rounded"></div>
                                    <div className="w-full h-3 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ul className="p-2 space-y-1">
                            {searchResults.length > 0 ? (
                                searchResults.map((note) => (
                                    <li
                                        key={note.id}
                                        onClick={() => handleNoteSelect(note)}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${activeNote?.id === note.id
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start">
                                            <div className={`p-1 mr-3 rounded-md ${activeNote?.id === note.id
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {note.type === 'folder' ? <FolderIcon /> : <NoteIcon />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">
                                                    {note.name || "Untitled"}
                                                </p>
                                                {note.type === 'note' &&
                                                    <p className="text-sm text-gray-500 truncate">
                                                        {note.content.substring(30, 90) || "No additional content"}
                                                    </p>
                                                }
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setMoveNote(note); }} className="p-1 rounded-md hover:bg-gray-200">
                                            <MoveIcon />
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="p-3 mx-auto mb-3 rounded-full bg-gray-100 w-max">
                                        <NoteIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500">No notes found</p>
                                    <button
                                        onClick={handleNewNote}
                                        className="px-4 py-2 mt-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                    >
                                        Create your first note
                                    </button>
                                </div>
                            )}
                        </ul>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 md:px-6">
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-1 mr-2 text-gray-500 rounded-md hover:bg-gray-100 md:hidden"
                        >
                            <MenuIcon />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800">PKOS Editor</h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        <label className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                            <ImportIcon className="mr-2" />
                            <span className="hidden sm:inline">Import</span>
                            <input type="file" className="hidden" accept=".md" onChange={handleImport} />
                        </label>
                        <button
                            onClick={handleExport}
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            <ExportIcon className="mr-2" />
                            <span className="hidden sm:inline">Export All</span>
                        </button>
                        <div className="hidden px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-full sm:block">
                            {userEmail}
                        </div>
                        <button
                            onClick={logout}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Editor area */}
                <main className="flex-1 overflow-auto bg-white">
                    <div className="flex flex-col h-full">
                        {/* Editor */}
                        <div className="flex-1 overflow-auto">
                            <BlockEditor
                                content={noteContent}
                                onChange={setNoteContent}
                                onWikiLinkClick={handleWikiLinkClick}
                            />
                        </div>

                        {/* AI Summary */}
                        {aiSummary && (
                            <div className="p-4 mx-4 mt-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <div className="p-1 mr-2 bg-blue-100 rounded-full">
                                        <AiIcon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="font-medium text-blue-800">AI Summary</h3>
                                </div>
                                <p className="text-sm text-blue-700">{aiSummary}</p>
                            </div>
                        )}

                        {/* Backlinks */}
                        {backlinks.length > 0 && (
                            <div className="p-4 mx-4 mt-4 bg-gray-50 border-l-4 border-gray-400 rounded-lg">
                                <h3 className="font-medium text-gray-800">Backlinks</h3>
                                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                    {backlinks.map(link => (
                                        <li key={link.id} onClick={() => handleNoteSelect(link)} className="cursor-pointer hover:underline">
                                            {link.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Status message */}
                        {message && (
                            <div className="px-4 py-2 mx-4 mt-2 text-sm text-gray-600 bg-gray-100 rounded-lg">
                                {message}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={handleSaveNote}
                                    className="flex-1 px-4 py-2 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                                >
                                    Save Note
                                </button>
                                <button
                                    onClick={handleSummarize}
                                    disabled={isAiLoading || !activeNote}
                                    className="flex items-center justify-center flex-1 px-4 py-2 font-medium text-white transition-colors bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed"
                                >
                                    <AiIcon className="mr-2" />
                                    {isAiLoading ? 'Summarizing...' : 'Summarize'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}