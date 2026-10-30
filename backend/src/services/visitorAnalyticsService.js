const crypto = require('crypto');

const INDIA_TIME_ZONE = 'Asia/Kolkata';

function buildVisitorHash(visitorId) {
  return crypto.createHash('sha256').update(visitorId).digest('hex');
}

function getDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getRecentDayKeys(count, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (count - index - 1));
    return getDayKey(date);
  });
}

async function recordVisit(DailyVisitor, visitorId, now = new Date()) {
  const dayKey = getDayKey(now);
  await DailyVisitor.updateOne(
    { dayKey, visitorHash: buildVisitorHash(visitorId) },
    {
      $set: { lastSeenAt: now },
      $setOnInsert: { firstSeenAt: now },
    },
    { upsert: true },
  );
}

async function getVisitorSummary(DailyVisitor, now = new Date()) {
  const dayKeys = getRecentDayKeys(7, now);
  const todayKey = dayKeys.at(-1);
  const yesterdayKey = dayKeys.at(-2);
  const liveSince = new Date(now.getTime() - 60_000);

  const [live, today, yesterday, counts] = await Promise.all([
    DailyVisitor.countDocuments({ dayKey: todayKey, lastSeenAt: { $gte: liveSince } }),
    DailyVisitor.countDocuments({ dayKey: todayKey }),
    DailyVisitor.countDocuments({ dayKey: yesterdayKey }),
    DailyVisitor.aggregate([
      { $match: { dayKey: { $in: dayKeys } } },
      { $group: { _id: '$dayKey', visitors: { $sum: 1 } } },
    ]),
  ]);
  const countByDay = new Map(counts.map((item) => [item._id, item.visitors]));

  return {
    live,
    today,
    yesterday,
    changePercent: yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null,
    trend: dayKeys.map((dayKey) => ({ dayKey, visitors: countByDay.get(dayKey) || 0 })),
    generatedAt: now.toISOString(),
  };
}

module.exports = {
  buildVisitorHash,
  getDayKey,
  getRecentDayKeys,
  getVisitorSummary,
  recordVisit,
};
