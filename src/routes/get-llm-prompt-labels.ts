import { publicRoute } from 'router/router'
import { yearValues, timePeriodRanges } from '../time-periods'
import { okAsync } from 'neverthrow'

export const getLLMPromptLabels = publicRoute({}, () => {
  return okAsync({
    timePeriodRanges: timePeriodRanges.join(','),
    yearValues: yearValues.join(','),
  })
})