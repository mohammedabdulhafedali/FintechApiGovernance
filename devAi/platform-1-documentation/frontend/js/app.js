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
    updateDashboardCards();
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
  } else if (view === 'add-api') {
    const addBtn = document.getElementById('btn-nav-add-api');
    if (addBtn) addBtn.classList.add('active');
    renderSavedCustomApisList();
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
  if (sector.services) {
    for (const srv of Object.values(sector.services)) {
      (srv.endpoints || []).forEach(ep => {
        APP.sectorEndpoints.push(ep);
      });
    }
  }

  const workbench = document.querySelector('.spec-workbench-container');
  let emptyWrap = document.getElementById('sector-empty-state-wrap');

  if (APP.sectorEndpoints.length === 0) {
    if (workbench) workbench.style.display = 'none';
    if (!emptyWrap) {
      emptyWrap = document.createElement('div');
      emptyWrap.id = 'sector-empty-state-wrap';
      document.getElementById('pane-spec').appendChild(emptyWrap);
    }
    emptyWrap.style.display = 'block';
    emptyWrap.innerHTML = `
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:3.5rem 2rem; text-align:center; max-width:680px; margin:2.5rem auto; box-shadow:0 15px 35px rgba(0,0,0,0.3);">
        <div style="width:68px; height:68px; border-radius:50%; background:rgba(16, 185, 129, 0.12); display:flex; align-items:center; justify-content:center; color:var(--emerald); margin:0 auto 1.25rem; font-size:1.85rem;">
          <i class="fa-solid fa-folder-open"></i>
        </div>
        <h3 style="font-size:1.3rem; font-weight:800; color:var(--text); margin-bottom:0.5rem;">لا توجد أي APIs موثقة لـ [${sector.name}] بعد</h3>
        <p style="font-size:0.86rem; color:var(--text-muted); max-width:480px; margin:0 auto 1.75rem; line-height:1.65;">
          تم تسجيل هذه الجهة في الكتالوج بنجاح. يمكنك الآن إضافة أول API أو خدمة مصرفية تابعة لهذه الجهة وتوثيق مساراتها مباشرة.
        </p>
        <button class="btn btn-emerald" style="padding:0.65rem 1.75rem; font-size:0.92rem;" onclick="openAddApiForCurrentSector('${sectorKey}')">
          <i class="fa-solid fa-circle-plus"></i> + إضافة أول API لهذه الجهة
        </button>
      </div>
    `;
    renderEndpointsRibbon();
    toast(`تم استعراض: ${sector.name} (بانتظار إضافة أول API)`);
    return;
  }

  if (emptyWrap) emptyWrap.style.display = 'none';
  if (workbench) workbench.style.display = 'block';

  APP.activeEndpointIdx = 0;
  renderEndpointsRibbon();
  renderEndpointDetails();
  toast(`تم استعراض: ${sector.name}`);
}

function openAddApiForCurrentSector(sectorKey) {
  goView('add-api');
  const secSelect = document.getElementById('add-api-sector');
  if (secSelect) {
    let exists = Array.from(secSelect.options).some(o => o.value === sectorKey);
    if (!exists && DATA[sectorKey]) {
      const opt = document.createElement('option');
      opt.value = sectorKey;
      opt.textContent = DATA[sectorKey].name;
      secSelect.insertBefore(opt, secSelect.lastElementChild);
    }
    secSelect.value = sectorKey;
    onSectorSelectChange(sectorKey);
  }
  const titleInp = document.getElementById('add-api-title');
  if (titleInp) titleInp.focus();
}

