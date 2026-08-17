/** Rows are ~48dp plus list gap; chrome covers title, tabs, merge, pager, and back. */
export function playerListPageSize(width: number, height: number): number {
  const rowHeight = 60;
  const chrome = height < 720 ? 380 : 340;
  const fit = Math.floor((height - chrome) / rowHeight);
  const cap = width < 768 ? 6 : width < 1024 ? 10 : 14;
  return Math.min(cap, Math.max(4, fit));
}
