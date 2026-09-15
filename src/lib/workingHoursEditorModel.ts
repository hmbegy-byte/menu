const names = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export type WorkingDay = { id: number; dayName: string; isOpen: boolean; from: string; to: string };
export function normalizeHours(
  hours?: Array<Partial<Omit<WorkingDay, "id">> & { id: number | string }> | null,
): WorkingDay[] {
  return names.map((dayName, id) => ({
    isOpen: true,
    from: "12:00",
    to: "23:59",
    ...hours?.find((day) => Number(day.id) === id),
    id,
    dayName,
  }));
}