// Render Endpoints Ribbon (Concise name only: transfers, recall, balance, etc.)
function renderEndpointsRibbon() {
  const ribbon = document.getElementById('endpoints-ribbon');
  ribbon.innerHTML = '';

  if (!APP.sectorEndpoints || APP.sectorEndpoints.length === 0) {
    // Show add API button directly in ribbon for empty sector
    const addApiBtn = document.createElement('button');
    addApiBtn.className = 'btn-ribbon-add';
    addApiBtn.style.cssText = 'background:rgba(16, 185, 129, 0.12); color:var(--emerald); border-color:var(--emerald); font-weight:700;';
    addApiBtn.innerHTML = '<i class="fa-solid fa-circle-plus"></i> + إضافة API لهذه الجهة';
    addApiBtn.onclick = () => openAddApiForCurrentSector(APP.currentSector);
    ribbon.appendChild(addApiBtn);
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

  // Dynamic Add Endpoint Button directly in ribbon
  const addEpBtn = document.createElement('button');
  addEpBtn.className = 'btn-ribbon-add';
  addEpBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة مسار من الشاشة';
  addEpBtn.onclick = openAddEndpointDrawer;
  ribbon.appendChild(addEpBtn);

  // Dynamic Add API to this entity Button
  const addApiBtn = document.createElement('button');
  addApiBtn.className = 'btn-ribbon-add';
  addApiBtn.style.cssText = 'background:rgba(16, 185, 129, 0.12); color:var(--emerald); border-color:var(--emerald); font-weight:700;';
  addApiBtn.innerHTML = '<i class="fa-solid fa-folder-plus"></i> + إضافة API جديدة لهذه الجهة';
  addApiBtn.onclick = () => openAddApiForCurrentSector(APP.currentSector);
  ribbon.appendChild(addApiBtn);

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
        markdown: 'Ultimate Pay (.md)',
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

    function getEffectiveSectionsForService(service) {
      if (service && service.exportSections) {
        return service.exportSections;
      }
      return {
        overview: true,
        security: true,
        headers: true,
        sdk: true,
        errors: true,
        endpoints: true
      };
    }

    function generateUltimatePayStyleMarkdown(selectedServices, ver) {
      const dateStr = '30-9-2026';
      let md = '';

      // 1. Title Block
      md += `# Financial Institutions (FI) API Documentation\n\n`;
      md += `**Ultimate Pay Platform**\n\n`;
      md += `latest update  ${dateStr}  \n\n`;
      md += `---\n\n`;

      // 2. Overview Section
      const showOverview = selectedServices.some(s => getEffectiveSectionsForService(s).overview);
      if (showOverview) {
        md += `## Overview\n\n`;
        md += `The **Ultimate Pay Financial Institutions (FI) API** enables financial institutions to seamlessly integrate payment, inquiry, biller discovery, and transaction management services. All API requests are authenticated using RSA-SHA256 digital signatures to ensure end-to-end message integrity and non-repudiation.\n\n`;
        md += `### Base URL\n\n`;
        md += `\`\`\`http\nhttps://tahseeltest.ultimate-pay.net/webserve\n\`\`\`\n\n`;
        md += `---\n\n`;
      }

      // 3. Authentication & Security
      const showSecurity = selectedServices.some(s => getEffectiveSectionsForService(s).security);
      if (showSecurity) {
        md += `## 1. Authentication & Security\n\n`;
        md += `### 1.1 Digital Signature Overview\n\n`;
        md += `The digital signature serves as a secure, stateless alternative to traditional username/password authentication. Every HTTP request sent to the platform must include custom security headers generated using an RSA-256 private key.\n\n`;
        md += `### 1.2 FI Onboarding Steps\n\n`;
        md += `1.  **Navigate to Platform Settings**: Log into the **Ultimate Pay Platform** and go to the **Users** screen.\n`;
        md += `2.  **Create FI User**:\n`;
        md += `- Create a new user with type **Financial Institution**.\n`;
        md += `- Assign appropriate permissions.\n`;
        md += `- Set the user role/type as **Terminal User**.\n`;
        md += `3.  **Key Exchange**:\n`;
        md += `- Generate an RSA key pair locally (minimum 2048-bit recommended).\n`;
        md += `- Upload the \`public_key.pem\` file or paste its content into the designated text box in the admin portal.\n`;
        md += `- **Important Security Notice**: Store \`private_key.pem\` in a secure location (e.g., HSM, AWS Secrets Manager, Key Vault). *Never share or expose the private key.*\n\n`;
        md += `---\n\n`;
        md += `### 1.3 Signature Generation Specification\n\n`;
        md += `To sign a request, construct a canonical string formatted as follows:\n\n`;
        md += `\`\`\`text\n<HTTP_METHOD>\\n<PATH>\\n<TIMESTAMP>\\n<NONCE>\\n<SHA256_HASH_OF_BODY>\n\`\`\`\n\n`;
        md += `Where:\n`;
        md += `-  \`<HTTP_METHOD>\`: Uppercase HTTP method (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`).\n`;
        md += `-  \`<PATH>\`: Request endpoint path starting with \`/\` (e.g., \`/api/v1/financial_corp/sub_sector\`).\n`;
        md += `-  \`<TIMESTAMP>\`: Current Unix timestamp in seconds (string).\n`;
        md += `-  \`<NONCE>\`: Unique UUID v4 string for replay protection.\n`;
        md += `-  \`<SHA256_HASH_OF_BODY>\`: Lowercase hex digest of the SHA-256 hash of the raw JSON request body (for empty body, use \`""\`).\n\n`;
        md += `Sign the UTF-8 encoded canonical string using **RSA PKCS#1 v1.5 with SHA-256**, then Base64 encode the resulting signature.\n\n`;
        md += `---\n\n`;
      }

      // 4. Required Request Headers
      const showHeaders = selectedServices.some(s => getEffectiveSectionsForService(s).headers);
      if (showHeaders) {
        md += `### 1.4 Required Request Headers\n\n`;
        md += `Every request sent to the Ultimate Pay platform must include the following headers:\n\n`;
        md += `| Header Name | Description | Example |\n`;
        md += `| :--- | :--- | :--- |\n`;
        md += `| \`X-Client-ID\` | Unique identifier assigned to the user | \`client_corp_17\` |\n`;
        md += `| \`X-Timestamp\` | Unix timestamp (seconds) when request was sent | \`1786981200\` |\n`;
        md += `| \`X-Nonce\` | UUID v4 generated per request | \`c9bf9e57-1685-4c89-bafb-ff5af830be8a\` |\n`;
        md += `| \`X-Signature\` | Base64-encoded RSA-256 signature | \`dGhpcyBpcyBhIHNpZ25hdHVyZQ...\` |\n`;
        md += `| \`Content-Type\` | Payload content type | \`application/json\` |\n\n`;
        md += `> ⚠️ **Verification Note**: The exact raw request body sent in the payload must be used to generate the SHA-256 hash. Any mismatch (e.g., key reordering, spacing differences) will cause signature verification failure on the server.\n\n`;
        md += `---\n\n`;
      }

      // 5. Python SDK Implementation
      const showSdk = selectedServices.some(s => getEffectiveSectionsForService(s).sdk);
      if (showSdk) {
        md += `### 1.5 Python Client SDK Implementation\n\n`;
        md += `Below is a complete, production-ready Python client class implementing RSA-256 request signing and request execution:\n\n`;
        md += `\`\`\`python\nimport hashlib\nimport json\nimport time\nimport uuid\nfrom base64 import b64encode\nfrom typing import Optional\nimport requests\nfrom cryptography.hazmat.primitives import hashes, serialization\nfrom cryptography.hazmat.primitives.asymmetric import padding\n\nclass RS256ApiClient:\n    def __init__(self, base_url: str, client_id: str, private_key_pem: str):\n        self.base_url = base_url.rstrip("/")\n        self.client_id = client_id\n        self.private_key = serialization.load_pem_private_key(\n            private_key_pem.encode("utf-8"), password=None\n        )\n\n    def _sha256(self, data: str) -> str:\n        return hashlib.sha256(data.encode("utf-8")).hexdigest()\n\n    def _sign(self, canonical: str) -> str:\n        sig = self.private_key.sign(\n            canonical.encode("utf-8"),\n            padding.PKCS1v15(),\n            hashes.SHA256()\n        )\n        return b64encode(sig).decode("utf-8")\n\n    def _headers(self, method: str, path: str, body: str,\n                 timestamp: Optional[str] = None, nonce: Optional[str] = None) -> dict:\n        ts = timestamp or str(int(time.time()))\n        n = nonce or str(uuid.uuid4())\n        canonical = f"{method}\\n{path}\\n{ts}\\n{n}\\n{self._sha256(body)}"\n        return {\n            "X-Client-ID": self.client_id,\n            "X-Timestamp": ts,\n            "X-Nonce": n,\n            "X-Signature": self._sign(canonical),\n            "Content-Type": "application/json",\n        }\n\n    def request(self, method: str, path: str, body: str = "",\n                timestamp: Optional[str] = None, nonce: Optional[str] = None) -> requests.Response:\n        headers = self._headers(method, path, body, timestamp, nonce)\n        url = f"{self.base_url}{path}"\n        return requests.request(method, url, data=body, headers=headers)\n\n    def post(self, path: str, body: str = "{}", **kw) -> requests.Response:\n        return self.request("POST", path, body, **kw)\n\`\`\`\n\n---\n\n`;
      }

      // 6. Error Handling
      const showErrors = selectedServices.some(s => getEffectiveSectionsForService(s).errors);
      if (showErrors) {
        md += `### 1.6 General Error Handling\n\n`;
        md += `The platform standardizes on RFC 7807 problem details across all integrations:\n\n`;
        md += `| HTTP Status | Category | Description |\n`;
        md += `| :--- | :--- | :--- |\n`;
        md += `| \`200 OK\` | Success | Request processed successfully |\n`;
        md += `| \`400 Bad Request\` | Malformed Request | Syntax error, missing headers, or invalid JSON |\n`;
        md += `| \`401 Unauthorized\` | Authentication Failure | Invalid signature, expired timestamp, or bad key |\n`;
        md += `| \`422 Unprocessable\` | Business Rule Validation | Validation error or business rule breach |\n`;
        md += `| \`500 Server Error\` | System Exception | Unexpected internal core switch failure |\n\n`;
        md += `### System Error Matrix\n\n`;
        md += `| Code | Description | Suggested Action |\n`;
        md += `| :--- | :--- | :--- |\n`;
        md += `| \`ERR_AUTH_001\` | Invalid Signature | Verify private key and canonical string format |\n`;
        md += `| \`ERR_NONCE_002\` | Replay Attack / Nonce Reused | Ensure UUID v4 is regenerated per request |\n`;
        md += `| \`ERR_EXPIRED_003\` | Timestamp Expired | Synchronize system clock with NTP |\n`;
        md += `| \`ERR_VALIDATION_422\` | Schema Constraint Error | Verify payload fields against data type rules |\n`;
        md += `| \`ERR_LIMIT_EXCEEDED\` | Transaction Ceiling Exceeded | Ensure amount is within permitted limits |\n\n`;
        md += `---\n\n`;
      }

      // 7. Operations & Endpoints Catalogue
      let sectionIndex = 2;
      selectedServices.forEach(s => {
        const sEff = getEffectiveSectionsForService(s);
        if (!sEff.endpoints) return;

        md += `## ${sectionIndex}. ${s.title || s.name || 'Financial Service'} Endpoints\n\n`;

        (s.endpoints || []).forEach((ep, epIdx) => {
          const epNum = `${sectionIndex}.${epIdx + 1}`;
          md += `### ${epNum} ${ep.shortName || ep.desc || 'Endpoint Operation'}\n\n`;
          md += `${ep.desc || 'Official banking API specification endpoint.'}\n\n`;
          md += `- **Endpoint**: \`${ep.method} ${ep.path}\`\n`;
          md += `- **Headers**: Required RSA Security Headers\n\n`;

          // Request Parameters Table
          md += `#### Request Parameters\n`;
          md += `| Field Name | Type | Length / Constraint | Required | Description |\n`;
          md += `| :--- | :--- | :--- | :--- | :--- |\n`;
          if (ep.params && ep.params.length > 0) {
            ep.params.forEach(p => {
              const typeStr = (p.type || 'STR').toUpperCase().includes('INT') ? 'INT' : (p.type || 'STR').toUpperCase().includes('DEC') ? 'DECIMAL' : 'STR';
              const constraintStr = p.length || (typeStr === 'INT' ? 'Max (15)' : 'Max (250)');
              const reqStr = p.req ? '**Must**' : 'Optional';
              md += `| \`${p.name}\` | \`${typeStr}\` | ${constraintStr} | ${reqStr} | ${p.rule || p.desc || 'Standard parameter'} |\n`;
            });
          } else {
            md += `| \`requestId\` | \`STR\` | Max (64) | **Must** | Unique request identifier |\n`;
          }
          md += `\n`;

          // Code Example
          md += `#### Code Example\n`;
          md += `\`\`\`python\n`;
          let payloadObj = {};
          try {
            payloadObj = typeof ep.payload === 'string' ? JSON.parse(ep.payload) : (ep.payload || {});
          } catch (e) {
            payloadObj = { status: "TEST" };
          }
          md += `payload = json.dumps(${JSON.stringify(payloadObj, null, 4)})\n`;
          md += `response = client.post("${ep.path}", body=payload)\n`;
          md += `\`\`\`\n\n`;

          // Response Example 200 OK
          md += `#### Response Example (\`200 OK\`)\n`;
          md += `\`\`\`json\n`;
          let res200Str = '';
          try {
            const parsedRes = typeof ep.res200 === 'string' ? JSON.parse(ep.res200) : (ep.res200 || { status: "success" });
            res200Str = JSON.stringify(parsedRes, null, 2);
          } catch (e) {
            res200Str = typeof ep.res200 === 'string' ? ep.res200 : '{\n  "status": "success"\n}';
          }
          md += `${res200Str}\n`;
          md += `\`\`\`\n\n`;

          // Response Parameters Table
          md += `#### Response Parameters\n`;
          md += `| Field Name | Type | Description |\n`;
          md += `| :--- | :--- | :--- |\n`;
          try {
            const parsedRes = typeof ep.res200 === 'string' ? JSON.parse(ep.res200) : (ep.res200 || {});
            const keys = Object.keys(parsedRes);
            if (keys.length > 0) {
              keys.forEach(k => {
                const v = parsedRes[k];
                const t = typeof v === 'number' ? 'INT' : typeof v === 'boolean' ? 'BOOL' : typeof v === 'object' ? 'OBJECT' : 'STR';
                md += `| \`${k}\` | \`${t}\` | Operation response attribute |\n`;
              });
            } else {
              md += `| \`status\` | \`STR\` | Execution result status |\n`;
            }
          } catch (e) {
            md += `| \`status\` | \`STR\` | Execution result status |\n`;
          }
          md += `\n---\n\n`;
        });

        sectionIndex++;
      });

      return md;
    }

    function renderMarkdownToHtmlPreview(md) {
      if (!md) return '';
      const lines = md.split('\n');
      let html = '';
      let inCode = false;
      let codeBuffer = [];
      let inTable = false;
      let tableRows = [];

      const flushTable = () => {
        if (!inTable) return;
        html += '<table style="width:100%; border-collapse:collapse; margin:1rem 0;">';
        tableRows.forEach((r, idx) => {
          const cells = r.split('|').filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1).map(c => c.trim());
          if (cells.length > 0 && !cells.every(c => /^:?-+:?$/.test(c))) {
            html += '<tr>';
            cells.forEach(cell => {
              const tag = (idx === 0) ? 'th' : 'td';
              let formatted = escapeXmlHtml(cell).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>');
              html += `<${tag} style="border:1px solid #334155; padding:0.5rem 0.75rem;">${formatted}</${tag}>`;
            });
            html += '</tr>';
          }
        });
        html += '</table>';
        tableRows = [];
        inTable = false;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim().startsWith('```')) {
          if (inTable) flushTable();
          if (!inCode) {
            inCode = true;
            codeBuffer = [];
          } else {
            inCode = false;
            html += `<pre><code>${escapeXmlHtml(codeBuffer.join('\n'))}</code></pre>`;
            codeBuffer = [];
          }
          continue;
        }

        if (inCode) {
          codeBuffer.push(line);
          continue;
        }

        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
          inTable = true;
          tableRows.push(line.trim());
          continue;
        } else {
          if (inTable) flushTable();
        }

        if (!line.trim()) continue;

        if (line.startsWith('# ')) {
          html += `<h1>${escapeXmlHtml(line.slice(2))}</h1>`;
        } else if (line.startsWith('## ')) {
          html += `<h2>${escapeXmlHtml(line.slice(3))}</h2>`;
        } else if (line.startsWith('### ')) {
          html += `<h3>${escapeXmlHtml(line.slice(4))}</h3>`;
        } else if (line.startsWith('#### ')) {
          html += `<h4>${escapeXmlHtml(line.slice(5))}</h4>`;
        } else if (line.startsWith('> ⚠️') || line.startsWith('> ')) {
          html += `<blockquote>${escapeXmlHtml(line.replace(/^>\s*/, '')).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</blockquote>`;
        } else if (line.trim() === '---') {
          html += `<hr style="border:none; border-top:1px solid #334155; margin:1.5rem 0;">`;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          html += `<p style="margin-inline-start:1rem; margin-bottom:0.35rem;">• ${escapeXmlHtml(line.slice(2)).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>')}</p>`;
        } else if (/^\d+\.\s/.test(line)) {
          html += `<p style="margin-inline-start:1rem; margin-bottom:0.35rem;">${escapeXmlHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>')}</p>`;
        } else {
          html += `<p>${escapeXmlHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>')}</p>`;
        }
      }

      if (inTable) flushTable();
      return html;
    }

    function generateMarkdownVisualHtml(selectedServices, ver, totalEndpoints) {
      const mdRaw = generateUltimatePayStyleMarkdown(selectedServices, ver);
      const filename = `Ultimate_Pay_FI_API_Documentation_${ver}.md`;

      return `
        <div class="markdown-doc-container">
          <div class="markdown-doc-header-bar">
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <i class="fa-brands fa-markdown" style="color:#a855f7; font-size:1.2rem;"></i>
              <span style="font-weight:700; color:#f8fafc; font-size:0.85rem;">معاينة وثيقة Markdown الرسمية (معيار Ultimate Pay)</span>
              <span class="mono" style="font-size:0.75rem; color:#94a3b8; background:rgba(255,255,255,0.06); padding:0.15rem 0.5rem; border-radius:4px;">${filename}</span>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button type="button" class="btn btn-ghost" style="font-size:0.75rem; padding:0.25rem 0.65rem;" onclick="copyMarkdownDocDirect()">
                <i class="fa-solid fa-copy"></i> نسخ Markdown
              </button>
              <button type="button" class="btn btn-emerald" style="font-size:0.75rem; padding:0.25rem 0.75rem;" onclick="executeExportDownload()">
                <i class="fa-solid fa-download"></i> تنزيل .md
              </button>
            </div>
          </div>
          <div class="markdown-doc-content">
            ${renderMarkdownToHtmlPreview(mdRaw)}
          </div>
        </div>
      `;
    }

    function copyMarkdownDocDirect() {
      const { selectedServices } = getSelectedExportItems();
      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';
      const md = generateUltimatePayStyleMarkdown(selectedServices, ver);
      navigator.clipboard.writeText(md).then(() => {
        toast('تم بنجاح نسخ وثيقة Markdown (معيار Ultimate Pay) إلى الحافظة');
      });
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
      } else if (fmt === 'markdown') {
        visualHtml = generateMarkdownVisualHtml(selectedServices, ver, totalEndpoints);
        if (btn) btn.innerHTML = `<i class="fa-brands fa-markdown"></i> <span>تنزيل ملف Markdown (.md)</span>`;
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
      executeExportDownload();
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
      const origText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left:0.4rem;"></i> جاري توليد وتحميل ملف الـ PDF...`;
      }

      // 1. عرض نافذة انتظار تفاعلية شفافة احترافية
      let loadingOverlay = document.getElementById('pdf-export-loading-backdrop');
      if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'pdf-export-loading-backdrop';
        loadingOverlay.style.cssText = `
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 29, 0.88);
          backdrop-filter: blur(8px);
          z-index: 999998;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.2rem;
          color: #f8fafc;
          font-family: 'Cairo', system-ui, sans-serif;
        `;
        loadingOverlay.innerHTML = `
          <div style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); border-radius:50%; width:76px; height:76px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 25px rgba(56,189,248,0.25);">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2.5rem; color:#38bdf8;"></i>
          </div>
          <div style="text-align:center;">
            <div style="font-size:1.15rem; font-weight:800; margin-bottom:0.4rem;">جاري تصدير وثيقة المواصفة بصيغة PDF مباشرة...</div>
            <div style="font-size:0.84rem; color:#94a3b8;">يتم الآن تجهيز الصفحات الـ 4 المعتمدة وحفظ الملف تلقائياً إلى جهازك</div>
          </div>
        `;
        document.body.appendChild(loadingOverlay);
      }

      // 2. انتظار اكتمال تحميل الخطوط المعتمدة
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) { /* ignore */ }
      }

      // 3. تحديث وجلب صفحات المستند المعتمد
      const { selectedServices } = getSelectedExportItems();
      const stackContainer = document.getElementById('pdf-pages-stack-container');
      if (stackContainer) {
        stackContainer.innerHTML = generateFullPdfDocumentPagesHtml(selectedServices, ver);
      }
      let pages = document.querySelectorAll('#pdf-pages-stack-container .pdf-paper-page');

      if (!pages || pages.length === 0) {
        if (loadingOverlay && loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
        toast('لم يتم العثور على صفحات المستند لتوليد ملف الـ PDF');
        return;
      }

      // 4. بناء مسرح تصدير نقي معزول بدقة A4 ومطابق للأبعاد المتجهية
      const exportStage = document.createElement('div');
      exportStage.id = 'clean-pdf-export-stage';
      exportStage.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 794px;
        background: #ffffff;
        direction: rtl;
        margin: 0;
        padding: 0;
        z-index: 999997;
        box-shadow: none;
        border: none;
        pointer-events: none;
      `;

      pages.forEach((p, idx) => {
        const clone = p.cloneNode(true);
        clone.className = 'pdf-paper-page' + (idx < pages.length - 1 ? ' html2pdf__page-break' : '');
        clone.style.cssText = `
          width: 794px !important;
          min-height: 1122px !important;
          max-height: 1122px !important;
          height: 1122px !important;
          box-sizing: border-box !important;
          padding: 36px 40px !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          direction: rtl !important;
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          overflow: hidden !important;
          ${idx < pages.length - 1 ? 'page-break-after: always !important; break-after: page !important;' : 'page-break-after: avoid !important; break-after: avoid !important;'}
        `;

        // تصفير letter-spacing لضمان عدم تفكك وترابط الحروف العربية
        clone.querySelectorAll('*').forEach(el => {
          el.style.letterSpacing = 'normal';
          el.style.fontKerning = 'normal';
        });

        exportStage.appendChild(clone);
      });

      document.body.appendChild(exportStage);

      const opt = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], after: '.html2pdf__page-break' }
      };

      try {
        if (typeof html2pdf !== 'undefined') {
          // التصدير المباشر كملف PDF وتنزيله فوراً للمستخدم بدون فتح نافذة الطباعة
          const pdfBlob = await html2pdf().set(opt).from(exportStage).outputPdf('blob');
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          toast(`تم بنجاح تصدير وتنزيل ملف PDF المعتمد (${filename}) مباشرة`);
        } else {
          throw new Error('محرك html2pdf غير متاح');
        }
      } catch (err) {
        console.error('Direct client-side PDF export error:', err);
        toast('حدث خطأ أثناء تصدير ملف الـ PDF');
      } finally {
        if (loadingOverlay && loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
        if (exportStage && exportStage.parentNode) {
          exportStage.parentNode.removeChild(exportStage);
        }
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      }
    }

    async function downloadRealPdfDocument(ver) {
      const btn = document.getElementById('btn-execute-download');
      const filename = `fintech-specification-${ver}.pdf`;
      await exportClientSidePdf(ver, filename, btn);
    }

    async function executeExportDownload() {
      const { selectedServices, totalEndpoints } = getSelectedExportItems();
      const ver = document.getElementById('global-release-select')?.value || 'v2026.2';

      // 1. التصدير المباشر كملف PDF حقيقي دون إظهار نافذة الطباعة
      if (EXPORT_CONFIG.format === 'pdf') {
        const btn = document.getElementById('btn-execute-download');
        const filename = `fintech-specification-${ver}.pdf`;
        await exportClientSidePdf(ver, filename, btn);
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

      // 2.5 Markdown (.md) Ultimate Pay Export
      if (EXPORT_CONFIG.format === 'markdown') {
        const btn = document.getElementById('btn-execute-download');
        const origText = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left:0.5rem;"></i> جاري توليد وثيقة Markdown...`;
        }

        try {
          const mdText = generateUltimatePayStyleMarkdown(selectedServices, ver);
          const filename = `Ultimate_Pay_FI_API_Documentation_${ver}.md`;
          const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast(`تم بنجاح تنزيل وثيقة Markdown الرسمية (${filename})`);
        } catch (err) {
          console.error('Markdown export failed:', err);
          toast('حدث خطأ أثناء تصدير ملف Markdown');
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

// =========================================================================
// DYNAMIC API DOCUMENTATION ENGINE & LOCAL STORAGE PERSISTENCE
// =========================================================================
const STORAGE_CUSTOM_APIS_KEY = 'FINTECH_CUSTOM_APIS_V1';

// Preset Templates for Rapid Meeting Demonstrations
const PRESET_TEMPLATES = {
  fx: {
    sector: 'banking',
    title: 'خدمة أسعار صرف العملات والتحويل اللحظي FX',
    code: 'FX_RATES',
    baseUrl: 'https://api.gov.fintech/v1/fx',
    method: 'POST',
    path: '/v1/fx/quotes/convert',
    shortName: 'fx-convert',
    ruleName: 'تثبيت وحجز سعر الصرف لمدة 60 ثانية للعمليات اللحظية',
    desc: 'تنفيذ عمليات صرف العملات الفورية للتحويلات البنكية الدولية والمحلية متعددة العملات مع قفل سعر الصرف اللحظي.',
    payload: `{\n  "sourceCurrency": "SAR",\n  "targetCurrency": "USD",\n  "amount": 50000.00,\n  "settlementSpeed": "INSTANT",\n  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"\n}`,
    res200: `{\n  "quoteId": "FX-QUOTE-88910",\n  "exchangeRate": 0.2666,\n  "convertedAmount": 13330.00,\n  "expiresInSeconds": 60,\n  "status": "LOCKED",\n  "timestamp": "${new Date().toISOString()}"\n}`,
    res422: `{\n  "error": "MARKET_CLOSED_422",\n  "code": "BR_FX_003",\n  "message": "Currency market is currently closed or liquidity pair unavailable."\n}`
  },
  kyc: {
    sector: 'merchants',
    title: 'خدمة التحقق من أهلية التاجر والعميل KYC',
    code: 'KYC_VERIFY',
    baseUrl: 'https://api.gov.fintech/v1/kyc',
    method: 'POST',
    path: '/v1/merchants/kyc/verify',
    shortName: 'kyc-verify',
    ruleName: 'مطابقة السجل التجاري مع وزارة التجارة وضوابط مكافحة التستر',
    desc: 'التحقق الفوري من صحة السجل التجاري والبيانات البنكية للتاجر قبل تفعيل خدمات نقاط البيع وبوابات الدفع.',
    payload: `{\n  "commercialRegister": "1010884920",\n  "taxNumber": "300188920100003",\n  "merchantName": "شركة التقنية المتقدمة للمدفوعات",\n  "merchantType": "FINTECH_PSP"\n}`,
    res200: `{\n  "status": "VERIFIED",\n  "kycReference": "KYC-SA-994201",\n  "complianceLevel": "TIER_1_APPROVED",\n  "verifiedAt": "${new Date().toISOString()}"\n}`,
    res422: `{\n  "error": "CR_EXPIRED_422",\n  "code": "BR_KYC_001",\n  "message": "Commercial registration is expired or suspended."\n}`
  },
  payroll: {
    sector: 'banking',
    title: 'خدمة مسيرات الرواتب وحماية الأجور WPS',
    code: 'WPS_PAYROLL',
    baseUrl: 'https://api.gov.fintech/v1/wps',
    method: 'POST',
    path: '/v1/payroll/files/process',
    shortName: 'wps-process',
    ruleName: 'مطابقة إجمالي الرواتب مع الرصيد المحجوز مسبقاً وتفويض التأمينات',
    desc: 'معالجة ملفات مسيرات الأجور الموحدة والتحقق من الهويات البنكية للموظفين والمقاصة اللحظية للحسابات.',
    payload: `{\n  "employerId": "7001928374",\n  "batchId": "WPS-2026-10-A",\n  "totalAmount": 1285000.00,\n  "currency": "SAR",\n  "recordCount": 245\n}`,
    res200: `{\n  "batchStatus": "ACCEPTED_FOR_SETTLEMENT",\n  "wpsFileRef": "MOL-WPS-88492",\n  "clearingTime": "IMMEDIATE",\n  "processedRecords": 245\n}`,
    res422: `{\n  "error": "INSUFFICIENT_FUNDS_422",\n  "code": "BR_WPS_004",\n  "message": "Debit account balance is insufficient to cover total payroll batch."\n}`
  }
};

function openAddApiWizard() {
  goView('add-api');
}

function closeAddApiWizard() {
  const m = document.getElementById('modal-add-api-wizard');
  if (m) m.classList.remove('show');
}

function switchAddApiMode(mode) {
  const btnForm = document.getElementById('btn-tab-mode-form');
  const btnJson = document.getElementById('btn-tab-mode-json');
  const paneForm = document.getElementById('pane-mode-form');
  const paneJson = document.getElementById('pane-mode-json');

  if (mode === 'form') {
    if (btnForm) btnForm.classList.add('active');
    if (btnJson) btnJson.classList.remove('active');
    if (paneForm) paneForm.style.display = 'block';
    if (paneJson) paneJson.style.display = 'none';
  } else {
    if (btnForm) btnForm.classList.remove('active');
    if (btnJson) btnJson.classList.add('active');
    if (paneForm) paneForm.style.display = 'none';
    if (paneJson) paneJson.style.display = 'block';
  }
}

function onSectorSelectChange(val) {
  const wrapCustom = document.getElementById('wrap-custom-sector');
  if (wrapCustom) {
    wrapCustom.style.display = val === 'custom' ? 'block' : 'none';
  }
}

function applyPresetToForm(presetKey) {
  const p = PRESET_TEMPLATES[presetKey];
  if (!p) return;

  const secSelect = document.getElementById('add-api-sector');
  if (secSelect) secSelect.value = p.sector;
  onSectorSelectChange(p.sector);

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setVal('add-api-title', p.title);
  setVal('add-api-code', p.code);
  setVal('add-api-base-url', p.baseUrl);
  setVal('add-api-method', p.method);
  setVal('add-api-path', p.path);
  setVal('add-api-shortname', p.shortName);
  setVal('add-api-rule-name', p.ruleName);
  setVal('add-api-desc', p.desc);
  setVal('add-api-payload', p.payload);
  setVal('add-api-res200', p.res200);
  setVal('add-api-res422', p.res422);

  switchAddApiMode('form');
  toast(`تم تعبئة نموذج: [${p.title}] بنجاح!`);
}

function parseAndApplyJsonImport() {
  const raw = document.getElementById('add-api-json-import').value.trim();
  if (!raw) {
    toast('يرجى لصق كائن JSON صالح');
    return;
  }

  try {
    const obj = JSON.parse(raw);
    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
    
    setVal('add-api-title', obj.title || obj.name);
    setVal('add-api-code', obj.code);
    setVal('add-api-base-url', obj.baseUrl);
    setVal('add-api-method', (obj.method || 'POST').toUpperCase());
    setVal('add-api-path', obj.path || obj.endpoint);
    setVal('add-api-desc', obj.desc || obj.description);
    setVal('add-api-shortname', obj.shortName);
    
    if (obj.sector) {
      const secEl = document.getElementById('add-api-sector');
      if (secEl) {
        secEl.value = obj.sector;
        onSectorSelectChange(obj.sector);
      }
    }

    if (obj.payload) {
      setVal('add-api-payload', typeof obj.payload === 'string' ? obj.payload : JSON.stringify(obj.payload, null, 2));
    }
    if (obj.res200) {
      setVal('add-api-res200', typeof obj.res200 === 'string' ? obj.res200 : JSON.stringify(obj.res200, null, 2));
    }
    if (obj.res422) {
      setVal('add-api-res422', typeof obj.res422 === 'string' ? obj.res422 : JSON.stringify(obj.res422, null, 2));
    }

    switchAddApiMode('form');
    toast('تم تحليل وتطبيق كود الـ JSON بنجاح على الحقول!');
  } catch (err) {
    toast('خطأ في بناء الـ JSON: ' + err.message);
  }
}

function resetAddApiForm() {
  const ids = ['add-api-title', 'add-api-code', 'add-api-path', 'add-api-shortname', 'add-api-rule-name', 'add-api-desc', 'add-api-json-import'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  toast('تم تفريغ حقول النموذج');
}

function toggleCustomExportSections(isCustom) {
  const wrap = document.getElementById('wrap-export-sections-checklist');
  if (wrap) {
    wrap.style.display = isCustom ? 'block' : 'none';
  }
}

function saveCustomApiFromForm() {
  let sector = document.getElementById('add-api-sector').value;
  let customSectorName = '';
  
  if (sector === 'custom') {
    const customInp = document.getElementById('add-api-custom-sector-name');
    customSectorName = customInp ? customInp.value.trim() : '';
    if (!customSectorName) {
      toast('يرجى كتابة اسم الجهة / القطاع الجديد');
      if (customInp) customInp.focus();
      return;
    }
    sector = 'sec_' + customSectorName.replace(/\s+/g, '_').toLowerCase();
  }

  const title = (document.getElementById('add-api-title').value || '').trim();
  const code = ((document.getElementById('add-api-code').value || '').trim() || 'API').toUpperCase();
  const baseUrl = (document.getElementById('add-api-base-url').value || '').trim() || 'https://api.gov.fintech';
  const method = (document.getElementById('add-api-method').value || 'POST').toUpperCase();
  let path = (document.getElementById('add-api-path').value || '').trim();
  const shortName = (document.getElementById('add-api-shortname').value || '').trim() || (path ? path.split('/').filter(Boolean).pop() : 'action');
  const ruleName = (document.getElementById('add-api-rule-name').value || '').trim() || 'التحقق من صحة تفويض الحساب والعملية';
  const desc = (document.getElementById('add-api-desc').value || '').trim() || `المواصفة التوثيقية المعتمدة لخدمة ${title}`;

  const payloadText = (document.getElementById('add-api-payload').value || '').trim();
  const res200Text = (document.getElementById('add-api-res200').value || '').trim();
  const res422Text = (document.getElementById('add-api-res422').value || '').trim();

  if (!title) {
    toast('يرجى إدخال اسم الخدمة أو الـ API');
    document.getElementById('add-api-title').focus();
    return;
  }
  if (!path) {
    path = '/v1/' + (code.toLowerCase()) + '/action';
  }
  if (!path.startsWith('/')) path = '/' + path;

  // Extract parameters safely from JSON body
  let paramsList = [];
  try {
    const parsedPayload = JSON.parse(payloadText);
    if (parsedPayload && typeof parsedPayload === 'object') {
      Object.entries(parsedPayload).forEach(([k, v]) => {
        let valType = typeof v;
        if (valType === 'number') valType = 'decimal';
        paramsList.push({
          name: k,
          type: valType,
          req: true,
          rule: `حقل إلزامي وفق مواصفة ${code}`,
          tag: 'CORE',
          tagClass: 'badge-fin'
        });
      });
    }
  } catch (e) {
    paramsList = [
      { name: 'requestId', type: 'string (UUID)', req: true, rule: 'معرف فريد للعملية', tag: 'SECURITY', tagClass: 'badge-iso' },
      { name: 'payload', type: 'object', req: true, rule: 'بيانات العملية المعتمدة', tag: 'CORE', tagClass: 'badge-fin' }
    ];
  }

  if (paramsList.length === 0) {
    paramsList.push(
      { name: 'id', type: 'string', req: true, rule: 'معرف الطلب المعتمد', tag: 'KEY', tagClass: 'badge-iso' }
    );
  }

  // Modular Export Sections Profile (Ultimate Pay Spec)
  const isCustomExport = document.querySelector('input[name="export-profile-mode"]:checked')?.value === 'custom';
  let exportSections = null;
  if (isCustomExport) {
    exportSections = {
      overview: document.getElementById('chk-sec-overview')?.checked ?? true,
      security: document.getElementById('chk-sec-security')?.checked ?? true,
      headers: document.getElementById('chk-sec-headers')?.checked ?? true,
      sdk: document.getElementById('chk-sec-sdk')?.checked ?? true,
      errors: document.getElementById('chk-sec-errors')?.checked ?? true,
      endpoints: document.getElementById('chk-sec-endpoints')?.checked ?? true
    };
  }

  const srvKey = 'custom_' + Date.now();
  const newEndpoint = {
    method: method,
    path: path,
    shortName: shortName,
    desc: desc,
    isDraft: false,
    isCustom: true,
    params: paramsList,
    rules: [
      { id: 'BR_' + code + '_001', name: ruleName, err: 'ERR_VALIDATION_422' }
    ],
    payload: payloadText || '{\n  "status": "PENDING"\n}',
    res200: res200Text || '{\n  "status": "SUCCESS"\n}',
    res422: res422Text || '{\n  "error": "UNPROCESSABLE_ENTITY"\n}',
    curl: `curl -X ${method} "${baseUrl}${path}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json"`
  };

  const newService = {
    title: title,
    code: code,
    baseUrl: baseUrl,
    versions: ['v1.0.0 (رسمي)'],
    isCustom: true,
    exportSections: exportSections,
    endpoints: [ newEndpoint ]
  };

  // Inject into DATA dictionary
  if (!DATA[sector]) {
    DATA[sector] = {
      name: customSectorName || 'شريك مالي مخصص',
      code: 'SECTOR_' + sector.toUpperCase(),
      services: {}
    };
    if (typeof EXPORT_CONFIG !== 'undefined' && EXPORT_CONFIG.sectors) {
      EXPORT_CONFIG.sectors[sector] = true;
    }
  }
  DATA[sector].services[srvKey] = newService;

  // Persist to localStorage
  try {
    let stored = [];
    const raw = localStorage.getItem(STORAGE_CUSTOM_APIS_KEY);
    if (raw) stored = JSON.parse(raw);
    if (!Array.isArray(stored)) stored = [];
    
    stored.push({
      id: srvKey,
      sectorKey: sector,
      sectorName: DATA[sector].name,
      serviceKey: srvKey,
      serviceData: newService,
      createdAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    });
    localStorage.setItem(STORAGE_CUSTOM_APIS_KEY, JSON.stringify(stored));
  } catch (err) {
    console.error('Failed to save custom API to localStorage:', err);
  }

  toast(`تم حفظ ونشر توثيق [${title}] بنجاح في قطاع ${DATA[sector].name}!`);
  renderSavedCustomApisList();
  updateDashboardCards();

  // Seamless navigation: immediately open Spec Explorer for the sector!
  setTimeout(() => {
    selectSector(sector);
    const lastIdx = APP.sectorEndpoints.length - 1;
    if (lastIdx >= 0) selectEndpoint(lastIdx);
  }, 450);
}

function renderSavedCustomApisList() {
  const container = document.getElementById('saved-apis-container');
  const countBadge = document.getElementById('saved-apis-count');
  if (!container) return;

  let stored = [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_APIS_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (e) {}

  if (!Array.isArray(stored) || stored.length === 0) {
    if (countBadge) countBadge.textContent = '0 توثيقات مضافة';
    container.innerHTML = `
      <div style="text-align:center; padding:2rem 1rem; color:var(--text-dim); font-size:0.8rem; background:rgba(0,0,0,0.15); border-radius:var(--radius-sm); border:1px dashed var(--border);">
        <i class="fa-solid fa-folder-open" style="font-size:1.5rem; margin-bottom:0.5rem; display:block; opacity:0.5;"></i>
        لم يتم إضافة أي توثيق مخصص حتى الآن. استخدم النماذج الجاهزة أعلاه أو أدخل بيانات API جديد لتجربته في اجتماع الغد!
      </div>
    `;
    return;
  }

  if (countBadge) countBadge.textContent = `${stored.length} توثيق مضاف`;

  let rows = '';
  stored.forEach((item) => {
    const srv = item.serviceData;
    const ep = srv.endpoints && srv.endpoints[0] ? srv.endpoints[0] : { method: 'POST', path: '/' };
    const methodColor = ep.method === 'POST' ? 'var(--emerald)' : (ep.method === 'GET' ? '#38bdf8' : '#f59e0b');

    rows += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="padding:0.6rem; font-weight:700; color:#cbd5e1;">${item.sectorName || item.sectorKey}</td>
        <td style="padding:0.6rem;"><strong>${srv.title}</strong></td>
        <td style="padding:0.6rem;"><strong class="mono" style="color:${methodColor};">${ep.method}</strong> <code class="mono" style="font-size:0.75rem; color:#38bdf8;">${ep.path}</code></td>
        <td style="padding:0.6rem;" class="mono" style="font-size:0.75rem; color:var(--text-dim);">${item.createdAt || 'اليوم'}</td>
        <td style="padding:0.6rem; text-align:left; display:flex; gap:0.35rem; justify-content:flex-end;">
          <button class="btn btn-ghost" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="selectSector('${item.sectorKey}')" title="استعراض في المواصفة">
            <i class="fa-solid fa-eye"></i> استعراض
          </button>
          <button class="btn btn-ghost" style="padding:0.25rem 0.6rem; font-size:0.75rem; color:var(--emerald);" onclick="goView('export')" title="تصدير">
            <i class="fa-solid fa-file-export"></i> تصدير
          </button>
          <button class="btn btn-ghost" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:var(--rose);" onclick="deleteCustomApi('${item.id}', '${item.sectorKey}', '${item.serviceKey}')" title="حذف">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = `
    <table class="table-compact" style="width:100%; border-collapse:collapse; font-size:0.8rem;">
      <thead>
        <tr style="border-bottom:1px solid var(--border); color:var(--text-dim); text-align:right;">
          <th style="padding:0.5rem;">الجهة</th>
          <th style="padding:0.5rem;">اسم الخدمة</th>
          <th style="padding:0.5rem;">المسار</th>
          <th style="padding:0.5rem;">التوقيت</th>
          <th style="padding:0.5rem; text-align:left;">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function deleteCustomApi(id, sectorKey, serviceKey) {
  if (!confirm('هل أنت متأكد من حذف هذا التوثيق؟')) return;

  if (DATA[sectorKey] && DATA[sectorKey].services && DATA[sectorKey].services[serviceKey]) {
    delete DATA[sectorKey].services[serviceKey];
  }

  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_APIS_KEY);
    if (raw) {
      let stored = JSON.parse(raw);
      if (Array.isArray(stored)) {
        stored = stored.filter(item => item.id !== id && item.serviceKey !== serviceKey);
        localStorage.setItem(STORAGE_CUSTOM_APIS_KEY, JSON.stringify(stored));
      }
    }
  } catch (e) {}

  toast('تم حذف التوثيق بنجاح');
  renderSavedCustomApisList();
  updateDashboardCards();
}

const STORAGE_CUSTOM_SECTORS_KEY = 'FINTECH_CUSTOM_SECTORS_STORE';

function openAddSectorModal() {
  const m = document.getElementById('modal-add-sector');
  if (m) m.classList.add('show');
  const nameInput = document.getElementById('new-sector-name');
  if (nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }
}

function closeAddSectorModal() {
  const m = document.getElementById('modal-add-sector');
  if (m) m.classList.remove('show');
}

function saveCustomSectorsToStorage() {
  try {
    const customSectors = {};
    Object.entries(DATA).forEach(([k, v]) => {
      if (k !== 'banking' && k !== 'merchants' && k !== 'aml') {
        customSectors[k] = v;
      }
    });
    localStorage.setItem(STORAGE_CUSTOM_SECTORS_KEY, JSON.stringify(customSectors));
  } catch (e) {
    console.error('Failed to save custom sectors:', e);
  }
}

function loadCustomSectorsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_SECTORS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([k, sec]) => {
        DATA[k] = sec;
        if (typeof EXPORT_CONFIG !== 'undefined' && EXPORT_CONFIG.sectors) {
          EXPORT_CONFIG.sectors[k] = true;
        }
      });
    }
  } catch (e) {
    console.error('Failed to load custom sectors:', e);
  }
}

