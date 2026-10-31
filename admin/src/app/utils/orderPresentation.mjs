const orderTimestamp = (order) => {
  const timestamp = new Date(order?.createdAt || '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const indianCalendarDay = (value) => {
  const date = value instanceof Date ? value : new Date(value || '');
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).formatToParts(date);
  const part = (type) => Number(parts.find((item) => item.type === type)?.value);

  return Date.UTC(part('year'), part('month') - 1, part('day'));
};

const indianCalendarKey = (value) => {
  const day = indianCalendarDay(value);
  return day === null ? null : new Date(day).toISOString().slice(0, 10);
};

export const getRecentOrderDayOptions = (now = new Date()) => {
  const currentDay = indianCalendarDay(now);
  if (currentDay === null) return [{ value: 'all', label: 'All orders' }];

  const dayOptions = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(currentDay - index * 86_400_000);
    const dateLabel = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(day);
    const prefix = index === 0 ? 'Today' : index === 1 ? 'Yesterday' : null;

    return {
      value: day.toISOString().slice(0, 10),
      label: prefix ? `${prefix} — ${dateLabel}` : dateLabel,
    };
  });

  return [...dayOptions, { value: 'all', label: 'All orders' }];
};

export const sortOrdersNewestFirst = (orders) =>
  [...orders].sort((left, right) => orderTimestamp(right) - orderTimestamp(left));

export const filterOrdersByDay = (orders, filter, now = new Date()) => {
  if (filter === 'all') return [...orders];

  if (/^\d{4}-\d{2}-\d{2}$/.test(filter)) {
    return orders.filter((order) => indianCalendarKey(order?.createdAt) === filter);
  }

  const currentDay = indianCalendarDay(now);
  const targetAge = filter === 'yesterday' ? 1 : 0;

  return orders.filter((order) => {
    const orderDay = indianCalendarDay(order?.createdAt);
    if (currentDay === null || orderDay === null) return false;

    const ageInDays = (currentDay - orderDay) / 86_400_000;
    return filter === 'last7'
      ? ageInDays >= 0 && ageInDays <= 6
      : ageInDays === targetAge;
  });
};

export const isOrderFromToday = (dateString, now = new Date()) =>
  indianCalendarDay(dateString) !== null
  && indianCalendarDay(dateString) === indianCalendarDay(now);

export const formatOrderDateTime = (dateString) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};
