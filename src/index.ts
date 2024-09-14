import { initServer } from 'routes'
import { initAccessTokenSync } from 'sp-api/auth'
import { timePeriodRanges, yearValues } from 'time-periods'

if (process.env.NODE_ENV === 'development') {
  console.log('YEARS')
  console.log(yearValues.join(','))

  console.log('TIME PERIODS')
  console.log(timePeriodRanges.join(','))
}

initAccessTokenSync()
initServer()