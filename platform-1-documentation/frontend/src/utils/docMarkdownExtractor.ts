/**
 * Extracts structured documentation sections dynamically from live Markdown source code.
 * Adheres to SOLID principles: Single Responsibility for document metadata extraction.
 */

export interface ExtractedDocMetadata {
  title?: string;
  platform?: string;
  lastUpdated?: string;
  version?: string;
  overview?: string;
  baseUrl?: string;
  customHeadersRaw?: string;
  customPythonSdk?: string;
}

export function extractDocMetadataFromMarkdown(markdown: string): ExtractedDocMetadata {
  if (!markdown || typeof markdown !== 'string') {
    return {};
  }

  const result: ExtractedDocMetadata = {};

  // 1. Title: first # Heading
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // 2. Platform: **Platform Name** under title
  const platformMatch = markdown.match(/\*\*([^*]+)\*\*/);
  if (platformMatch) {
    result.platform = platformMatch[1].trim();
  }

  // 3. Last update: "latest update <date>" or "آخر تحديث <date>"
  const updateMatch = markdown.match(/(?:latest\s*update|آخر\s*تحديث)\s*[:：]?\s*([^\n\r]+)/i);
  if (updateMatch) {
    result.lastUpdated = updateMatch[1].trim();
  }

  // 4. Base URL: match URL under "Base URL" or code blocks
  const baseUrlMatch = markdown.match(/(?:Base\s*URL|عنوان\s*الخادم)[\s\S]*?(https?:\/\/[^\s`\n\r]+)/i);
  if (baseUrlMatch) {
    result.baseUrl = baseUrlMatch[1].trim();
  }

  // 5. Overview: text between ## Overview and next ## heading
  const overviewMatch = markdown.match(/##\s*Overview\s*\n([\s\S]*?)(?=\n##|\n###|$)/i);
  if (overviewMatch) {
    const rawOverview = overviewMatch[1]
      .replace(/^[#\s*-]+/gm, '')
      .replace(/[*_`]/g, '')
      .trim();
    if (rawOverview.length > 10) {
      result.overview = rawOverview;
    }
  }

  // 6. Python SDK implementation block
  const pythonMatch = markdown.match(/```python\s*([\s\S]*?)```/i);
  if (pythonMatch) {
    result.customPythonSdk = pythonMatch[1].trim();
  }

  return result;
}
