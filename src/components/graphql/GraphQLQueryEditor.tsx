/**
 * GraphQLQueryEditor — Monaco-based GraphQL query editor.
 *
 * We deliberately use Monaco (same instance the rest of the app uses
 * for raw bodies / response viewer) so the theme matches and there is
 * exactly one editor flavour in the product. Monaco doesn't ship with
 * a GraphQL language out of the box, so we register a small Monarch
 * tokeniser on first mount. The Monarch grammar handles:
 *
 *    • Keywords (query / mutation / subscription / fragment / on / etc.)
 *    • String / number / variable / directive / comment tokens
 *    • Type literals (`ID!`, `[String]`) for proper colouring inside
 *      operation argument blocks.
 *
 * Schema-aware autocomplete is intentionally out-of-scope for this
 * editor — the user has the inline Docs side-panel (and the AI Build
 * flow) for guided composition. If we later want IntelliSense it
 * lives behind `monaco-graphql`, but we don't want to ship that
 * extra ~600KB right now.
 *
 * Imperative API:
 *   insertAtCursor(text)  — used by the Docs panel click-to-insert
 *                           and the right-rail AI Builder.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { IntrospectionQuery } from 'graphql';
import { MonacoEditor, type MonacoEditorHandle } from '@/components/editor/MonacoEditor';

export interface GraphQLQueryEditorHandle {
  insertAtCursor: (text: string) => void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Currently unused — kept on the signature so future schema-aware
   *  IntelliSense can hook in without changing every call-site. */
  introspection?: IntrospectionQuery | null;
  testId?: string;
}

let _graphqlRegistered = false;
const ensureGraphqlMonacoLanguage = (monaco: any) => {
  if (_graphqlRegistered) return;
  if (!monaco?.languages) return;
  // If anybody else (e.g. a future monaco-graphql install) already
  // registered the language, don't clobber it.
  const known = monaco.languages.getLanguages?.().some((l: any) => l.id === 'graphql');
  if (!known) {
    monaco.languages.register({ id: 'graphql' });
    monaco.languages.setMonarchTokensProvider('graphql', {
      defaultToken: '',
      keywords: ['query', 'mutation', 'subscription', 'fragment', 'on', 'true', 'false', 'null', 'enum', 'type', 'input', 'interface', 'union', 'scalar', 'schema', 'directive', 'extend', 'implements', 'repeatable'],
      tokenizer: {
        root: [
          [/#.*$/, 'comment'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/\$[A-Za-z_][\w]*/, 'variable'],
          [/@[A-Za-z_][\w]*/, 'annotation'],
          [/-?\d+(\.\d+)?/, 'number'],
          [/[{}()[\]:,!]/, 'delimiter'],
          [/[A-Z][\w]*/, 'type'],
          [/[a-z_][\w]*/, {
            cases: { '@keywords': 'keyword', '@default': 'identifier' },
          }],
        ],
      },
    });
    monaco.languages.setLanguageConfiguration('graphql', {
      comments: { lineComment: '#' },
      brackets: [['{', '}'], ['(', ')'], ['[', ']']],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '"', close: '"' },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '"', close: '"' },
      ],
    });
  }
  _graphqlRegistered = true;
};

export const GraphQLQueryEditor = forwardRef<GraphQLQueryEditorHandle, Props>(
  ({ value, onChange, testId }, ref) => {
    const monacoRef = useRef<MonacoEditorHandle>(null);

    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        const editor = monacoRef.current?.getEditor?.();
        if (!editor) {
          // Editor not mounted yet — append and let onChange flow.
          onChange(value + (value.endsWith('\n') ? '' : '\n') + text);
          return;
        }
        const selection = editor.getSelection() ?? editor.getModel()?.getFullModelRange();
        if (!selection) {
          // Defensive — should never happen since the model exists when
          // the editor is mounted, but bail rather than crash.
          onChange(value + text);
          return;
        }
        editor.executeEdits('graphql-insert', [{ range: selection, text, forceMoveMarkers: true }]);
        editor.focus();
      },
    }), [value, onChange]);

    return (
      <MonacoEditor
        ref={monacoRef}
        value={value}
        onChange={onChange}
        language="graphql"
        testId={testId}
        onMount={(_editor, monaco) => ensureGraphqlMonacoLanguage(monaco)}
        placeholder={'# Write your GraphQL operation here\nquery {\n  \n}'}
      />
    );
  },
);
GraphQLQueryEditor.displayName = 'GraphQLQueryEditor';
