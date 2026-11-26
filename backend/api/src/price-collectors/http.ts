const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export class HttpStatusError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type FetchLike = typeof fetch;

export interface RequestOptions {
  timeoutMs: number;
  retries: number;
  maxBytes?: number;
  headers?: Record<string, string>;
}

const retryable = (error: unknown) =>
  !(error instanceof HttpStatusError) || error.status === 429 || error.status >= 500;

export async function requestText(fetcher: FetchLike, url: string, options: RequestOptions) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetcher(url, {
        headers: { 'user-agent': 'LabAssist-PriceCollector/0.1', ...options.headers },
        signal: controller.signal,
      });
      if (!response.ok) throw new HttpStatusError(response.status, `HTTP ${response.status} from ${new URL(url).host}`);
      const declared = Number(response.headers.get('content-length'));
      const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
      if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);
      const body = await response.text();
      if (Buffer.byteLength(body) > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`);
      return body;
    } catch (error) {
      lastError = error;
      if (attempt === options.retries || !retryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export async function requestJson(fetcher: FetchLike, url: string, options: RequestOptions): Promise<unknown> {
  const body = await requestText(fetcher, url, options);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Invalid JSON from ${new URL(url).host}`);
  }
}
