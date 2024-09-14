import { DateTime } from 'luxon'

export const timePeriodRanges = [
  "black_friday",
  // 'christmas',
  "thanksgiving",
  "cyber_monday",
  "q1",
  "q2",
  "q3",
  "q4",
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
  "current_month",
  "last_week",
  "last_month",
  "last_quarter",
  "yesterday",
  "year",
  "now",
  "[int]_months_ago",
  "[int]_weeks_ago",
  "[int]_days_ago",
] as const;

export const yearValues = ["current_year", "last_year", "[int]"];

const months: Month[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

type Month =
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec";

const monthInfo: Record<Month, { month: number; lastDay: number }> = {
  jan: { month: 0, lastDay: 31 },
  feb: { month: 1, lastDay: 28 }, // defaulting to non-leap year
  mar: { month: 2, lastDay: 31 },
  apr: { month: 3, lastDay: 30 },
  may: { month: 4, lastDay: 31 },
  jun: { month: 5, lastDay: 30 },
  jul: { month: 6, lastDay: 31 },
  aug: { month: 7, lastDay: 31 },
  sep: { month: 8, lastDay: 30 },
  oct: { month: 9, lastDay: 31 },
  nov: { month: 10, lastDay: 30 },
  dec: { month: 11, lastDay: 31 },
};


const validEndings = ["_days_ago", "_months_ago", "_weeks_ago"] as const;

type Ending = (typeof validEndings)[number];
type RelativeTimePeriod = `${number}${Ending}`;

const isRelativeTimePeriod = (val: string) => {
  const [firstPart] = val.split("_");

  const isInvalidInt = Number.isNaN(parseInt(firstPart + "", 10));

  if (isInvalidInt) return false;

  return validEndings.some((ending) => val.endsWith(ending));
};

export type TimePeriodRange =
  | Exclude<(typeof timePeriodRanges)[number], `[int]${Ending}`>
  | RelativeTimePeriod;

export type TimePeriodYear = "current_year" | "last_year" | `${number}`;

export const parseTimePeriod = (
  raw: string
): [TimePeriodRange, TimePeriodYear] | null => {
  const [rangePart, yearPart] = raw.split("::");

  const isValidYearPart = () =>
    yearPart === "current_year" ||
    yearPart === "last_year" ||
    yearPart?.split("").every((char) => !isNaN(parseInt(char)));

  const isValidRange = () => {
    return (
      timePeriodRanges.includes((rangePart + "") as any) ||
      isRelativeTimePeriod(rangePart + "")
    );
  };

  if (isValidRange() && isValidYearPart()) {
    return [rangePart, yearPart] as [TimePeriodRange, TimePeriodYear];
  }

  return null;
};

export const timePeriodToDateRanges = (
  [timePeriod, timePeriodYear]: [TimePeriodRange, TimePeriodYear]
): { start: Date; end: Date } => {
  const now = new Date();

  now.setFullYear(timePeriodYearToNumber(timePeriodYear));

  const startOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);


  if (timePeriod.endsWith(('_ago'))) {
    return handleNumericalOffsetRange(timePeriod, timePeriodYearToNumber(timePeriodYear))
  }


  switch (timePeriod) {
    case "jan":
    case "feb":
    case "mar":
    case "apr":
    case "may":
    case "jun":
    case "jul":
    case "aug":
    case "sep":
    case "oct":
    case "nov":
    case "dec":
      return monthToDateRanges(timePeriod);

    case "q1":
      return {
        start: new Date("2024-01-01"),
        end: endOfDay(new Date("2024-03-31")),
      };

    case "q2":
      return {
        start: new Date("2024-04-01"),
        end: endOfDay(new Date("2024-06-30")),
      };

    case "q3":
      return {
        start: new Date("2024-07-01"),
        end: endOfDay(new Date("2024-09-30")),
      };

    case "q4":
      return {
        start: new Date("2024-10-01"),
        end: endOfDay(new Date("2024-12-31")),
      };

    case "last_quarter": {
      const start = getLastQuarterStartDate()
      const end = new Date(now.getFullYear(), start.getMonth() + 2, 0); // Last day of previous month
      return {
        start: startOfDay(start),
        end: endOfDay(end),
      };
    }

    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)), // Last day of last month
      };

    case "yesterday":
      return {
        start: startOfDay(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        ),
        end: endOfDay(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        ),
      };

    case "last_week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7); // Last week's start
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Last week's end
      return {
        start: startOfDay(start),
        end: endOfDay(end),
      };
    }

    case "black_friday": {
      const blackFriday = getBlackFridayDate(now.getFullYear());

      return {
        start: startOfDay(blackFriday),
        end: endOfDay(blackFriday),
      };
    }

    case "thanksgiving": {
      const thanksgiving = getThanksgivingDate(now.getFullYear());

      return {
        start: startOfDay(thanksgiving),
        end: endOfDay(thanksgiving),
      };
    }

    case "cyber_monday": {
      const cyberMonday = getCyberMondayDate(now.getFullYear())

      return {
        start: startOfDay(cyberMonday),
        end: endOfDay(cyberMonday),
      };
    }

    case "current_month": {
      const monthIdx = now.getMonth();
      const startOfMonth = new Date(now.getFullYear(), monthIdx, 1);

      const monthName = months[monthIdx] ?? "jan";
      const lastDay = monthInfo[monthName].lastDay;
      const endOfMonth = new Date(now.getFullYear(), monthIdx, lastDay);

      return {
        start: startOfDay(startOfMonth),
        end: endOfDay(endOfMonth),
      };
    }

    // same as "today"
    case "now": {
      return {
        start: endOfDay(now),
        end: endOfDay(now),
      };
    }

    case "year": {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: endOfDay(new Date(now.getFullYear(), 11, 31)),
      };
    }

    default: {
      throw new Error("Unrecognized time period: " + timePeriod);
    }
  }
};

