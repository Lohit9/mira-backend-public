import { RouteError } from "errors";
import { publicRoute } from "router/router";
import * as spApi from "sp-api";
import { z } from "zod";
import Dinero from "dinero.js";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import {
  parseTimePeriod,
  sortTimePeriods,
  timePeriodToDateRanges,
} from "time-periods";
import { handleCalculateFees } from 'metrics/fees'
import { percentageChange } from "utils";

const MONEY_FORMAT = "$0,0.00";

const parser = z.object({
  timePeriod1: z.string(),
  timePeriod2: z.string(),
  isComparison: z.boolean(),
  sellerId: z.string(),
  region: z.string().or(z.undefined()),
  asin: z.string().or(z.undefined()),
  metric: z.union([
    z.literal("sales"),
    z.literal("inventory"),
    z.literal("sales_volume"),
    z.literal("order_count"),
    z.literal("total_fees"),
  ]),
});

export const calculateSimpleMetric = publicRoute({ parser }, ({ body }) => {
  const metric = body.metric;

  const asin =
    typeof body.asin === "string" && body.asin.toLocaleLowerCase() !== "novalue"
      ? body.asin
      : undefined;

  const period1 = parseTimePeriod(body.timePeriod1);
  const period2 = parseTimePeriod(body.timePeriod2);

  if (period1 === null) {
    return errAsync({
      type: "BadRequest",
      payload: { type: "application_error", message: "invalid time period" },
    });
  }

  if (metric === "inventory") {
    return okAsync({
      response: "INVENTORY NOT YET IMPLEMENTED",
    });
  }

  if (metric === "total_fees") {
    return handleCalculateFees(body.sellerId, period1, period2)
  }

  if (body.isComparison) {
    if (period2 === null) {
      return errAsync({
        type: "BadRequest",
        payload: { type: "application_error", message: "invalid time period" },
      });
    }

    const [olderPeriod, newerPeriod] = sortTimePeriods(period1, period2);

    const configOlder = {
      ...timePeriodToDateRanges(olderPeriod),
      asin,
    };
    const configNewer = {
      ...timePeriodToDateRanges(newerPeriod),
      asin,
    };

    return ResultAsync.combine([
      spApi.getOrderMetrics(body.sellerId, configOlder),
      spApi.getOrderMetrics(body.sellerId, configNewer),
    ])
      .map(([{ payload: payloadOlder }, { payload: payloadNewer }]) => {
        return {
          response: compare(payloadOlder, payloadNewer, metric),
        };
      })
      .mapErr((e): RouteError => {
        console.log("> noooooooo");
        console.log(e);
        return { type: "Other", context: "idunno" };
      });
  }

  const config = {
    ...timePeriodToDateRanges(period1),
    asin,
  };

  return spApi
    .getOrderMetrics(body.sellerId, config)
    .map(({ payload }) => {
      return {
        response: tallyMetric(metric, payload),
      };
    })
    .mapErr(hackyRouteError);
});

const hackyRouteError = <E>(e: E): RouteError => {
  console.log("> noooooooo");
  console.log(e);
  return { type: "Other", context: "idunno" };
}

type MetricType = "sales" | "sales_volume" | "order_count";

const tallyMetric = (metricType: MetricType, data: spApi.Metric[]): string => {
  if (metricType === "sales") {
    return getSalesValue(data).toFormat(MONEY_FORMAT);
  }

  if (metricType === "sales_volume") {
    return `Total units sold: ${getUnitsSold(data)}`;
  }

  return `Total orders: ${getOrderCount(data)}`;
};

const compare = (
  older: spApi.Metric[],
  newer: spApi.Metric[],
  metricType: MetricType
): string => {
  if (metricType === "order_count") {
    const olderCount = getOrderCount(older);
    const newerCount = getOrderCount(newer);

    const diff = newerCount - olderCount;

    if (diff === 0) {
      return `Orders were the same in both periods (${newerCount} orders)`;
    }

    const descriptor = diff > 0 ? "increased" : "decreased";
    const percentage = percentageChange(olderCount, newerCount);

    return `Orders ${descriptor} by ${percentage}% (difference of ${diff} orders) from ${olderCount} to ${newerCount}`;
  }

  if (metricType === "sales") {
    const olderSales = getSalesValue(older);
    const newerSales = getSalesValue(newer);

    if (olderSales.equalsTo(newerSales)) {
      return `Sales stayed the same in both periods: ${newerSales.toFormat(
        MONEY_FORMAT
      )}`;
    }

    const descriptor = newerSales.greaterThan(olderSales)
      ? "increased"
      : "decreased";
    const percentage = percentageChange(
      olderSales.getAmount(),
      newerSales.getAmount()
    );

    return `Sales ${descriptor} by ${percentage}% from ${olderSales.toFormat(
      MONEY_FORMAT
    )} to ${newerSales.toFormat(MONEY_FORMAT)}`;
  }

  // sales volume
  const olderUnitsSold = getUnitsSold(older);
  const newerUnitsSold = getUnitsSold(newer);

  const diff = newerUnitsSold - olderUnitsSold;

  if (diff === 0) {
    return `Sales volume was the same in both periods (${newerUnitsSold} units sold)`;
  }

  const descriptor = diff > 0 ? "increased" : "decreased";
  const percentage = percentageChange(olderUnitsSold, newerUnitsSold);

  return `Sales volume ${descriptor} by ${percentage}% (difference of ${diff} units) from ${olderUnitsSold} to ${newerUnitsSold}`;
};

const getUnitsSold = (data: spApi.Metric[]): number =>
  data.map((a) => a.unitCount).reduce((sum, int) => sum + int, 0);

const getOrderCount = (data: spApi.Metric[]): number =>
  data.map((a) => a.orderCount).reduce((sum, count) => sum + count, 0);

const getSalesValue = (data: spApi.Metric[]): Dinero.Dinero => {
  const RADIX_10 = 10;
  return data
    .map(({ totalSales }) =>
      Dinero({
        amount: parseInt(
          totalSales.amount.toString().replace(".", ""),
          RADIX_10
        ),
      })
    )
    .reduce((sum, d) => sum.add(d), Dinero({ amount: 0 }));
};
