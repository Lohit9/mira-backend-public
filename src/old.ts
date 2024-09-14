/*
import { db } from "shared";
import Dinero from "dinero.js";

export const getSalesTotal = async (_timePeriod: string) => {
  const { start, end } = { start: null, end: null } // timePeriodToDateRanges(timePeriod);

  const orderTotalSum = await db.order.aggregate({
    where: {
      orderStatus: "Shipped",
      purchaseDate: {
        gte: start,
        lte: end,
      },
      orderTotal: {
        not: null,
      },
    },
    _sum: {
      orderTotal: true,
    },
  });

  const response = Dinero({ amount: orderTotalSum._sum.orderTotal ?? 0 }).toFormat(
    "$0,0.00"
  )

  return { response };
};

*/