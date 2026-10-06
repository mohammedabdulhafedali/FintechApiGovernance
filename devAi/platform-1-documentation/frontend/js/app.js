const APP = {
  activeView: 'dashboard',
  currentSector: null,
  sectorEndpoints: [],
  activeEndpointIdx: 0,
  activeConsoleTab: 'payload'
};

// View Switching
function goView(view) {
  APP.activeView = view;
  document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById('pane-' + view);
  if (target) target.classList.add('active');

  if (view === 'dashboard') {
    document.getElementById('btn-nav-dashboard').classList.add('active');
  } else if (view === 'rbac') {
    document.getElementById('btn-nav-rbac').classList.add('active');
    renderRbac('admin');
  } else if (view === 'export') {
    const expBtn = document.getElementById('btn-nav-export');
    if (expBtn) expBtn.classList.add('active');
    updateExportStudio();
  } else if (view === 'approvals') {
    const appBtn = document.getElementById('btn-nav-approvals');
    if (appBtn) appBtn.classList.add('active');
  } else if (view === 'security') {
    const secBtn = document.getElementById('btn-nav-security');
    if (secBtn) secBtn.classList.add('active');
  } else if (view === 'versions') {
    const verBtn = document.getElementById('btn-nav-versions');
    if (verBtn) verBtn.classList.add('active');
  }
}

// Select Sector (Directly loads all APIs in this sector)
function selectSector(sectorKey) {
  APP.currentSector = sectorKey;
  const sector = DATA[sectorKey];
  if (!sector) return;

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sBtn = document.getElementById('btn-sec-' + sectorKey);
  if (sBtn) sBtn.classList.add('active');

  // Switch to spec pane
  document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('pane-spec').classList.add('active');

  // Flatten all endpoints for this sector
  APP.sectorEndpoints = [];
  for (const srv of Object.values(sector.services)) {
    srv.endpoints.forEach(ep => {
      APP.sectorEndpoints.push(ep);
    });
  }

  APP.activeEndpointIdx = 0;
  renderEndpointsRibbon();
  toast(`تم استعراض: ${sector.name}`);
}

// Render Endpoints Ribbon (Concise name only: transfers, recall, balance, etc.)
function renderEndpointsRibbon() {
  const ribbon = document.getElementById('endpoints-ribbon');
  ribbon.innerHTML = '';

  if (!APP.sectorEndpoints || APP.sectorEndpoints.length === 0) {
    // Show add button even if empty
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-ribbon-add';
    addBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة مسار من الشاشة';
    addBtn.onclick = openAddEndpointDrawer;
    ribbon.appendChild(addBtn);
    return;
  }

  APP.sectorEndpoints.forEach((ep, idx) => {
    const pill = document.createElement('div');
    pill.className = 'ep-pill ' + (idx === APP.activeEndpointIdx ? 'active' : '');
    pill.onclick = () => selectEndpoint(idx);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ep-pill-path';
    nameSpan.textContent = ep.shortName || ep.path.split('/').filter(Boolean).pop();
    pill.appendChild(nameSpan);

    if (ep.isDraft) {
      const draftDot = document.createElement('span');
      draftDot.style.cssText = 'font-size:0.65rem; background:rgba(245,158,11,0.2); color:var(--amber); border:1px solid rgba(245,158,11,0.3); padding:0.1rem 0.35rem; border-radius:3px; margin-inline-start:0.35rem; font-weight:700;';
      draftDot.textContent = 'مسودة';
      pill.appendChild(draftDot);
    }

    ribbon.appendChild(pill);
  });

  // Dynamic Add Button directly in ribbon (من نفس الشاشة)
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-ribbon-add';
  addBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة مسار من الشاشة';
  addBtn.onclick = openAddEndpointDrawer;
  ribbon.appendChild(addBtn);

  renderEndpointDetails();
}

// Select Endpoint
function selectEndpoint(idx) {
  APP.activeEndpointIdx = idx;
  document.querySelectorAll('.ep-pill').forEach((p, i) => {
    p.classList.toggle('active', i === idx);
  });
  renderEndpointDetails();
}

// Two-Tabs Switching: 1. Specification Tables vs 2. Full Example
function switchSpecTwoTab(tabType) {
  const btnDoc = document.getElementById('btn-tab-spec-doc');
  const btnExample = document.getElementById('btn-tab-spec-example');
  const paneDoc = document.getElementById('pane-spec-doc');
  const paneExample = document.getElementById('pane-spec-example');
  const formatSwitcher = document.getElementById('toolbar-format-switcher');

  if (tabType === 'doc') {
    if (btnDoc) btnDoc.classList.add('active');
    if (btnExample) btnExample.classList.remove('active');
    if (paneDoc) paneDoc.style.display = 'flex';
    if (paneExample) paneExample.style.display = 'none';
    if (formatSwitcher) formatSwitcher.style.display = 'none';
  } else {
    if (btnDoc) btnDoc.classList.remove('active');
    if (btnExample) btnExample.classList.add('active');
    if (paneDoc) paneDoc.style.display = 'none';
    if (paneExample) paneExample.style.display = 'block';
    if (formatSwitcher) formatSwitcher.style.display = 'inline-flex';
  }
}

// Render Endpoint Details (Tab 1: Tables + Error Banner | Tab 2: Full Example)
function renderEndpointDetails() {
  if (!APP.sectorEndpoints || !APP.sectorEndpoints[APP.activeEndpointIdx]) return;
  const ep = APP.sectorEndpoints[APP.activeEndpointIdx];

  // Meta Banner
  const methodEl = document.getElementById('active-ep-method');
  methodEl.className = `method-badge method-${ep.method.toLowerCase()}`;
  methodEl.textContent = ep.method;
  document.getElementById('active-ep-path').textContent = ep.path;

  // Status Badge & Sealing Action
  const statusBadge = document.getElementById('active-ep-status-badge');
  const sealBtn = document.getElementById('btn-seal-active-ep');
  if (statusBadge) {
    if (ep.isDraft) {
      statusBadge.className = 'badge-pill badge-opt';
      statusBadge.style.borderColor = 'var(--amber)';
      statusBadge.style.color = 'var(--amber)';
      statusBadge.innerHTML = '<i class="fa-solid fa-clock"></i> مسودة مضافة من الشاشة';
      if (sealBtn) sealBtn.style.display = 'inline-flex';
    } else {
      statusBadge.className = 'badge-pill badge-iso';
      statusBadge.style.borderColor = '';
      statusBadge.style.color = '';
      statusBadge.innerHTML = '<i class="fa-solid fa-shield-check"></i> معتمد رسمي v2026.2';
      if (sealBtn) sealBtn.style.display = 'none';
    }
  }

  // 1. Headers Table
  const headersTableBody = document.getElementById('headers-table-body');
  if (headersTableBody) {
    headersTableBody.innerHTML = '';
    const standardHeaders = [
      { name: 'Authorization', type: 'string (Bearer Token)', req: 'إلزامي', desc: 'رمز تفويض مصادق عليه عبر مزود الهوية المعتمد OAuth 2.0 / FAPI 1.0 Advanced' },
      { name: 'X-Idempotency-Key', type: 'string (UUIDv4)', req: 'إلزامي قطعي', desc: 'مفتاح عدم التكرار الصادر من نظام البنك لمنع ازدواجية الخصم والقيد عند انقطاع الشبكة' },
      { name: 'X-Signature', type: 'string (Base64 RSA)', req: 'إلزامي للعمليات المالية', desc: 'التوقيع الرقمي لمحتوى الطلب باستخدام مفتاح البنك الخاص RSA-PSS 4096' },
      { name: 'X-Correlation-ID', type: 'string (UUID)', req: 'إلزامي للتدقيق', desc: 'معرف التتبع الشامل لمطابقة مسار العملية بين البنك المرسل والشبكة المركزية' }
    ];

    standardHeaders.forEach(h => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><code class="mono spec-code-key">${h.name}</code></td>
        <td><span class="mono" style="font-size:0.75rem; color:var(--text-dim);">${h.type}</span></td>
        <td><span class="badge-pill ${h.req.includes('إلزامي قطعي') ? 'badge-req' : 'badge-fin'}">${h.req}</span></td>
        <td style="color:var(--text-muted); font-size:0.78rem;">${h.desc}</td>
      `;
      headersTableBody.appendChild(row);
    });
  }

  // 2. Request Body Table
  const requestTableBody = document.getElementById('request-table-body');
  if (requestTableBody) {
    requestTableBody.innerHTML = '';
    if (ep.params && ep.params.length > 0) {
      ep.params.forEach(param => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><code class="mono spec-code-key">${param.name}</code></td>
          <td><span class="mono" style="font-size:0.75rem; color:var(--text-dim);">${param.type}</span></td>
          <td>
            <span class="badge-pill ${param.req ? 'badge-req' : 'badge-opt'}">${param.req ? 'إلزامي' : 'اختياري'}</span>
            <span class="badge-pill ${param.tagClass}" style="margin-right:0.25rem;">${param.tag}</span>
          </td>
          <td style="color:var(--text-muted); font-size:0.78rem;">${param.rule}</td>
        `;
        requestTableBody.appendChild(row);
      });
    } else {
      requestTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-dim); padding:1.25rem;">لا يتطلب هذا المسار بيانات في جسم الطلب (No Request Body)</td></tr>`;
    }
  }

  // 3. Response Body Table (200 OK)
  const responseTableBody = document.getElementById('response-table-body');
  if (responseTableBody) {
    responseTableBody.innerHTML = '';
    const responseFields = ep.responseFields || [
      { name: 'status', type: 'string (Enum)', req: 'مؤكد بالرد', desc: 'حالة تنفيذ العملية في المقاصة: SUCCESS أو PENDING أو REJECTED' },
      { name: 'transactionId', type: 'string (UUID/Ref)', req: 'مؤكد بالرد', desc: 'المعرف الرقمي الوطني الثابت للحوالة المعتمدة لدى البنك المركزي' },
      { name: 'clearingCode', type: 'string', req: 'شرطي', desc: 'رمز جلسة التسوية المركزية الفورية الصادر من نظام المقاصة اللحظية' },
      { name: 'timestamp', type: 'string (ISO-8601)', req: 'مؤكد بالرد', desc: 'التوقيت الزمني الدقيق بالمللي ثانية لتوثيق القيد المالي' }
    ];

    responseFields.forEach(f => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><code class="mono" style="color:var(--emerald); font-weight:700;">${f.name}</code></td>
        <td><span class="mono" style="font-size:0.75rem; color:var(--text-dim);">${f.type}</span></td>
        <td><span class="badge-pill badge-fin">${f.req}</span></td>
        <td style="color:var(--text-muted); font-size:0.78rem;">${f.desc}</td>
      `;
      responseTableBody.appendChild(row);
    });
  }

  // 4. Error Summary Chips (In Tab 1)
  const errChips = document.getElementById('endpoint-error-chips');
  if (errChips) {
    errChips.innerHTML = '';
    ep.rules.forEach(rule => {
      const chip = document.createElement('span');
      chip.className = 'badge-pill badge-req';
      chip.style.cursor = 'pointer';
      chip.title = 'اضغط لفتح القاموس الشامل';
      chip.onclick = () => {
        openErrorDictionaryModal();
        filterErrorDictionary(rule.err.split('_')[0]);
      };
      chip.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${rule.err}`;
      errChips.appendChild(chip);
    });
  }

  // 5. Tab 2: Full Working Example Rendering (Multi-Format: JSON, XML, YAML)
  renderFullExamplePanes();
}

// Current Example Format state ('json' | 'xml' | 'yaml')
let currentExampleFormat = 'json';

function switchExampleFormat(format) {
  currentExampleFormat = format;
  document.querySelectorAll('.format-seg-btn, .format-mini-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('btn-format-' + format);
  if (activeBtn) activeBtn.classList.add('active');

  renderFullExamplePanes();
}

function parseJsonSafe(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return null;
  }
}

// Convert JS object into clean, formatted XML (ISO 20022 compliant style)
function objToXmlString(obj, rootName = 'Payload') {
  function formatNode(val, name, indent = 1) {
    const sp = '  '.repeat(indent);
    if (val === null || val === undefined) {
      return `${sp}<${name}/>\n`;
    }
    if (Array.isArray(val)) {
      const itemTag = name.endsWith('s') ? name.slice(0, -1) : name + 'Item';
      return val.map(item => formatNode(item, itemTag, indent)).join('');
    }
    if (typeof val === 'object') {
      const inner = Object.keys(val).map(k => formatNode(val[k], k, indent + 1)).join('');
      return `${sp}<${name}>\n${inner}${sp}</${name}>\n`;
    }
    const escaped = String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return `${sp}<${name}>${escaped}</${name}>\n`;
  }

  if (!obj || typeof obj !== 'object') {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName} xmlns="urn:iso:std:iso:20022:tech:xsd:fintech.v1"/>`;
  }

  const innerXml = Object.keys(obj).map(k => formatNode(obj[k], k, 1)).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName} xmlns="urn:iso:std:iso:20022:tech:xsd:fintech.v1">\n${innerXml}</${rootName}>`;
}

// Convert JS object into clean, formatted YAML
function objToYamlString(obj, indent = 0) {
  const sp = '  '.repeat(indent);
  if (obj === null || obj === undefined) return `${sp}~\n`;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') return `${sp}"${obj}"\n`;
    return `${sp}${obj}\n`;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object') {
        const itemYaml = objToYamlString(item, indent + 1).trimStart();
        return `${sp}- ${itemYaml}`;
      }
      return `${sp}- ${typeof item === 'string' ? `"${item}"` : item}\n`;
    }).join('');
  }
  return Object.keys(obj).map(k => {
    const val = obj[k];
    if (val === null || val === undefined) {
      return `${sp}${k}: ~\n`;
    }
    if (Array.isArray(val)) {
      return `${sp}${k}:\n${objToYamlString(val, indent + 1)}`;
    }
    if (typeof val === 'object') {
      return `${sp}${k}:\n${objToYamlString(val, indent + 1)}`;
    }
    return `${sp}${k}: ${typeof val === 'string' ? `"${val}"` : val}\n`;
  }).join('');
}

