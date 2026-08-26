export function avatarColor(id: number): string {
  return `hsl(${(id * 137) % 360} 60% 42%)`;
}

export function formatTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
