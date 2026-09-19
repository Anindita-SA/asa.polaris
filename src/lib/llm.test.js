// @vitest-environment jsdom
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
        { id: 'llama-3.1-8b-instant' }, // This is now highest priority
        { id: 'custom-model-x' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('llama-3.1-8b-instant');
  });

  it('should fallback to first valid available model if no priorities match', async () => {
    const mockModels = {
      data: [
        { id: 'custom-model-y' },
        { id: 'custom-model-z' }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockModels
    });

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('custom-model-y');
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
    expect(model).toBe('llama-3.3-70b-versatile');
  });

  it('should fallback to hardcoded string if fetch throws network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const model = await getBestGroqModel('fake-key');
    expect(model).toBe('llama-3.3-70b-versatile');
  });
});

describe('getGroqKey and getGeminiKey', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads groq key strictly from localStorage and returns null when empty', async () => {
    const { getGroqKey } = await import('./llm');
    expect(getGroqKey()).toBeNull();

    localStorage.setItem('polaris_groq_api_key', 'gsk_test_123');
    expect(getGroqKey()).toBe('gsk_test_123');
  });

  it('reads gemini key strictly from localStorage and returns null when empty', async () => {
    const { getGeminiKey } = await import('./llm');
    expect(getGeminiKey()).toBeNull();

    localStorage.setItem('polaris_gemini_api_key', 'AIza_test_456');
    expect(getGeminiKey()).toBe('AIza_test_456');
  });
});

describe('generateLlmResponse routing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('invokes supabase llm-proxy when no BYOK keys are in localStorage', async () => {
    const { generateLlmResponse } = await import('./llm');
    const { supabase } = await import('./supabase');

    const invokeSpy = vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke').mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: '{"status": "ok"}' } }]
      },
      error: null
    });

    const res = await generateLlmResponse('Hello AI', true);
    expect(invokeSpy).toHaveBeenCalledWith('llm-proxy', {
      body: {
        promptOrMessages: 'Hello AI',
        asJson: true,
        maxTokens: 1024,
        systemPrompt: null
      }
    });
    expect(res.choices[0].message.content).toBe('{"status": "ok"}');
  });

  it('throws clean error when llm-proxy returns error', async () => {
    const { generateLlmResponse } = await import('./llm');
    const { supabase } = await import('./supabase');

    vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke').mockResolvedValueOnce({
      data: null,
      error: { message: 'Proxy edge function error' }
    });

    await expect(generateLlmResponse('Hello AI', true)).rejects.toThrow(/LLM proxy failed/);
  });
});
