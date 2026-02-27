/**
 * Merge new note into existing notes
 * - Do NOT append if new note already exists
 * - Append only when new note is different
 * - Safe for null / undefined
 */
export function mergeNotes(existingNotes?: string | null, newNote?: string | null): string {
  const note = (newNote ?? '').trim();
  const existing = (existingNotes ?? '').trim();

  // Không có note mới > giữ nguyên
  if (!note) {
    return existing;
  }

  // Chưa có note cũ > dùng note mới
  if (!existing) {
    return note;
  }

  // Normalize để so sánh
  const normalizedNew = note.toLowerCase();
  const normalizedExisting = existing.toLowerCase();

  // Nếu note mới đã tồn tại > không append
  if (normalizedExisting.includes(normalizedNew)) {
    return existing;
  }

  // Append note mới lên đầu
  return `${note}, ${existing}`;
}
