/**
 * Safe wrapper for Supabase mutations and async operations.
 *
 * @param {Promise<any>|Function} queryPromise - Supabase query promise, thenable, or async function.
 * @param {Object} [options={}] - Options configuration.
 * @param {boolean} [options.throwOnError=false] - Whether to throw on error after logging.
 * @param {string} [options.context=''] - Context tag for error logging.
 * @param {Function} [options.onSuccess] - Callback invoked with data on successful mutation.
 * @param {Function} [options.onError] - Callback invoked with error on failure.
 * @returns {Promise<{ data: any, error: any, isSuccess: boolean }>} Mutation result.
 */
export async function safeMutate(queryPromise, options = {}) {
  const {
    throwOnError = false,
    context = '',
    onSuccess,
    onError
  } = options

  let rawData = null
  let rawError = null

  try {
    const promise = typeof queryPromise === 'function' ? queryPromise() : queryPromise
    const res = await promise

    if (res && typeof res === 'object' && ('error' in res || 'data' in res)) {
      rawData = res.data ?? null
      rawError = res.error ?? null
    } else {
      rawData = res ?? null
      rawError = null
    }
  } catch (err) {
    rawData = null
    rawError = err
  }

  if (rawError) {
    const contextPrefix = context ? `[safeMutate: ${context}]` : '[safeMutate]'
    console.error(`${contextPrefix} Mutation failed:`, rawError)

    if (typeof onError === 'function') {
      try {
        onError(rawError)
      } catch (callbackErr) {
        console.error(`${contextPrefix} onError callback threw:`, callbackErr)
      }
    }

    if (throwOnError) {
      throw rawError
    }

    return {
      data: rawData,
      error: rawError,
      isSuccess: false
    }
  }

  if (typeof onSuccess === 'function') {
    try {
      onSuccess(rawData)
    } catch (callbackErr) {
      const contextPrefix = context ? `[safeMutate: ${context}]` : '[safeMutate]'
      console.error(`${contextPrefix} onSuccess callback threw:`, callbackErr)
    }
  }

  return {
    data: rawData,
    error: null,
    isSuccess: true
  }
}

export default safeMutate