const getThanksgivingDate = (year: number): Date => {
  const november = 10; // November is the 11th month (0-indexed)

  const date = new Date(year, november, 1);
  const dayOfWeek = date.getDay();

  // Calculate the first Thursday of November
  const firstThursday = 1 + ((4 - dayOfWeek + 7) % 7);

  // Calculate the fourth Thursday by adding 21 days to the first Thursday
  return new Date(year, november, firstThursday + 21);
};

const getBlackFridayDate = (year: number): Date => {
  const thanksgiving = getThanksgivingDate(year);
  const blackFriday = new Date(thanksgiving);

  // Set Black Friday to the day after Thanksgiving
  blackFriday.setDate(thanksgiving.getDate() + 1);

  return blackFriday;
};

const getCyberMondayDate = (year: number): Date => {
  const blackFriday = getBlackFridayDate(year);

  const cyberMonday = new Date(blackFriday);
  cyberMonday.setDate(blackFriday.getDate() + 3); // move forward to monday

  if (cyberMonday.getDay() !== 1) {
    cyberMonday.setDate(
      cyberMonday.getDate() + ((1 - cyberMonday.getDay() + 7) % 7)
    );
  }

  return cyberMonday
}

const monthToDateRanges = (timePeriod: Month): { start: Date; end: Date } => {
  const now = new Date();
  const endOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  const { month, lastDay } = monthInfo[timePeriod];
  const isLeapYear = (year: number) =>
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const endDay =
    timePeriod === "feb" && isLeapYear(now.getFullYear()) ? 29 : lastDay;

  return {
    start: new Date(now.getFullYear(), month, 1),
    end: endOfDay(new Date(now.getFullYear(), month, endDay)),
  };
};

type Sorted = [
  [TimePeriodRange, TimePeriodYear],
  [TimePeriodRange, TimePeriodYear]
];
export const sortTimePeriods  = (
  a: [TimePeriodRange, TimePeriodYear],
  b: [TimePeriodRange, TimePeriodYear]
): Sorted => {
  const unixA = timePeriodToUnixTimestamp(a);
  const unixB = timePeriodToUnixTimestamp(b);

  if (unixA < unixB) return [a, b]
  if (unixA > unixB) return [b, a]

  return [a, b]
};

const isMonth = (val: TimePeriodRange): val is Month =>
  months.includes(val as any);