// Build realistic, production-grade payload for endpoint
function getProductionRequestPayload(ep) {
  const p = parseJsonSafe(ep.payload);
  if (!p) return null;

  return {
    sourceAccount: p.sourceAccount || "SA0380000000608010167519",
    destinationAccount: p.destinationAccount || "SA4420000001234567890123",
    amount: typeof p.amount === 'number' ? p.amount : 1500.00,
    currency: p.currency || "SAR",
    paymentPurpose: "SUPPLIER_INVOICE_SETTLEMENT",
    remittanceInformation: "فاتورة توريد حوسبة سحابية رقم INV-2026-091",
    debtor: {
      name: "شركة التقنية المتقدمة للمدفوعات",
      identification: "7001928374",
      bankCode: "NCB"
    },
    creditor: {
      name: "مؤسسة البنية التحتية للحوسبة",
      identification: "1010928172",
      bankCode: "SABB"
    },
    idempotencyKey: p.idempotencyKey || "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  };
}

// Build realistic, production-grade response object
function getProductionResponseBody(ep) {
  const r = parseJsonSafe(ep.res200);

  return {
    status: (r && r.status) || "SUCCESS",
    code: 20000,
    message: "تم قبول وتنفيذ أمر العملية بنجاح عبر شبكة المقاصة الوطنية اللحظية",
    transactionId: (r && r.transactionId) || "TXN-88492019-SA",
    clearingCode: (r && r.clearingCode) || "CLR-IPS-20261005-00192",
    endToEndIdentification: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    instructedAmount: {
      amount: 1500.00,
      currency: "SAR"
    },
    settlementDetails: {
      settlementMethod: "IPS_INSTANT",
      clearingSystem: "SARIE_IPS_CORE",
      settledAt: (r && r.settledAt) || "2026-10-05T11:15:00.342Z",
      executionTimeMs: 68
    },
    audit: {
      sourceBankCode: "NCB",
      destinationBankCode: "SABB",
      signedAuditHash: "sha256:8f2a1b9e0d4c5e6f3b18a209..."
    }
  };
}

// Dynamic Multi-Format Renderer for Full Wire Request & Response
function renderFullExamplePanes() {
  if (!APP.sectorEndpoints || !APP.sectorEndpoints[APP.activeEndpointIdx]) return;
  const ep = APP.sectorEndpoints[APP.activeEndpointIdx];

  const fullReqPane = document.getElementById('full-request-code-pane');
  const fullResPane = document.getElementById('full-response-code-pane');
  const badgeReq = document.getElementById('badge-req-format');
  const badgeRes = document.getElementById('badge-res-format');
  const btnCopyReqLabel = document.getElementById('btn-copy-req-label');
  const btnCopyResLabel = document.getElementById('btn-copy-res-label');

  const reqObj = getProductionRequestPayload(ep);
  const resObj = getProductionResponseBody(ep);

  const isGet = ep.method.toUpperCase() === 'GET' || !reqObj;
  const rootReqName = (ep.shortName ? ep.shortName.charAt(0).toUpperCase() + ep.shortName.slice(1) : 'Transfer') + 'Request';
  const rootResName = (ep.shortName ? ep.shortName.charAt(0).toUpperCase() + ep.shortName.slice(1) : 'Transfer') + 'Response';

  const jwtSample = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhdXRoLmdvdi5maW50ZWNoIiwic3ViIjoiQkFOS19TQUJfMDAxOTIiLCJhdWQiOiJpcHMtZ292ZXJuYW5jZSIsImV4cCI6MTgwMTgyNDAwMCwiaWF0IjoxODAxODI0MDAwLCJzY29wZSI6WyJ0cmFuc2ZlcnM6d3JpdGUiLCJpcHM6ZXhlY3V0ZSJdfQ.MEQCID9a0xM208j1ZkdPwIgd892Kls4810a9c84e1b7f2b6eAiB7d02e88a0f91c8";
  const rsaSigSample = "MEQCID9a0xM208j1ZkdPwIgd892Kls4810a9c84e1b7f2b6eAiB7d02e88a0f91c8901b0f1a92d8e7";

  if (currentExampleFormat === 'json') {
    if (badgeReq) badgeReq.textContent = ep.method + ' / JSON';
    if (badgeRes) badgeRes.textContent = 'HTTP 200 / JSON';
    if (btnCopyReqLabel) btnCopyReqLabel.textContent = 'نسخ الطلب (JSON)';
    if (btnCopyResLabel) btnCopyResLabel.textContent = 'نسخ الاستجابة (JSON)';

    if (fullReqPane) {
      if (isGet) {
        fullReqPane.textContent = `GET ${ep.path}/TXN-88492019-SA HTTP/1.1
Host: api.gov.fintech
Authorization: Bearer ${jwtSample}
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
Accept: application/json
User-Agent: FintechCore-Client/2.4.0 (Linux x86_64; OpenJDK 21)`;
      } else {
        const jsonBody = JSON.stringify(reqObj, null, 2);
        const byteLen = new TextEncoder().encode(jsonBody).length;
        fullReqPane.textContent = `${ep.method} ${ep.path} HTTP/1.1
Host: api.gov.fintech
Authorization: Bearer ${jwtSample}
X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
X-Signature: ${rsaSigSample}
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
Content-Type: application/json; charset=utf-8
Accept: application/json
User-Agent: FintechCore-Client/2.4.0 (Linux x86_64; OpenJDK 21)
Content-Length: ${byteLen}

${jsonBody}`;
      }
    }

    if (fullResPane) {
      const resJsonBody = JSON.stringify(resObj, null, 2);
      const resByteLen = new TextEncoder().encode(resJsonBody).length;
      fullResPane.textContent = `HTTP/1.1 200 OK
Date: Mon, 05 Oct 2026 11:15:00 GMT
Server: Envoy-Gateway/1.30.1
Content-Type: application/json; charset=utf-8
Content-Length: ${resByteLen}
Connection: keep-alive
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
X-Idempotency-Status: RESOLVED_FRESH
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9984
X-RateLimit-Reset: 1801824060
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

${resJsonBody}`;
    }
  } else if (currentExampleFormat === 'xml') {
    if (badgeReq) badgeReq.textContent = ep.method + ' / XML (ISO 20022)';
    if (badgeRes) badgeRes.textContent = 'HTTP 200 / XML';
    if (btnCopyReqLabel) btnCopyReqLabel.textContent = 'نسخ الطلب (XML)';
    if (btnCopyResLabel) btnCopyResLabel.textContent = 'نسخ الاستجابة (XML)';

    const xmlReq = isGet ? '' : objToXmlString(reqObj, rootReqName);
    const xmlRes = objToXmlString(resObj, rootResName);

    if (fullReqPane) {
      if (isGet) {
        fullReqPane.textContent = `GET ${ep.path}/TXN-88492019-SA HTTP/1.1
Host: api.gov.fintech
Authorization: Bearer ${jwtSample}
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
Accept: application/xml
User-Agent: FintechCore-Client/2.4.0 (Linux x86_64; OpenJDK 21)`;
      } else {
        const byteLen = new TextEncoder().encode(xmlReq).length;
        fullReqPane.textContent = `${ep.method} ${ep.path} HTTP/1.1
Host: api.gov.fintech
Authorization: Bearer ${jwtSample}
X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
X-Signature: ${rsaSigSample}
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
Content-Type: application/xml; charset=utf-8
Accept: application/xml
User-Agent: FintechCore-Client/2.4.0 (Linux x86_64; OpenJDK 21)
Content-Length: ${byteLen}

${xmlReq}`;
      }
    }

    if (fullResPane) {
      const resByteLen = new TextEncoder().encode(xmlRes).length;
      fullResPane.textContent = `HTTP/1.1 200 OK
Date: Mon, 05 Oct 2026 11:15:00 GMT
Server: Envoy-Gateway/1.30.1
Content-Type: application/xml; charset=utf-8
Content-Length: ${resByteLen}
Connection: keep-alive
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
X-Idempotency-Status: RESOLVED_FRESH

${xmlRes}`;
    }
  } else if (currentExampleFormat === 'yaml') {
    if (badgeReq) badgeReq.textContent = ep.method + ' / YAML';
    if (badgeRes) badgeRes.textContent = 'HTTP 200 / YAML';
    if (btnCopyReqLabel) btnCopyReqLabel.textContent = 'نسخ الطلب (YAML)';
    if (btnCopyResLabel) btnCopyResLabel.textContent = 'نسخ الاستجابة (YAML)';

    const yamlReq = isGet ? '' : objToYamlString(reqObj, 0);
    const yamlRes = objToYamlString(resObj, 0);

    if (fullReqPane) {
      if (isGet) {
        fullReqPane.textContent = `GET ${ep.path}/TXN-88492019-SA HTTP/1.1
Host: api.gov.fintech
Authorization: Bearer ${jwtSample}
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
Accept: application/x-yaml
User-Agent: FintechCore-Client/2.4.0 (Linux x86_64; OpenJDK 21)`;
      } else {
        const byteLen = new TextEncoder().encode(yamlReq).length;
        fullReqPane.textContent = `${ep.method} ${ep.path} HTTP/1.1
Host: api.gov.fintech
Authorization: Bearer ${jwtSample}
X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
X-Signature: ${rsaSigSample}
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
Content-Type: application/x-yaml; charset=utf-8
Accept: application/x-yaml
User-Agent: FintechCore-Client/2.4.0 (Linux x86_64; OpenJDK 21)
Content-Length: ${byteLen}

${yamlReq.trimEnd()}`;
      }
    }

    if (fullResPane) {
      const resByteLen = new TextEncoder().encode(yamlRes).length;
      fullResPane.textContent = `HTTP/1.1 200 OK
Date: Mon, 05 Oct 2026 11:15:00 GMT
Server: Envoy-Gateway/1.30.1
Content-Type: application/x-yaml; charset=utf-8
Content-Length: ${resByteLen}
Connection: keep-alive
X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1
X-Idempotency-Status: RESOLVED_FRESH

${yamlRes.trimEnd()}`;
    }
  }
}

// Universal Copy Feedback Animation (changes icon to checkmark for 1.8s)
function triggerCopySuccess(el) {
  let btn = null;
  if (el) {
    if (el instanceof Event) {
      btn = el.currentTarget || el.target?.closest('button');
    } else if (el instanceof Element) {
      btn = el.closest('button') || el;
    }
  }
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (icon) {
    const origClass = icon.className;
    icon.className = 'fa-solid fa-check';
    btn.classList.add('copy-success');
    setTimeout(() => {
      icon.className = origClass;
      btn.classList.remove('copy-success');
    }, 1800);
  }
}

// Copy Full Request Snippet
function copyFullRequestSnippet(e) {
  const el = document.getElementById('full-request-code-pane');
  if (el) {
    navigator.clipboard.writeText(el.textContent);
    triggerCopySuccess(e);
    toast("تم نسخ الطلب الكامل (Full Request) بصيغة " + currentExampleFormat.toUpperCase());
  }
}

function copyFullCurl(e) {
  copyCurlSnippet(e);
}

// Generate and copy ready-to-run cURL command with all production headers
function copyCurlSnippet(e) {
  if (!APP.sectorEndpoints || !APP.sectorEndpoints[APP.activeEndpointIdx]) return;
  const ep = APP.sectorEndpoints[APP.activeEndpointIdx];
  const reqObj = getProductionRequestPayload(ep);
  const isGet = ep.method.toUpperCase() === 'GET' || !reqObj;

  const jwtSample = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhdXRoLmdvdi5maW50ZWNoIiwic3ViIjoiQkFOS19TQUJfMDAxOTIiLCJhdWQiOiJpcHMtZ292ZXJuYW5jZSIsImV4cCI6MTgwMTgyNDAwMCwiaWF0IjoxODAxODI0MDAwLCJzY29wZSI6WyJ0cmFuc2ZlcnM6d3JpdGUiLCJpcHM6ZXhlY3V0ZSJdfQ.MEQCID9a0xM208j1ZkdPwIgd892Kls4810a9c84e1b7f2b6eAiB7d02e88a0f91c8";
  const rsaSigSample = "MEQCID9a0xM208j1ZkdPwIgd892Kls4810a9c84e1b7f2b6eAiB7d02e88a0f91c8901b0f1a92d8e7";

  let mimeType = 'application/json';
  let bodyStr = '';

  if (currentExampleFormat === 'xml') {
    mimeType = 'application/xml';
    bodyStr = isGet ? '' : objToXmlString(reqObj, (ep.shortName || 'Transfer') + 'Request');
  } else if (currentExampleFormat === 'yaml') {
    mimeType = 'application/x-yaml';
    bodyStr = isGet ? '' : objToYamlString(reqObj, 0);
  } else {
    mimeType = 'application/json';
    bodyStr = isGet ? '' : JSON.stringify(reqObj, null, 2);
  }

  let curlCmd = '';
  if (isGet) {
    curlCmd = `curl -X GET "https://api.gov.fintech${ep.path}/TXN-88492019-SA" \\
  -H "Authorization: Bearer ${jwtSample}" \\
  -H "X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1" \\
  -H "Accept: ${mimeType}"`;
  } else {
    curlCmd = `curl -X ${ep.method} "https://api.gov.fintech${ep.path}" \\
  -H "Authorization: Bearer ${jwtSample}" \\
  -H "X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \\
  -H "X-Signature: ${rsaSigSample}" \\
  -H "X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1" \\
  -H "Content-Type: ${mimeType}" \\
  -H "Accept: ${mimeType}" \\
  -d '${bodyStr.replace(/\n/g, '\n  ')}'`;
  }

  navigator.clipboard.writeText(curlCmd);
  triggerCopySuccess(e);
  toast("تم نسخ أمر cURL التنفيذي الكامل بجميع الترويسات");
}

// Copy Full Response
function copyFullResponse(e) {
  const el = document.getElementById('full-response-code-pane');
  if (el) {
    navigator.clipboard.writeText(el.textContent);
    triggerCopySuccess(e);
    toast("تم نسخ الاستجابة الكاملة (Full Response) بصيغة " + currentExampleFormat.toUpperCase());
  }
}

// Copy active endpoint path
function copyActiveEndpointPath(e) {
  const path = document.getElementById('active-ep-path').textContent;
  navigator.clipboard.writeText(path);
  triggerCopySuccess(e || document.querySelector('.spec-slim-path-wrap button'));
  toast("تم نسخ مسار الـ API: " + path);
}

// =========================================================================
// MASTER ERROR DICTIONARY SYSTEM (HTTP CODES + CUSTOM 10xxx CODES)
// =========================================================================
const MASTER_ERROR_DICTIONARY = [
  // Custom Business Codes (10xxx)
  {
    code: '10111',
    http: '422',
    name: 'INSUFFICIENT_FUNDS',
    arName: 'رصيد الحساب غير كافٍ',
    category: 'custom',
    cause: 'رصيد الحساب المصرفي للعميل لا يغطي مبلغ التحويل مضافاً إليه رسوم المقاصة المعتمدة.',
    remedy: 'التحقق من الرصيد المتاح للعميل وخصم عمولة الخدمة قبل إعادة إرسال الحوالة.',
    sample: '{\n  "error": "INSUFFICIENT_FUNDS",\n  "code": 10111,\n  "message": "Source account balance is insufficient for transfer."\n}'
  },
  {
    code: '10112',
    http: '422',
    name: 'DAILY_LIMIT_EXCEEDED',
    arName: 'تجاوز السقف اليومي للعمليات',
    category: 'custom',
    cause: 'مجموع عمليات العميل خلال الـ 24 ساعة الماضية تجاوز السقف المسموح به نظاماً (50,000 ر.س).',
    remedy: 'إشعار العميل باستنفاد حده اليومي وتوجيهه للتحويل عبر نظام التسويات الإجمالية RTGS أو الانتظار لليوم التالي.',
    sample: '{\n  "error": "DAILY_LIMIT_EXCEEDED",\n  "code": 10112,\n  "message": "Aggregated daily limit of 50,000 SAR has been exceeded."\n}'
  },
  {
    code: '10205',
    http: '409',
    name: 'DUPLICATE_IDEMPOTENCY_KEY',
    arName: 'تكرار مفتاح عدم التكرار (Idempotency)',
    category: 'custom',
    cause: 'تم استخدام نفس مفتاح Idempotency-Key في عملية سابقة مسجلة خلال نافذة الـ 24 ساعة الحالية.',
    remedy: 'توليد UUID v4 جديد لكل عملية مستقلة، أو استعلام حالة الحوالة السابقة برقم المرجع.',
    sample: '{\n  "error": "DUPLICATE_IDEMPOTENCY_KEY",\n  "code": 10205,\n  "message": "Transaction with this Idempotency-Key already processed."\n}'
  },
  {
    code: '10300',
    http: '403',
    name: 'ACCOUNT_FROZEN_OR_BLOCKED',
    arName: 'الحساب مجمد أو موقوف رقابياً',
    category: 'custom',
    cause: 'حساب المستفيد أو المحوّل خاضع لأمر تجميد قضائي أو تدقيق غسل أموال (AML) معلق.',
    remedy: 'رفض المعاملة وتوجيه العميل لمراجعة البنك التابع له الحساب لتحديث بيانات الامتثال.',
    sample: '{\n  "error": "ACCOUNT_FROZEN_OR_BLOCKED",\n  "code": 10300,\n  "message": "Account status does not permit credit or debit operations."\n}'
  },
  {
    code: '10404',
    http: '404',
    name: 'IBAN_NOT_REGISTERED',
    arName: 'رقم الآيبان غير مسجل في الدليل الموحد',
    category: 'custom',
    cause: 'رقم الآيبان الوطني SA-IBAN المدخل غير مرتبط بحساب بنكي سارٍ في قاعدة بيانات البنوك المحلية.',
    remedy: 'التحقق من صحة صياغة الآيبان المكون من 24 خانة والتأكد من تفعيل الحساب لدى البنك المستلم.',
    sample: '{\n  "error": "IBAN_NOT_REGISTERED",\n  "code": 10404,\n  "message": "Beneficiary IBAN is not registered in national directory."\n}'
  },
  {
    code: '10502',
    http: '401',
    name: 'INVALID_RSA_SIGNATURE',
    arName: 'فشل التحقق من التوقيع الرقمي للطلب',
    category: 'custom',
    cause: 'التوقيع المشفر في ترويسة X-Signature غير مطابق لشهادة المفتاح العام المسجلة لدى البنك المركزي.',
    remedy: 'إعادة إنشاء التوقيع باستخدام خوارزمية RSA-PSS 4096 والتأكد من ترتيب الحقول حسب المعيار المعتمد.',
    sample: '{\n  "error": "INVALID_RSA_SIGNATURE",\n  "code": 10502,\n  "message": "Cryptographic payload signature validation failed."\n}'
  },

  // Standard Protocol Codes (HTTP 4xx / 5xx)
  {
    code: '400',
    http: '400',
    name: 'BAD_REQUEST',
    arName: 'طلب غير صالح أو غير مكتمل',
    category: 'http',
    cause: 'صياغة الـ JSON غير صحيحة، أو وجود حقول إلزامية مفقودة في الطلب.',
    remedy: 'مراجعة مخطط البيانات والتأكد من صياغة JSON سليمة.',
    sample: '{\n  "error": "BAD_REQUEST",\n  "status": 400,\n  "message": "Malformed JSON payload in request."\n}'
  },
  {
    code: '401',
    http: '401',
    name: 'UNAUTHORIZED',
    arName: 'فشل المصادقة أو التوكن منتهي',
    category: 'http',
    cause: 'ترويسة Authorization مفقودة، أو أن توكن الـ OAuth 2.0 منتهي الصلاحية أو غير موثق.',
    remedy: 'تجديد توكن الدخول عبر خادم التفويض OAuth 2.0 المعتمد.',
    sample: '{\n  "error": "UNAUTHORIZED",\n  "status": 401,\n  "message": "Bearer token expired or invalid."\n}'
  },
  {
    code: '403',
    http: '403',
    name: 'FORBIDDEN',
    arName: 'الصلاحية غير ممنوحة (RBAC)',
    category: 'http',
    cause: 'حساب الجهة لا يمتلك الصلاحية الكافية لتنفيذ هذا النوع من العمليات المصرفية.',
    remedy: 'مراجعة مصفوفة الصلاحيات (RBAC) وطلب ترقية صلاحيات الحساب لدى مسؤول الحوكمة.',
    sample: '{\n  "error": "FORBIDDEN",\n  "status": 403,\n  "message": "Insufficient permissions to execute financial transfers."\n}'
  },
  {
    code: '404',
    http: '404',
    name: 'NOT_FOUND',
    arName: 'المورد أو المسار غير موجود',
    category: 'http',
    cause: 'المعرف الممرر في مسار الـ URL (مثل رقم المعاملة) غير موجود في النظام.',
    remedy: 'التأكد من صحة معرف المسار قبل إرسال الطلب.',
    sample: '{\n  "error": "NOT_FOUND",\n  "status": 404,\n  "message": "Requested resource could not be found."\n}'
  },
  {
    code: '422',
    http: '422',
    name: 'UNPROCESSABLE_ENTITY',
    arName: 'فشل في معالجة القواعد المالية',
    category: 'http',
    cause: 'البيانات صحيحة برمجياً ولكنها تتعارض مع قواعد العمل المصرفية أو ضوابط المقاصة.',
    remedy: 'فحص مصفوفة الأخطاء المرفقة لتحديد شرط الحوكمة المخالف وتصحيحه.',
    sample: '{\n  "error": "UNPROCESSABLE_ENTITY",\n  "status": 422,\n  "message": "Business validation failed."\n}'
  },
  {
    code: '503',
    http: '503',
    name: 'SERVICE_UNAVAILABLE',
    arName: 'شبكة المقاصة أو الخدمة غير متاحة',
    category: 'http',
    cause: 'توقف مؤقت لخدمة المقاصة اللحظية أثناء فترة الصيانة الدورية أو وجود عطل مؤقت في شبكة البنك المركزي.',
    remedy: 'جدولة الحوالة أو استخدام آلية إعادة المحاولة Exponential Backoff مع المحافظة على نفس مفتاح Idempotency-Key.',
    sample: '{\n  "error": "SERVICE_UNAVAILABLE",\n  "status": 503,\n  "message": "Clearing core network is currently undergoing scheduled maintenance."\n}'
  }
];

let currentErrorCategoryFilter = 'all';

function openErrorDictionaryModal() {
  const modal = document.getElementById('modal-error-dictionary');
  if (modal) {
    modal.classList.add('show');
    const input = document.getElementById('error-dict-search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    filterErrorCategory('all');
  }
}

function closeErrorDictionaryModal() {
  const modal = document.getElementById('modal-error-dictionary');
  if (modal) modal.classList.remove('show');
}

function filterErrorCategory(category) {
  currentErrorCategoryFilter = category;
  document.querySelectorAll('.error-filter-chip').forEach(c => c.classList.remove('active'));
  const activeChip = document.getElementById('chip-err-' + category);
  if (activeChip) activeChip.classList.add('active');

  const query = document.getElementById('error-dict-search-input')?.value || '';
  filterErrorDictionary(query);
}

function filterErrorDictionary(query) {
  const q = (query || '').toLowerCase().trim();
  const listContainer = document.getElementById('error-dict-list-container');
  if (!listContainer) return;

  const filtered = MASTER_ERROR_DICTIONARY.filter(item => {
    // Category match
    const categoryMatch = currentErrorCategoryFilter === 'all' || item.category === currentErrorCategoryFilter;
    if (!categoryMatch) return false;

    // Search query match
    if (!q) return true;
    return (
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.arName.toLowerCase().includes(q) ||
      item.cause.toLowerCase().includes(q) ||
      item.http.includes(q)
    );
  });

  listContainer.innerHTML = '';

  if (filtered.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; padding:2.5rem; color:var(--text-dim); font-size:0.85rem;">لم يتم العثور على أخطاء مطابقة للبحث "${q}".</div>`;
    return;
  }

  filtered.forEach(err => {
    const isCustom = err.category === 'custom';
    const card = document.createElement('div');
    card.className = 'error-card-item';
    card.style.borderInlineStartColor = isCustom ? 'var(--rose)' : 'var(--amber)';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem; gap:0.5rem; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span class="mono" style="font-size:0.95rem; font-weight:800; color:${isCustom ? '#fb7185' : '#38bdf8'}; background:rgba(255,255,255,0.05); padding:0.15rem 0.55rem; border-radius:4px;">
            ${err.code}
          </span>
          <strong style="font-size:0.88rem; color:var(--text);">${err.arName}</strong>
          <span class="mono" style="font-size:0.75rem; color:var(--text-dim);">(${err.name})</span>
        </div>
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <span class="badge-pill ${isCustom ? 'badge-req' : 'badge-iso'}">${isCustom ? 'كود مخصص (10xxx)' : 'HTTP الرسمي'}</span>
          <span class="mono" style="font-size:0.72rem; color:var(--text-dim);">HTTP ${err.http}</span>
        </div>
      </div>

      <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.5; margin-bottom:0.4rem;">
        <strong style="color:var(--text); font-weight:700;">السبب التشغيلي:</strong> ${err.cause}
      </div>

      <div style="font-size:0.78rem; color:var(--emerald); line-height:1.5;">
        <strong style="color:var(--emerald); font-weight:700;"><i class="fa-solid fa-wrench"></i> الإجراء التصحيحي للمطور:</strong> ${err.remedy}
      </div>
    `;

    listContainer.appendChild(card);
  });
}

// Switch Console Tab
function switchConsoleTab(tabKey, clickedBtn) {
  APP.activeConsoleTab = tabKey;
  if (clickedBtn) {
    document.querySelectorAll('.c-tab').forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');
  }

  if (!APP.sectorEndpoints || !APP.sectorEndpoints[APP.activeEndpointIdx]) return;
  const ep = APP.sectorEndpoints[APP.activeEndpointIdx];

  const consoleBox = document.getElementById('console-display-box');
  if (tabKey === 'payload') consoleBox.textContent = ep.payload;
  else if (tabKey === '200') consoleBox.textContent = ep.res200;
  else if (tabKey === '422') consoleBox.textContent = ep.res422;
  else if (tabKey === 'curl') consoleBox.textContent = ep.curl;
}

// Copy Static Base URL
function copyBaseUrl(e) {
  const urlEl = document.getElementById('topbar-base-url');
  const url = urlEl ? urlEl.textContent : 'https://api.gov.fintech';
  navigator.clipboard.writeText(url);
  triggerCopySuccess(e || document.querySelector('.btn-copy-icon'));
  toast("تم نسخ الرابط الأساسي: " + url);
}

    function copyConsoleCode(e) {
      const code = document.getElementById('console-display-box').textContent;
      navigator.clipboard.writeText(code);
      triggerCopySuccess(e);
      toast("تم نسخ الكود للحافظة");
    }

    // Quick Search
    function handleSearch(q) {
      q = q.toLowerCase().trim();
      if (!q) return;

      for (const [secKey, sec] of Object.entries(DATA)) {
        for (const srv of Object.values(sec.services)) {
          for (let i = 0; i < srv.endpoints.length; i++) {
            const ep = srv.endpoints[i];
            if (ep.path.toLowerCase().includes(q) || (ep.shortName && ep.shortName.toLowerCase().includes(q))) {
              selectSector(secKey);
              selectEndpoint(i);
              return;
            }
          }
        }
      }
    }

    // RBAC Render
    function renderRbac(roleKey) {
      const categories = RBAC_DATA[roleKey] || [];
      const deck = document.getElementById('rbac-deck-container');
      deck.innerHTML = '';

      categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'rbac-card';
        let rowsHtml = '';
        cat.p.forEach(pName => {
          rowsHtml += `
            <div class="perm-toggle-row">
              <span>${pName}</span>
              <input type="checkbox" checked style="accent-color:var(--primary); cursor:pointer;">
            </div>
          `;
        });
        card.innerHTML = `
          <div class="rbac-card-title">
            <span>${cat.cat}</span>
            <i class="fa-solid fa-shield-check"></i>
          </div>
          <div>${rowsHtml}</div>
        `;
        deck.appendChild(card);
      });
    }

    function onRoleChange(role) {
      renderRbac(role);
      toast(`تم تحميل صلاحيات: ${role}`);
    }

    function saveRbac() { toast("تم حفظ مصفوفة الصلاحيات"); }

    // Global Platform Release Handler
    function onGlobalReleaseChange(ver) {
      updateExportStudio();
      toast(`تم تفعيل خط الأساس العام للمنظومة: ${ver}`);
    }


    // =========================================================================
    // STREAMLINED EXPORT STUDIO ENGINE
    // =========================================================================
    const EXPORT_CONFIG = {
      sectors: {
        banking: true,
        merchants: true,
        aml: true
      },
      modules: {
        schemas: true,
        wire: true,
        crypto: true,
        errors: true,
        sla: true
      },
      format: 'pdf',
      activePreviewTab: 'doc'
    };

    function toggleExportSectorDirect(secKey, checked) {
      EXPORT_CONFIG.sectors[secKey] = checked;
      updateExportStudio();
    }

    function onExportModuleToggle(modKey, checked) {
      EXPORT_CONFIG.modules[modKey] = checked;
      updateExportStudio();
    }

    function selectExportFormat(fmt) {
      EXPORT_CONFIG.format = fmt;
      document.querySelectorAll('.format-pill, .format-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-fmt') === fmt);
      });
      const fmtLabels = {
        pdf: 'مستند (PDF)',
        word: 'Word (.docx)',
        openapi: 'OpenAPI 3.1',
        postman: 'Postman Collection',
        iso: 'ISO 20022 XML'
      };
      const badge = document.getElementById('export-format-badge');
      if (badge) badge.textContent = fmtLabels[fmt] || fmt;

      updateExportStudio();
    }

    function switchExportPreviewTab(tab) {
      EXPORT_CONFIG.activePreviewTab = tab;
      document.querySelectorAll('.preview-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-ptab') === tab);
      });
      const paneDoc = document.getElementById('preview-tab-doc');
      const paneCode = document.getElementById('preview-tab-code');
      if (paneDoc) paneDoc.style.display = tab === 'doc' ? 'flex' : 'none';
      if (paneCode) paneCode.style.display = tab === 'code' ? 'block' : 'none';

      if (tab === 'code') {
        renderExportCodePreview();
      }
    }

    function getSelectedExportItems() {
      let selectedServices = [];
      let totalEndpoints = 0;
      if (typeof DATA !== 'undefined') {
        for (const [secKey, sec] of Object.entries(DATA)) {
          if (EXPORT_CONFIG.sectors[secKey]) {
            for (const [srvKey, srv] of Object.entries(sec.services)) {
              selectedServices.push({
                sectorKey: secKey,
                sectorName: sec.name,
                serviceKey: srvKey,
                title: srv.title,
                code: srv.code,
                endpoints: srv.endpoints
              });
              totalEndpoints += srv.endpoints.length;
            }
          }
        }
      }
      return { selectedServices, totalEndpoints };
    }

    const FORMAT_DELIVERABLES = {
      pdf: {
        icon: '<i class="fa-solid fa-file-pdf"></i>',
        title: 'المواصفة الفنية لواجهات الربط المعتمدة',
        type: 'مستند رسمي معتمد (HTML/PDF)',
        baseSizeKb: 1450,
        desc: 'المواصفة الفنية الشاملة لجميع مسارات الربط المصرفي، نماذج البيانات، وضوابط التشفير المعتمدة.',
        btnLabel: 'تحميل المستند المعتمد'
      },
      openapi: {
        icon: '<i class="fa-solid fa-file-code"></i>',
        title: 'مخطط مواصفات OpenAPI 3.1',
        type: 'مخطط برمجي (OpenAPI 3.1.0)',
        baseSizeKb: 180,
        desc: 'مخطط REST API كامل متوافق مع Swagger وPostman ومولدات الكود البرمجي.',
        btnLabel: 'تحميل مخطط OpenAPI (JSON)'
      },
      postman: {
        icon: '<i class="fa-solid fa-paper-plane"></i>',
        title: 'مجموعة اختبارات Postman v2.1',
        type: 'مجموعة طلبات (Postman Collection)',
        baseSizeKb: 95,
        desc: 'حزمة طلبات واختبارات تكامل مسبقة الإعداد للاستيراد المباشر في بيئة Postman.',
        btnLabel: 'تحميل حزمة Postman'
      },
      sdk: {
        icon: '<i class="fa-solid fa-box-archive"></i>',
        title: 'حزمة تطوير العميل TypeScript SDK',
        type: 'حزمة برمجية (TypeScript SDK)',
        baseSizeKb: 340,
        desc: 'مكتبة برمجية مكتوبة بـ TypeScript ومزودة بكافة العقود ونماذج البيانات للدمج الفوري.',
        btnLabel: 'تحميل حزمة العميل (SDK)'
      },
      iso: {
        icon: '<i class="fa-solid fa-file-lines"></i>',
        title: 'مخطط المعاملات ISO 20022 XML',
        type: 'مخطط مالي قياسي (ISO 20022)',
        baseSizeKb: 72,
        desc: 'رسائل تحويل مالي قياسية متوافقة مع شبكات المقاصة الوطنية والبنوك المركزية.',
        btnLabel: 'تحميل مخطط ISO 20022 XML'
      }
    };

    function updateExportStudio() {
      const { selectedServices, totalEndpoints } = getSelectedExportItems();
      const activeModules = Object.entries(EXPORT_CONFIG.modules).filter(([_, v]) => v).map(([k]) => k);
      const selectedSectorCount = Object.values(EXPORT_CONFIG.sectors).filter(Boolean).length;

      // Scope Count Badge
      const scopeCountEl = document.getElementById('export-scope-count');
      if (scopeCountEl) {
        scopeCountEl.textContent = `${selectedSectorCount}/3 قطاعات مختارة`;
      }

      // Modules Count Badge
      const modCountEl = document.getElementById('export-modules-count');
      if (modCountEl) {
        modCountEl.textContent = `${activeModules.length}/5 أقسام`;
      }

      // Live Deliverable Preview
      renderExportDocPreview(selectedServices, totalEndpoints);

      // Code Preview if active
      if (EXPORT_CONFIG.activePreviewTab === 'code') {
        renderExportCodePreview();
      }
    }

    function togglePdfWebsiteExpand() {
      const wrap = document.querySelector('.export-clean-wrap');
      const icon = document.getElementById('icon-pdf-expand');
      const btn = document.getElementById('btn-toggle-pdf-expand');
      if (!wrap) return;

      const isExpanded = wrap.classList.toggle('pdf-site-expanded');
      if (isExpanded) {
        if (icon) icon.className = 'fa-solid fa-compress';
        if (btn) btn.title = 'العودة للوضع الطبيعي';
        toast('تم تكبير المستند لملء مساحة الموقع بالكامل');
      } else {
        if (icon) icon.className = 'fa-solid fa-expand';
        if (btn) btn.title = 'تكبير لملء مساحة الموقع بالكامل';
        toast('تمت العودة للحجم العادي');
      }
    }

    function closePdfWebsiteExpand() {
      const wrap = document.querySelector('.export-clean-wrap');
      if (wrap && wrap.classList.contains('pdf-site-expanded')) {
        togglePdfWebsiteExpand();
      }
    }


    function generateFullPdfDocumentPagesHtml(selectedServices, ver) {
      const securityMap = {
        banking: 'mTLS + FAPI 1.0 Advanced',
        merchants: 'Idempotency + HMAC-SHA256',
        aml: 'Zero-Trust Sanction Screening'
      };

      const hasServices = selectedServices && selectedServices.length > 0;
      const totalEndpoints = (selectedServices || []).reduce((acc, s) => acc + (s.endpoints ? s.endpoints.length : 0), 0);

      // Collect all endpoints for page 2
      let endpointRows = '';
      if (!hasServices) {
        endpointRows = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:1rem;">لم يتم تحديد أي قطاع للتضمين في الوثيقة</td></tr>`;
      } else {
        selectedServices.forEach(s => {
          (s.endpoints || []).forEach(ep => {
            const methodColor = ep.method === 'POST' ? '#10b981' : (ep.method === 'GET' ? '#0284c7' : '#f59e0b');
            endpointRows += `
              <tr>
                <td style="font-weight:700; color:#0f172a;">${s.sectorName}</td>
                <td><strong class="mono" style="color:${methodColor};">${ep.method}</strong> <code class="mono" style="font-size:0.6rem; color:#334155;">${ep.path}</code></td>
                <td><span style="font-size:0.62rem; color:#475569;">${ep.desc || s.title}</span></td>
                <td><span class="badge-pill mono" style="font-size:0.58rem; background:#f1f5f9; color:#0369a1;">${ep.method === 'POST' ? '201 Created' : '200 OK'}</span></td>
              </tr>
            `;
          });
        });
      }

      return `
        <!-- PAGE 1: COVER & EXECUTIVE SUMMARY -->
        <div class="pdf-paper-page" id="pdf-page-1">
          <div class="pdf-page-header">
            <div style="display:flex; align-items:center; gap:0.55rem;">
              <div class="pdf-gov-crest"><i class="fa-solid fa-landmark-dome"></i></div>
              <div>
                <div style="font-size:0.74rem; font-weight:800; color:#0f172a;">المملكة العربية السعودية</div>
                <div style="font-size:0.62rem; color:#475569;">البنك المركزي السعودي • الإشراف والرقابة المصرفية</div>
              </div>
            </div>
            <div style="text-align:left;" class="mono">
              <div style="font-size:0.66rem; font-weight:700; color:#0284c7;">SAMA-SPEC-${ver}</div>
              <div style="font-size:0.58rem; color:#64748b;">تاريخ السريان: 2026-10</div>
            </div>
          </div>

          <div class="pdf-header-divider"></div>

          <div style="text-align:center; padding:0.6rem 0 0.8rem 0;">
            <div style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:0.18rem 0.65rem; border-radius:3px; font-size:0.6rem; font-weight:800; margin-bottom:0.4rem;">المواصفة القياسية المعتمدة رسمياً</div>
            <h1 style="font-size:0.98rem; font-weight:900; color:#0f172a; margin:0 0 0.3rem 0; line-height:1.4;">وثيقة المواصفة الفنية الوطنية لمعايير الربط المصرفي المفتوح والتقنية المالية</h1>
            <div style="font-size:0.62rem; color:#0284c7; font-weight:700; font-family:'Outfit', sans-serif; direction:ltr;">NATIONAL FINTECH INTEROPERABILITY & OPEN BANKING STANDARD (${ver})</div>
          </div>

          <div class="pdf-doc-section">
            <div class="pdf-section-title">1. النطاق والأهداف التنظيمية (Scope & Objectives)</div>
            <p class="pdf-section-text">تحدد هذه الوثيقة المعايير المعمارية الإلزامية ونقاط النهاية ونماذج البيانات الموحدة لربط أنظمة البنوك والمؤسسات المالية المرخصة ومزودي خدمات الدفع بالمملكة. تهدف المواصفة لضمان استقرار العمليات اللحظية، منع الازدواج المالي، وتطبيق أعلى درجات الحماية السيادية للبيانات المالية.</p>
          </div>

          <div class="pdf-doc-section">
            <div class="pdf-section-title">2. ملخص القطاعات والخدمات المشمولة في هذه النسخة</div>
            <div class="pdf-mini-table-wrap">
              <table class="pdf-mini-table">
                <thead>
                  <tr>
                    <th>القطاع المعماري</th>
                    <th>الخدمة التشغيلية</th>
                    <th>عدد المسارات</th>
                    <th>المعيار الأمني</th>
                  </tr>
                </thead>
                <tbody>
                  ${hasServices ? selectedServices.map(s => `
                    <tr>
                      <td style="font-weight:700; color:#0f172a;">${s.sectorName}</td>
                      <td>${s.title}</td>
                      <td class="mono" style="font-weight:700; color:#0284c7;">${s.endpoints ? s.endpoints.length : 0} مسار</td>
                      <td class="mono" style="font-size:0.6rem; color:#475569;">${securityMap[s.sectorKey] || 'TLS 1.3'}</td>
                    </tr>
                  `).join('') : `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:0.6rem;">لا توجد خدمات مختارة</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:3px; padding:0.45rem 0.75rem; margin-top:0.3rem;">
            <span style="font-size:0.62rem; color:#334155; font-weight:700;">إجمالي المسارات المعتمدة في هذا الملف:</span>
            <span class="mono" style="font-weight:800; color:#059669; font-size:0.7rem;">${totalEndpoints} Endpoint معتمد</span>
          </div>

          <div class="pdf-page-footer-line">
            <span>وثيقة تنظيمية رسمية صادرة بموجب اللائحة المصرفية</span>
            <span class="mono">صفحة 1 من 4</span>
          </div>
        </div>

        <div class="pdf-page-separator"><span>فاصل الصفحات • صفحة 2 من 4</span></div>

        <!-- PAGE 2: TECHNICAL ENDPOINTS & SCHEMAS -->
        <div class="pdf-paper-page" id="pdf-page-2">
          <div class="pdf-page-header">
            <div style="font-size:0.68rem; font-weight:700; color:#0f172a;">المواصفة الفنية الوطنية — جداول المسارات المعمارية</div>
            <div style="font-size:0.6rem; color:#64748b;" class="mono">SAMA-SPEC-${ver} • PAGE 2</div>
          </div>
          <div class="pdf-header-divider"></div>

          <div class="pdf-doc-section">
            <div class="pdf-section-title">3. مصفوفة نقاط النهاية المعتمدة (Architectural Endpoints Matrix)</div>
            <p class="pdf-section-text">الجدول التالي يوضح المواصفات الدقيقة لكافة مسارات الـ API الإلزامية المشمولة بالوثيقة:</p>
            <div class="pdf-mini-table-wrap" style="max-height:220px; overflow-y:auto;">
              <table class="pdf-mini-table">
                <thead>
                  <tr>
                    <th>القطاع</th>
                    <th>الطلب والمسار (Method & Path)</th>
                    <th>الوصف الوظيفي</th>
                    <th>الاستجابة</th>
                  </tr>
                </thead>
                <tbody>
                  ${endpointRows}
                </tbody>
              </table>
            </div>
          </div>

          <div class="pdf-doc-section" style="margin-top:0.5rem;">
            <div class="pdf-section-title">4. اشتراطات مفتاح عدم التكرار (Idempotency Enforcement)</div>
            <p class="pdf-section-text">
              <strong>قاعدة تنظيمية إلزامية:</strong> يجب على كافة الأنظمة المتصلة تمرير الترويسة <code class="mono" style="color:#0284c7;">X-Idempotency-Key</code> بتنسيق UUIDv4 صالح وفريد لكل عملية خصم أو تحويل مالي. تلتزم البنوك بحفظ المفتاح ونتيجته لمدة لا تقل عن 24 ساعة، ويُمنع منعاً باتاً إعادة قيد أي معاملة تحمل مفتاحاً مكرراً منعاً لازدواجية الصرف.
            </p>
          </div>

          <div class="pdf-page-footer-line">
            <span>سري ومحمي بموجب الأنظمة المصرفية</span>
            <span class="mono">صفحة 2 من 4</span>
          </div>
        </div>

        <div class="pdf-page-separator"><span>فاصل الصفحات • صفحة 3 من 4</span></div>

        <!-- PAGE 3: SECURITY PROFILE, ERROR DICTIONARY & SLA -->
        <div class="pdf-paper-page" id="pdf-page-3">
          <div class="pdf-page-header">
            <div style="font-size:0.68rem; font-weight:700; color:#0f172a;">المواصفة الفنية الوطنية — الأمان وقاموس الأخطاء وSLA</div>
            <div style="font-size:0.6rem; color:#64748b;" class="mono">SAMA-SPEC-${ver} • PAGE 3</div>
          </div>
          <div class="pdf-header-divider"></div>

          <div class="pdf-doc-section">
            <div class="pdf-section-title">5. بروتوكولات الأمان والتوثيق المتبادل (Security Profile)</div>
            <p class="pdf-section-text">
              تخضع كافة الاتصالات لبروتوكول <strong>TLS 1.3</strong> مع التوثيق المتبادل للشهادات (mTLS) باستخدام شهادات x509 المعتمدة لدى المركز الوطني للتصديق الرقمي. ويتم تفويض الوصول حصراً عبر بروتوكول <strong>OAuth 2.0 / FAPI 1.0 Advanced</strong> مع تقييد الصلاحيات عبر نطاقات Scopes دقيقة لكل مؤسسة.
            </p>
          </div>

          <div class="pdf-doc-section">
            <div class="pdf-section-title">6. القاموس الموحد لأكواد الأخطاء المالية (Standard Error Codes)</div>
            <div class="pdf-mini-table-wrap">
              <table class="pdf-mini-table">
                <thead>
                  <tr>
                    <th>كود الخطأ</th>
                    <th>الاسم المعياري</th>
                    <th>السبب والإجراء المطلوب</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="mono" style="font-weight:700; color:#dc2626;">10111</td>
                    <td>INSUFFICIENT_FUNDS</td>
                    <td>رصيد الحساب غير كافٍ لتغطية مبلغ العملية ورسومها.</td>
                  </tr>
                  <tr>
                    <td class="mono" style="font-weight:700; color:#dc2626;">10112</td>
                    <td>DAILY_LIMIT_EXCEEDED</td>
                    <td>تجاوز السقف اليومي المحدد للحوالات الفورية اللحظية.</td>
                  </tr>
                  <tr>
                    <td class="mono" style="font-weight:700; color:#d97706;">10204</td>
                    <td>DUPLICATE_IDEMPOTENCY_KEY</td>
                    <td>تم تنفيذ العملية مسبقاً بنفس مفتاح عدم التكرار.</td>
                  </tr>
                  <tr>
                    <td class="mono" style="font-weight:700; color:#dc2626;">10301</td>
                    <td>AML_SANCTION_MATCH</td>
                    <td>حظر العملية لتطابق أحد الأطراف مع القوائم المعتمدة.</td>
                  </tr>
                  <tr>
                    <td class="mono" style="font-weight:700; color:#475569;">401 / 403</td>
                    <td>AUTH_FORBIDDEN</td>
                    <td>شهادة mTLS غير معتمدة أو صلاحيات الـ Token غير كافية.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="pdf-doc-section">
            <div class="pdf-section-title">7. اتفاقية مستوى الخدمة الإلزامية (SLA)</div>
            <p class="pdf-section-text">
              تلتزم المؤسسات بمعدل توافر تشغيلي لا يقل عن <strong>99.99%</strong> سنوياً، وألا يتجاوز زمن معالجة طلب التحويل اللحظي <strong>150ms</strong> في أوقات الذروة.
            </p>
          </div>

          <div class="pdf-page-footer-line">
            <span>سري ومحمي بموجب الأنظمة المصرفية</span>
            <span class="mono">صفحة 3 من 4</span>
          </div>
        </div>

        <div class="pdf-page-separator"><span>فاصل الصفحات • صفحة 4 من 4</span></div>

        <!-- PAGE 4: REGULATORY SIGN-OFF & OFFICIAL SEAL -->
        <div class="pdf-paper-page" id="pdf-page-4">
          <div class="pdf-page-header">
            <div style="font-size:0.68rem; font-weight:700; color:#0f172a;">المواصفة الفنية الوطنية — محضر الاعتماد الرسمي والتوقيعات</div>
            <div style="font-size:0.6rem; color:#64748b;" class="mono">SAMA-SPEC-${ver} • PAGE 4</div>
          </div>
          <div class="pdf-header-divider"></div>

          <div class="pdf-doc-section">
            <div class="pdf-section-title">8. قرار الاعتماد وإلزامية التطبيق (Regulatory Mandate)</div>
            <p class="pdf-section-text">
              بناءً على الصلاحيات المخولة نظاماً، تُعتمد هذه الوثيقة كـ <strong>مرجع فني وطني موحد وإلزامي</strong> لكافة المصارف المرخصة وشركات المدفوعات والتقنية المالية المصرحة بالمملكة. ويسري العمل بها فوراً، وتُمنح المنشآت مهلة 60 يوماً لتحديث برمجيات الربط بما يتطابق تماماً مع النماذج المحددة أعلاه.
            </p>
          </div>

          <div class="pdf-doc-section" style="margin-top:0.4rem;">
            <div class="pdf-section-title">9. جدول الاعتمادات والتوقيعات الرسمية</div>
            <div class="pdf-mini-table-wrap">
              <table class="pdf-mini-table">
                <thead>
                  <tr>
                    <th>الصفة والمسؤولية</th>
                    <th>الجهة المشرفة</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight:700;">محافظ البنك المركزي</td>
                    <td>مجلس الإدارة والسياسات المصرفية</td>
                    <td><span style="color:#059669; font-weight:800;">معتمد ومصدق</span></td>
                    <td class="mono">2026-10-01</td>
                  </tr>
                  <tr>
                    <td style="font-weight:700;">وكيل الرقابة المالية وتقنية المعلومات</td>
                    <td>الإشراف المصرفي وتطوير المدفوعات</td>
                    <td><span style="color:#059669; font-weight:800;">معتمد ومطابق</span></td>
                    <td class="mono">2026-10-01</td>
                  </tr>
                  <tr>
                    <td style="font-weight:700;">مدير عام حوكمة المعايير الرقمية</td>
                    <td>لجنة المعايير التقنية الوطنية</td>
                    <td><span style="color:#059669; font-weight:800;">مدقق ومعتمد</span></td>
                    <td class="mono">2026-10-01</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem; padding-top:0.6rem; border-top:1px dashed #cbd5e1;">
            <div>
              <div style="font-size:0.62rem; font-weight:800; color:#0f172a;">رمز الاعتماد الرقمي المركزي:</div>
              <div class="mono" style="font-size:0.56rem; color:#64748b;">CERT-ID: SAMA-GOV-${ver}-FINAL-AUTH</div>
              <div style="font-size:0.55rem; color:#059669; margin-top:2px;"><i class="fa-solid fa-circle-check"></i> تم التوثيق وفق نظام المعاملات والتوثيق الإلكتروني</div>
            </div>

            <!-- Big Official Red Stamp -->
            <div class="pdf-official-seal">
              <div class="seal-inner">
                <i class="fa-solid fa-stamp"></i>
                <span>معتمد رسمي</span>
                <small class="mono">SAMA SEALED</small>
              </div>
            </div>
          </div>

          <div class="pdf-page-footer-line">
            <span>نهاية الوثيقة المعتمدة • كافة الحقوق محفوظة للبنك المركزي</span>
            <span class="mono">صفحة 4 من 4</span>
          </div>
        </div>
      `;
    }

    function escapeXmlHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function generateOpenApiSpecObject(selectedServices, ver) {
      const paths = {};
      (selectedServices || []).forEach(s => {
        (s.endpoints || []).forEach(ep => {
          paths[ep.path] = {
            [ep.method.toLowerCase()]: {
              summary: ep.desc || s.title,
              tags: [s.sectorName, s.code],
              parameters: [
                {
                  name: "X-Idempotency-Key",
                  in: "header",
                  required: ep.method === 'POST',
                  schema: { type: "string", format: "uuid" }
                }
              ],
              responses: {
                [ep.method === 'POST' ? "201" : "200"]: {
                  description: "Successful Operation",
                  content: {
                    "application/json": {
                      schema: { type: "object", properties: { status: { type: "string", example: "SUCCESS" } } }
                    }
                  }
                }
              }
            }
          };
        });
      });

      return {
        openapi: "3.1.0",
        info: {
          title: "Fintech API Governance Specifications",
          version: ver,
          description: "المواصفة الوطنية الموحدة لربط الخدمات المصرفية والمدفوعات"
        },
        servers: [{ url: "https://api.sama.gov.sa/v1", description: "Production Gateway" }],
        paths
      };
    }

    function generatePostmanCollectionObject(selectedServices, ver) {
      const item = (selectedServices || []).map(s => ({
        name: `${s.code} - ${s.sectorName}`,
        item: (s.endpoints || []).map(ep => ({
          name: ep.desc || ep.path,
          request: {
            method: ep.method,
            header: [
              { key: "Authorization", value: "Bearer {{authToken}}" },
              { key: "X-Idempotency-Key", value: "{{idempotencyKey}}" }
            ],
            url: {
              raw: "{{baseUrl}}" + ep.path,
              host: ["{{baseUrl}}"],
              path: ep.path.split('/').filter(Boolean)
            }
          }
        }))
      }));

      return {
        info: {
          name: `Fintech-Governance-APIs-${ver}`,
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item
      };
    }

    function generateIsoXmlContent(selectedServices, ver) {
      const total = (selectedServices || []).reduce((acc, s) => acc + (s.endpoints ? s.endpoints.length : 0), 0);
      return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>SAMA-TRF-${Date.now()}-001</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${total}</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>SARIE-INSTANT</Prtry>
        </ClrSys>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-FINTECH-${ver}-99281</EndToEndId>
        <TxId>TX-${Date.now()}</TxId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="SAR">25000.00</IntrBkSttlmAmt>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>NCBKSAJE</BICFI>
          <Nm>البنك الأهلي السعودي</Nm>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>RJHISEJ2</BICFI>
          <Nm>مصرف الراجحي</Nm>
        </FinInstnId>
      </CdtrAgt>
      <SplmtryData>
        <PlcAndNm>RegulatorySignOff</PlcAndNm>
        <Envlp>
          <SovereignSeal>SAMA-SEALED-RSA4096-COMPLIANT</SovereignSeal>
        </Envlp>
      </SplmtryData>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
    }

    function copyOpenApiJsonDirect() {
      const { selectedServices } = getSelectedExportItems();
      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';
      const spec = generateOpenApiSpecObject(selectedServices, ver);
      navigator.clipboard.writeText(JSON.stringify(spec, null, 2)).then(() => {
        toast('تم نسخ مخطط OpenAPI 3.1 JSON إلى الحافظة');
      });
    }

    function copyPostmanJsonDirect() {
      const { selectedServices } = getSelectedExportItems();
      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';
      const col = generatePostmanCollectionObject(selectedServices, ver);
      navigator.clipboard.writeText(JSON.stringify(col, null, 2)).then(() => {
        toast('تم نسخ Postman Collection JSON إلى الحافظة');
      });
    }

    function copyIsoXmlDirect() {
      const { selectedServices } = getSelectedExportItems();
      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';
      const xml = generateIsoXmlContent(selectedServices, ver);
      navigator.clipboard.writeText(xml).then(() => {
        toast('تم نسخ رسالة ISO 20022 XML إلى الحافظة');
      });
    }

    function highlightJson(jsonStr) {
      const safe = escapeXmlHtml(jsonStr);
      return safe.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'hl-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'hl-key';
          } else {
            cls = 'hl-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'hl-boolean';
        } else if (/null/.test(match)) {
          cls = 'hl-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }

    function highlightXml(xmlStr) {
      const safe = escapeXmlHtml(xmlStr);
      return safe
        .replace(/(&lt;\/?[\w:\.-]+)/g, '<span class="hl-tag">$1</span>')
        .replace(/([\w:\.-]+)=(&quot;.*?&quot;)/g, '<span class="hl-attr">$1</span>=<span class="hl-val">$2</span>')
        .replace(/(&gt;)/g, '<span class="hl-tag">&gt;</span>');
    }

    function renderDirectCodeViewer(filename, highlightedCode, copyFnName) {
      return `
        <div class="code-viewer-stage">
          <div class="code-viewer-float-bar">
            <span class="code-viewer-filename">${filename}</span>
            <button type="button" class="btn-code-copy-float" onclick="${copyFnName}()" title="نسخ الملف بالكامل">
              <i class="fa-solid fa-copy"></i>
              <span>نسخ</span>
            </button>
          </div>
          <pre class="code-viewer-pre"><code>${highlightedCode}</code></pre>
        </div>
      `;
    }

    function generateWordDocumentPagesHtml(selectedServices, ver, totalEndpoints) {
      let endpointRows = '';
      if (!selectedServices || selectedServices.length === 0) {
        endpointRows = `<tr><td colspan="4" style="text-align:center; padding:1.2rem; color:#64748b;">لم يتم تحديد أي قطاع للتضمين في المستند</td></tr>`;
      } else {
        selectedServices.forEach(s => {
          (s.endpoints || []).forEach(ep => {
            endpointRows += `
              <tr>
                <td style="font-weight:700;">${s.sectorName}</td>
                <td><strong class="mono" style="color:#2b579a;">${ep.method}</strong> <code class="mono" style="font-size:0.75rem;">${ep.path}</code></td>
                <td>${ep.desc || s.title}</td>
                <td><span class="mono" style="font-size:0.72rem; color:#059669; font-weight:700;">${ep.method === 'POST' ? '201 Created' : '200 OK'}</span></td>
              </tr>
            `;
          });
        });
      }

      return `
        <!-- Page 1: Official Specification Document Page (Clean Word A4) -->
        <div class="word-paper-page">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:0.5rem;">
            <span style="font-size:0.75rem; color:#64748b;" class="mono">CONFIDENTIAL • SAMA-SPEC-${ver}</span>
            <span style="font-size:0.75rem; color:#2b579a; font-weight:700;">البنك المركزي السعودي — وثيقة المواصفات الفنية المعتمدة</span>
          </div>

          <div class="word-doc-title">المواصفة القياسية الوطنية لواجهات برمجة التطبيقات (API Standards)</div>
          
          <p style="font-size:0.86rem; color:#334155; line-height:1.7;">
            تُحدد هذه الوثيقة الصادرة بصيغة Microsoft Word المواصفات المعمارية الإلزامية ونماذج تبادل الرسائل المالية بين كافة المصارف المرخصة وشركات التقنية المالية المعتمدة بالمملكة.
          </p>

          <div class="word-heading-1">1. جدول بيانات الاعتماد والتحكم بالنسخة</div>
          <table class="word-table">
            <thead>
              <tr>
                <th>البند التنظيمي</th>
                <th>القيمة المعتمدة</th>
                <th>الحالة التشغيلية</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:700;">رقم الإصدار الفني</td>
                <td class="mono">${ver} Official Release</td>
                <td><span style="color:#059669; font-weight:700;">ساري المفعول</span></td>
              </tr>
              <tr>
                <td style="font-weight:700;">إجمالي المسارات المعتمدة</td>
                <td class="mono">${totalEndpoints} Endpoints</td>
                <td><span style="color:#0284c7; font-weight:700;">مشمول بالكامل</span></td>
              </tr>
              <tr>
                <td style="font-weight:700;">بروتوكول الأمان الإلزامي</td>
                <td class="mono">TLS 1.3 / mTLS Strict</td>
                <td><span style="color:#d97706; font-weight:700;">إلزامي ومطابق</span></td>
              </tr>
              <tr>
                <td style="font-weight:700;">مفتاح عدم التكرار</td>
                <td class="mono">X-Idempotency-Key (UUIDv4)</td>
                <td><span style="color:#059669; font-weight:700;">مفعل 24 ساعة</span></td>
              </tr>
            </tbody>
          </table>

          <div class="word-heading-1" style="margin-top:1rem;">2. مصفوفة نقاط الربط المشمولة (API Endpoints Matrix)</div>
          <table class="word-table">
            <thead>
              <tr>
                <th>القطاع</th>
                <th>الطلب والمسار (Method & Path)</th>
                <th>الوصف الوظيفي</th>
                <th>الاستجابة القياسية</th>
              </tr>
            </thead>
            <tbody>
              ${endpointRows}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #cbd5e1; padding-top:0.6rem; margin-top:auto; font-size:0.75rem; color:#64748b;">
            <span>المواصفة الفنية الوطنية المعتمدة • صالحة للتحرير والطباعة الرسمية</span>
            <span class="mono">صفحة 1 من 2</span>
          </div>
        </div>

        <!-- Page 2: Security & SLA Technical Addendum (Clean Word A4) -->
        <div class="word-paper-page">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #cbd5e1; padding-bottom:0.5rem;">
            <span style="font-size:0.75rem; color:#64748b;" class="mono">SAMA-SPEC-${ver} • الملحق الأمني الفني</span>
            <span style="font-size:0.75rem; color:#2b579a; font-weight:700;">البنك المركزي السعودي — المعايير الأمنية وضمان الجودة</span>
          </div>

          <div class="word-heading-1">3. المعايير الأمنية وضوابط التشفير الإلزامية</div>
          <p style="font-size:0.84rem; color:#334155; line-height:1.7;">
            تخضع كافة قنوات الربط المالي للضوابط الأمنية المشددة الصادرة عن البنك المركزي:
          </p>
          <ul style="font-size:0.84rem; color:#334155; line-height:1.8; padding-right:1.2rem;">
            <li><strong>التوثيق المتبادل للشهادات (mTLS):</strong> استخدام شهادات رقمية صادرة من هيئة وطنية معتمدة بتشفير SHA-256 كحد أدنى.</li>
            <li><strong>بروتوكول التفويض المالي:</strong> اعتماد معيار FAPI (Financial-grade API) متوافق مع OAuth 2.0 و PKCE.</li>
            <li><strong>التوقيع الرقمي للرسائل:</strong> توقيع كامل محتوى Payload باستخدام خوارزمية RSA-PSS-4096 لضمان عدم الإنكار والتلاعب.</li>
          </ul>

          <div class="word-heading-1" style="margin-top:0.8rem;">4. اتفاقية مستوى الخدمة وجداول الأداء (SLA Standards)</div>
          <table class="word-table">
            <thead>
              <tr>
                <th>المؤشر التشغيلي</th>
                <th>الحد الأقصى المسموح</th>
                <th>الإجراء الرقابي عند التجاوز</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:700;">زمن الاستجابة للعملية (Latency)</td>
                <td class="mono">P99 &lt; 250ms</td>
                <td>تنبيه فوري وإعادة توجيه حركة المرور</td>
              </tr>
              <tr>
                <td style="font-weight:700;">نسبة الجاهزية الشهرية (Availability)</td>
                <td class="mono">99.99% Uptime</td>
                <td>فرض غرامات الامتثال التنظيمي</td>
              </tr>
              <tr>
                <td style="font-weight:700;">معدل الخطأ الفني (5xx Rate)</td>
                <td class="mono">&lt; 0.01%</td>
                <td>تعليق فوري لمسار الربط المتأثر</td>
              </tr>
            </tbody>
          </table>

          <div style="background:#f1f5f9; border-right:4px solid #2b579a; padding:1rem; border-radius:4px; margin-top:1.5rem;">
            <div style="font-weight:700; color:#2b579a; font-size:0.88rem; margin-bottom:0.3rem;">اعتماد وختم المواصفة الوطنية الرقمية</div>
            <p style="font-size:0.8rem; color:#475569; margin:0; line-height:1.6;">
              صدرت هذه الوثيقة رسمياً وتعتبر ملزمة لكافة المؤسسات المالية والمصرفية المرخصة. التحقق الرقمي متاح عبر بوابة الحوكمة الرقمية الوطنية.
            </p>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #cbd5e1; padding-top:0.6rem; margin-top:auto; font-size:0.75rem; color:#64748b;">
            <span>نهاية الوثيقة الفنية المعتمدة • صالحة للتحرير والطباعة الرسمية</span>
            <span class="mono">صفحة 2 من 2</span>
          </div>
        </div>
      `;
    }

    function docxXmlEscape(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    async function generateRealDocxBlob(ver, selectedServices, totalEndpoints) {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library is not loaded');
      }

      const zip = new JSZip();

      // 1. [Content_Types].xml
      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

      // 2. _rels/.rels
      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

      // 3. word/_rels/document.xml.rels
      zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

      // 4. word/styles.xml
      zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Arial"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="ar-SA" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:bidi/>
        <w:jc w:val="right"/>
        <w:spacing w:after="140" w:line="260" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`);

      // 5. word/document.xml
      const dateStr = new Date().toISOString().split('T')[0];

      // Page Break Helper for Word OpenXML
      const pageBreakXml = '<w:p><w:pPr><w:bidi/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>';

      // Build Summary Table Rows (Page 1)
      let summaryRowsXml = `
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>القطاع المعماري</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>الخدمة التشغيلية</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>عدد المسارات</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>المعيار الأمني</w:t></w:r></w:p></w:tc>
        </w:tr>
      `;

      const secMap = { banks: 'mTLS + FAPI 1.0', merchants: 'Idempotency + HMAC', compliance: 'Zero-Trust Sanction' };
      (selectedServices || []).forEach((s, idx) => {
        const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
        summaryRowsXml += `
          <w:tr>
            <w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${docxXmlEscape(s.sectorName)}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>${docxXmlEscape(s.title)}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="0284C7"/></w:rPr><w:t>${s.endpoints ? s.endpoints.length : 0} مسار</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${secMap[s.sectorKey] || 'TLS 1.3 Strict'}</w:t></w:r></w:p></w:tc>
          </w:tr>
        `;
      });

      // Build Endpoints Table Rows (Page 2)
      let tableRowsXml = `
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>القطاع</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="3400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>الطلب والمسار (Method &amp; Path)</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>الوصف الوظيفي</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>الاستجابة</w:t></w:r></w:p></w:tc>
        </w:tr>
      `;

      let rowIndex = 0;
      (selectedServices || []).forEach(s => {
        (s.endpoints || []).forEach(ep => {
          rowIndex++;
          const bg = rowIndex % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
          const methodColor = ep.method === 'POST' ? '10B981' : (ep.method === 'GET' ? '0284C7' : 'F59E0B');
          const statusText = ep.method === 'POST' ? '201 Created' : '200 OK';
          tableRowsXml += `
            <w:tr>
              <w:tc>
                <w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr>
                <w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${docxXmlEscape(s.sectorName)}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:tcW w:w="3400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr>
                <w:p><w:pPr><w:jc w:val="left"/></w:pPr>
                  <w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:b/><w:color w:val="${methodColor}"/></w:rPr><w:t>${docxXmlEscape(ep.method)} </w:t></w:r>
                  <w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="334155"/></w:rPr><w:t>${docxXmlEscape(ep.path)}</w:t></w:r>
                </w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr>
                <w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>${docxXmlEscape(ep.desc || s.title)}</w:t></w:r></w:p>
              </w:tc>
              <w:tc>
                <w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/></w:tcPr>
                <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:b/><w:color w:val="059669"/></w:rPr><w:t>${docxXmlEscape(statusText)}</w:t></w:r></w:p>
              </w:tc>
            </w:tr>
          `;
        });
      });

      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>

    <!-- ========================================== -->
    <!-- PAGE 1: COVER & EXECUTIVE SUMMARY          -->
    <!-- ========================================== -->
    <!-- Top Header Bar -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9200" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:bidiVisual/>
        <w:tblBorders>
          <w:bottom w:val="single" w:sz="14" w:space="0" w:color="0284C7"/>
          <w:top w:val="none"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>المملكة العربية السعودية</w:t></w:r>
          </w:p>
          <w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
            <w:r><w:rPr><w:color w:val="475569"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>البنك المركزي السعودي • الإشراف والرقابة المصرفية</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:b/><w:color w:val="0284C7"/><w:sz w:val="20"/></w:rPr><w:t>SAMA-SPEC-${docxXmlEscape(ver)}</w:t></w:r>
          </w:p>
          <w:p><w:pPr><w:jc w:val="left"/></w:pPr>
            <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>تاريخ السريان: 2026-10</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Document Title Badge -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="center"/><w:spacing w:before="200" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="0369A1"/><w:shd w:val="clear" w:color="auto" w:fill="E0F2FE"/></w:rPr>
        <w:t> المواصفة القياسية المعتمدة رسمياً </w:t>
      </w:r>
    </w:p>

    <!-- Main Title -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>وثيقة المواصفة الفنية الوطنية لمعايير الربط المصرفي المفتوح والتقنية المالية</w:t>
      </w:r>
    </w:p>

    <!-- Subtitle LTR -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:b/><w:sz w:val="18"/><w:color w:val="0284C7"/></w:rPr>
        <w:t>NATIONAL FINTECH INTEROPERABILITY &amp; OPEN BANKING STANDARD (${docxXmlEscape(ver)})</w:t>
      </w:r>
    </w:p>

    <!-- Section 1 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="120" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>1. النطاق والأهداف التنظيمية (Scope &amp; Objectives)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="200"/></w:pPr>
      <w:r>
        <w:rPr><w:color w:val="334155"/></w:rPr>
        <w:t>تحدد هذه الوثيقة المعايير المعمارية الإلزامية ونقاط النهاية ونماذج البيانات الموحدة لربط أنظمة البنوك والمؤسسات المالية المرخصة ومزودي خدمات الدفع بالمملكة. تهدف المواصفة لضمان استقرار العمليات اللحظية، منع الازدواج المالي، وتطبيق أعلى درجات الحماية السيادية للبيانات المالية.</w:t>
      </w:r>
    </w:p>

    <!-- Section 2 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="120" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>2. ملخص القطاعات والخدمات المشمولة في هذه النسخة</w:t>
      </w:r>
    </w:p>

    <!-- Summary Table -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9200" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:bidiVisual/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${summaryRowsXml}
    </w:tbl>

    <!-- Total Endpoints Box -->
    <w:p>
      <w:pPr>
        <w:bidi/><w:jc w:val="right"/>
        <w:pBdr><w:right w:val="single" w:sz="18" w:space="8" w:color="059669"/></w:pBdr>
        <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
        <w:spacing w:before="160" w:after="160"/>
      </w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:color w:val="334155"/></w:rPr><w:t>إجمالي المسارات المعتمدة في هذا الملف: </w:t></w:r>
      <w:r><w:rPr><w:b/><w:color w:val="059669"/><w:sz w:val="24"/></w:rPr><w:t>${totalEndpoints} Endpoint معتمد</w:t></w:r>
    </w:p>

    <!-- Page 1 Footer -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="center"/><w:spacing w:before="240"/></w:pPr>
      <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>وثيقة تنظيمية رسمية صادرة بموجب اللائحة المصرفية  •  صفحة 1 من 4</w:t></w:r>
    </w:p>

    <!-- END OF PAGE 1 -->
    ${pageBreakXml}

    <!-- ========================================== -->
    <!-- PAGE 2: TECHNICAL ENDPOINTS MATRIX         -->
    <!-- ========================================== -->
    <!-- Header -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>المواصفة الفنية الوطنية — جداول المسارات المعمارية  |  SAMA-SPEC-${docxXmlEscape(ver)} • PAGE 2</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="100" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>3. مصفوفة نقاط النهاية المعتمدة (Architectural Endpoints Matrix)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="140"/></w:pPr>
      <w:r><w:rPr><w:color w:val="475569"/></w:rPr><w:t>الجدول التالي يوضح المواصفات الدقيقة لكافة مسارات الـ API الإلزامية المشمولة بالوثيقة:</w:t></w:r>
    </w:p>

    <!-- Endpoints Table -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9200" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:bidiVisual/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${tableRowsXml}
    </w:tbl>

    <!-- Section 4 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="200" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>4. اشتراطات مفتاح عدم التكرار (Idempotency Enforcement)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:color w:val="0284C7"/></w:rPr><w:t>قاعدة تنظيمية إلزامية: </w:t></w:r>
      <w:r><w:t>يجب على كافة الأنظمة المتصلة تمرير الترويسة X-Idempotency-Key بتنسيق UUIDv4 صالح وفريد لكل عملية خصم أو تحويل مالي. تلتزم البنوك بحفظ المفتاح ونتيجته لمدة لا تقل عن 24 ساعة، ويُمنع منعاً باتاً إعادة قيد أي معاملة تحمل مفتاحاً مكرراً منعاً لازدواجية الصرف.</w:t></w:r>
    </w:p>

    <!-- Page 2 Footer -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="center"/><w:spacing w:before="200"/></w:pPr>
      <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>سري ومحمي بموجب الأنظمة المصرفية  •  صفحة 2 من 4</w:t></w:r>
    </w:p>

    <!-- END OF PAGE 2 -->
    ${pageBreakXml}

    <!-- ========================================== -->
    <!-- PAGE 3: SECURITY, ERROR CODES & SLA        -->
    <!-- ========================================== -->
    <!-- Header -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>المواصفة الفنية الوطنية — الأمان وقاموس الأخطاء وSLA  |  SAMA-SPEC-${docxXmlEscape(ver)} • PAGE 3</w:t></w:r>
    </w:p>

    <!-- Section 5 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="100" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>5. بروتوكولات الأمان والتوثيق المتبادل (Security Profile)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="140"/></w:pPr>
      <w:r><w:t>تخضع كافة الاتصالات لبروتوكول </w:t></w:r>
      <w:r><w:rPr><w:b/><w:color w:val="0284C7"/></w:rPr><w:t>TLS 1.3</w:t></w:r>
      <w:r><w:t> مع التوثيق المتبادل للشهادات (mTLS) باستخدام شهادات x509 المعتمدة لدى المركز الوطني للتصديق الرقمي. ويتم تفويض الوصول حصراً عبر بروتوكول </w:t></w:r>
      <w:r><w:rPr><w:b/><w:color w:val="0284C7"/></w:rPr><w:t>OAuth 2.0 / FAPI 1.0 Advanced</w:t></w:r>
      <w:r><w:t> مع تقييد الصلاحيات عبر نطاقات Scopes دقيقة لكل مؤسسة.</w:t></w:r>
    </w:p>

    <!-- Section 6 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="120" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>6. القاموس الموحد لأكواد الأخطاء المالية (Standard Error Codes)</w:t></w:r>
    </w:p>

    <!-- Errors Table -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9200" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:bidiVisual/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>كود الخطأ</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>الاسم المعياري (Error Name)</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>السبب والإجراء المطلوب</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t>10111</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t>INSUFFICIENT_FUNDS</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>رصيد الحساب غير كافٍ لتغطية مبلغ العملية ورسومها.</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t>10112</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t>DAILY_LIMIT_EXCEEDED</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>تجاوز السقف اليومي المحدد للحوالات الفورية اللحظية.</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="D97706"/></w:rPr><w:t>10204</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t>DUPLICATE_IDEMPOTENCY_KEY</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>تم تنفيذ العملية مسبقاً بنفس مفتاح عدم التكرار.</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="DC2626"/></w:rPr><w:t>10301</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t>AML_SANCTION_MATCH</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>حظر العملية لتطابق أحد الأطراف مع القوائم المعتمدة.</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="475569"/></w:rPr><w:t>401 / 403</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr><w:t>AUTH_FORBIDDEN</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>شهادة mTLS غير معتمدة أو صلاحيات الـ Token غير كافية.</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- Section 7 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="160" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>7. اتفاقية مستوى الخدمة الإلزامية (SLA)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="200"/></w:pPr>
      <w:r><w:t>تلتزم المؤسسات بمعدل توافر تشغيلي لا يقل عن </w:t></w:r>
      <w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>99.99%</w:t></w:r>
      <w:r><w:t> سنوياً، وألا يتجاوز زمن معالجة طلب التحويل اللحظي </w:t></w:r>
      <w:r><w:rPr><w:b/><w:color w:val="0284C7"/></w:rPr><w:t>150ms</w:t></w:r>
      <w:r><w:t> في أوقات الذروة.</w:t></w:r>
    </w:p>

    <!-- Page 3 Footer -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="center"/><w:spacing w:before="200"/></w:pPr>
      <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>سري ومحمي بموجب الأنظمة المصرفية  •  صفحة 3 من 4</w:t></w:r>
    </w:p>

    <!-- END OF PAGE 3 -->
    ${pageBreakXml}

    <!-- ========================================== -->
    <!-- PAGE 4: REGULATORY MANDATE & SIGN-OFF      -->
    <!-- ========================================== -->
    <!-- Header -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="100"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>المواصفة الفنية الوطنية — محضر الاعتماد الرسمي والتوقيعات  |  SAMA-SPEC-${docxXmlEscape(ver)} • PAGE 4</w:t></w:r>
    </w:p>

    <!-- Section 8 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="100" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>8. قرار الاعتماد وإلزامية التطبيق (Regulatory Mandate)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="140"/></w:pPr>
      <w:r><w:t>بناءً على الصلاحيات المخولة نظاماً، تُعتمد هذه الوثيقة كـ </w:t></w:r>
      <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>مرجع فني وطني موحد وإلزامي</w:t></w:r>
      <w:r><w:t> لكافة المصارف المرخصة وشركات المدفوعات والتقنية المالية المصرحة بالمملكة. ويسري العمل بها فوراً، وتُمنح المنشآت مهلة 60 يوماً لتحديث برمجيات الربط بما يتطابق تماماً مع النماذج المحددة أعلاه.</w:t></w:r>
    </w:p>

    <!-- Section 9 -->
    <w:p>
      <w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="120" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0F172A"/></w:rPr><w:t>9. جدول الاعتمادات والتوقيعات الرسمية</w:t></w:r>
    </w:p>

    <!-- Sign-off Table -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9200" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:bidiVisual/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>الصفة والمسؤولية</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>الجهة المشرفة</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/></w:rPr><w:t>الحالة</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0F172A"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>التاريخ</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>محافظ البنك المركزي</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>مجلس الإدارة والسياسات المصرفية</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>معتمد ومصدق</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>2026-10-01</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>وكيل الرقابة المالية</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>الإشراف المصرفي وتطوير المدفوعات</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>معتمد ومطابق</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>2026-10-01</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>مدير عام حوكمة المعايير</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:t>لجنة المعايير التقنية الوطنية</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="059669"/></w:rPr><w:t>مدقق ومعتمد</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>2026-10-01</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- Digital Certificate & Stamp Box -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="240" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>رمز الاعتماد الرقمي المركزي: </w:t></w:r>
      <w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:b/><w:color w:val="0284C7"/></w:rPr><w:t>CERT-ID: SAMA-GOV-${docxXmlEscape(ver)}-FINAL-AUTH</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="140"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:color w:val="059669"/></w:rPr><w:t>✓ تم التوثيق وفق نظام المعاملات والتوثيق الإلكتروني ولائحته التنفيذية المعتمدة.</w:t></w:r>
    </w:p>

    <!-- Page 4 Footer -->
    <w:p><w:pPr><w:bidi/><w:jc w:val="center"/><w:spacing w:before="300"/></w:pPr>
      <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr><w:t>نهاية الوثيقة المعتمدة  •  كافة الحقوق محفوظة للبنك المركزي  •  صفحة 4 من 4</w:t></w:r>
    </w:p>

    <!-- Section Page Settings -->
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1100" w:right="1200" w:bottom="1100" w:left="1200" w:header="720" w:footer="720" w:gutter="0"/>
      <w:bidi/>
    </w:sectPr>

  </w:body>
</w:document>`;

      zip.file('word/document.xml', docXml);

      return await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });
    }

    function generateOpenApiVisualHtml(selectedServices, ver, totalEndpoints) {
      const spec = generateOpenApiSpecObject(selectedServices, ver);
      const jsonStr = JSON.stringify(spec, null, 2);
      const highlighted = highlightJson(jsonStr);
      return renderDirectCodeViewer(`fintech-openapi-${ver}.json`, highlighted, 'copyOpenApiJsonDirect');
    }

    function generatePostmanVisualHtml(selectedServices, ver, totalEndpoints) {
      const col = generatePostmanCollectionObject(selectedServices, ver);
      const jsonStr = JSON.stringify(col, null, 2);
      const highlighted = highlightJson(jsonStr);
      return renderDirectCodeViewer(`fintech-postman-collection-${ver}.json`, highlighted, 'copyPostmanJsonDirect');
    }

    function generateIsoVisualHtml(selectedServices, ver, totalEndpoints) {
      const xmlStr = generateIsoXmlContent(selectedServices, ver);
      const highlighted = highlightXml(xmlStr);
      return renderDirectCodeViewer(`fintech-iso20022-pacs008-${ver}.xml`, highlighted, 'copyIsoXmlDirect');
    }

    function renderExportDocPreview(selectedServices, totalEndpoints) {
      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';
      const stackContainer = document.getElementById('pdf-pages-stack-container');
      const btn = document.getElementById('btn-execute-download');
      const fmt = EXPORT_CONFIG.format || 'pdf';

      let visualHtml = '';

      if (fmt === 'word') {
        visualHtml = generateWordDocumentPagesHtml(selectedServices, ver, totalEndpoints);
        if (btn) btn.innerHTML = `<i class="fa-solid fa-file-word"></i> <span>تصدير مستند Word (.docx)</span>`;
      } else if (fmt === 'openapi') {
        visualHtml = generateOpenApiVisualHtml(selectedServices, ver, totalEndpoints);
        if (btn) btn.innerHTML = `<i class="fa-solid fa-code"></i> <span>تصدير OpenAPI (.json)</span>`;
      } else if (fmt === 'postman') {
        visualHtml = generatePostmanVisualHtml(selectedServices, ver, totalEndpoints);
        if (btn) btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>تصدير Postman Collection</span>`;
      } else if (fmt === 'iso') {
        visualHtml = generateIsoVisualHtml(selectedServices, ver, totalEndpoints);
        if (btn) btn.innerHTML = `<i class="fa-solid fa-file-lines"></i> <span>تصدير ISO 20022 (.xml)</span>`;
      } else {
        // Default PDF
        visualHtml = generateFullPdfDocumentPagesHtml(selectedServices, ver);
        if (btn) btn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> <span>تصدير مستند رسمي (.pdf)</span>`;
      }

      if (stackContainer) {
        stackContainer.innerHTML = visualHtml;
      }
    }

    function renderExportCodePreview() {
      const { selectedServices, totalEndpoints } = getSelectedExportItems();
      const filenameEl = document.getElementById('code-preview-filename');
      const codeEl = document.getElementById('code-preview-content');
      if (!codeEl) return;

      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';

      if (EXPORT_CONFIG.format === 'openapi') {
        if (filenameEl) filenameEl.textContent = `fintech-governance-openapi-${ver}.json`;
        const paths = {};
        selectedServices.forEach(s => {
          s.endpoints.forEach(ep => {
            paths[ep.path] = {
              [ep.method.toLowerCase()]: {
                summary: ep.desc,
                tags: [s.sectorName, s.code],
                parameters: (ep.params || []).map(p => ({
                  name: p.name,
                  in: p.type.includes('Path') ? 'path' : 'header',
                  required: p.req,
                  schema: { type: 'string' },
                  description: p.rule
                })),
                responses: {
                  "200": { description: "نجاح العملية" },
                  "422": { description: "خطأ تحقق من قواعد العمل" }
                }
              }
            };
          });
        });

        const oas = {
          openapi: "3.1.0",
          info: {
            title: "دليل ومواصفة واجهات الربط المعتمدة",
            version: ver,
            description: "مواصفة الحوكمة الرقمية لمعايير واجهات الربط المالية."
          },
          servers: [{ url: "https://api.gov.fintech", description: "بوابة الإنتاج (mTLS Strict)" }],
          paths
        };
        codeEl.textContent = JSON.stringify(oas, null, 2);
      } else if (EXPORT_CONFIG.format === 'postman') {
        if (filenameEl) filenameEl.textContent = `fintech-governance-postman-${ver}.json`;
        const items = selectedServices.map(s => ({
          name: `${s.sectorName} - ${s.title}`,
          item: s.endpoints.map(ep => ({
            name: ep.desc,
            request: {
              method: ep.method,
              url: { raw: `{{baseUrl}}${ep.path}` },
              header: [
                { key: "Authorization", value: "Bearer {{token}}" },
                { key: "X-Idempotency-Key", value: "{{$guid}}" },
                { key: "X-Signature", value: "{{signature}}" }
              ]
            }
          }))
        }));

        const postman = {
          info: {
            name: `Fintech API Governance Collection (${ver})`,
            schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
          },
          item: items
        };
        codeEl.textContent = JSON.stringify(postman, null, 2);
      } else if (EXPORT_CONFIG.format === 'iso') {
        if (filenameEl) filenameEl.textContent = `fintech-iso20022-pacs008-${ver}.xml`;
        codeEl.textContent = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>IPS-MSG-2026-99182</MsgId>
      <CreDtTm>2026-10-05T12:00:00Z</CreDtTm>
      <NbOfTxs>${totalEndpoints}</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>IPS_CLEARING</Prtry>
        </ClrSys>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-2026-IPS-9901</EndToEndId>
        <UETR>c01a2f64-508b-4c07-a9f8-d4fa3972a912</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="SAR">1500.00</IntrBkSttlmAmt>
      <DbtrAgt>
        <FinInstnId><BICFI>BANKA22XXX</BICFI></FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId><BICFI>BANKB22XXX</BICFI></FinInstnId>
      </CdtrAgt>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
      } else {
        if (filenameEl) filenameEl.textContent = `fintech-spec-manifest-${ver}.json`;
        const manifest = {
          specTitle: "دليل ومواصفة واجهات الربط المعتمدة",
          reference: `API-SPEC-${ver}`,
          classification: "معتمد رسمي",
          cryptographicSignature: {
            algorithm: "RSA-PSS-4096 / SHA-256",
            keyId: "SIGNING-KEY-2026",
            status: "VERIFIED"
          },
          includedServices: selectedServices.map(s => ({
            code: s.code,
            title: s.title,
            sector: s.sectorName,
            endpointCount: s.endpoints.length
          })),
          activeModules: Object.entries(EXPORT_CONFIG.modules).filter(([_, v]) => v).map(([k]) => k)
        };
        codeEl.textContent = JSON.stringify(manifest, null, 2);
      }
    }

    function copyCodePreviewContent(e) {
      const codeEl = document.getElementById('code-preview-content');
      if (!codeEl) return;
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        triggerCopySuccess(e);
        toast('تم نسخ كود المخطط إلى الحافظة بنجاح');
      }).catch(() => {
        triggerCopySuccess(e);
        toast('تم تحديد الكود لنسخه');
      });
    }

    function generateSovereignPrintableHtml(ver, selectedServices, totalEndpoints) {
      const dateStr = new Date().toISOString().split('T')[0];
      return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>دليل ومواصفة واجهات الربط المعتمدة - ${ver}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
    body { font-family: 'Cairo', sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #fff; line-height: 1.6; }
    .header { border-bottom: 3px double #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 900; margin: 5px 0; }
    .sub { font-size: 13px; color: #475569; }
    .badge { border: 1px solid #0f172a; padding: 4px 12px; font-size: 12px; font-weight: 700; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: right; }
    th { background: #f8fafc; font-weight: 700; }
    .mono { font-family: 'JetBrains Mono', monospace; direction: ltr; display: inline-block; }
    .seal-box { margin-top: 40px; border: 2px dashed #0f172a; padding: 20px; border-radius: 6px; page-break-inside: avoid; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px; text-align:left;">
    <button onclick="window.print()" style="padding:10px 20px; background:#0f172a; color:#fff; border:none; border-radius:4px; font-family:'Cairo'; font-weight:700; cursor:pointer;">طباعة / حفظ كـ PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="sub">منظومة الحوكمة المالية</div>
      <div class="title">المواصفة الفنية لواجهات الربط المعتمدة</div>
      <div class="sub">رقم المرجع: API-SPEC-${ver} • تاريخ الإصدار: ${dateStr}</div>
    </div>
    <div class="badge">معتمد رسمي • ساري المفعول</div>
  </div>

  <h2>1. فهرس الخدمات المشمولة (${selectedServices.length} خدمات)</h2>
  <table>
    <thead>
      <tr>
        <th>القطاع</th>
        <th>الخدمة</th>
        <th>كود الخدمة</th>
      </tr>
    </thead>
    <tbody>
      ${selectedServices.map(s => `<tr><td>${s.sectorName}</td><td>${s.title}</td><td class="mono">${s.code}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>2. ضوابط الأمان المعتمدة</h2>
  <p>تخضع جميع العمليات لبروتوكول TLS 1.3 مع التوثيق المتبادل للشهادات (mTLS) وحماية الهوية عبر OAuth 2.0.</p>
</body>
</html>`;
    }

    function triggerBrowserPrintPdf() {
      if (EXPORT_CONFIG.format !== 'pdf') {
        selectExportFormat('pdf');
      }
      toast('جاري فتح نافذة الطباعة لاختيار حفظ كـ PDF...');
      setTimeout(() => {
        window.print();
      }, 250);
    }

    /**
     * =========================================================================
     * WORD AUTOMATED ENGINE — محرك التحويل الصامت المباشر عبر مايكروسوفت وورد
     * =========================================================================
     * ملاحظة معمارية وتوثيقية للمطورين والمهندسين اللاحقين:
     * -------------------------------------------------------------------------
     * تم اعتماد هذه الطريقة هندسياً لحل مشكلة تشوه الحروف العربية وانفصالها،
     * وتداخل الكلمات الإنجليزية والأقواس (BiDi Overlapping) الناتجة عن محركات 
     * تصوير الشاشة (html2canvas / Raster Canvas).
     *
     * آلية عمل هذا المحرك:
     * 1. بناء هيكل المستند من الصفر كملف Word حقيقي (.docx) بترميز OpenXML قياسي
     *    مع تفعيل خصائص الاتجاه العربي الأصيل (<w:bidi/> و <w:rtl/>) والجداول المتجهة.
     * 2. إرسال ملف الـ Word المولد تلقائياً عبر طلب POST إلى خادم الأتمتة المكتبي:
     *    /api/convert-docx-to-pdf
     * 3. يستدعي الخادم محرك Microsoft Word (WINWORD.EXE) بصمت في الخلفية عبر 
     *    واجهة COM Automation (Word.Application) ويقوم بحفظ المستند فوراً كـ PDF.
     * 4. استقبال ملف الـ PDF الأصلي وتحميله تلقائياً للمستخدم بنصوص متجهة حقيقية 100%،
     *    تكون فيها الحروف متصلة بدقة فائقة وقابلة للبحث والتحديد والنسخ، وبدون أي صور.
     * 5. محرك التصدير المباشر (Client-Side PDF Engine): في حال عدم تشغيل خادم التحويل 
     *    أو فتح الملف محلياً بصيغة file://، يتم توليد مستند الـ PDF بالكامل (4 صفحات)
     *    مباشرة داخل المتصفح وبنفس التصميم الرسمي، دون أي تحويل لصيغة Word منعاً لأي لبس.
     * =========================================================================
     */
    async function exportClientSidePdf(ver, filename, btn) {
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left:0.4rem;"></i> جاري توليد ملف الـ PDF (4 صفحات)...`;
      }

      // الحصول على الصفحات الأربع من المعاينة الحالية أو بناؤها إن لم تكن معروضة
      let pages = document.querySelectorAll('#pdf-pages-stack-container .pdf-paper-page');
      if (!pages || pages.length === 0) {
        const { selectedServices } = getSelectedExportItems();
        const stackContainer = document.getElementById('pdf-pages-stack-container');
        if (stackContainer) {
          stackContainer.innerHTML = generateFullPdfDocumentPagesHtml(selectedServices, ver);
          pages = stackContainer.querySelectorAll('.pdf-paper-page');
        }
      }

      if (!pages || pages.length === 0) {
        throw new Error('لم يتم العثور على صفحات المستند لتوليد ملف الـ PDF');
      }

      // بناء حاوية منفصلة ونظيفة للتصدير بدقة A4
      const tempContainer = document.createElement('div');
      tempContainer.style.background = '#ffffff';
      tempContainer.style.width = '794px';
      tempContainer.style.padding = '0';
      tempContainer.style.margin = '0';
      tempContainer.style.direction = 'rtl';

      pages.forEach((p, idx) => {
        const clone = p.cloneNode(true);
        clone.style.margin = '0';
        clone.style.boxShadow = 'none';
        clone.style.border = 'none';
        clone.style.width = '100%';
        clone.style.background = '#ffffff';
        if (idx < pages.length - 1) {
          clone.style.pageBreakAfter = 'always';
          clone.style.breakAfter = 'page';
        }
        tempContainer.appendChild(clone);
      });

      const opt = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      if (typeof html2pdf !== 'undefined') {
        const pdfBlob = await html2pdf().set(opt).from(tempContainer).outputPdf('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast(`تم بنجاح تصدير وتحميل ملف PDF معتمد (${filename})`);
      } else {
        window.print();
      }
    }

    async function downloadRealPdfDocument(ver) {
      const btn = document.getElementById('btn-execute-download');
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left:0.4rem;"></i> جاري تجهيز وتصدير ملف الـ PDF...`;
      }

      const filename = `fintech-specification-${ver}.pdf`;
      const { selectedServices, totalEndpoints } = getSelectedExportItems();

      let convertedViaWord = false;

      // محاولة التحويل عبر خادم الأتمتة المكتبي (Word COM) في حال كان يعمل محلياً
      const wordApiUrl = window.location.protocol.startsWith('http') 
        ? '/api/convert-docx-to-pdf' 
        : 'http://127.0.0.1:8088/api/convert-docx-to-pdf';

      try {
        const docxBlob = await generateRealDocxBlob(ver, selectedServices, totalEndpoints);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(wordApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          },
          body: docxBlob,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const pdfBlob = await response.blob();
          if (pdfBlob && pdfBlob.size > 0) {
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            toast(`تم بنجاح تصدير ملف PDF رسمي فائق النقاء عبر محرك Word (${filename})`);
            convertedViaWord = true;
          }
        }
      } catch (err) {
        // في حال تعذر الوصول لخادم Word المكتبي، ننتقل فوراً وبسلاسة للمحرك المباشر
        console.info('خادم Word المكتبي غير متصل، جاري التصدير عبر المحرك المباشر للمتصفح:', err);
      }

      // في حال عدم توفر خادم Word، يتم التصدير المباشر كملف PDF حصراً (يُمنع منعاً باتاً تنزيل Word عند طلب PDF)
      if (!convertedViaWord) {
        try {
          await exportClientSidePdf(ver, filename, btn);
        } catch (pdfErr) {
          console.error('Client-side PDF generation failed:', pdfErr);
          toast('جاري فتح نافذة الطباعة لاختيار حفظ كـ PDF...');
          window.print();
        }
      }

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }



    async function executeExportDownload() {
      const { selectedServices, totalEndpoints } = getSelectedExportItems();
      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';

      // 1. Real PDF Export
      if (EXPORT_CONFIG.format === 'pdf') {
        downloadRealPdfDocument(ver);
        return;
      }

      // 2. Real Word .docx Export
      if (EXPORT_CONFIG.format === 'word') {
        const btn = document.getElementById('btn-execute-download');
        const origText = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left:0.5rem;"></i> جاري توليد مستند Word (.docx)...`;
        }

        try {
          const docxBlob = await generateRealDocxBlob(ver, selectedServices, totalEndpoints);
          const filename = `fintech-specification-${ver}.docx`;
          const url = URL.createObjectURL(docxBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast(`تم بنجاح تنزيل مستند Word رسمي (${filename})`);
        } catch (err) {
          console.error('Word docx generation failed:', err);
          toast('حدث خطأ أثناء توليد مستند Word');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
          }
        }
        return;
      }

      // 3. Code formats (OpenAPI, Postman, ISO)
      const btn = document.getElementById('btn-execute-download');
      if (!btn) return;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left:0.5rem;"></i> جاري التوليد...`;

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHtml;

        let content = '';
        let filename = '';
        let mimeType = '';

        if (EXPORT_CONFIG.format === 'openapi') {
          const spec = generateOpenApiSpecObject(selectedServices, ver);
          content = JSON.stringify(spec, null, 2);
          filename = `fintech-governance-openapi-${ver}.json`;
          mimeType = 'application/json';
        } else if (EXPORT_CONFIG.format === 'postman') {
          const col = generatePostmanCollectionObject(selectedServices, ver);
          content = JSON.stringify(col, null, 2);
          filename = `fintech-governance-postman-${ver}.json`;
          mimeType = 'application/json';
        } else if (EXPORT_CONFIG.format === 'iso') {
          content = generateIsoXmlContent(selectedServices, ver);
          filename = `fintech-iso20022-pacs008-${ver}.xml`;
          mimeType = 'application/xml';
        }

        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast(`تم بنجاح تنزيل ملف (${filename})`);
      }, 400);
    }

    function openChangelogModal() { document.getElementById('modal-changelog').classList.add('show'); }
    function closeChangelogModal() { document.getElementById('modal-changelog').classList.remove('show'); }

    // Version switcher
    function onVersionChange(v) {
      APP.currentVersion = v;
      toast(`تم الانتقال للإصدار: ${v}`);
    }

    // Theme toggle
    function toggleTheme() {
      const h = document.documentElement;
      const next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      h.setAttribute('data-theme', next);
      toast(next === 'light' ? "الوضع النهاري" : "الوضع الليلي");
    }

    // Modals
    function openDiffModal() { document.getElementById('modal-diff').classList.add('show'); }
    function closeDiffModal() { document.getElementById('modal-diff').classList.remove('show'); }

    // Toast
    function toast(m) {
      const t = document.getElementById('toast');
      document.getElementById('toast-msg').textContent = m;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    }

    // Global keyboard shortcuts (Escape to close expanded PDF & modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePdfWebsiteExpand();
        if (typeof closeErrorDictionaryModal === 'function') closeErrorDictionaryModal();
        if (typeof closeChangelogModal === 'function') closeChangelogModal();
      }
    });

    // Dynamic Splitter between Export Options and Document Preview
    function initExportSplitter() {
      const splitter = document.getElementById('export-splitter');
      const wrap = document.getElementById('export-resizable-wrap');
      const panel = document.getElementById('export-config-panel');
      if (!splitter || !wrap || !panel) return;

      let isDragging = false;

      function onStart(e) {
        if (wrap.classList.contains('pdf-site-expanded')) return;
        isDragging = true;
        splitter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }

      function onMove(clientX) {
        if (!isDragging) return;
        const wrapRect = wrap.getBoundingClientRect();
        // In RTL document, options panel is on the right side.
        // Therefore, the panel width is distance from right edge of wrap to mouse cursor.
        const isRtl = document.documentElement.getAttribute('dir') === 'rtl';
        let newWidth = isRtl ? (wrapRect.right - clientX) : (clientX - wrapRect.left);

        // Clamp width between 180px and 550px, ensuring preview has at least 320px
        const maxPanelWidth = Math.max(200, wrapRect.width - 340);
        newWidth = Math.max(180, Math.min(newWidth, Math.min(550, maxPanelWidth)));

        wrap.style.setProperty('--export-panel-w', `${newWidth}px`);
        wrap.style.gridTemplateColumns = `${newWidth}px 14px 1fr`;

        // Real-time responsive layout states for seamless reflow
        if (newWidth < 260) {
          panel.setAttribute('data-size', 'compact');
        } else if (newWidth >= 360) {
          panel.setAttribute('data-size', 'wide');
        } else {
          panel.removeAttribute('data-size');
        }
      }

      function onEnd() {
        if (isDragging) {
          isDragging = false;
          splitter.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      }

      splitter.addEventListener('mousedown', onStart);
      document.addEventListener('mousemove', (e) => onMove(e.clientX));
      document.addEventListener('mouseup', onEnd);

      splitter.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) onStart(e);
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) onMove(e.touches[0].clientX);
      }, { passive: true });

      document.addEventListener('touchend', onEnd);

      // Initial layout state
      const initialW = panel.offsetWidth || 280;
      if (initialW < 260) panel.setAttribute('data-size', 'compact');
      else if (initialW >= 360) panel.setAttribute('data-size', 'wide');
    }

    // Initialize Splitter
    initExportSplitter();

