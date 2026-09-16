import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBestGroqModel } from './llm';

describe('getBestGroqModel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return highest priority model when available', async () => {
    const mockModels = {
      data: [
        { id: 'llama-3.1-8b-instant' },
        { id: 'llama-3.1-70b-versatile' },
        { id: 'llama-3.3-70b-versatile' }, // This is highest priority
        { id: 'mixtral-8x7b-32768' },
        { id: 'qwen-2.5-32b' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('llama-3.3-70b-versatile');
    expect(fetch).toHaveBeenCalledWith('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': 'Bearer fake-key' }
    });
  });

  it('should fallback to next priority if top priority is missing', async () => {
    const mockModels = {
      data: [
        { id: 'llama-3.1-8b-instant' },
        { id: 'llama-3.1-70b-versatile' }, // This is now highest priority
        { id: 'mixtral-8x7b-32768' },
        { id: 'qwen-2.5-32b' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('llama-3.1-70b-versatile');
  });

  it('should fallback to mixtral if no llama-70b or qwen-32b available', async () => {
    const mockModels = {
      data: [
        { id: 'llama-3.1-8b-instant' }, // Priority: 'llama-3.1'
        { id: 'mixtral-8x7b-32768' }    // Priority: 'mixtral-8x7b' (higher than generic llama)
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('mixtral-8x7b-32768');
  });

  it('should fallback to first available if no priorities match', async () => {
    const mockModels = {
      data: [
        { id: 'gemma-7b-it' },
        { id: 'custom-model-x' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('gemma-7b-it');
  });

  it('should fallback to hardcoded string if API returns non-200', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('llama-3.1-70b-versatile');
  });

  it('should fallback to hardcoded string if fetch throws network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('llama-3.1-70b-versatile');
  });
});
