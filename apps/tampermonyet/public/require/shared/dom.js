// Global visible-DOM helpers shared by every site-specific require module.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});

  function normalize(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isHidden(element) {
    if (!element || element.nodeType !== 1) return false;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return true;

    const view = element.ownerDocument?.defaultView;
    const style = view?.getComputedStyle(element);
    return Boolean(style && (style.display === 'none' || style.visibility === 'hidden'));
  }

  function readText(element, options = {}) {
    if (!element) return '';

    const exclude =
      options.exclude ||
      'script,style,noscript,svg,button,input,textarea,select,[hidden],[aria-hidden="true"]';
    const pieces = [];

    function visit(node) {
      if (node.nodeType === 3) {
        const value = normalize(node.nodeValue);
        if (value) pieces.push(value);
        return;
      }

      if (node.nodeType !== 1) return;
      if (node !== element && exclude && node.matches(exclude)) return;
      if (isHidden(node)) return;

      for (const child of node.childNodes) visit(child);
    }

    visit(element);
    return normalize(pieces.join(' '));
  }

  function findExact(scope, expectedText) {
    const expected = normalize(expectedText).toLowerCase();
    return (
      [...scope.querySelectorAll('*')].find(
        (element) => readText(element).toLowerCase() === expected,
      ) || null
    );
  }

  function isLoading(scope) {
    const document = scope?.nodeType === 9 ? scope : scope?.ownerDocument;
    if (!document || (scope?.nodeType === 9 && document.readyState === 'loading')) return true;

    const queryScope =
      scope?.nodeType === 9 ? document.querySelector('main') || document.body : scope;
    const loadingSelector =
      '[aria-busy="true"], [data-loading="true"], [role="progressbar"], .ant-spin-spinning, .is-loading';
    return Boolean(
      queryScope?.matches?.(loadingSelector) || queryScope?.querySelector(loadingSelector),
    );
  }

  namespace.dom = Object.freeze({
    normalize,
    readText,
    findExact,
    isLoading,
  });
})(globalThis);
