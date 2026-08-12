export function getMonthMatrix(year, month) {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sun, 6 = Sat

  const today = new Date();
  const todayYyyy = today.getFullYear();
  const todayMm = String(today.getMonth() + 1).padStart(2, '0');
  const todayDd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${todayYyyy}-${todayMm}-${todayDd}`;

  const days = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMmStr = String(prevMonth + 1).padStart(2, '0');

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const pDay = prevMonthLastDay - i;
    const ddStr = String(pDay).padStart(2, '0');
    const dateStr = `${prevYear}-${prevMmStr}-${ddStr}`;
    days.push({
      dateStr,
      dayNumber: pDay,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  const mmStr = String(month + 1).padStart(2, '0');
  for (let d = 1; d <= daysInMonth; d++) {
    const ddStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${mmStr}-${ddStr}`;
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding to complete grid
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMmStr = String(nextMonth + 1).padStart(2, '0');

    for (let n = 1; n <= remaining; n++) {
      const ddStr = String(n).padStart(2, '0');
      const dateStr = `${nextYear}-${nextMmStr}-${ddStr}`;
      days.push({
        dateStr,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }
  }

  return days;
}

export function aggregateRequests(requests) {
  // Map of YYYY-MM-DD => { totalCount, categories: { [catName]: count }, items: [] }
  const map = {};
  (requests || []).forEach((req) => {
    const dateStr = req.date_needed;
    if (!dateStr) return;
    if (!map[dateStr]) {
      map[dateStr] = { totalCount: 0, categories: {}, items: [] };
    }
    const countToAdd = typeof req.count === 'number' ? req.count : 1;
    map[dateStr].totalCount += countToAdd;
    map[dateStr].categories[req.category] = (map[dateStr].categories[req.category] || 0) + countToAdd;
    map[dateStr].items.push(req);
  });
  return map;
}
