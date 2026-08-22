import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          partition?: string;
          allowpopups?: string | boolean;
          useragent?: string;
          autosize?: string | boolean;
        },
        HTMLElement
      >;
    }
  }
  interface Window {
    isElectron?: boolean;
  }
}
