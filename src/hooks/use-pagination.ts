'use client'

import { useState, useCallback } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/app'

export interface PaginationState {
  page: number
  pageSize: number
  offset: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  setTotal: (total: number) => void
}

export function usePagination(initialPageSize = DEFAULT_PAGE_SIZE): PaginationState {
  const [page, setPage] = useState(0)
  const [total, setTotalState] = useState(0)
  const pageSize = initialPageSize

  const offset = page * pageSize
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasNextPage = page < totalPages - 1
  const hasPrevPage = page > 0

  const nextPage = useCallback(() => {
    setPage((p) => (p < totalPages - 1 ? p + 1 : p))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPage((p) => (p > 0 ? p - 1 : 0))
  }, [])

  const goToPage = useCallback(
    (target: number) => {
      setPage(Math.max(0, Math.min(target, totalPages - 1)))
    },
    [totalPages],
  )

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal)
  }, [])

  return {
    page,
    pageSize,
    offset,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    setTotal,
  }
}
