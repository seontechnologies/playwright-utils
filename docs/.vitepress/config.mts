import { defineConfig } from 'vitepress'

// Use /playwright-utils/ for GitHub Pages, / for local dev
const base = process.env.DOCS_BASE ?? (process.env.CI ? '/playwright-utils/' : '/')

export default defineConfig({
  title: 'Playwright Utils',
  description: 'A collection of utilities for Playwright testing',

  base,

  head: [
    // VitePress automatically prepends base to href
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Utilities',
        items: [
          { text: 'API Request', link: '/api-request' },
          { text: 'Auth Session', link: '/auth-session' },
          { text: 'Recurse (Polling)', link: '/recurse' },
          { text: 'Logging', link: '/log' },
          { text: 'Network Interception', link: '/intercept-network-call' },
          { text: 'Network Recorder', link: '/network-recorder' },
          { text: 'Network Error Monitor', link: '/network-error-monitor' },
          { text: 'File Utilities', link: '/file-utils' },
          { text: 'Burn-in', link: '/burn-in' }
        ]
      },
      {
        text: 'GitHub',
        link: 'https://github.com/seontechnologies/playwright-utils'
      }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/installation' }
        ]
      },
      {
        text: 'Core Utilities',
        collapsed: false,
        items: [
          { text: 'API Request', link: '/api-request' },
          { text: 'Auth Session', link: '/auth-session' },
          { text: 'Recurse (Polling)', link: '/recurse' },
          { text: 'Logging', link: '/log' }
        ]
      },
      {
        text: 'Network Utilities',
        collapsed: false,
        items: [
          { text: 'Network Interception', link: '/intercept-network-call' },
          { text: 'Network Recorder', link: '/network-recorder' },
          { text: 'Network Error Monitor', link: '/network-error-monitor' }
        ]
      },
      {
        text: 'Testing Utilities',
        collapsed: false,
        items: [
          { text: 'File Utilities', link: '/file-utils' },
          { text: 'Burn-in', link: '/burn-in' }
        ]
      }
    ],

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/seontechnologies/playwright-utils'
      }
    ],

    search: {
      provider: 'local'
    },

    editLink: {
      pattern:
        'https://github.com/seontechnologies/playwright-utils/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present SEON Technologies'
    }
  }
})
