import { PrismaClient } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { ResultAsync } from 'neverthrow'

const db = new PrismaClient()

export default db

type DbError =
  | { type: 'NotFound' }
  | { type: 'Conflict' }
  | { type: 'Other'; error?: Error; context: string }

export type DbResult<T> = ResultAsync<T, DbError>

export const intoDbResult = <T>(query: PromiseLike<T>): DbResult<T> =>
  ResultAsync.fromPromise(query, (err) => {
    console.log(err)

    if (err instanceof PrismaClientKnownRequestError) {
      console.log('Code: ', err.code)
    }

    return {
      type: 'Conflict',
    }
  })

export const notFound = (): DbError => ({ type: 'NotFound' })
export const conflict = (): DbError => ({ type: 'Conflict' })
export const other = (ctx: string): DbError => ({ type: 'Other', context: ctx })
