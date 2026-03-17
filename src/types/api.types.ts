import type { ApiError } from './common.types'

// generic API response wrapper

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
}

export interface ApiListResponse<T> {
  data: T[]
  total: number
  error: ApiError | null
}

// health check

export interface HealthCheckResponse {
  ok: boolean
  timestamp: string
  version: string
}

// push subscription

export interface PushSubscribeRequest {
  subscription: {
    endpoint: string
    keys: {
      auth: string
      p256dh: string
    }
  }
}

export interface PushSubscribeResponse {
  ok: boolean
}

// reminder function

export interface SendRemindersResponse {
  ok: boolean
  processed: number
}

// auth

export interface AuthLoginRequest {
  email: string
  password: string
}

export interface AuthRegisterRequest {
  email: string
  password: string
  full_name: string
  bar_number?: string
  timezone?: string
}

export interface AuthForgotPasswordRequest {
  email: string
}

// document upload

export interface DocumentUploadRequest {
  case_id: string
  name: string
  file_size: number
  mime_type: string
  doc_type: string
}

export interface DocumentUploadResponse {
  upload_url: string
  file_path: string
  document_id: string
}

export interface SignedUrlResponse {
  signed_url: string
  expires_at: string
}
