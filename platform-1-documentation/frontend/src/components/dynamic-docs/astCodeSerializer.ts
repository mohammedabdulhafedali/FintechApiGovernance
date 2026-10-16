import { UastDocument, IUastNode } from '../../services/uast/types';

export function serializeUastToCode(doc: UastDocument, format: string): string {
  const normalizedFormat = (format || 'json').toLowerCase();

  if (normalizedFormat === 'markdown' || normalizedFormat === 'md') {
    return serializeToMarkdown(doc);
  }

  if (normalizedFormat === 'json') {
    return serializeToJson(doc);
  }

  if (normalizedFormat === 'openapi' || normalizedFormat === 'yaml' || normalizedFormat === 'yml') {
    return serializeToOpenApiYaml(doc);
  }

  // Fallback to markdown
  return serializeToMarkdown(doc);
}

function serializeToMarkdown(doc: UastDocument): string {
  const parts: string[] = [];

  parts.push(`# ${doc.serviceName || 'API Documentation'}\n`);
  parts.push(`**${doc.serviceCode || 'SERVICE'}**\n`);
  parts.push(`latest update: ${new Date().toLocaleDateString('en-GB')}\n`);
  parts.push(`---\n`);

  if (doc.overviewText) {
    parts.push(`## Overview\n\n${doc.overviewText}\n`);
  }

  if (doc.allEndpoints && doc.allEndpoints.length > 0) {
    parts.push(`## Endpoints Specifications\n`);

    doc.allEndpoints.forEach((ep) => {
      parts.push(`### [${ep.method}] ${ep.path}\n`);
      if (ep.summary) {
        parts.push(`${ep.summary}\n`);
      }

      if (ep.requestFields && ep.requestFields.length > 0) {
        parts.push(`#### Request Parameters\n`);
        parts.push(`| Field | Type | Required | Description | Example |`);
        parts.push(`| --- | --- | --- | --- | --- |`);
        ep.requestFields.forEach(f => {
          parts.push(`| ${f.name} | ${f.type} | ${f.required ? 'Yes' : 'No'} | ${f.description || '-'} | ${f.example || '-'} |`);
        });
        parts.push('');
      }

      if (ep.responseFields && ep.responseFields.length > 0) {
        parts.push(`#### Response Fields\n`);
        parts.push(`| Field | Type | Description |`);
        parts.push(`| --- | --- | --- |`);
        ep.responseFields.forEach(f => {
          parts.push(`| ${f.name} | ${f.type} | ${f.description || '-'} |`);
        });
        parts.push('');
      }
    });
  }

  if (doc.importedHeaders && doc.importedHeaders.length > 0) {
    parts.push(`## Security Headers\n`);
    parts.push(`| Header | Description | Example |`);
    parts.push(`| --- | --- | --- |`);
    doc.importedHeaders.forEach(h => {
      parts.push(`| ${h.name} | ${h.description || '-'} | ${h.example || '-'} |`);
    });
    parts.push('');
  }

  if (doc.errorCodes && doc.errorCodes.length > 0) {
    parts.push(`## Error Codes\n`);
    parts.push(`| Code | Message | HTTP Status |`);
    parts.push(`| --- | --- | --- |`);
    doc.errorCodes.forEach(err => {
      parts.push(`| ${err.code} | ${err.message} | ${err.httpStatus || 400} |`);
    });
    parts.push('');
  }

  return parts.join('\n');
}

