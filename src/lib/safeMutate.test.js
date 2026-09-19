import { describe, it, expect, vi, beforeEach } from 'vitest'
import { safeMutate } from './safeMutate'

describe('safeMutate helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles successful Supabase mutation response', async () => {
    const mockData = { id: 'item-1', title: 'Test Task' }
    const promise = Promise.resolve({ data: mockData, error: null })
    const onSuccess = vi.fn()

    const result = await safeMutate(promise, { onSuccess, context: 'createTask' })

    expect(result).toEqual({
      data: mockData,
      error: null,
      isSuccess: true
    })
    expect(onSuccess).toHaveBeenCalledWith(mockData)
  })

  it('handles Supabase error response without throwing by default', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockError = { message: 'Row level security violation', code: '42501' }
    const promise = Promise.resolve({ data: null, error: mockError })
    const onError = vi.fn()

    const result = await safeMutate(promise, { onError, context: 'updateTask' })

    expect(result).toEqual({
      data: null,
      error: mockError,
      isSuccess: false
    })
    expect(onError).toHaveBeenCalledWith(mockError)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[safeMutate: updateTask] Mutation failed:',
      mockError
    )

    consoleSpy.mockRestore()
  })

  it('handles rejected promise as an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const networkError = new Error('Network offline')
    const promise = Promise.reject(networkError)
    const onError = vi.fn()

    const result = await safeMutate(promise, { onError })

    expect(result).toEqual({
      data: null,
      error: networkError,
      isSuccess: false
    })
    expect(onError).toHaveBeenCalledWith(networkError)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[safeMutate] Mutation failed:',
      networkError
    )

    consoleSpy.mockRestore()
  })

  it('throws error when throwOnError is true on Supabase error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockError = new Error('Database connection timed out')
    const promise = Promise.resolve({ data: null, error: mockError })
    const onError = vi.fn()

    await expect(
      safeMutate(promise, { throwOnError: true, onError, context: 'criticalInsert' })
    ).rejects.toThrow('Database connection timed out')

    expect(onError).toHaveBeenCalledWith(mockError)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[safeMutate: criticalInsert] Mutation failed:',
      mockError
    )

    consoleSpy.mockRestore()
  })

  it('throws error when throwOnError is true on rejected promise', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const promise = Promise.reject(new Error('Rejected error'))

    await expect(
      safeMutate(promise, { throwOnError: true })
    ).rejects.toThrow('Rejected error')

    consoleSpy.mockRestore()
  })

  it('accepts a function returning a promise', async () => {
    const fn = () => Promise.resolve({ data: { count: 5 }, error: null })
    const result = await safeMutate(fn)

    expect(result).toEqual({
      data: { count: 5 },
      error: null,
      isSuccess: true
    })
  })

  it('safely handles throwing callbacks without crashing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const throwingOnSuccess = () => {
      throw new Error('Callback failed')
    }

    const result = await safeMutate(
      Promise.resolve({ data: { id: 1 }, error: null }),
      { onSuccess: throwingOnSuccess, context: 'throwTest' }
    )

    expect(result.isSuccess).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      '[safeMutate: throwTest] onSuccess callback threw:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('handles non-Supabase resolved object response', async () => {
    const rawResult = { success: true }
    const result = await safeMutate(Promise.resolve(rawResult))

    expect(result).toEqual({
      data: rawResult,
      error: null,
      isSuccess: true
    })
  })
})
