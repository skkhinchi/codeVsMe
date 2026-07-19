import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
} from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html, htmlCompletionSource } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { Annotation, Compartment, EditorState, Prec } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { playgroundCompletionSources } from '../editor/completions';
import { createHtmlPathCompletions, htmlTagCompletions } from '../editor/htmlCompletions';
import type { EditorLanguage } from '../editor/languageMode';

export type CodeEditorHandle = {
  getCode: () => string;
};

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  lineWrap: boolean;
  onRun: (code: string) => void;
  canRun?: boolean;
  language?: EditorLanguage;
  /** Sibling file names in the current folder (for HTML src/href suggestions). */
  siblingFiles?: string[];
};

const wrapCompartment = new Compartment();
const languageCompartment = new Compartment();
const completionCompartment = new Compartment();
/** Marks doc updates that came from React props, not user typing. */
const ExternalSync = Annotation.define<boolean>();

const editorKeymap = defaultKeymap.filter((binding) => binding.key !== 'Mod-Enter');

const completionTrigger = EditorView.inputHandler.of((view, _from, _to, text) => {
  if (text === '.' || text === '<' || text === '"' || text === "'") {
    requestAnimationFrame(() => startCompletion(view));
  }
  return false;
});

function languageExtensions(language: EditorLanguage) {
  if (language === 'html') return [html()];
  if (language === 'css') return [css()];
  if (language === 'javascript') return [javascript()];
  return [];
}

function completionExtensions(language: EditorLanguage, getSiblingFiles: () => string[]) {
  if (language === 'html') {
    return [
      autocompletion({
        activateOnTyping: true,
        activateOnTypingDelay: 0,
        override: [
          createHtmlPathCompletions({ getSiblingFiles }),
          htmlTagCompletions,
          htmlCompletionSource,
        ],
      }),
    ];
  }

  if (language === 'css') {
    return [
      autocompletion({
        activateOnTyping: true,
        activateOnTypingDelay: 0,
      }),
    ];
  }

  if (language === 'javascript') {
    return [
      autocompletion({
        activateOnTyping: true,
        activateOnTypingDelay: 0,
        override: playgroundCompletionSources,
      }),
    ];
  }

  return [autocompletion({ activateOnTyping: true })];
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, lineWrap, onRun, canRun = true, language = 'javascript', siblingFiles = [] },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const canRunRef = useRef(canRun);
  const siblingFilesRef = useRef(siblingFiles);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  canRunRef.current = canRun;
  siblingFilesRef.current = siblingFiles;

  useImperativeHandle(ref, () => ({
    getCode: () => viewRef.current?.state.doc.toString() ?? value,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const getSiblingFiles = () => siblingFilesRef.current;

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          languageCompartment.of(languageExtensions(language)),
          oneDark,
          closeBrackets(),
          completionCompartment.of(completionExtensions(language, getSiblingFiles)),
          completionTrigger,
          wrapCompartment.of(lineWrap ? EditorView.lineWrapping : []),
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-Enter',
                run: (editorView) => {
                  if (!canRunRef.current) return true;
                  onRunRef.current(editorView.state.doc.toString());
                  return true;
                },
              },
            ]),
          ),
          keymap.of([...completionKeymap, ...closeBracketsKeymap, ...editorKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const fromExternal = update.transactions.some((tr) => tr.annotation(ExternalSync));
            if (fromExternal) return;
            onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once; language/completions reconfigured below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        annotations: ExternalSync.of(true),
      });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: wrapCompartment.reconfigure(lineWrap ? EditorView.lineWrapping : []),
    });
  }, [lineWrap]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const getSiblingFiles = () => siblingFilesRef.current;
    view.dispatch({
      effects: [
        languageCompartment.reconfigure(languageExtensions(language)),
        completionCompartment.reconfigure(completionExtensions(language, getSiblingFiles)),
      ],
    });
  }, [language]);

  return <div ref={containerRef} className="code-editor" role="region" aria-label="Code editor" />;
});
