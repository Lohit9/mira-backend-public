import { getSettlementReports } from "sp-api";
import { initAccessTokenSync } from "sp-api/auth";
import { DateTime } from "luxon";
import { _printFeesTimeSeries, processAllCsvReports } from 'data-processing/settlement-reports'

await initAccessTokenSync();

setTimeout(() => {
  const go = async () => {
    console.log("getting report");
    // zbk
    // A81H5T924C6JL
    //
    // penguinni
    // A304MML04MKFZ2

    const sellerId = "A81H5T924C6JL";

    const ref = DateTime.now().minus({ days: 40 });
    const docResult = await getSettlementReports(sellerId, ref);

    if (docResult.isOk()) {
      const ts = processAllCsvReports(docResult.value)

      _printFeesTimeSeries(ts)
    } else {
      throw new Error(docResult.error);
    }
  };

  go();
}, 2000);
