/**
 * BRASEIRO PREMIUM KNIVES
 * braseiro-data.js — Biblioteca central de dados compartilhados
 * Inclua este script em TODOS os módulos:
 * <script src="braseiro-data.js"></script>
 */

// ── CONFIG SUPABASE ──
var SUPA_URL = 'https://mibylztsvhhhmnsoipac.supabase.co';
var SUPA_KEY = 'sb_publishable_a7X5JlFdtqwzaE9bB5TsGg_09zvlle-';

// ── BRASEIRO DATA LAYER ──
window.BraseiroData = {

  // ── Get all products (models + variations) ──
  getProducts() {
    const models = JSON.parse(localStorage.getItem('braseiro_models_v2') || '[]');
    const products = [];
    models.forEach(m => {
      // Add base model
      products.push({
        id: m.id,
        codigo: m.codigo,
        nome: m.nome,
        colecao: m.colecao || '',
        tipo: m.tipo || 'series',
        aco: m.aco || '',
        custo: m.custo || 0,
        moeda: m.moeda || 'BRL',
        frete: m.frete || 0,
        foto: m.foto || null,
        isVariation: false,
        modelId: m.id,
        variacoes: m.variacoes || []
      });
      // Add each variation
      (m.variacoes || []).forEach(v => {
        products.push({
          id: v.id,
          codigo: v.codigo,
          nome: `${m.nome} — ${v.desc}`,
          nomeShort: v.desc,
          colecao: m.colecao || '',
          tipo: m.tipo || 'series',
          aco: v.aco || m.aco || '',
          cabo: v.cabo || '',
          custo: v.custo || m.custo || 0,
          moeda: m.moeda || 'BRL',
          frete: m.frete || 0,
          foto: v.foto || m.foto || null,
          skuAmazon: v.skuAmazon || '',
          isVariation: true,
          modelId: m.id,
          modelNome: m.nome,
          sufixo: v.sufixo
        });
      });
    });
    return products;
  },

  // ── Find product by code ──
  findProduct(codigo) {
    return this.getProducts().find(p =>
      p.codigo.toUpperCase() === (codigo || '').toUpperCase()
    );
  },

  // ── Search products by query ──
  searchProducts(query, limit = 8) {
    if (!query || query.trim().length === 0) {
      return this.getProducts().slice(0, limit);
    }
    const q = query.toLowerCase().trim();
    return this.getProducts().filter(p =>
      p.codigo.toLowerCase().includes(q) ||
      p.nome.toLowerCase().includes(q) ||
      (p.colecao || '').toLowerCase().includes(q) ||
      (p.aco || '').toLowerCase().includes(q) ||
      (p.skuAmazon || '').toLowerCase().includes(q)
    ).slice(0, limit);
  },

  // ── Get stock for a product ──
  getStock(codigo) {
    const stock = JSON.parse(localStorage.getItem('braseiro_stock') || '[]');
    return stock.filter(s => s.codigo.toUpperCase() === (codigo || '').toUpperCase());
  },

  // ── Get total available stock for a product ──
  getTotalStock(codigo) {
    return this.getStock(codigo).reduce((s, i) => s + (i.qtd || 0) - (i.reservado || 0), 0);
  },

  // ── Deduct stock after sale ──
  deductStock(codigo, qty, local = null) {
    const stock = JSON.parse(localStorage.getItem('braseiro_stock') || '[]');
    let remaining = qty;
    // Prefer specified local, otherwise deduct from any
    const items = local
      ? stock.filter(s => s.codigo.toUpperCase() === codigo.toUpperCase() && s.local === local)
      : stock.filter(s => s.codigo.toUpperCase() === codigo.toUpperCase());

    for (const item of items) {
      if (remaining <= 0) break;
      const available = item.qtd - (item.reservado || 0);
      const deduct = Math.min(available, remaining);
      item.qtd -= deduct;
      remaining -= deduct;
    }

    // Remove zero-stock items
    const updated = stock.filter(s => s.qtd > 0);
    localStorage.setItem('braseiro_stock', JSON.stringify(updated));

    // Log movement
    this.logStockMovement({
      tipo: 'saida',
      codigo,
      nomeProd: this.findProduct(codigo)?.nome || codigo,
      local: local || 'texas',
      qtd: qty,
      data: new Date().toISOString().split('T')[0],
      obs: 'Saída automática por venda'
    });

    return remaining === 0; // true if fully deducted
  },

  // ── Log stock movement ──
  logStockMovement(mov) {
    const movimentos = JSON.parse(localStorage.getItem('braseiro_movimentos') || '[]');
    movimentos.unshift({ id: Date.now(), ...mov });
    localStorage.setItem('braseiro_movimentos', JSON.stringify(movimentos));
  },

  // ── Add stock ──
  addStock(codigo, nome, qty, local, custo = 0) {
    const stock = JSON.parse(localStorage.getItem('braseiro_stock') || '[]');
    const existing = stock.find(s =>
      s.codigo.toUpperCase() === codigo.toUpperCase() && s.local === local
    );
    if (existing) {
      existing.qtd += qty;
      if (custo) existing.custo = custo;
    } else {
      stock.push({
        id: Date.now(), codigo, nome, local,
        qtd: qty, reservado: 0, custo,
        criadoEm: new Date().toISOString()
      });
    }
    localStorage.setItem('braseiro_stock', JSON.stringify(stock));
    this.logStockMovement({
      tipo: 'entrada', codigo, nomeProd: nome,
      local, qtd: qty,
      data: new Date().toISOString().split('T')[0],
      obs: 'Entrada via cadastro'
    });
  },

  // ── Get saved prices for a product ──
  getSavedPrice(codigo) {
    const prices = JSON.parse(localStorage.getItem('braseiro_prices') || '[]');
    return prices.find(p => p.produto && p.produto.includes(codigo));
  },

  // ── Save suggested price for product ──
  saveSuggestedPrice(codigo, priceData) {
    const models = JSON.parse(localStorage.getItem('braseiro_models_v2') || '[]');
    models.forEach(m => {
      if (m.codigo === codigo) m._suggestedPrice = priceData;
      (m.variacoes || []).forEach(v => {
        if (v.codigo === codigo) v._suggestedPrice = priceData;
      });
    });
    localStorage.setItem('braseiro_models_v2', JSON.stringify(models));
  },

  // ── Render product search dropdown ──
  renderProductSearch(config) {
    /**
     * config: {
     *   inputId: 'myInput',
     *   dropId: 'myDrop',
     *   onSelect: (product) => {},
     *   showStock: true/false,
     *   showPrice: true/false,
     *   placeholder: 'Buscar produto...'
     * }
     */
    const input = document.getElementById(config.inputId);
    const drop  = document.getElementById(config.dropId);
    if (!input || !drop) return;

    const query = input.value;
    const results = this.searchProducts(query);

    if (results.length === 0) {
      drop.innerHTML = `<div style="padding:14px 16px;text-align:center;color:#6b6b6b;font-size:12px;">
        Nenhum produto encontrado.<br>
        <span style="color:#c9a84c">Cadastre produtos no Módulo 1 primeiro.</span>
      </div>`;
      drop.style.display = 'block';
      return;
    }

    drop.innerHTML = results.map(p => {
      const stock = config.showStock ? this.getTotalStock(p.codigo) : null;
      const stockColor = stock === null ? '' : stock > 0 ? '#4caf7a' : '#c44a1a';
      const stockText  = stock === null ? '' : `${stock} un.`;
      const priceData  = config.showPrice ? this.getSavedPrice(p.codigo) : null;

      return `<div
        onclick="window._braseiroSelectProduct && window._braseiroSelectProduct('${p.codigo}', '${config.inputId}', '${config.dropId}')"
        style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;
               border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s;"
        onmouseover="this.style.background='rgba(201,168,76,.08)'"
        onmouseout="this.style.background='transparent'">
        ${p.foto
          ? `<img src="${p.foto}" style="width:36px;height:36px;object-fit:cover;border-radius:3px;flex-shrink:0">`
          : `<div style="width:36px;height:36px;background:#2a2a2a;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🔪</div>`
        }
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:#e8e4de;font-family:'Rajdhani',sans-serif">${p.codigo}</div>
          <div style="font-size:11px;color:#a8a8a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</div>
          ${p.colecao ? `<div style="font-size:10px;color:#6b6b6b">${p.colecao}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${p.custo ? `<div style="font-size:12px;font-weight:700;color:#c9a84c">R$ ${p.custo.toFixed(0)}</div>` : ''}
          ${stock !== null ? `<div style="font-size:10px;color:${stockColor}">${stockText}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    drop.style.display = 'block';

    // Store callback
    window._braseiroSelectProduct = (codigo, inputId, dropId) => {
      const product = this.findProduct(codigo);
      if (!product) return;
      document.getElementById(inputId).value = codigo;
      document.getElementById(dropId).style.display = 'none';
      if (config.onSelect) config.onSelect(product);
    };
  },

  // ── Init search on an input ──
  initProductSearch(config) {
    const input = document.getElementById(config.inputId);
    if (!input) return;

    input.setAttribute('placeholder', config.placeholder || 'Buscar por código ou nome...');
    input.setAttribute('autocomplete', 'off');

    input.addEventListener('input', () => {
      this.renderProductSearch(config);
    });
    input.addEventListener('focus', () => {
      this.renderProductSearch(config);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      const drop = document.getElementById(config.dropId);
      if (drop && !input.contains(e.target) && !drop.contains(e.target)) {
        drop.style.display = 'none';
      }
    });
  },

  // ── Create search UI (input + dropdown) ──
  createSearchUI(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const dropId = config.dropId || (config.inputId + '_drop');
    config.dropId = dropId;

    container.innerHTML = `
      <div style="position:relative">
        <div style="position:relative">
          <svg style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#6b6b6b;pointer-events:none"
            width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input id="${config.inputId}" type="text"
            style="width:100%;background:#1e1e1e;border:1px solid rgba(255,255,255,.08);border-radius:3px;
                   padding:10px 14px 10px 36px;color:#e8e4de;font-family:'Rajdhani',sans-serif;
                   font-size:14px;outline:none;transition:all .2s;"
            onfocus="this.style.borderColor='rgba(201,168,76,.4)';this.style.background='#2a2a2a'"
            onblur="this.style.borderColor='rgba(255,255,255,.08)';this.style.background='#1e1e1e'"
            placeholder="${config.placeholder || 'Buscar produto por código ou nome...'}">
        </div>
        <div id="${dropId}"
          style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;
                 background:#2a2a2a;border:1px solid rgba(201,168,76,.4);border-radius:3px;
                 z-index:100;max-height:260px;overflow-y:auto;
                 box-shadow:0 12px 32px rgba(0,0,0,.6);">
        </div>
      </div>
      <div id="${config.inputId}_selected" style="display:none;margin-top:8px;
        background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.25);border-radius:3px;
        padding:10px 14px;display:none;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <div id="${config.inputId}_sel_img" style="width:40px;height:40px;background:#1e1e1e;border-radius:3px;overflow:hidden;flex-shrink:0">
            <img id="${config.inputId}_sel_foto" style="width:100%;height:100%;object-fit:cover;display:none">
            <div id="${config.inputId}_sel_icon" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px">🔪</div>
          </div>
          <div>
            <div id="${config.inputId}_sel_code" style="font-size:11px;color:#6b6b6b;letter-spacing:.1em"></div>
            <div id="${config.inputId}_sel_name" style="font-size:13px;font-weight:600;color:#c9a84c;font-family:'Rajdhani',sans-serif"></div>
            <div id="${config.inputId}_sel_meta" style="font-size:10px;color:#6b6b6b"></div>
          </div>
        </div>
        <button onclick="BraseiroData.clearSearch('${config.inputId}', ${JSON.stringify(config).replace(/"/g,"'")})"
          style="background:transparent;border:none;cursor:pointer;color:#6b6b6b;font-size:16px;padding:4px"
          title="Remover seleção">✕</button>
      </div>
    `;

    // Enhanced onSelect
    const originalOnSelect = config.onSelect;
    config.onSelect = (product) => {
      // Show selected card
      const selDiv = document.getElementById(config.inputId + '_selected');
      selDiv.style.display = 'flex';
      document.getElementById(config.inputId + '_sel_code').textContent = product.codigo;
      document.getElementById(config.inputId + '_sel_name').textContent = product.nome;
      const meta = [product.aco, product.cabo, `Custo: R$ ${(product.custo||0).toFixed(2)}`].filter(Boolean).join(' · ');
      document.getElementById(config.inputId + '_sel_meta').textContent = meta;

      const foto = document.getElementById(config.inputId + '_sel_foto');
      const icon = document.getElementById(config.inputId + '_sel_icon');
      if (product.foto) {
        foto.src = product.foto; foto.style.display = 'block'; icon.style.display = 'none';
      } else {
        foto.style.display = 'none'; icon.style.display = 'flex';
      }

      // Clear the input text (show as selected card instead)
      document.getElementById(config.inputId).value = product.codigo;

      if (originalOnSelect) originalOnSelect(product);
    };

    this.initProductSearch(config);
  },

  clearSearch(inputId, config) {
    document.getElementById(inputId).value = '';
    const sel = document.getElementById(inputId + '_selected');
    if (sel) sel.style.display = 'none';
    if (config && config.onClear) config.onClear();
  }
};
