/**
 * Abstraction on top of express JS.
 *
 */
import { Request, Response } from "express";

import { Decoder } from "../parser";
import { valueSerializer } from "../serialize";
import {
  intoRouteError,
  mapRouteError,
  RouteResult,
  Utils,
} from "./router-utils";
import { z, SafeParseReturnType } from "zod";

export { passthrough } from "../parser";

/** Type generic that callers must always explicitly specify https://stackoverflow.com/a/61018992 */
export type NoInfer<T> = [T][T extends unknown ? 0 : never];

/**
 * Custom subset of the JSON spec that omits the 'password' field from JSON objects.
 *
 * source:
 *  - https://www.typescriptlang.org/play?#code/C4TwDgpgBAUgygeQHIDUCGAbArhAzlAXgCgooAfKAOywFsAjCAJxPKl2EYEtKBzFi6hgz8odAPZiMENJRHxkCOgCsIAY2BzEqTDlwBtALpEioSLC2KV6wlADeUPQGsAXGw7ceB1-O3Y8UAF8oADI7KDA0XFwAdzFGABMAfldKCAA3JkDjVTFKdihYsTBcTjxvC2U1YBtbFlIIqNiE1wByeLRgNFFGaVUACwBCIYGWogDjIA
 *  - https://stackoverflow.com/q/58594051/4259341
 */
export type JSONValues =
  | number
  | string
  | null
  | boolean
  | JSONObject
  | JSONValues[];

export type JSONObject = { [k: string]: JSONValues } & { password?: never };

export interface RequestData<B = null, Q = null, U = null> {
  body: B;
  query: Q;
  params: Record<string, string | undefined>;
  utils: Utils;
  user: U;
}

export type RouteHandler<T, B = unknown, Q = unknown, U = unknown> = (
  data: RequestData<B, Q, U>
) => RouteResult<T>;

/*
 * Sends appropriate HTTP responses for a RouteHandler<T>
 */
const handleHandlerResult = <T>(
  handlerResult: RouteResult<T>,
  _req: Request,
  res: Response
): void => {
  const serializer = valueSerializer;

  handlerResult.match(
    (data) => {
      res.status(200).json(serializer(data));
    },

    (error) => {
      const httpError = mapRouteError(error);

      const { statusCode } = httpError;

      const payload =
        httpError.statusCode === 400
          ? httpError.error
          : { error: httpError.errorMsg };
      res.status(statusCode as number).json(payload);
    }
  );
};

export interface PublicRouteConfig<B, Q> {
  parser?: Decoder<B>;
  queryParser?: Decoder<Q>;
}

export const publicRoute =
  <$Out, $Body = unknown, $Query = unknown>(
    { parser, queryParser }: PublicRouteConfig<$Body, $Query>,
    handler: RouteHandler<$Out, $Body, $Query>
  ) =>
  (req: Request, res: Response) => {
    const requestBodyDecodeResult: SafeParseReturnType<$Body, $Body> = (
      parser ?? z.any()
    ).safeParse(req.body);

    if (!requestBodyDecodeResult.success) {
      res.status(400).json({
        error: requestBodyDecodeResult.error.errors,
      });

      return;
    }

    const query =
      queryParser === undefined ? null : queryParser.safeParse(req.query);

    if (query !== null) {
      if (query.success === false) {
        res.status(400).json({
          error: "Invalid query params",
        });

        return;
      }
    }

    const queryValue = query === null ? (null as $Query) : query.data;

    const routeResult = handler({
      body: requestBodyDecodeResult.data,
      query: queryValue,
      params: req.params,
      utils: {
        intoRouteError,
      },
      user: null,
    })

    handleHandlerResult(routeResult, req, res);
  }