// =========================================================================
// DYNAMIC IN-PLACE SPEC PROVISIONING & WIZARDS (PLATFORM 1)
// =========================================================================

function openAddEndpointDrawer() {
  document.getElementById('drawer-endpoint-backdrop').classList.add('show');
  document.getElementById('drawer-endpoint-add').classList.add('show');
  const pInput = document.getElementById('drawer-ep-path');
  if (pInput) pInput.focus();
}

function closeAddEndpointDrawer() {
  document.getElementById('drawer-endpoint-backdrop').classList.remove('show');
  document.getElementById('drawer-endpoint-add').classList.remove('show');
}

function applyEndpointPreset(val) {
  const methodInput = document.getElementById('drawer-ep-method');
  const pathInput = document.getElementById('drawer-ep-path');
  const shortNameInput = document.getElementById('drawer-ep-shortname');
  const descInput = document.getElementById('drawer-ep-desc');

  if (val === 'iso_transfer') {
    methodInput.value = 'POST';
    pathInput.value = '/v1/transfers/fx-instant';
    shortNameInput.value = 'fx-transfer';
    descInput.value = 'تحويل مالي فوري وتغطية العملات الأجنبية مطابق لمعيار ISO 20022 مع تحقق آلي من حظر الأسماء وقواعد غسل الأموال.';
  } else if (val === 'iso_balance') {
    methodInput.value = 'GET';
    pathInput.value = '/v1/accounts/multi-currency-balance';
    shortNameInput.value = 'mc-balance';
    descInput.value = 'استعلام لحظي للأرصدة البنكية لكافة الحسابات المربوطة وفق حزمة رسائل camt.053 مع تدقيق PII.';
  } else if (val === 'instant_pay') {
    methodInput.value = 'POST';
    pathInput.value = '/v1/merchants/qr-instant-pay';
    shortNameInput.value = 'qr-pay';
    descInput.value = 'مسار مدفوعات سريع عبر رمز الاستجابة السريع QR لنقاط البيع وبوابات الدفع الإلكتروني مع تسوية فورية.';
  } else if (val === 'aml_check') {
    methodInput.value = 'POST';
    pathInput.value = '/v1/compliance/sanctions-screen';
    shortNameInput.value = 'sanctions';
    descInput.value = 'فحص قائمة العقوبات وقوائم الحظر الوطنية والدولية قبل تمرير العملية المالية.';
  } else {
    methodInput.value = 'POST';
    pathInput.value = '';
    shortNameInput.value = '';
    descInput.value = '';
  }
}

