export const convertDateToISO = (input: string): string | null => {
  if (!input) return null;

  const [datePart, timePart] = input.trim().split(' ');

  const [day, month, year] = datePart.split('.').map(Number);
  if (!day || !month || !year) return null;

  let hours = 0,
    minutes = 0,
    seconds = 0;

  if (timePart) {
    const [h, m, s] = timePart.split(':').map(Number);
    hours = h ?? 0;
    minutes = m ?? 0;
    seconds = s ?? 0;
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);

  if (isNaN(date.getTime())) return null;

  return date.toISOString();
};
