
export type OnFetchDataType = {
  url: string
  status: number
  statusText: string
  method: 'POST' | 'GET'
  body: any,
  elapsedTime: number,
  traceId?: string,
  response: any
}

export type OnBeforeProps = {
  url: string
  method: 'POST' | 'GET'
  options?: RequestInit
}