function saveNewEndpointFromDrawer() {
  const method = document.getElementById('drawer-ep-method').value;
  let path = document.getElementById('drawer-ep-path').value.trim();
  const shortName = document.getElementById('drawer-ep-shortname').value.trim() || path.split('/').filter(Boolean).pop() || 'endpoint';
  const desc = document.getElementById('drawer-ep-desc').value.trim() || 'مسار مسجل حديثاً في المواصفة الرسمية.';
  const status = document.getElementById('drawer-ep-status').value;

  if (!path) {
    toast('يرجى تحديد مسار الخدمة');
    return;
  }
  if (!path.startsWith('/')) path = '/' + path;

  const isDraft = (status === 'draft');

  const newEp = {
    method: method,
    path: path,
    shortName: shortName,
    isDraft: isDraft,
    desc: desc,
    params: [
      { name: 'channelId', type: 'string (UUID)', req: true, tag: 'SECURITY', tagClass: 'badge-iso', rule: 'معرف القناة الإلكترونية المعتمدة للربط' },
      { name: 'amount', type: 'number (Decimal 18,2)', req: true, tag: 'FINANCIAL', tagClass: 'badge-fin', rule: 'المبلغ المالي المطابق لقواعد التحقق الرقابي' },
      { name: 'currency', type: 'string (ISO-4217)', req: true, tag: 'FINANCIAL', tagClass: 'badge-fin', rule: 'رمز العملة الرسمية المعياري (SAR, USD)' }
    ],
    responseFields: [
      { name: 'status', type: 'string (Enum)', req: 'مؤكد بالرد', desc: 'حالة العملية: APPROVED أو PENDING' },
      { name: 'referenceId', type: 'string (Ref)', req: 'مؤكد بالرد', desc: 'الرقم المرجعي السيادي الصادر من النظام' },
      { name: 'timestamp', type: 'string (ISO-8601)', req: 'مؤكد بالرد', desc: 'التوقيت الزمني لتوثيق القيد المالي' }
    ],
    rules: [
      { cond: 'قيمة العملية يجب أن لا تتجاوز الحدود المصرحة', err: 'ERR_LIMIT_EXCEEDED' },
      { cond: 'تطابق توقيع المعاملة الرقمي', err: 'ERR_INVALID_SIGNATURE' }
    ],
    examples: {
      json: JSON.stringify({ channelId: "CH-90112", amount: 2500.00, currency: "SAR" }, null, 2),
      curl: `curl -X ${method} "https://api.gov.fintech${path}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 2500.00, "currency": "SAR"}'`
    }
  };

  // Push to current sector
  if (!APP.sectorEndpoints) APP.sectorEndpoints = [];
  APP.sectorEndpoints.push(newEp);

  // Also update DATA structure
  if (APP.currentSector && DATA[APP.currentSector]) {
    const srvKeys = Object.keys(DATA[APP.currentSector].services);
    if (srvKeys.length > 0) {
      DATA[APP.currentSector].services[srvKeys[0]].endpoints.push(newEp);
    }
  }

  APP.activeEndpointIdx = APP.sectorEndpoints.length - 1;
  closeAddEndpointDrawer();
  renderEndpointsRibbon();

  // Reset inputs
  document.getElementById('drawer-ep-path').value = '';
  document.getElementById('drawer-ep-shortname').value = '';
  document.getElementById('drawer-ep-desc').value = '';

  toast(`تمت إضافة المسار [${method} ${path}] بنجاح إلى المواصفة!`);
}

