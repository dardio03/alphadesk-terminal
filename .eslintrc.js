module.exports = {
  // ... other config ...
  rules: {
    'no-restricted-globals': ['error', ...but exclude 'self' for worker files],
  },
  overrides: [
    {
      files: ['**/worker/**/*.ts'],
      rules: {
        'no-restricted-globals': 'off'
      }
    }
  ]
} 