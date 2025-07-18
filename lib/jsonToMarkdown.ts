// lib/jsonToMarkdown.ts

import { EditorJSON } from '../app/components/BlockEditor';

// This function recursively traverses the TipTap JSON structure and converts it to Markdown.
export function convertJsonToMarkdown(json: EditorJSON): string {
  let markdown = '';

  const recurse = (node: any) => {
    switch (node.type) {
      case 'doc':
        node.content.forEach((contentNode: any, index: number) => {
          recurse(contentNode);
          if (index < node.content.length - 1) {
            markdown += '\n\n'; // Add space between top-level blocks
          }
        });
        break;

      case 'heading':
        const level = node.attrs.level;
        markdown += '#'.repeat(level) + ' ';
        if (node.content) node.content.forEach(recurse);
        break;

      case 'paragraph':
        if (node.content) node.content.forEach(recurse);
        break;

      case 'bulletList':
        node.content.forEach((listItem: any) => {
          markdown += '* ';
          recurse(listItem);
          markdown += '\n';
        });
        break;
      
      case 'blockquote':
        markdown += '> ';
        if (node.content) node.content.forEach(recurse);
        break;

      case 'listItem':
        if (node.content) node.content.forEach(recurse);
        break;

      case 'text':
        markdown += node.text;
        break;
      
      default:
        // For any other node types, just try to process their content
        if (node.content) node.content.forEach(recurse);
        break;
    }
  };

  recurse(json);
  return markdown.trim();
}