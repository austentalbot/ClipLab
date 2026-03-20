export function getClipFileUrl(filename: string): string {
  return `/uploads/${encodeURIComponent(filename)}`;
}
