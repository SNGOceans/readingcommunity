import { Hono } from 'hono'

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      user_id: number
      email: string
      name: string
      is_admin: boolean
    }
  }
}

