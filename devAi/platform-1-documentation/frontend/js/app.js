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

  const badge = document.getElementById('topbar-context-badge');

  if (view === 'dashboard') {
    document.getElementById('btn-nav-dashboard').classList.add('active');
    badge.style.display = "none";
    badge.textContent = "";
  } else if (view === 'rbac') {
    document.getElementById('btn-nav-rbac').classList.add('active');
    badge.style.display = "inline-block";
    badge.textContent = "الصلاحيات";
    renderRbac('admin');
  } else if (view === 'export') {
    const expBtn = document.getElementById('btn-nav-export');
    if (expBtn) expBtn.classList.add('active');
    badge.style.display = "inline-block";
    badge.textContent = "مركز التصدير المخصص";
    updateExportStudio();
  } else if (view === 'approvals') {
    const appBtn = document.getElementById('btn-nav-approvals');
    if (appBtn) appBtn.classList.add('active');
    badge.style.display = "inline-block";
    badge.textContent = "الاعتمادات وطلبات التغيير";
  } else if (view === 'security') {
    const secBtn = document.getElementById('btn-nav-security');
    if (secBtn) secBtn.classList.add('active');
    badge.style.display = "inline-block";
    badge.textContent = "المعايير الأمنية والأدوات";
  } else if (view === 'versions') {
    const verBtn = document.getElementById('btn-nav-versions');
    if (verBtn) verBtn.classList.add('active');
    badge.style.display = "inline-block";
    badge.textContent = "سجل الإصدارات";
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

  // Update Topbar Context (Sector Name only)
  const badge = document.getElementById('topbar-context-badge');
  badge.style.display = "inline-block";
  badge.textContent = sector.name;

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

  if (!APP.sectorEndpoints || APP.sectorEndpoints.length === 0) return;

  APP.sectorEndpoints.forEach((ep, idx) => {
    const pill = document.createElement('div');
    pill.className = 'ep-pill ' + (idx === APP.activeEndpointIdx ? 'active' : '');
    pill.onclick = () => selectEndpoint(idx);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ep-pill-path';
    nameSpan.textContent = ep.shortName || ep.path.split('/').filter(Boolean).pop();

    pill.appendChild(nameSpan);
    ribbon.appendChild(pill);
  });

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

// Render Endpoint Details (Tree + Console)
function renderEndpointDetails() {
  if (!APP.sectorEndpoints || !APP.sectorEndpoints[APP.activeEndpointIdx]) return;
  const ep = APP.sectorEndpoints[APP.activeEndpointIdx];

  // Meta bar
  const methodEl = document.getElementById('active-ep-method');
  methodEl.className = `method-badge method-${ep.method.toLowerCase()}`;
  methodEl.textContent = ep.method;
  document.getElementById('active-ep-path').textContent = ep.path;
  document.getElementById('active-ep-desc').textContent = ep.desc;

  // Render Parameters Tree
  const pContainer = document.getElementById('param-list-container');
  pContainer.innerHTML = '';

  ep.params.forEach(param => {
    const item = document.createElement('div');
    item.className = 'param-item';
    item.innerHTML = `
      <div class="param-top-row">
        <div class="param-name-wrap">
          <span class="param-name">${param.name}</span>
          <span class="param-type">${param.type}</span>
        </div>
        <div class="param-badges">
          <span class="badge-pill ${param.req ? 'badge-req' : 'badge-opt'}">${param.req ? 'إلزامي' : 'اختياري'}</span>
          <span class="badge-pill ${param.tagClass}">${param.tag}</span>
        </div>
      </div>
      <div class="param-constraint">${param.rule}</div>
    `;
    pContainer.appendChild(item);
  });

  // Render Rules
  const rContainer = document.getElementById('rules-list-container');
  rContainer.innerHTML = '';
  ep.rules.forEach(rule => {
    const rItem = document.createElement('div');
    rItem.className = 'rule-item';
    rItem.innerHTML = `
      <div>
        <strong class="mono" style="color:var(--amber); font-size:0.78rem;">${rule.id}</strong>
        <span style="font-size:0.78rem; margin-right:0.4rem;">${rule.name}</span>
      </div>
      <code class="mono" style="color:var(--rose); font-size:0.75rem;">${rule.err}</code>
    `;
    rContainer.appendChild(rItem);
  });

  // Update Console display
  switchConsoleTab(APP.activeConsoleTab);
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
function copyBaseUrl() {
  const urlEl = document.getElementById('topbar-base-url');
  const url = urlEl ? urlEl.textContent : 'https://api.gov.fintech/v1';
  navigator.clipboard.writeText(url);
  toast("تم نسخ الرابط الأساسي: " + url);
}

    function copyConsoleCode() {
      const code = document.getElementById('console-display-box').textContent;
      navigator.clipboard.writeText(code);
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
    // DYNAMIC EXPORT STUDIO ENGINE
    // =========================================================================
    const EXPORT_CONFIG = {
      scope: 'all',
      sectors: {
        banking: true,
        merchants: true,
        aml: true
      },
      modules: {
        schemas: true,
        rules: true,
        errors: true,
        samples: true,
        rbac: true
      },
      format: 'pdf'
    };

    function setExportScopeType(type) {
      EXPORT_CONFIG.scope = type;
      const customWrap = document.getElementById('export-custom-sectors-wrap');
      if (customWrap) {
        customWrap.style.display = type === 'custom' ? 'grid' : 'none';
      }
      updateExportStudio();
    }

    function toggleExportSector(key, checked) {
      EXPORT_CONFIG.sectors[key] = checked;
      updateExportStudio();
    }

    function toggleExportModule(key, checked) {
      EXPORT_CONFIG.modules[key] = checked;
      updateExportStudio();
    }

    function selectExportFormat(fmt) {
      EXPORT_CONFIG.format = fmt;
      document.querySelectorAll('.format-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-fmt') === fmt);
      });
      updateExportStudio();
    }

    function updateExportStudio() {
      let totalApis = 0;
      let totalEndpoints = 0;
      let selectedSectorNames = [];

      for (const [secKey, sec] of Object.entries(DATA)) {
        const isIncluded = (EXPORT_CONFIG.scope === 'all') || (EXPORT_CONFIG.scope === 'custom' && EXPORT_CONFIG.sectors[secKey]);
        if (isIncluded) {
          selectedSectorNames.push(sec.name);
          const srvKeys = Object.keys(sec.services);
          totalApis += srvKeys.length;
          srvKeys.forEach(k => {
            totalEndpoints += sec.services[k].endpoints.length;
          });
        }
      }

      const globalReleaseEl = document.getElementById('global-release-select');
      const currentGlobalVer = globalReleaseEl ? globalReleaseEl.value : 'v2026.2';

      const sumVerEl = document.getElementById('exp-sum-version');
      if (sumVerEl) sumVerEl.textContent = currentGlobalVer;

      const sumApisEl = document.getElementById('exp-sum-apis');
      if (sumApisEl) sumApisEl.textContent = `${totalApis} APIs (${selectedSectorNames.join('، ') || 'لا يوجد'})`;

      const sumEndpointsEl = document.getElementById('exp-sum-endpoints');
      if (sumEndpointsEl) sumEndpointsEl.textContent = `${totalEndpoints} مسار برمجي`;

      const activeModules = [];
      if (EXPORT_CONFIG.modules.schemas) activeModules.push('المخططات');
      if (EXPORT_CONFIG.modules.rules) activeModules.push('قواعد العمل');
      if (EXPORT_CONFIG.modules.errors) activeModules.push('رموز الأخطاء');
      if (EXPORT_CONFIG.modules.samples) activeModules.push('أمثلة الكود');
      if (EXPORT_CONFIG.modules.rbac) activeModules.push('الصلاحيات');
      const sumModEl = document.getElementById('exp-sum-modules');
      if (sumModEl) sumModEl.textContent = activeModules.length > 0 ? activeModules.join(' • ') : 'لم يتم تحديد أي مكونات';

      const fmtLabels = {
        pdf: 'وثيقة رسمية مشفرة (PDF RSA-4096)',
        docx: 'مستند تحريري قياسي (Word .docx)',
        openapi: 'حزمة تفاعلية معيارية (OpenAPI 3.1 JSON)'
      };
      const sumFmtEl = document.getElementById('exp-sum-format');
      if (sumFmtEl) sumFmtEl.textContent = fmtLabels[EXPORT_CONFIG.format] || EXPORT_CONFIG.format;

      const sumHashEl = document.getElementById('exp-sum-hash');
      if (sumHashEl) {
        const hashSeed = `${currentGlobalVer}-${totalApis}-${totalEndpoints}-${EXPORT_CONFIG.format}-${activeModules.length}`;
        let hash = 0x811c9dc5;
        for (let i = 0; i < hashSeed.length; i++) {
          hash ^= hashSeed.charCodeAt(i);
          hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        const hex = (hash >>> 0).toString(16).padStart(8, '0');
        sumHashEl.textContent = `SHA256: 4f9d${hex}e82b...9a0c`;
      }
    }

    function executeExportDownload() {
      const btn = document.getElementById('btn-execute-download');
      if (!btn) return;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-left:0.5rem;"></i> جاري الختم الرقمي والتجميع...`;

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        const fmtName = EXPORT_CONFIG.format.toUpperCase();
        toast(`تم بنجاح توليد وختم حزمة التوثيق الرسمية (${fmtName}) برمز RSA-4096`);
      }, 850);
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