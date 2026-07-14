/** Only plain `.js` files are executable in the playground runner. */
export function isRunnableJavaScriptFile(fileName: string | null | undefined): boolean {
  if (!fileName) return false;
  return /\.js$/i.test(fileName.trim());
}
