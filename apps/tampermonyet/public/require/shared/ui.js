// Lightweight Shadow DOM panel shared by site-specific require modules.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});
  const UISection = namespace.uiSection;

  function safeId(value) {
    const id = String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
    if (!id) throw new TypeError('UI.mount membutuhkan id.');
    return id;
  }

  function mount(options = {}) {
    const document = options.document || root.document;
    const parent = document.documentElement || document.body;
    if (!parent) throw new Error('Document belum siap untuk memasang UI.');

    const id = `tampermonyet-${safeId(options.id)}`;
    document.getElementById(id)?.remove();

    const host = document.createElement('div');
    host.id = id;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .panel {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 2147483647;
          width: min(320px, calc(100vw - 32px));
          overflow: hidden;
          color: #f4f7fb;
          background: #17191e;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          box-shadow: 0 18px 52px rgba(0, 0, 0, 0.42);
          font: 14px/1.45 Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .panel-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 7px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        h2 { margin: 0; color: #fff; font-size: 15px; line-height: 1.3; }
        .status {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          min-width: 0;
          color: #aeb8c7;
          font-size: 12px;
          overflow-wrap: anywhere;
        }
        .header-path {
          grid-column: 1 / -1;
          min-width: 0;
          color: #7f8b9d;
          font: 10px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace;
          overflow-wrap: anywhere;
        }
        .dot { width: 8px; height: 8px; border-radius: 999px; background: #8c8c8c; }
        .status[data-tone='loading'] .dot { background: #1677ff; }
        .status[data-tone='success'] .dot { background: #52c41a; }
        .status[data-tone='warning'] .dot { background: #faad14; }
        .status[data-tone='error'] .dot { background: #ff4d4f; }
        .body { max-height: min(70vh, 620px); overflow-y: auto; padding: 14px 16px 16px; }
        dl { display: grid; gap: 10px; margin: 0 0 14px; }
        dl:empty { display: none; }
        .field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; }
        dt { color: #8f9bad; }
        dd { margin: 0; color: #fff; font-weight: 600; overflow-wrap: anywhere; text-align: right; }
        .auto-scan {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px;
          color: #d6deea;
          cursor: pointer;
          user-select: none;
        }
        .auto-scan input { width: 16px; height: 16px; margin: 0; accent-color: #1677ff; }
        .auto-scan input:focus-visible { outline: 2px solid #91caff; outline-offset: 2px; }
        .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        button {
          width: 100%;
          padding: 9px 12px;
          color: #fff;
          background: #1677ff;
          border: 0;
          border-radius: 8px;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }
        button:hover { background: #4096ff; }
        button:focus-visible { outline: 2px solid #91caff; outline-offset: 2px; }
        button:disabled { cursor: not-allowed; opacity: 0.55; }
        button.secondary { color: #ff7875; background: transparent; border: 1px solid #ff4d4f; }
        button.secondary:hover { color: #fff; background: #ff4d4f; }
        [hidden] { display: none !important; }
        ${UISection?.styles || ''}
      </style>
      <section class="panel" aria-label="Tampermonyet scanner">
        <header class="panel-header">
          <h2 data-role="title"></h2>
          <div class="status" data-role="status" data-tone="idle" aria-live="polite">
            <span data-role="status-text"></span>
            <span class="dot" aria-hidden="true"></span>
          </div>
          <div class="header-path" data-role="path" hidden></div>
        </header>
        <div class="body">
          <div class="section-list" data-role="sections" hidden></div>
          <dl data-role="fields"></dl>
          <label class="auto-scan">
            <input type="checkbox" data-role="auto-scan" />
            <span data-role="auto-scan-label"></span>
          </label>
          <div class="actions">
            <button type="button" data-role="action"></button>
            <button type="button" class="secondary" data-role="secondary-action"></button>
          </div>
        </div>
      </section>
    `;

    const title = shadow.querySelector('[data-role="title"]');
    const status = shadow.querySelector('[data-role="status"]');
    const statusText = shadow.querySelector('[data-role="status-text"]');
    const headerPath = shadow.querySelector('[data-role="path"]');
    const fields = shadow.querySelector('[data-role="fields"]');
    const sections = shadow.querySelector('[data-role="sections"]');
    const autoScan = shadow.querySelector('[data-role="auto-scan"]');
    const autoScanLabel = shadow.querySelector('[data-role="auto-scan-label"]');
    const action = shadow.querySelector('[data-role="action"]');
    const secondaryAction = shadow.querySelector('[data-role="secondary-action"]');
    let currentFields = [];
    let currentSections = null;

    title.textContent = String(options.title || 'Tampermonyet');
    autoScanLabel.textContent = String(options.autoScanLabel || 'Auto scan');
    action.textContent = String(options.actionLabel || 'Refresh');
    secondaryAction.textContent = String(options.secondaryActionLabel || 'Clear');
    autoScan.addEventListener('change', () => options.onAutoScanChange?.(autoScan.checked));
    action.addEventListener('click', () => options.onAction?.());
    secondaryAction.addEventListener('click', () => options.onSecondaryAction?.());

    function render(state = {}) {
      if (Array.isArray(state.fields)) currentFields = state.fields;
      if (Array.isArray(state.sections)) currentSections = state.sections;
      if (state.title !== undefined) title.textContent = String(state.title);
      if (state.path !== undefined) {
        headerPath.textContent = String(state.path || '');
        headerPath.title = String(state.path || '');
        headerPath.hidden = !state.path;
      }
      if (state.actionLabel !== undefined) action.textContent = String(state.actionLabel);
      if (state.secondaryActionLabel !== undefined) {
        secondaryAction.textContent = String(state.secondaryActionLabel);
      }
      status.dataset.tone = state.tone || 'idle';
      statusText.textContent = String(state.status || 'Siap');
      if (typeof state.autoScanChecked === 'boolean') autoScan.checked = state.autoScanChecked;
      action.disabled = Boolean(state.actionDisabled);
      secondaryAction.disabled = Boolean(state.secondaryActionDisabled);
      if (currentSections && UISection) {
        sections.hidden = false;
        fields.hidden = true;
        UISection.render(sections, currentSections);
        return;
      }

      sections.hidden = true;
      fields.hidden = false;
      fields.replaceChildren();

      for (const field of currentFields) {
        const row = document.createElement('div');
        const label = document.createElement('dt');
        const value = document.createElement('dd');
        row.className = 'field';
        label.textContent = String(field.label || '');
        value.textContent = String(field.value ?? '—');
        row.append(label, value);
        fields.append(row);
      }
    }

    function destroy() {
      host.remove();
    }

    parent.append(host);
    render(options.initialState);
    return Object.freeze({ host, shadowRoot: shadow, render, destroy });
  }

  namespace.ui = Object.freeze({ mount });
})(globalThis);
