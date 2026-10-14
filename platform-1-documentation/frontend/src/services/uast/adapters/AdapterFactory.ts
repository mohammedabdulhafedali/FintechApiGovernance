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
    for (const adapter of this.adapters) {
      if (adapter.canHandle(formatHint, rawContent)) {
        return adapter;
      }
    }
    // Fallback to RawJsonAdapter
    return this.adapters.find(a => a instanceof RawJsonAdapter)!;
  }

  public parse(rawContent: string, formatHint = 'auto', defaultMeta?: Partial<UastDocument>): UastDocument {
    const adapter = this.resolve(formatHint, rawContent);
    return adapter.parseToAst(rawContent, defaultMeta);
  }
}

export const uastAdapterFactory = AdapterFactory.getInstance();
