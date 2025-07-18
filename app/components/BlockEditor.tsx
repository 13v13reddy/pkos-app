// app/components/BlockEditor.tsx
'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FC, useEffect } from 'react'; // 1. Import useEffect
import isEqual from 'lodash.isequal'; // 2. We'll use this for a reliable comparison

// Define the type for the JSON content
export type EditorJSON = {
  type: 'doc';
  content: any[];
};

// --- A simple toolbar for the editor ---
const Toolbar: FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 p-2 mb-2 border-b bg-gray-50 rounded-t-md">
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>H2</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded ${editor.isActive('bulletList') ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>List</button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 py-1 rounded ${editor.isActive('blockquote') ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>Quote</button>
    </div>
  );
};

// --- The Main Editor Component ---
interface BlockEditorProps {
  content: EditorJSON | string;
  onChange: (content: EditorJSON) => void;
}

const BlockEditor: FC<BlockEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // You can configure the extensions here if needed
      }),
    ],
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as EditorJSON);
    },
    content: content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none',
      },
    },
    immediatelyRender: false,
  });
  
  // 3. This new useEffect hook listens for changes to the `content` prop.
  useEffect(() => {
    if (editor) {
      const editorContent = editor.getJSON();
      // Only update the editor if the new content from the prop is actually different
      // from what's currently in the editor. This prevents an infinite loop.
      if (!isEqual(editorContent, content)) {
        editor.commands.setContent(content, { emitUpdate: false }); // prevents the `onUpdate` callback from firing
      }
    }
  }, [content, editor]);


  return (
    <div className="relative flex flex-col w-full h-full border border-gray-300 rounded-md">
      <Toolbar editor={editor} />
      <div className="flex-grow overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default BlockEditor;
