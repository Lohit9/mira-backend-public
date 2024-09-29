import { ResultAsync } from 'neverthrow';
import * as spApi from 'sp-api';
import Dinero from 'dinero.js';
import { RouteError } from 'errors';

const MONEY_FORMAT = "$0,0.00";

export const handleCalculateAverageSalesPrice = (sellerId: string): ResultAsync<{ response: string }, RouteError> => {
  // We'll use a default time range of the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const config = {
    startDate,
    endDate,
  };

  return spApi.getOrderMetrics(sellerId, config)
    .map(({ payload }) => {
      const totalSales = getSalesValue(payload);
      const totalUnits = getUnitsSold(payload);

      if (totalUnits === 0) {
        return {
          response: "No sales data available for the given period."
        };
      }

      const averagePrice = totalSales.divide(totalUnits);

      return {
        response: `The average sales price for the last 30 days is ${averagePrice.toFormat(MONEY_FORMAT)}.`
      };
    })
    .mapErr((e): RouteError => {
      console.error("Error calculating average sales price:", e);
      return { type: "Other", context: "Error calculating average sales price" };
    });
};

const getUnitsSold = (data: spApi.Metric[]): number =>
  data.reduce((sum, metric) => sum + metric.unitCount, 0);

const getSalesValue = (data: spApi.Metric[]): Dinero.Dinero => {
  const RADIX_10 = 10;
  return data
    .reduce((sum, { totalSales }) => 
      sum.add(Dinero({
        amount: parseInt(totalSales.amount.toString().replace(".", ""), RADIX_10),
      }))
    , Dinero({ amount: 0 }));
};
