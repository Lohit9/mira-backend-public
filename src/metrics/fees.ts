import { processAllCsvReports, SettlementReportsSummary, summarizeAmounts, TimeSeriesAmounts } from 'data-processing/settlement-reports'
import { DateTime } from 'luxon'
import { Filters } from './types'
import { TimePeriodRange, timePeriodToDateRanges, TimePeriodYear } from 'time-periods';
import * as spApi from "sp-api";
import { RouteError } from 'errors';
import { err, ok, ResultAsync } from 'neverthrow';
import Dinero from 'dinero.js';
import { percentageChange } from 'utils';
import { oneLine } from 'common-tags';

const MONEY_FORMAT = "$0,0.00";

const ZERO = Dinero({ amount: 0 });

type Period = [TimePeriodRange, TimePeriodYear]

export const handleCalculateFees = (sellerId: string, mainTimePeriod: Period, comparisonPeriod: Period | null) => {
    // comparison use case
    if (comparisonPeriod !== null) {
      return ResultAsync.combine([
        calculateFeesForTimePeriod(sellerId, mainTimePeriod),
        calculateFeesForTimePeriod(sellerId, comparisonPeriod),
      ])
      .map(([ summary1, summary2 ]) => {
        return {
          response: summaryToString(summary1, summary2)
        }
      })
    }

    return calculateFeesForTimePeriod(sellerId, mainTimePeriod)
      .map((summary) => {
        return { response: summaryToString(summary) }
      })
      .mapErr(hackyRouteError)
}

const calculateFeesForTimePeriod = (sellerId: string, timePeriod: Period) => {
  const { start, end } = timePeriodToDateRanges(timePeriod)
  const anchorPoint = DateTime.fromJSDate(start)

  return spApi
      .getSettlementReports(sellerId, anchorPoint)
      .map(processAllCsvReports)
      .andThen((ts) => summarize(ts, { range: { start, end }}))
}

const summarize = (ts: TimeSeriesAmounts, filters: Filters) => {
  const start = DateTime.fromJSDate(filters.range.start)
  const end = DateTime.fromJSDate(filters.range.end)

  const startOffset = Math.ceil(start.diff(ts.anchor).as('days'))
  const totalDays = Math.ceil(end.diff(start).as('days'))

  // the user is asking for data that starts BEFORE the first day that we have
  // in the dataset
  const missingData = startOffset < 0

  if (missingData) {
    return err('Missing data')
  }

  const subset = ts.amountInfo.slice(startOffset, startOffset + totalDays)

  return ok(summarizeAmounts(subset))
}

const summaryToString = (summary: SettlementReportsSummary, comparisonSummary?: SettlementReportsSummary): string => {
  // simple case (no comparison)
  if (comparisonSummary === undefined) {
    return `Total fees were: ${summary.feesTotal.toFormat(MONEY_FORMAT)}`
  }

  /////////////////////////////////////
  // Comparison use case
  //
  const diff = summary.feesTotal.subtract(comparisonSummary.feesTotal)

  if (diff.equalsTo(ZERO)) {
    return `Total fees were the same in both periods (${summary.feesTotal.toFormat(MONEY_FORMAT)})`
  }

  const descriptor = diff.greaterThan(ZERO) ? "increased" : "decreased";
  const percentage = percentageChange(summary.feesTotal.getAmount(), comparisonSummary.feesTotal.getAmount());

  return oneLine`
    Total fees ${descriptor} by ${percentage}% (difference of ${diff.toFormat(MONEY_FORMAT)})
    from ${summary.feesTotal.toFormat(MONEY_FORMAT)}
    to ${comparisonSummary.feesTotal.toFormat(MONEY_FORMAT)}`
}

const hackyRouteError = <E>(e: E): RouteError => {
  console.log("> noooooooo");
  console.log(e);
  return { type: "Other", context: "idunno" };
}