// AgentRouter account identity reader shared by its page-specific scanners.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});
  const Dom = namespace.dom;

  if (!Dom) throw new Error('Tampermonyet DOM helper harus dimuat sebelum Account reader.');

  const greetingPattern =
    /(?:good\s+(?:morning|afternoon|evening)|selamat\s+(?:pagi|siang|sore|malam)|早上好|下午好|晚上好)(?:\s*[,，]\s*|\s+)(.+)$/i;
  const githubAccountPattern = /(github_[a-z0-9_.-]+)\b/i;

  function readGreeting(document) {
    for (const heading of document.querySelectorAll('h1,h2,h3,h4')) {
      const match = Dom.readText(heading).match(greetingPattern);
      if (match?.[1]) return Dom.normalize(match[1]);
    }
    return '';
  }

  function readHeaderAccount(document) {
    for (const button of document.querySelectorAll(
      'header button, nav button, body > div button',
    )) {
      const match = Dom.readText(button).match(githubAccountPattern);
      if (match?.[1]) return Dom.normalize(match[1]);
    }
    return '';
  }

  function read(document) {
    return readGreeting(document) || readHeaderAccount(document);
  }

  namespace.agentRouterAccount = Object.freeze({ read });
})(globalThis);