function serializeToJson(doc: UastDocument): string {
  const payload: Record<string, any> = {
    serviceCode: doc.serviceCode,
    serviceName: doc.serviceName,
    baseUrl: doc.baseUrl,
    channel: doc.channel,
    version: doc.semver,
    overview: doc.overviewText || undefined
  };

  if (doc.importedHeaders && doc.importedHeaders.length > 0) {
    payload.headers = doc.importedHeaders;
  }

  if (doc.errorCodes && doc.errorCodes.length > 0) {
    payload.errorCodes = doc.errorCodes;
  }

  if (doc.allEndpoints && doc.allEndpoints.length > 0) {
    payload.endpoints = doc.allEndpoints.map(ep => ({
      method: ep.method,
      path: ep.path,
      summary: ep.summary,
      parameters: ep.requestFields?.map(f => ({
        name: f.name,
        type: f.type,
        required: f.required,
        description: f.description,
        example: f.example
      })),
      responseFields: ep.responseFields?.map(f => ({
        name: f.name,
        type: f.type,
        description: f.description
      }))
    }));
  } else {
    // Extract parameters from requestTree if present
    const extractedParams: any[] = [];
    const walkTree = (node: any) => {
      if (node && node.semantics?.name && node.structure?.path !== '$') {
        extractedParams.push({
          name: node.semantics.name,
          type: node.semantics.dataType || 'STRING',
          required: node.constraints?.required !== false,
          description: node.semantics.description || '',
          example: node.governance?.exampleValue !== undefined ? String(node.governance.exampleValue) : ''
        });
      }
      if (node?.children && Array.isArray(node.children)) {
        node.children.forEach(walkTree);
      }
    };
    if (doc.requestTree) {
      walkTree(doc.requestTree);
    }

    payload.endpoints = [{
      method: doc.channel?.method || 'POST',
      path: doc.channel?.endpointPath || '/api/v1/endpoint',
      summary: doc.serviceName || 'نقطة نهاية الخدمة',
      parameters: extractedParams.length > 0 ? extractedParams : [
        { name: 'requestId', type: 'STRING', required: true, description: 'معرف الطلب', example: 'REQ-1001' }
      ]
    }];
  }

  return JSON.stringify(payload, null, 2);
}

function serializeToOpenApiYaml(doc: UastDocument): string {
  const lines: string[] = [
    `openapi: 3.1.0`,
    `info:`,
    `  title: "${doc.serviceName || 'Fintech API'}"`,
    `  version: "${doc.semver || '1.0.0'}"`,
    `  description: "${(doc.overviewText || '').replace(/"/g, '\\"')}"`,
    `servers:`,
    `  - url: "${doc.baseUrl || 'https://api.gateway.bank.ye/v1'}"`,
    `paths:`
  ];

  if (doc.allEndpoints && doc.allEndpoints.length > 0) {
    doc.allEndpoints.forEach(ep => {
      lines.push(`  ${ep.path}:`);
      lines.push(`    ${ep.method.toLowerCase()}:`);
      lines.push(`      summary: "${ep.summary || ''}"`);
      if (ep.requestFields && ep.requestFields.length > 0) {
        lines.push(`      requestBody:`);
        lines.push(`        content:`);
        lines.push(`          application/json:`);
        lines.push(`            schema:`);
        lines.push(`              type: object`);
        lines.push(`              properties:`);
        ep.requestFields.forEach(f => {
          lines.push(`                ${f.name}:`);
          lines.push(`                  type: ${f.type.toLowerCase() === 'number' ? 'number' : f.type.toLowerCase() === 'boolean' ? 'boolean' : 'string'}`);
          if (f.description) lines.push(`                  description: "${f.description.replace(/"/g, '\\"')}"`);
          if (f.example) lines.push(`                  example: "${f.example}"`);
        });
      }
      lines.push(`      responses:`);
      lines.push(`        '200':`);
      lines.push(`          description: Successful Response`);
      if (ep.responseFields && ep.responseFields.length > 0) {
        lines.push(`          content:`);
        lines.push(`            application/json:`);
        lines.push(`              schema:`);
        lines.push(`                type: object`);
        lines.push(`                properties:`);
        ep.responseFields.forEach(rf => {
          lines.push(`                  ${rf.name}:`);
          lines.push(`                    type: ${rf.type.toLowerCase() === 'number' ? 'number' : rf.type.toLowerCase() === 'boolean' ? 'boolean' : 'string'}`);
          if (rf.description) lines.push(`                    description: "${rf.description.replace(/"/g, '\\"')}"`);
        });
      }
    });
  } else {
    lines.push(`  ${doc.channel.endpointPath}:`);
    lines.push(`    ${doc.channel.method.toLowerCase()}:`);
    lines.push(`      summary: "${doc.serviceName}"`);
  }

  return lines.join('\n');
}
