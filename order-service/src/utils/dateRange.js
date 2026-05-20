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

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseDate = (value, label) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createError(`${label} must be a valid ISO date`);
  }
  return date;
};

const getDateRange = ({ range = "today", startDate, endDate } = {}) => {
  const now = new Date();
  let start;
  let end;

  if (startDate || endDate) {
    if (!startDate || !endDate) {
      throw createError("Both startDate and endDate are required for custom range");
    }
    start = startOfDay(parseDate(startDate, "startDate"));
    end = endOfDay(parseDate(endDate, "endDate"));
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

  if (start > end) {
    throw createError("startDate must be before or equal to endDate");
  }

  const diffDays = Math.ceil((end - start) / MS_PER_DAY);
  if (diffDays > 366) {
    throw createError("Date range cannot be longer than 1 year");
  }

  let groupBy = "day";
  if (!startDate && !endDate && (range === "today" || !range)) {
    groupBy = "hour";
  } else if (diffDays > 31) {
    groupBy = "month";
  }

  return { start, end, groupBy };
};

const mongoDateFormat = (groupBy) => {
  if (groupBy === "hour") return "%Y-%m-%d %H:00";
  if (groupBy === "month") return "%Y-%m";
  return "%Y-%m-%d";
};

module.exports = {
  getDateRange,
  mongoDateFormat,
};
