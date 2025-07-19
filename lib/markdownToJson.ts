// lib/markdownToJson.ts

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
// FIX: Import specific languages to register
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml'; // xml is used for html
import python from 'highlight.js/lib/languages/python';

const lowlight = createLowlight();

// FIX: Register the languages
lowlight.register('css', css);
lowlight.register('javascript', js);
lowlight.register('typescript', ts);
lowlight.register('html', html);
lowlight.register('python', python);

export const convertMarkdownToJson = (markdown: string) => {
  const editor = new Editor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: markdown,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert invisible',
      },
    },
  });

  const json = editor.getJSON();
  editor.destroy();
  return json;
};