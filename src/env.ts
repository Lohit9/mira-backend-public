// fetch tokens asynchronously in production / gcp environment
// locally do so via process.env

export interface Env {
  server: {
    port: number
  }
  gcp: {
    spApiReportsBucket: string
  }
}

const parseInt_ = (envName: string): number => {
  const BASE_10 = 10

  const raw = Bun.env[envName]

  if (raw === undefined) {
    throw new Error(`${envName} env var not set`)
  }

  return parseInt(raw, BASE_10)
}

/*
const parseString = (envName: string): string => {
  const raw = Bun.env[envName]

  if (raw === undefined) {
    throw new Error(`${envName} env var not set`)
  }

  return raw
}
*/

const testEnv: Env = {
  server: {
    port: 12345,
  },
  gcp: {
    spApiReportsBucket: 'testing-123'
  }
}

export const env: Env =
  Bun.env.NODE_ENV === 'test'
    ? testEnv
    : {
        server: {
          port: parseInt_('SERVER_PORT'),
        },
        gcp: {
          spApiReportsBucket: process.env.NODE_ENV === 'production' ? 'live-sp-api-reports' : 'dev-sp-api-reports'
        }
      }
