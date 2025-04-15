/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from '@playwright/test'

export type NetworkCallResult = {
  request: Request | null
  response: Response | null
  responseJson: any
  status: number
  requestJson: any
}
