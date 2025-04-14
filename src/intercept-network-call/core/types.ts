import type { Request, Response } from '@playwright/test'

export type NetworkCallResult = {
  request: Request | null
  response: Response | null
  responseJson: unknown
  status: number
  requestJson: unknown
}
