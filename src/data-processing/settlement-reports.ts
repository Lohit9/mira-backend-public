import P from "papaparse";
import Dinero from "dinero.js";
import { DateTime } from "luxon";

const ZERO = Dinero({ amount: 0 });

const MONEY_FORMAT = "$0,0.00";

const TOTAL_AMOUNT_KEY = "total-amount";

const getAmountFields = (obj: Record<string, any>): string[] =>
  Object.keys(obj).filter((k) => {
    return k !== TOTAL_AMOUNT_KEY && k.endsWith("-amount");
  });

export interface TimeSeriesAmounts {
  anchor: DateTime;
  amountInfo: AmountsByFeeType[];
}

type FeesAndInflows = { fees: Dinero.Dinero; inflows: Dinero.Dinero }

type AmountsByFeeType = Record<string, FeesAndInflows>;

type DateString = string;
type Amounts = Record<DateString, AmountsByFeeType>;

const initialFeesAndInflows = (): FeesAndInflows => ({ fees: ZERO, inflows: ZERO })

const initialState = (headers: string[]): AmountsByFeeType =>
  Object.fromEntries(
    headers.map((k) => [k, initialFeesAndInflows()] as const)
  );


export const processAllCsvReports = (tsvFiles: string[]): TimeSeriesAmounts => {
  const amounts = tsvFiles.map(processSettlementReport)
  const merged = mergeAmounts(amounts)
  return intoTimeSeries(merged)
}

const processSettlementReport = (
  rawTabSeparatedValuesFile: string
): Amounts => {
  const { data } = P.parse<Record<string, string>>(rawTabSeparatedValuesFile, {
    header: true,
  });

  return getAmounts(data);
};


export interface SettlementReportsSummary {
  feesTotal: Dinero.Dinero;
  inflowsTotal: Dinero.Dinero;
  net: Dinero.Dinero;
  summarizedAmounts: AmountsByFeeType;
}

export const summarizeAmounts = (amounts: AmountsByFeeType[]): SettlementReportsSummary => {
  const amountFields = getAmountFields(amounts[0] ?? {})

  const summarizedAmounts = camelCaseKeys(
    amounts.reduce((acc, amount) => {
      const copy = {
        ...acc,
      };

      amountFields.forEach((k) => {
        copy[k] = {
          inflows: copy[k]!.inflows.add(amount[k]?.inflows ?? ZERO),
          fees: copy[k]!.fees.add(amount[k]?.fees ?? ZERO),
        };
      });

      return copy;
    }, initialState(amountFields))
  );

  const feesTotal = Object.values(summarizedAmounts).reduce(
    (total, { fees }) => total.add(fees),
    ZERO
  );
  const inflowsTotal = Object.values(summarizedAmounts).reduce(
    (total, { inflows }) => total.add(inflows),
    ZERO
  );

  const net = inflowsTotal.subtract(feesTotal);

  return {
    feesTotal,
    inflowsTotal,
    net,
    summarizedAmounts,
  }
}

// here for testing / double-checking purposes
export const _printFeesTimeSeries = ({ amountInfo }: TimeSeriesAmounts) => {
  // const totalSettlementObj = data.find((val) => val[TOTAL_AMOUNT_KEY] !== "");
  // const total = getAmount(totalSettlementObj, TOTAL_AMOUNT_KEY);
  const { summarizedAmounts, feesTotal, inflowsTotal, net}= summarizeAmounts(amountInfo) 

  console.log("--------Fees Breakdown-----");
  Object.entries(summarizedAmounts).forEach(([k, { fees }]) => {
    console.log(` ${k}: `, fees.toFormat(MONEY_FORMAT));
  });
  console.log("total fees: ", feesTotal.toFormat(MONEY_FORMAT));

  console.log("\n\n--------Inflows-----");
  Object.entries(summarizedAmounts).forEach(([k, { inflows }]) => {
    console.log(` ${k}: `, inflows.toFormat(MONEY_FORMAT));
  });
  console.log("total inflows: ", inflowsTotal.toFormat(MONEY_FORMAT));

  // const diff = net.subtract(total);

  console.log("\n--------Summary-----");
  // console.log("hard-coded total: ", total.toFormat(MONEY_FORMAT));
  console.log("Net: ", net.toFormat(MONEY_FORMAT));
  // console.log("diff (reconciled - total): ", diff.toFormat(MONEY_FORMAT));

  // if (diff.equalsTo(ZERO) === false) {
  //   throw new Error("uhhh ohhh");
  // }
};

