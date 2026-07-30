/**
 * ARCHITECTURE RULE:
 * This is the Parent UI Orchestrator. DO NOT WRITE PRESENTATION LOGIC HERE.
 * This component's sole responsibility is slot composition and layout positioning for its children.
 * It receives generic ReactNode slots and MUST NOT inspect domain ViewModels.
 */
import type { CoreLayoutProps } from './contracts';
import './CoreLayout.tokens.css';
import './CoreLayout.css';

export type { CoreLayoutProps };

export function CoreLayout({ header, toolbar, content, pageAlert }: CoreLayoutProps) {
  return (
    <main className="core-ui-layout" data-scroll-owner="none">
      {header ? <div className="core-ui-layout__header-shell">{header}</div> : null}

      <section
        className="core-ui-layout__workspace"
        aria-labelledby="workspace-title"
        data-scroll-owner="none"
      >
        <h2 id="workspace-title" className="sr-only">
          Workspace
        </h2>

        {toolbar}

        {pageAlert ? <div className="core-ui-layout__page-alert">{pageAlert}</div> : null}

        <div className="core-ui-layout__content-slot" data-scroll-owner="none">
          {content}
        </div>
      </section>
    </main>
  );
}
