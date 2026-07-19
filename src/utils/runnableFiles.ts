/** File types the playground can execute / preview. */
export function isRunnableJavaScriptFile(fileName: string | null | undefined): boolean {
  if (!fileName) return false;
  return /\.js$/i.test(fileName.trim());
}

export function isHtmlFile(fileName: string | null | undefined): boolean {
  if (!fileName) return false;
  return /\.html?$/i.test(fileName.trim());
}

export function isCssFile(fileName: string | null | undefined): boolean {
  if (!fileName) return false;
  return /\.css$/i.test(fileName.trim());
}

export function isWebPreviewFile(fileName: string | null | undefined): boolean {
  return isHtmlFile(fileName) || isCssFile(fileName);
}

export function isRunnableFile(fileName: string | null | undefined): boolean {
  return isRunnableJavaScriptFile(fileName) || isWebPreviewFile(fileName);
}
