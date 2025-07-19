// app/components/BlockEditor.tsx
'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FC, useEffect, useState } from 'react';
import isEqual from 'lodash.isequal';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml';
import python from 'highlight.js/lib/languages/python';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';

const lowlight = createLowlight();

lowlight.register('css', css);
lowlight.register('javascript', js);
lowlight.register('typescript', ts);
lowlight.register('html', html);
lowlight.register('python', python);

const WikiLink = Link.extend({
  inclusive: false,
  parseHTML() {
    return [{ tag: 'a[data-type="wiki-link"]' }];
  },
});

const Tag = Mention.extend({
  name: 'tag',
  parseHTML() {
    return [{ tag: `span[data-type="${this.name}"]` }];
  },
  addAttributes() {
    return {
      id: {
        default: null,
        // FIX: Added explicit types for element and attributes
        parseHTML: (element: HTMLElement) => element.getAttribute('data-id'),
        renderHTML: (attributes: any) => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
    };
  },
}).configure({
  HTMLAttributes: {
    class: 'tag',
  },
  suggestion: {
    char: '#',
    startOfLine: false,
  },
});

export type EditorJSON = {
  type: 'doc';
  content: any[];
};

const Toolbar: FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) return null;
  // Toolbar implementation remains the same...
  return (
    <div className="flex flex-wrap items-center gap-4 p-2 mb-2 border-b bg-gray-50 rounded-t-md">
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>H2</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded ${editor.isActive('bulletList') ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>List</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded ${editor.isActive('orderedList') ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>Numbered List</button>
      <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`px-2 py-1 rounded ${editor.isActive('taskList') ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>Checklist</button>
      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`px-2 py-1 rounded ${editor.isActive('codeBlock') ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>Code</button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-2 py-1 rounded ${editor.isActive('blockquote') ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}>Quote</button>
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="px-2 py-1 rounded bg-gray-200">Divider</button>
    </div>
  );
};

interface BlockEditorProps {
  content: EditorJSON | string;
  onChange: (content: EditorJSON) => void;
  onWikiLinkClick: (href: string) => void;
}

const BlockEditor: FC<BlockEditorProps> = ({ content, onChange, onWikiLinkClick }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      WikiLink.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          'data-type': 'wiki-link',
          class: 'wiki-link',
        },
      }),
      Tag,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as EditorJSON);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none',
      },
      handleClickOn: (view, pos, node, nodePos, event, direct) => {
        if (event.target instanceof HTMLAnchorElement && event.target.dataset.type === 'wiki-link') {
          onWikiLinkClick(event.target.innerText);
          return true;
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) {
      const editorContent = editor.getJSON();
      if (!isEqual(editorContent, content)) {
        editor.commands.setContent(content, { emitUpdate: false });
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