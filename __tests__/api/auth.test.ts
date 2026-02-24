import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { POST as registerHandler } from '@/app/api/auth/register/route'
import { prisma } from '@/lib/prisma'

describe('Auth API', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test@' } }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        },
      })

      const response = await registerHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('User created successfully')
      expect(data.user).toHaveProperty('id')
      expect(data.user.email).toBe('test@example.com')
    })

    it('should return error for invalid input', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          name: 'T', // Too short
          email: 'invalid-email',
          password: '123', // Too short
        },
      })

      const response = await registerHandler(req as any)
      expect(response.status).toBe(400)
    })

    it('should return error for duplicate email', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          name: 'Test User 2',
          email: 'test@example.com', // Same as first test
          password: 'password123',
        },
      })

      const response = await registerHandler(req as any)
      expect(response.status).toBe(400)
    })
  })
})