const handleNumericalOffsetRange = (val: TimePeriodRange, year: number) => {
  const date = DateTime.now().set({ year })

  if (val.endsWith('_days_ago')) {
    const days = getIntOffset(val)

    const start = date.minus({ days }).startOf('day').toJSDate()
    const end = date.minus({ days }).endOf('day').toJSDate()

    return {
      start,
      end,
    }
  }

  if (val.endsWith('_weeks_ago')) {
    const weeks = getIntOffset(val)

    const start = date.minus({ weeks }).startOf('week').startOf('day').toJSDate()
    const end = date.minus({ weeks }).endOf('week').endOf('day').toJSDate()

    return {
      start,
      end,
    }
  }

  if (val.endsWith('_months_ago')) {
    const months = getIntOffset(val)

    const start = date.minus({ months }).startOf('month').startOf('day').toJSDate()
    const end = date.minus({ months }).endOf('month').endOf('day').toJSDate()

    return {
      start,
      end,
    }
  }

  throw new Error('Invalid numerical offset range: ' + val)
}


export const timePeriodToUnixTimestamp = ([range, year]: [
  TimePeriodRange,
  TimePeriodYear
]): number => {
  const now = DateTime.now()
  const withRelativeYear = now.set({ year: timePeriodYearToNumber(year) })
  const withRelativeYearAndFirstOfMonth = withRelativeYear.set({ day: 1 })

  if (isMonth(range)) {
    const { month } = monthInfo[range]
    return withRelativeYearAndFirstOfMonth.set({ month: month + 1 }).toMillis()
  } else {
    switch (range) {
      case 'q1': {
        return withRelativeYearAndFirstOfMonth.set({ month: monthInfo.jan.month + 1 }).toMillis()
      }

      case 'q2': {
        return withRelativeYearAndFirstOfMonth.set({ month: monthInfo.apr.month + 1 }).toMillis()
      }

      case 'q3': {
        return withRelativeYearAndFirstOfMonth.set({ month: monthInfo.jul.month + 1 }).toMillis()
      }

      case 'q4': {
        return withRelativeYearAndFirstOfMonth.set({ month: monthInfo.oct.month }).toMillis()
      }

      case 'black_friday': {
        return getBlackFridayDate(withRelativeYearAndFirstOfMonth.get('year')).getTime()
      }

      case 'cyber_monday': {
        return getCyberMondayDate(withRelativeYearAndFirstOfMonth.get('year')).getTime()
      }

      case 'thanksgiving': {
        return getThanksgivingDate(withRelativeYearAndFirstOfMonth.get('year')).getTime()
      }

      case 'current_month': {
        return now.set({ day: 1 }).toMillis()
      }

      case 'last_month': {
        return now.minus({ months: 1, day: 1 }).toMillis()
      }

      case 'last_quarter': {
        return getLastQuarterStartDate().getTime()
      }

      case 'last_week': {
        return now.minus({ weeks: 1 }).toMillis()
      }

      case 'now': {
        return now.toMillis()
      }

      case 'year': {
        return now.set({ day: 1, month: 1 }).toMillis()
      }

      case 'yesterday': {
        return now.minus({ day: 1 }).toMillis()
      }
    }

    if (range.endsWith('_days_ago')) {
      const days = parseInt(range.split('_').shift() ?? '0', 10)
      return withRelativeYear.minus({ days }).toMillis()
    }

    if (range.endsWith('_weeks_ago')) {
      const weeks = parseInt(range.split('_').shift() ?? '0', 10)
      return withRelativeYear.minus({ weeks }).toMillis()
    }

    if (range.endsWith('_months_ago')) {
      const months = parseInt(range.split('_').shift() ?? '0', 10)
      return withRelativeYear.minus({ months }).toMillis()
    }
  }

  throw new Error('Unhandled time period range: ' + JSON.stringify([range, year]))
};

const getIntOffset = (range: string) =>
  parseInt(range.split('_').shift() ?? '0', 10)

const getLastQuarterStartDate = () => {
  const now = new Date()
  const currentQuarter = Math.floor((now.getMonth() + 3) / 3);
  const startMonth = (currentQuarter - 2) * 3;
  return new Date(now.getFullYear(), startMonth, 1);
}

const timePeriodYearToNumber = (y: TimePeriodYear): number => {
  const now = new Date();

  return y === "current_year"
    ? now.getFullYear()
    : y === "last_year"
    ? now.getFullYear() - 1
    : parseInt(y, 10);
};
