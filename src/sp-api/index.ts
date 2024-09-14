import { _spApiAccessTokenCache } from "./auth";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { Order } from "./types";
import { JSONValues } from "router/router";
import { sleep } from "bun";
import { DateTime } from "luxon";
import db, { intoDbResult } from "db";
import { env } from 'env'
import * as storage from "storage";
import { RouteError } from "errors";

const downloadFileToMemory = (filename: string) =>
  ResultAsync.fromPromise(
    storage.downloadFileToMemory(filename, env.gcp.spApiReportsBucket),
    (e) => {
      console.log(e)

      return 'gcp_download_error' as const
    }
  )
    .map((buffer) => buffer.toString('utf-8'))

const BASE_URL = "https://sellingpartnerapi-na.amazon.com";

type Marketplace = "us" | "ca";

// https://developer-docs.amazon.com/sp-api/docs/marketplace-ids
const MARKETPLACE_MAP: Record<Marketplace, string> = {
  ca: "A2EUQ1WTGCTBG2",
  us: "ATVPDKIKX0DER",
};

const makeUrl = (
  rawUrl: string,
  queryParams?: Record<string, string | number | string[] | undefined>
) => {
  const url = new URL(rawUrl);

  if (queryParams) {
    Object.entries(queryParams)
      .filter(([_, v]) => v !== undefined)
      .forEach(([key, value]) => {
        const val = Array.isArray(value) ? value.join(",") : value + "";

        return url.searchParams.append(key, val);
      });
  }

  return url;
};

type AmazonApiError = "rate_limit_exceeded" | "other" | "access_token_missing";
type AmzResult<T> = ResultAsync<T, AmazonApiError>;

const post = <T>(
  sellerId: string,
  path: string,
  body: Record<string, JSONValues>,
  params: Record<string, string | string[] | undefined> = {}
): AmzResult<T> => {
  const url = makeUrl(BASE_URL + path, params).toString();

  const accessToken = _spApiAccessTokenCache[sellerId]?.accessToken;

  if (accessToken === undefined) {
    return errAsync("access_token_missing");
  }

  return ResultAsync.fromPromise(
    fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-amz-access-token": `${accessToken}`,
      },
      body: JSON.stringify(body),
    }),
    () => "other" as const
  ).andThen((response) => {
    if (response.ok) {
      return ResultAsync.fromSafePromise(response.json() as Promise<T>);
    }

    response
      .json()
      .then((b) => console.log("> BODY:\n", JSON.stringify(b, null, 2)));

    if (response.status === 429) {
      // maybe do exp backoff with three attempts?
      return errAsync("rate_limit_exceeded" as const);
    }

    return errAsync("other" as const);
  });
};

const get = <T>(
  sellerId: string,
  path: string,
  params: Record<string, string | string[] | undefined> = {}
  //   retryConfig: RetryConfig | undefined = undefined
): AmzResult<T> => {
  const url = makeUrl(BASE_URL + path, params).toString();

  const accessToken = _spApiAccessTokenCache[sellerId]?.accessToken;

  if (accessToken === undefined) {
    return errAsync("access_token_missing");
  }

  return ResultAsync.fromPromise(
    fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-amz-access-token": `${accessToken}`,
      },
    }),
    () => "other" as const
  ).andThen((response) => {
    if (response.ok) {
      return ResultAsync.fromSafePromise(response.json() as Promise<T>);
    }

    response
      .json()
      .then((b) => console.log("> BODY:\n", JSON.stringify(b, null, 2)));

    if (response.status === 429) {
      // maybe do exp backoff with three attempts?
      return errAsync("rate_limit_exceeded" as const);
    }

    return errAsync("other" as const);
  });
};

export interface GetOrdersResponse {
  payload: {
    Orders: Order[];
    NextToken?: string | null;
  };
}
export const getOrdersForMarketplaces = (
  sellerId: string,
  paginationToken?: string
): AmzResult<GetOrdersResponse> => {
  const queryParams: Record<string, string> = {
    CreatedAfter: "2020-01-01",
  };

  if (paginationToken) {
    queryParams["NextToken"] = paginationToken;
  }

  return get(
    sellerId,
    `/orders/v0/orders?MarketplaceIds=${MARKETPLACE_MAP.us},${MARKETPLACE_MAP.ca}`,
    queryParams
  );
};

