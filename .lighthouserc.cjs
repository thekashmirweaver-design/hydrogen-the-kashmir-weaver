/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'View Hydrogen app:',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/collections/all',
        'http://localhost:3000/journal',
      ],
      numberOfRuns: 3,
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1474.56,
          uploadThroughputKbps: 675,
          cpuSlowdownMultiplier: 4,
        },
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: 'http://localhost:3000/?$',
          assertions: {
            'categories:performance': ['error', {minScore: 0.9}],
            'categories:seo': ['error', {minScore: 0.95}],
            'categories:accessibility': ['error', {minScore: 0.9}],
            'categories:best-practices': ['warn', {minScore: 0.9}],
            'largest-contentful-paint': ['warn', {maxNumericValue: 2500}],
            'cumulative-layout-shift': ['warn', {maxNumericValue: 0.1}],
          },
        },
        {
          matchingUrlPattern: '.*',
          assertions: {
            'categories:performance': ['warn', {minScore: 0.85}],
            'categories:seo': ['error', {minScore: 0.95}],
            'categories:accessibility': ['warn', {minScore: 0.9}],
            'categories:best-practices': ['warn', {minScore: 0.9}],
          },
        },
      ],
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
