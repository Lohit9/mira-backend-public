import { isObject } from './utils'
import type { JSONObject, JSONValues } from './router/router'

export const dateSerializer = (date: Date): number => date.getTime()

const objectSerializer = <T extends Record<string, unknown>>(obj: T): JSONObject =>
  Object.entries(obj).reduce((serialized, [key, val]) => {
    if (isObject(val)) {
      return {
        ...serialized,
        [key]: objectSerializer(val),
      }
    }

    if (Array.isArray(val)) {
      return {
        ...serialized,
        [key]: val.map(valueSerializer),
      }
    }

    return {
      ...serialized,
      [key]: valueSerializer(val),
    }
  }, {})

export const arraySerializer = <T>(list: T[]): JSONValues[] => list.map(valueSerializer)

export const valueSerializer = <T>(val: T): JSONValues => {
  if (val instanceof Date) {
    return dateSerializer(val)
  }

  if (typeof val === 'bigint') {
    return val.toString()
  }

  if (val === null || val === undefined) {
    return null
  }

  if (isObject(val)) {
    return objectSerializer(val)
  }

  if (Array.isArray(val)) {
    // FIXME: improve typesafety here
    return arraySerializer(val as unknown[])
  }

  // FIXME: improve typesafety here
  return val as unknown as JSONValues
}
