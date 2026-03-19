/// <reference types="vite/client" />

import type { FlareAPI } from '../../preload/index';
import type { WebviewTag } from 'electron';
import type React from 'react';

declare global {
  var api: FlareAPI | undefined;
  interface Window {
    api?: FlareAPI;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<WebviewTag>, WebviewTag> & {
        src: string;
        preload?: string;
        allowpopups?: boolean;
        partition?: string;
        useragent?: string;
        webpreferences?: string;
      };
    }
  }
}

export {};
