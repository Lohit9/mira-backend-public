import { z, ZodType } from 'zod'

import { Result } from 'neverthrow'

export const passthrough = (): Decoder<unknown> => z.unknown()

export const mktQuery = () =>
  z.object({
    marketplace: z.union([z.literal('us'), z.literal('ca')]),
  })

export type DecodeResult<T> = Result<T, string>

export type Decoder<T> = ZodType<T>
