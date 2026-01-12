import { defineConfig } from 'vitepress'

// GitHub Pages requires /repo-name/ base path
// Override with DOCS_BASE env var for custom domains or local dev
// Local dev: DOCS_BASE=/ npm run docs:dev (or use docs:dev script)
const base = process.env.DOCS_BASE || '/playwright-utils/'

export default defineConfig({
  title: 'Playwright Utils',
  description: 'A collection of utilities for Playwright testing',

  base,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }]
  ],

  themeConfig: {
    logo: `${base}logo.svg`,

    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Agnostic',
        items: [
          { text: 'API Request', link: '/api-request' },
          { text: 'Auth Session', link: '/auth-session' },
          { text: 'Recurse (Polling)', link: '/recurse' },
          { text: 'Logging', link: '/log' },
          { text: 'File Utilities', link: '/file-utils' },
          { text: 'Burn-in', link: '/burn-in' }
        ]
      },
      {
        text: 'Frontend',
        items: [
          { text: 'Network Interception', link: '/intercept-network-call' },
          { text: 'Network Recorder', link: '/network-recorder' },
          { text: 'Network Error Monitor', link: '/network-error-monitor' }
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
        text: 'Agnostic Utilities',
        collapsed: false,
        items: [
          { text: 'API Request', link: '/api-request' },
          { text: 'Auth Session', link: '/auth-session' },
          { text: 'Recurse (Polling)', link: '/recurse' },
          { text: 'Logging', link: '/log' },
          { text: 'File Utilities', link: '/file-utils' },
          { text: 'Burn-in', link: '/burn-in' }
        ]
      },
      {
        text: 'Frontend Utilities',
        collapsed: false,
        items: [
          { text: 'Network Interception', link: '/intercept-network-call' },
          { text: 'Network Recorder', link: '/network-recorder' },
          { text: 'Network Error Monitor', link: '/network-error-monitor' }
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