function saveNewSectorFromModal() {
  const name = (document.getElementById('new-sector-name')?.value || '').trim();
  const code = ((document.getElementById('new-sector-code')?.value || '').trim() || 'ENT').toUpperCase();
  const icon = document.getElementById('new-sector-icon')?.value || 'fa-landmark';
  const desc = (document.getElementById('new-sector-desc')?.value || '').trim();

  if (!name) {
    toast('يرجى إدخال اسم الجهة أو القطاع المالي الجديد');
    document.getElementById('new-sector-name')?.focus();
    return;
  }

  const secKey = 'sec_' + Date.now();
  const newSector = {
    name: name,
    code: 'SECTOR_' + code,
    icon: icon,
    color: '#a855f7',
    desc: desc || `الجهة والقطاع المالي: ${name}`,
    services: {}
  };

  DATA[secKey] = newSector;

  if (typeof EXPORT_CONFIG !== 'undefined' && EXPORT_CONFIG.sectors) {
    EXPORT_CONFIG.sectors[secKey] = true;
  }

  saveCustomSectorsToStorage();

  renderDashboardSectors();
  renderSidebarEntities();

  closeAddSectorModal();
  toast(`تم بنجاح اعتماد جهة: [${name}] وإضافتها إلى الداش بورد والشريط الجانبي!`);

  // Direct user to this newly created entity
  selectSector(secKey);
}

