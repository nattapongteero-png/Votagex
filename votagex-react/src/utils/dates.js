export function formatDateThai(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${d.getDate()} , ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateThaiShort(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTripDays(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  while (current <= end) {
    days.push(formatISODate(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function activityMatchesDate(activity, dateStr) {
  if (activity.category === 'hotel') {
    return activity.checkIn <= dateStr && activity.checkOut > dateStr;
  }
  return activity.tripDay === dateStr;
}

export function getHotelNights(activity) {
  if (!activity.checkIn || !activity.checkOut) return 0;
  const d1 = new Date(activity.checkIn);
  const d2 = new Date(activity.checkOut);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

