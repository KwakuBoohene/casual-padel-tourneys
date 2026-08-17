export function standingsPageSize(width: number, height: number): number {
  const rowHeight = 52;
  const chrome = height < 720 ? 340 : 300;
  const fit = Math.floor((height - chrome) / rowHeight);
  const cap = width < 768 ? 8 : width < 1024 ? 12 : 16;
  return Math.min(cap, Math.max(5, fit));
}

export function standingsPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(total, 1) / pageSize));
}

export function standingsPageRange(
  total: number,
  pageIndex: number,
  pageSize: number
): { start: number; end: number } {
  const start = pageIndex * pageSize;
  return { start, end: Math.min(start + pageSize, total) };
}
