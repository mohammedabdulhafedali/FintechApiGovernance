import { IFormatAdapter } from './IFormatAdapter';
import { RawJsonAdapter } from './RawJsonAdapter';
import { OpenApiAdapter } from './OpenApiAdapter';
import { PostmanJsonAdapter } from './PostmanJsonAdapter';
import { XmlSoapAdapter } from './XmlSoapAdapter';
import { MarkdownAdapter } from './MarkdownAdapter';
import { UastDocument } from '../types';

export class AdapterFactory {
  private static instance: AdapterFactory;
  private adapters: IFormatAdapter[] = [];

  private constructor() {
    // Register default deterministic zero-AI adapters (Order matters for sniff priority)
    this.register(new OpenApiAdapter());
    this.register(new PostmanJsonAdapter());
    this.register(new XmlSoapAdapter());
    this.register(new MarkdownAdapter());
    this.register(new RawJsonAdapter()); // fallback JSON parser
  }

  public static getInstance(): AdapterFactory {
    if (!AdapterFactory.instance) {
      AdapterFactory.instance = new AdapterFactory();
    }
    return AdapterFactory.instance;
  }

  public register(adapter: IFormatAdapter): void {
    // Insert at beginning so custom adapters take precedence
    this.adapters.unshift(adapter);
  }

  public resolve(formatHint: string, rawContent: string): IFormatAdapter {
    const trimmed = (rawContent || '').trim();

    // 1. Explicit format hint priority
    if (formatHint && formatHint !== 'auto') {
      const hint = formatHint.toLowerCase();
      const matched = this.adapters.find(a => 
        a.supportedFormats.some(f => f.toLowerCase() === hint) || a.canHandle(hint, trimmed)
      );
      if (matched) return matched;
    }

    // 2. Format autodetection
    for (const adapter of this.adapters) {
      if (adapter.canHandle(formatHint, trimmed)) {
        return adapter;
      }
    }

    // 3. Fallback only if content looks like JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const jsonAdapter = this.adapters.find(a => a instanceof RawJsonAdapter);
      if (jsonAdapter) return jsonAdapter;
    }

    // 4. Reject unrecognized input strictly
    throw new Error('صيغة المدخل غير مدعومة أو غير صالحة. يرجى التأكد من أن الملف أو الكود بصيغة مدعومة صالحة (JSON / OpenAPI / Markdown / XML).');
  }

  public parse(rawContent: string, formatHint = 'auto', defaultMeta?: Partial<UastDocument>): UastDocument {
    if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
      throw new Error('محتوى المدخل فارغ أو غير صالح. يرجى توفير كود أو ملف صالح.');
    }
    const adapter = this.resolve(formatHint, rawContent);
    return adapter.parseToAst(rawContent, defaultMeta);
  }
}

export const uastAdapterFactory = AdapterFactory.getInstance();
