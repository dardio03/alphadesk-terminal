module.exports = {
  // ... other config ...
  rules: {
    'no-restricted-globals': ['error'],
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