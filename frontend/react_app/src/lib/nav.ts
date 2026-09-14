export type FromState = { from?: string };

export function locationFrom(location: { pathname: string; search: string }): string {
  return `${location.pathname}${location.search}`;
}

export function backFromState(state: unknown, fallback = "/"): string {
  const from = (state as FromState | null)?.from;
  return from || fallback;
}

export function backLabel(path: string): string {
  if (path.startsWith("/calendar")) return "Календарь";
  return "Входящие";
}

export function newTodoPath(day?: string | null): string {
  return day ? `/todos/new?day=${day}` : "/todos/new";
}

export function newEventPath(day?: string | null): string {
  return day ? `/events/new?day=${day}` : "/events/new";
}

export function eventPath(id: number): string {
  return `/events/${id}`;
}
