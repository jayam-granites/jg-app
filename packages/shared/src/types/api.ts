export type ApiResponse<T> = {
  data: T
  message?: string
}

export type ApiError = {
  error: {
    code: string
    message: string
  }
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number
  page: number
  pageSize: number
}