interface Price {
  amount: number;
  currencyCode: "CAD" | "USD";
}

export interface Metric {
  interval: string;
  unitCount: number;
  orderItemCount: number;
  orderCount: number;
  averageUnitPrice: Price;
  totalSales: Price;
}

interface OrderMetricsResponse {
  payload: Metric[];
}

interface GetOrderMetricsConfig {
  asin?: string;
  start: Date;
  end: Date;
}

export const getOrderMetrics = (
  sellerId: string,
  config: GetOrderMetricsConfig
): AmzResult<OrderMetricsResponse> => {
  const interval = `${toDateStr(config.start)}T00:00:00-04:00--${toDateStr(
    config.end
  )}T00:00:00-04:00`

  return get<OrderMetricsResponse>(sellerId, `/sales/v1/orderMetrics`, {
    asin: config.asin,
    // FIXME: add both US & canada
    marketplaceIds: MARKETPLACE_MAP.us,
    granularity: "Day",

    interval,

    /**
     *  NOTE
     *
     *  The granularityTimeZone value must align with the offset of the specified
     *  interval value. For example, if the interval value uses Z notation,
     *  then granularityTimeZone must be UTC. If the interval value uses an offset,
     *  then granularityTimeZone must be an IANA-compatible time zone that matches the offset.
     *  Example: US/Pacific to compute day boundaries, accounting for daylight
     *  time savings, for US/Pacific zone.
     */
    // TODO: get time zone from user
    granularityTimeZone: "America/New_York",
  });
};

const toDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed, so we add 1
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// doesn't have google cloud info .. straight from amz api
interface Report {
  reportDocumentId: string;
  reportId: string;
  reportType: string;
  processingStatus: "DONE" | "CANCELLED" | "FATAL" | "IN_PROGRESS" | "IN_QUEUE";
  marketplaceIds: string[];
  processingEndTime: string;
  dataEndTime: string;
  createdTime: string;
  processingStartTime: string;
  dataStartTime: string;
}

export const getSettlementReports = (
  sellerId: string,
  createdSince: DateTime
) => {
  // check what we have in db first
  return intoDbResult(
    db.reportDocuments.findMany({
      where: {
        sellerId,
        createdTime: {
          gte: createdSince.toJSDate(),
        },
      },
      orderBy: {
        createdTime: 'desc',
      }
    })
  )
    .andThen((savedDocs) => {
      const toFileName = (reportDocumentId: string): string =>
        `settlement-${reportDocumentId}.tsv.gz`;

      const createdSinceSpApi = savedDocs.length > 0
        ? DateTime.fromJSDate(savedDocs[0]!.createdTime).plus({ seconds: 1 })
        : createdSince

      const downloadExistingReportsFromGcp = () => ResultAsync.combine(
        savedDocs.map(d => downloadFileToMemory(toFileName(d.reportDocumentId)))
      )

      const getNewReportsFromSpAPI = () => get<{ reports: Report[]; nextToken?: string }>(
        sellerId,
        "/reports/2021-06-30/reports",
        {
          reportTypes: "GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE",
          createdSince: createdSinceSpApi.setZone("America/New_York").toISO() ?? undefined,
          processingStatuses: "DONE",
          pageSize: 100 + "",
        }
      )

      return ResultAsync.combine([
        getNewReportsFromSpAPI(),
        downloadExistingReportsFromGcp()
      ])
        .mapErr((e): RouteError => {
          console.log('> ', e)

          return {
            type: 'Other',
            context: e,
          }
        })
    }
    )
    .andThen(([{ reports, nextToken }, existingReports]) => {
      console.log("> Existing reports fetched: " + existingReports.length)
      console.log("> sp-api reports to download: " + reports.length);
      console.log("> has next token? ", !!nextToken);
      console.log(reports);

      ///////////////////////////
      // the "download document" endpoint has a burst limit of 15
      // hence if we request more than 15, we'll end up with failed requests
      // https://developer-docs.amazon.com/sp-api/docs/reports-api-v2021-06-30-reference#get-reports2021-06-30documentsreportdocumentid
      if (reports.length > 15) {
        return errAsync(
          "Downloading more than 15 reports in one go is not yet supported"
        );
      }

      return ResultAsync.combine(
        reports.map((report) =>
          downloadDocument(sellerId, report?.reportDocumentId ?? "").map(
            (content) => ({ content, meta: report })
          )
        )
      ).andThen(
        (reportContents) => saveDocuments(sellerId, reportContents)
      )
        // lastly; combine the recently-downloaded docs (downloaded from sp-pi),
        // with the existing docs from gcp to produce a single list of tab-separated
        // files / buffers
        .map((newSettlementDocs) => newSettlementDocs.concat(existingReports))
    })
    .mapErr((a) => {
      console.log("> error: " + JSON.stringify(a, null, 2));
      return a;
    });
};

