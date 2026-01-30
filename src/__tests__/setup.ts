// Jest setup file for Figma plugin testing

// Mock Figma Plugin API globals
const mockFigma = {
  currentPage: {
    selection: [],
    children: [],
    findAllWithCriteria: jest.fn(() => []),
  },
  root: {
    getPluginData: jest.fn(() => ""),
    setPluginData: jest.fn(),
  },
  getNodeById: jest.fn(),
  getNodeByIdAsync: jest.fn(),
  getStyleById: jest.fn(),
  getStyleByIdAsync: jest.fn(),
  getLocalPaintStyles: jest.fn(() => []),
  getLocalPaintStylesAsync: jest.fn(async () => []),
  getLocalTextStyles: jest.fn(() => []),
  getLocalTextStylesAsync: jest.fn(async () => []),
  getLocalEffectStyles: jest.fn(() => []),
  getLocalEffectStylesAsync: jest.fn(async () => []),
  createPaintStyle: jest.fn(() => ({ id: "mock-id", name: "", paints: [] })),
  createTextStyle: jest.fn(() => ({ id: "mock-id", name: "" })),
  createEffectStyle: jest.fn(() => ({ id: "mock-id", name: "", effects: [] })),
  importStyleByKeyAsync: jest.fn(),
  notify: jest.fn(),
  closePlugin: jest.fn(),
  ui: {
    postMessage: jest.fn(),
    onmessage: null,
  },
  clientStorage: {
    getAsync: jest.fn(),
    setAsync: jest.fn(),
  },
  viewport: {
    scrollAndZoomIntoView: jest.fn(),
  },
  variables: {
    getVariableById: jest.fn(),
    getVariableByIdAsync: jest.fn(),
  },
  on: jest.fn(),
  off: jest.fn(),
};

// Assign to global
(global as any).figma = mockFigma;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
