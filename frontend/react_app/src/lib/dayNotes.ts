export interface DayNote {
  date: string;
  text: string;
  updated_at?: string;
}

export function dayNotesMap(notes: DayNote[]): Map<string, DayNote> {
  const map = new Map<string, DayNote>();
  for (const note of notes) {
    map.set(note.date, note);
  }
  return map;
}
