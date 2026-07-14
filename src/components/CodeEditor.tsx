import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
} from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { Annotation, Compartment, EditorState, Prec } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { playgroundCompletionSources } from '../editor/completions';

export type CodeEditorHandle = {
  getCode: () => string;
};

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  lineWrap: boolean;
  onRun: (code: string) => void;
  canRun?: boolean;
};

const wrapCompartment = new Compartment();
/** Marks doc updates that came from React props, not user typing. */
const ExternalSync = Annotation.define<boolean>();

const editorKeymap = defaultKeymap.filter((binding) => binding.key !== 'Mod-Enter');

/** Open the completion menu right after typing `.` (e.g. console.). */
const dotCompletionTrigger = EditorView.inputHandler.of((view, _from, _to, text) => {
  if (text === '.') {
    requestAnimationFrame(() => startCompletion(view));
  }
  return false;
});

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, lineWrap, onRun, canRun = true },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const canRunRef = useRef(canRun);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  canRunRef.current = canRun;

  useImperativeHandle(ref, () => ({
    getCode: () => viewRef.current?.state.doc.toString() ?? value,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          javascript(),
          oneDark,
          closeBrackets(),
          autocompletion({
            activateOnTyping: true,
            activateOnTypingDelay: 0,
            override: playgroundCompletionSources,
          }),
          dotCompletionTrigger,
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

  return <div ref={containerRef} className="code-editor" />;
});
