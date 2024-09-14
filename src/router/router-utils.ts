import { ResultAsync, errAsync, okAsync } from 'neverthrow'
import routeErrors, {
  badRequest,
  BadRequestHttpError,
  isRouteError,
  RouteError,
} from 'errors'
import { match } from 'ts-pattern'
import { identity } from 'utils'
import _ from 'lodash'

export const getParam = (
  key: string,
  params: Record<string, string | undefined>
): ResultAsync<string, RouteError> => {
  const val = params[key]

  if (val === undefined) return errAsync(badRequest(`Missing value for '${key}'`))

  return okAsync(val)
}

export interface Utils {
  intoRouteError: (dbErrorInfo: ApiError) => RouteError
}

export type RouteResult<T> = ResultAsync<T, RouteError>

export type ApiError = RouteError

export const intoRouteError = (anyApiError: ApiError): RouteError =>
  match(anyApiError)
    .with({ type: 'NotFound' }, ({ context }) => routeErrors.notFound(context))
    .with({ type: 'Conflict' }, (_err) => routeErrors.conflict())
    .with({ type: 'Other' }, (_err) => routeErrors.other('other'))
    .with({ type: 'Forbidden' }, () => routeErrors.forbidden())
    .with({ type: 'BadRequest' }, () => routeErrors.badRequest('bad req'))
    .when(isRouteError, identity)
    .exhaustive()

type ErrorStatusCode = 400 | 401 | 402 | 403 | 404 | 409 | 500 | 599

type RouteErrorHttpResponse =
  | { statusCode: 400; error: BadRequestHttpError }
  | { statusCode: Exclude<ErrorStatusCode, 400>; errorMsg: string }

export const mapRouteError = (err: RouteError): RouteErrorHttpResponse => {
  switch (err.type) {
    case 'Unauthorized': {
      return {
        statusCode: 401,
        errorMsg: 'Unauthorized',
      }
    }

    case 'BadRequest': {
      return {
        statusCode: 400,
        error: err.payload,
      }
    }

    case 'Conflict': {
      return {
        statusCode: 409,
        errorMsg: 'Conflict',
      }
    }

    case 'NotFound': {
      const withMaybeContext = err.context ? ` - ${err.context}` : ''

      return {
        statusCode: 404,
        errorMsg: `Not Found${withMaybeContext}`,
      }
    }

    case 'Forbidden': {
      return {
        statusCode: 403,
        errorMsg: 'You do not have access to this resource.',
      }
    }

    case 'Other': {
      return {
        statusCode: 500,
        errorMsg: 'An Internal Error Occurred :(',
      }
    }
  }
}
