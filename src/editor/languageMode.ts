import { isCssFile, isHtmlFile, isRunnableJavaScriptFile } from '../utils/runnableFiles';

export type EditorLanguage = 'javascript' | 'html' | 'css' | 'plaintext';

export function languageFromFileName(fileName: string | null | undefined): EditorLanguage {
  if (!fileName) return 'javascript';
  if (isHtmlFile(fileName)) return 'html';
  if (isCssFile(fileName)) return 'css';
  if (isRunnableJavaScriptFile(fileName) || /\.[cm]?jsx?$/i.test(fileName) || /\.ts$/i.test(fileName)) {
    return 'javascript';
  }
  return 'plaintext';
}
