import errors from 'errors'
import { errAsync, okAsync } from 'neverthrow'
import { publicRoute } from 'router/router'
import { parseTimePeriod, timePeriodToUnixTimestamp as _timePeriodToUnixTimestamp } from 'time-periods'
import { z } from 'zod'

const queryParser = z.object({
  t1: z.string(),
  t2: z.string(),
})

export const timePeriodToUnixTimestamp = publicRoute({ queryParser }, ({ query }) => {
  const timePeriod1 = parseTimePeriod(query.t1)
  const timePeriod2 = parseTimePeriod(query.t2)

  if (timePeriod1 === null) return errAsync(errors.badRequest('invalid time period'))

  return okAsync({
    t1: _timePeriodToUnixTimestamp(timePeriod1),
    t2: timePeriod2 && _timePeriodToUnixTimestamp(timePeriod2),
  })
})