function sealActiveEndpoint() {
  if (!APP.sectorEndpoints || !APP.sectorEndpoints[APP.activeEndpointIdx]) return;
  const ep = APP.sectorEndpoints[APP.activeEndpointIdx];
  ep.isDraft = false;

  renderEndpointsRibbon();
  toast(`تم ختم واعتماد المسار [${ep.path}] رسمياً بتوقيع سيادي RSA-PSS-4096!`);
}

function openAddApiWizard() {
  document.getElementById('modal-add-api-wizard').classList.add('show');
}

function closeAddApiWizard() {
  document.getElementById('modal-add-api-wizard').classList.remove('show');
}

function commitNewApi() {
  const sector = document.getElementById('wiz-api-sector').value;
  const name = document.getElementById('wiz-api-name').value.trim();
  let endpoint = document.getElementById('wiz-api-endpoint').value.trim();

  if (!name) {
    toast('يرجى إدخال اسم الـ API');
    return;
  }
  if (!endpoint) endpoint = '/v1/service/action';
  if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;

  const srvKey = 'srv_' + Date.now();
  if (DATA[sector]) {
    DATA[sector].services[srvKey] = {
      name: name,
      endpoints: [
        {
          method: 'POST',
          path: endpoint,
          shortName: endpoint.split('/').filter(Boolean).pop(),
          isDraft: false,
          desc: `المسار التأسيسي لخدمة ${name}`,
          params: [
            { name: 'requestId', type: 'string (UUID)', req: true, tag: 'SECURITY', tagClass: 'badge-iso', rule: 'معرف الطلب الموحد' },
            { name: 'payload', type: 'object', req: true, tag: 'CORE', tagClass: 'badge-fin', rule: 'بيانات العملية المعتمدة' }
          ],
          responseFields: [
            { name: 'status', type: 'string (Enum)', req: 'مؤكد بالرد', desc: 'حالة استجابة النظام' },
            { name: 'code', type: 'string', req: 'مؤكد بالرد', desc: 'كود التنفيذ' }
          ],
          rules: [
            { cond: 'صحة بيانات الطلب', err: 'ERR_VALIDATION_FAILED' }
          ],
          examples: {
            json: JSON.stringify({ requestId: "REQ-101", payload: {} }, null, 2),
            curl: `curl -X POST "https://api.gov.fintech${endpoint}" -H "Authorization: Bearer <TOKEN>"`
          }
        }
      ]
    };
  }

  closeAddApiWizard();
  selectSector(sector);
  toast(`تم إنشاء وتفعيل API [${name}] بنجاح!`);
}