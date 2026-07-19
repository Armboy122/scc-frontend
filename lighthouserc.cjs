module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start -- --hostname 127.0.0.1 --port 3000',
      startServerReadyPattern: 'Ready',
      url: ['http://127.0.0.1:3000/login'],
      numberOfRuns: 1,
      settings: { chromeFlags: '--no-sandbox', throttlingMethod: 'provided' },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
