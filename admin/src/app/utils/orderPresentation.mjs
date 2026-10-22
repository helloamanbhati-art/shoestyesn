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

export const sortOrdersNewestFirst = (orders) =>
  [...orders].sort((left, right) => orderTimestamp(right) - orderTimestamp(left));

export const filterOrdersByDay = (orders, filter, now = new Date()) => {
  if (filter === 'all') return [...orders];

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
