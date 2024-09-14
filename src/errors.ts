import { match } from 'ts-pattern'

export type BadRequestHttpError = {
  type: 'application_error'
  message: string
}

export type RouteError =
  | { type: 'NotFound'; context?: string }
  | { type: 'Conflict'; context?: string }
  | { type: 'Other'; error?: Error; context: string }
  | { type: 'Forbidden' }
  | { type: 'BadRequest'; payload: BadRequestHttpError }
  | { type: 'Unauthorized' }

export type DomainError = { type: 'InvalidUserInvite' }

export const isRouteError = (err: unknown): err is RouteError =>
  match(err)
    .with(
      { type: 'NotFound' },
      { type: 'Conflict' },
      { type: 'MissingHeader' },
      { type: 'InvalidToken' },
      { type: 'InvalidSession' },
      { type: 'Forbidden' },
      { type: 'Other' },
      { type: 'BadRequest' },
      () => true
    )
    .otherwise(() => false)

export const notFound = (context?: string): RouteError => ({
  type: 'NotFound',
  context,
})

export const conflict = (context?: string): RouteError => ({
  type: 'Conflict',
  context,
})

export const other = (context: string, error?: Error): RouteError => ({
  type: 'Other',
  context,
  error,
})

export const badRequest = (context: string): RouteError => applicationError(context)

export const forbidden = (): RouteError => ({
  type: 'Forbidden',
})

export const applicationError = (message: string): RouteError => ({
  type: 'BadRequest',
  payload: {
    type: 'application_error',
    message,
  },
})

export default {
  notFound,
  conflict,
  other,
  badRequest,
  forbidden,
  applicationError,
}
