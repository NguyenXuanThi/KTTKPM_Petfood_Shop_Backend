const MS_PER_DAY = 24 * 60 * 60 * 1000;
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
const createError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};
const getDateRange = ({ range = "today", startDate, endDate } = {}) => {
  const now = new Date();
  let start;
  let end;
  if (startDate || endDate) {
    if (!startDate || !endDate) throw createError("Both startDate and endDate are required");
    start = startOfDay(new Date(startDate));
    end = endOfDay(new Date(endDate));
  } else if (range === "today" || !range) {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (range === "7days") {
    end = endOfDay(now);
    start = startOfDay(new Date(end.getTime() - 6 * MS_PER_DAY));
  } else if (range === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = endOfDay(now);
  } else {
    throw createError("range must be one of today, 7days, month");
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw createError("Invalid date range");
  if (start > end) throw createError("startDate must be before or equal to endDate");
  if (Math.ceil((end - start) / MS_PER_DAY) > 366) throw createError("Date range cannot be longer than 1 year");
  return { start, end };
};
module.exports = { getDateRange };
