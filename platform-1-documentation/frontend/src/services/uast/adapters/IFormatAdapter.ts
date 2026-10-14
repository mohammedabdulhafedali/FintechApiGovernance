import { UastDocument } from '../types';

export interface IFormatAdapter {
  readonly adapterName: string;
  readonly supportedFormats: string[];
  canHandle(formatHint: string, rawContent: string): boolean;
  parseToAst(rawContent: string, defaultMeta?: Partial<UastDocument>): UastDocument;
}