const getAmounts = (parsedCsvRows: Record<string, string>[]): Amounts => {
  const amounts: Amounts = {};

  parsedCsvRows.forEach((rowObj) => {
    const jsDate = new Date(rowObj["posted-date"] ?? "");
    const amountFields = getAmountFields(rowObj);

    if (
      rowObj["transaction-type"] === "" ||
      String(jsDate) === "Invalid Date"
    ) {
      return;
    }

    const amountsByTypeForRow = Object.fromEntries(
      amountFields.map((k) => [k, getAmount(rowObj, k)] as const)
    );

    const dateKey = DateTime.fromJSDate(jsDate).toFormat("yyyy-MM-dd");
    const amountsForDate: AmountsByFeeType =
      amounts[dateKey] ?? initialState(amountFields);

    const update = () => {
      amountFields.forEach((k) => {
        const amount = amountsByTypeForRow[k]!;

        if (amount.greaterThanOrEqual(ZERO)) {
          amountsForDate[k] = {
            ...amountsForDate[k]!,
            inflows: amountsForDate[k]!.inflows.add(amount),
          };
        } else {
          amountsForDate[k] = {
            ...amountsForDate[k]!,
            fees: amountsForDate[k]!.fees.add(
              // multiple by -1 to get absolute value
              amount.multiply(-1)
            ),
          };
        }

        amounts[dateKey] = amountsForDate;
      });
    };

    update();
  });

  return amounts;
};

// represents the summary amounts for ALL csvs
// they need to be merged because the dates oftentimes overlap
// e.g. csv1 may have data from an overlapping date range from csv2
const mergeAmounts = (allAmounts: Amounts[]): Amounts => {
  const merged: Amounts = {}

  allAmounts.forEach((amounts) => {
    Object.entries(amounts).forEach(([dateKey, amountsByType]) => {
      const amountFields = Object.keys(amountsByType)

      const amountsForDateAccumulator: AmountsByFeeType =
        merged[dateKey] ?? initialState(amountFields);

      const mergeFeesAndInflows = (a?: FeesAndInflows, b?: FeesAndInflows): FeesAndInflows => {
        const a_ = a ?? initialFeesAndInflows()
        const b_ = b ?? initialFeesAndInflows()

        return {
          inflows: a_.inflows.add(b_.inflows),
          fees: a_.fees.add(b_.fees)
        }
      }

      amountFields.forEach((k) => {
        const accFeesAndInflows = amountsForDateAccumulator[k]
        const currentFeesAndInflows = amountsByType[k]

        amountsForDateAccumulator[k] = mergeFeesAndInflows(accFeesAndInflows, currentFeesAndInflows)
      })

      merged[dateKey] = amountsForDateAccumulator
    })
  })

  return merged
}

const intoTimeSeries = (amounts: Amounts): TimeSeriesAmounts => {
  const sorted = Object.entries(amounts).sort(
    ([dateStringA, _amountsA], [dateStringB, _amountsB]) => {
      const a = new Date(dateStringA);
      const b = new Date(dateStringB);
      return a.getTime() - b.getTime();
    }
  );

  const anchor = DateTime.fromJSDate(new Date(sorted[0]?.[0] ?? Date.now()));

  const amountInfo = sorted.map(([_, amountInfo]) => amountInfo);

  return { anchor, amountInfo };
};

const getAmount = (obj: Record<string, string> | undefined, key: string) => {
  if (obj === undefined) return ZERO;

  const rawVal = parseFloat(obj[key] ?? "");

  if (Number.isNaN(rawVal)) return ZERO;

  return Dinero({
    amount: Math.round(rawVal * 100),
  });
};

function toCamelCase(str: string): string {
  return str
    .toLowerCase() // Convert the entire string to lowercase
    .split("-") // Split the string by dashes
    .map((word, index) => {
      if (index === 0) {
        return word; // The first word should be in lowercase
      }
      // Capitalize the first letter of each subsequent word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(""); // Join the words back together
}

const camelCaseKeys = (obj: AmountsByFeeType): AmountsByFeeType =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamelCase(k), v]));