function renderDashboardSectors() {
  const grid = document.getElementById('dashboard-sectors-grid');
  if (!grid || typeof DATA === 'undefined') return;

  grid.innerHTML = '';

  const defaultIcons = {
    banking: { icon: 'fa-building-columns', color: '#38bdf8' },
    merchants: { icon: 'fa-cart-shopping', color: '#34d399' },
    aml: { icon: 'fa-shield-halved', color: '#f59e0b' }
  };

  Object.entries(DATA).forEach(([key, sec]) => {
    const apiCount = sec.services ? Object.keys(sec.services).length : 0;
    const iconInfo = defaultIcons[key] || { icon: sec.icon || 'fa-landmark', color: sec.color || '#a855f7' };

    const card = document.createElement('div');
    card.className = 'sector-card';
    card.innerHTML = `
      <div class="sector-card-top">
        <div class="sector-icon-box" style="color:${iconInfo.color};"><i class="fa-solid ${iconInfo.icon}"></i></div>
        <strong style="font-size:0.95rem;">${sec.name}</strong>
      </div>
      <div style="margin-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
        <span class="mono" style="font-size:0.8rem; font-weight:700; color:var(--emerald);">${apiCount} APIs</span>
        <button class="btn btn-ghost" style="font-size:0.75rem; padding:0.25rem 0.65rem;" onclick="selectSector('${key}')">استعراض &larr;</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Append "+ إضافة جهة / شريك مالي جديد" card
  const addCard = document.createElement('div');
  addCard.className = 'sector-card';
  addCard.style.cssText = 'border:2px dashed var(--emerald); background:rgba(16, 185, 129, 0.05); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer; min-height:130px; transition:all 0.2s;';
  addCard.onclick = openAddSectorModal;
  addCard.innerHTML = `
    <div style="width:38px; height:38px; border-radius:50%; background:rgba(16, 185, 129, 0.15); display:flex; align-items:center; justify-content:center; color:var(--emerald); margin-bottom:0.4rem; font-size:1.1rem;">
      <i class="fa-solid fa-plus"></i>
    </div>
    <strong style="font-size:0.92rem; color:var(--emerald);">+ إضافة جهة / شريك مالي جديد</strong>
    <span style="font-size:0.72rem; color:var(--text-muted); margin-top:0.2rem;">تسجيل هيئة أو مصرف أو قطاع مالي جديد</span>
  `;
  grid.appendChild(addCard);
}

function renderSidebarEntities() {
  const container = document.getElementById('sidebar-entities-container');
  if (!container || typeof DATA === 'undefined') return;

  container.innerHTML = '';

  const defaultIcons = {
    banking: 'fa-building-columns',
    merchants: 'fa-cart-shopping',
    aml: 'fa-shield-halved'
  };

  Object.entries(DATA).forEach(([key, sec]) => {
    const iconClass = defaultIcons[key] || sec.icon || 'fa-landmark';
    const a = document.createElement('a');
    a.className = 'nav-btn' + (APP.currentSector === key ? ' active' : '');
    a.id = 'btn-sec-' + key;
    a.onclick = () => selectSector(key);
    a.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${sec.name}</span>
    `;
    container.appendChild(a);
  });
}

function updateDashboardCards() {
  renderDashboardSectors();
  renderSidebarEntities();
}

function initDynamicApiStorage() {
  // 1. Load Custom Sectors first
  loadCustomSectorsFromStorage();

  // 2. Load Custom APIs
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_APIS_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored)) {
        stored.forEach(item => {
          if (!item || !item.sectorKey || !item.serviceData) return;
          
          if (!DATA[item.sectorKey]) {
            DATA[item.sectorKey] = {
              name: item.sectorName || 'شريك مالي مخصص',
              code: 'SECTOR_' + item.sectorKey.toUpperCase(),
              services: {}
            };
            if (typeof EXPORT_CONFIG !== 'undefined' && EXPORT_CONFIG.sectors) {
              EXPORT_CONFIG.sectors[item.sectorKey] = true;
            }
          }
          
          DATA[item.sectorKey].services[item.serviceKey] = item.serviceData;
        });
      }
    }
  } catch (err) {
    console.error('Failed to load custom APIs from localStorage:', err);
  }

  // 3. Render Dashboard and Sidebar with all loaded entities
  renderDashboardSectors();
  renderSidebarEntities();
}

// Auto-initialize storage on script evaluation
initDynamicApiStorage();