// save many files at once to google cloud storage
// one single req
const saveDocuments = (
  sellerId: string,
  docs: { content: string; meta: Report }[]
): ResultAsync<string[], any> => {
  if (docs.length === 0) {
    console.log('No new docs to save')
    return okAsync([])
  }

  console.log("> Saving ...");

  const toFileName = ({ reportDocumentId }: Report): string =>
    `settlement-${reportDocumentId}.tsv.gz`;

  const files = docs.map(({ content, meta }) => ({
    content,
    fileName: toFileName(meta),
  }));

  const upload = () =>
    ResultAsync.fromPromise(
      storage.uploadManyFiles(env.gcp.spApiReportsBucket, files),
      (a): RouteError => {
        console.log(a);
        return { type: 'Other', context: "gcp_upload_error" };
      }
    );

  const saveToDb = () =>
    intoDbResult(
      db.reportDocuments.createMany({
        data: docs.map(({ meta }) => ({ ...meta, sellerId })),
      })
    ).mapErr((): RouteError => ({ type: 'Other', context: "prisma_insert_error" }));

  return upload()
    .andThen(() => saveToDb())
    .map(() => docs.map((doc) => doc.content));
};

export const getReport = (sellerId: string, _reportType: "current_inventory") =>
  post<{ reportId: string }>(sellerId, "/reports/2021-06-30/reports", {
    reportType: "GET_FLAT_FILE_OPEN_LISTINGS_DATA",
    marketplaceIds: [MARKETPLACE_MAP.us],
  })
    .map((a) => {
      console.log("> NICE");
      console.log(a);
      return a.reportId;
    })
    .andThen((reportId) => waitForProcessingFinished(sellerId, reportId))
    .andThen((reportDocumentId) =>
      downloadDocument(sellerId, reportDocumentId)
    );

interface ReportDocument {
  reportDocumentId: string;
  url: string;
  compressionAlgorithm?: string;
}
const downloadDocument = (sellerId: string, reportDocumentId: string) =>
  get<ReportDocument>(
    sellerId,
    `/reports/2021-06-30/documents/${reportDocumentId}`
  ).andThen((a) => {
    // I haven't implemented this yet
    if (typeof a.compressionAlgorithm === "string") {
      return errAsync("Found a file w a compression algo");
    }

    const p = async (): Promise<string> => {
      const response = await fetch(a.url);

      if (response.ok) {
        return response.text();
      } else {
        throw new Error("Unable to download data");
      }
    };

    return ResultAsync.fromSafePromise(p());
  });

type ReportProcessingStatus =
  | {
    processingStatus: "CANCELLED" | "FATAL" | "IN_PROGRESS" | "IN_QUEUE";
  }
  | {
    processingStatus: "DONE";
    reportDocumentId: string;
  };

const getReportProcessingStatus = (sellerId: string, reportId: string) =>
  get<ReportProcessingStatus>(
    sellerId,
    `/reports/2021-06-30/reports/${reportId}`
  );

const waitForProcessingFinished = (
  sellerId: string,
  reportId: string
): AmzResult<string> => {
  const asyncLoop = async () => {
    while (true) {
      console.log("> looping ...");

      const processingStatusResult = await getReportProcessingStatus(
        sellerId,
        reportId
      );

      if (processingStatusResult.isOk()) {
        const status = processingStatusResult.value.processingStatus;
        console.log("    status: " + status + "\n");

        // TODO: handle cancelled & fatal scenarios
        if (status === "DONE") {
          return processingStatusResult.value.reportDocumentId;
        } else if (status === "CANCELLED" || status === "FATAL") {
          console.log(processingStatusResult.value);
          throw new Error("wtf");
        }
      } else {
        // TODO: handle when request to get status fails
      }

      await sleep(3 * 1000);
    }
  };

  return ResultAsync.fromSafePromise(asyncLoop());
};
