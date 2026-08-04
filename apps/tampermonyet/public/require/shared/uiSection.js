// Reusable stacked data section for Tampermonyet Shadow DOM panels.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});
  const tones = new Set(['idle', 'loading', 'success', 'warning', 'error']);

  const styles = `
    .section-list { display: grid; gap: 8px; margin: 0 0 14px; }
    .data-section {
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.025);
    }
    .data-section[data-active='true'] {
      border-color: rgba(22, 119, 255, 0.75);
      box-shadow: inset 3px 0 0 #1677ff;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 11px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .section-title { margin: 0; color: #fff; font-size: 13px; line-height: 1.35; }
    .section-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      color: #aeb8c7;
      font-size: 11px;
      white-space: nowrap;
    }
    .section-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 999px; background: #8c8c8c; }
    .section-status[data-tone='loading'] .section-dot { background: #1677ff; }
    .section-status[data-tone='success'] .section-dot { background: #52c41a; }
    .section-status[data-tone='warning'] .section-dot { background: #faad14; }
    .section-status[data-tone='error'] .section-dot { background: #ff4d4f; }
    .section-fields { display: grid; gap: 7px; margin: 0; padding: 9px 11px 10px; }
    .section-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; }
    .section-field dt { color: #8f9bad; }
    .section-field dd {
      max-width: 170px;
      margin: 0;
      overflow-wrap: anywhere;
      color: #fff;
      font-weight: 600;
      text-align: right;
    }
    .section-empty { margin: 0; padding: 9px 11px 10px; color: #717d8e; font-size: 12px; }
  `;

  function normalizeSection(section = {}, index = 0) {
    const id = String(section.id || `section-${index}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
    return {
      id,
      title: String(section.title || 'Section'),
      status: String(section.status || 'No data'),
      tone: tones.has(section.tone) ? section.tone : 'idle',
      active: Boolean(section.active),
      fields: Array.isArray(section.fields) ? section.fields : [],
    };
  }

  function render(container, sections = []) {
    const document = container.ownerDocument;
    container.replaceChildren();

    sections.map(normalizeSection).forEach((section) => {
      const element = document.createElement('section');
      const header = document.createElement('header');
      const title = document.createElement('h3');
      const status = document.createElement('span');
      const dot = document.createElement('span');
      const statusText = document.createElement('span');

      element.className = 'data-section';
      element.dataset.sectionId = section.id;
      element.dataset.active = String(section.active);
      header.className = 'section-header';
      title.className = 'section-title';
      title.textContent = section.title;
      status.className = 'section-status';
      status.dataset.tone = section.tone;
      status.setAttribute('aria-label', section.status);
      dot.className = 'section-dot';
      dot.setAttribute('aria-hidden', 'true');
      statusText.textContent = section.status;
      status.append(dot, statusText);
      header.append(title, status);
      element.append(header);

      if (section.fields.length) {
        const fields = document.createElement('dl');
        fields.className = 'section-fields';
        fields.dataset.role = 'section-fields';
        for (const field of section.fields) {
          const row = document.createElement('div');
          const label = document.createElement('dt');
          const value = document.createElement('dd');
          row.className = 'section-field';
          label.textContent = String(field.label || '');
          value.textContent = String(field.value ?? '—');
          row.append(label, value);
          fields.append(row);
        }
        element.append(fields);
      } else {
        const empty = document.createElement('p');
        empty.className = 'section-empty';
        empty.textContent = 'No saved data.';
        element.append(empty);
      }

      container.append(element);
    });
  }

  namespace.uiSection = Object.freeze({ render, styles });
})(globalThis);
