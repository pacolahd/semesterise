export const c = (year: number, month = 1, day = 1) =>
  new Date(Date.UTC(year, month - 1, day)).toISOString().split("T")[0];
