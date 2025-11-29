import '@testing-library/jest-dom';

// jsdom does not implement canvas; some deps (e.g., xterm) call getContext in tests.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  // return a minimal mock to avoid "Not implemented: HTMLCanvasElement.prototype.getContext" errors
  value: jest.fn(() => ({})),
});

// MUI v4 still calls findDOMNode in some places; suppress the noisy deprecation warning in test output.
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: findDOMNode is deprecated')
  ) {
    return;
  }
  originalError(...args);
};

// Suppress noisy React Router warnings in test output
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('React Router Future Flag Warning')) {
      return;
    }
    if (
      args[0].includes(
        'DEPRECATION WARNING: Authentication providers require a configApi instance',
      )
    ) {
      return;
    }
  }
  originalWarn(...args);
};
