# Design Lint - Figma Plugin

## Project Overview

Design Lint is a Figma plugin that helps designers maintain consistency by detecting and fixing style inconsistencies in their designs. It checks for missing fill styles, text styles, stroke styles, effect styles, and border radius values.

## Architecture

```
src/
├── app/                    # React UI (runs in iframe)
│   ├── components/         # React components
│   ├── styles/             # CSS styles
│   └── assets/             # SVG icons and images
├── plugin/                 # Figma plugin code (runs on main thread)
│   ├── controller.ts       # Main plugin logic and message handling
│   ├── lintingFunctions.ts # Core linting logic
│   ├── remoteStyleFunctions.ts # Remote style fetching
│   └── styles.ts           # Local style fetching
└── types/                  # TypeScript type definitions
    └── index.ts            # Shared types
```

### Key Concepts

- **Plugin Code** (`src/plugin/`): Runs on Figma's main thread. Has access to Figma API but can freeze UI if operations take too long.
- **UI Code** (`src/app/`): Runs in an iframe. Communicates with plugin code via `postMessage`.
- **Message Protocol**: Plugin and UI communicate through typed messages (see `PluginMessageType` in types).

## Build Commands

```bash
npm run build       # Production build
npm run watch       # Development build with watch mode
npm run lint        # Run ESLint
npm run lint:fix    # Run ESLint with auto-fix
npm run typecheck   # Run TypeScript type checking
npm run test        # Run Jest tests
```

## Code Conventions

### TypeScript

- Use strict TypeScript types where possible
- Prefer interfaces over type aliases for object shapes
- Use Figma's built-in types (SceneNode, Paint, Effect, etc.)
- Cast `figma.getStyleById()` results to specific types: `as PaintStyle`, `as TextStyle`, `as EffectStyle`

### Figma API

- **Always use async APIs** - Sync APIs are deprecated:
  - Use `getLocalPaintStylesAsync()` not `getLocalPaintStyles()`
  - Use `getStyleByIdAsync()` not `getStyleById()`
  - Use `setFillStyleIdAsync()` not `fillStyleId =`
  - Use `getVariableByIdAsync()` not `getVariableById()`

- **Prevent UI freezing** - For operations on many nodes:
  ```typescript
  // Use chunked iteration with delay to yield to main thread
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    // Yield to main thread every CHUNK_SIZE nodes
    if (i > 0 && i % CHUNK_SIZE === 0) {
      await delay(YIELD_INTERVAL_MS);
    }
    // Process single node
  }
  ```

### React Components

- Use functional components with hooks
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback`
- Clean up event listeners in `useEffect` return functions
- Props interfaces should be defined above component

### CSS

- Use BEM-like naming: `.component-name`, `.component-name-element`
- Figma design system variables available in `figma.ds.css`

## Key Files

| File | Purpose |
|------|---------|
| `controller.ts` | Main message handler, coordinates all plugin operations |
| `lintingFunctions.ts` | Core linting logic - checks fills, strokes, text, effects, radius |
| `App.tsx` | Main React component, state management |
| `BulkErrorList.tsx` | Displays grouped errors with bulk actions |
| `types/index.ts` | All shared TypeScript interfaces |

## Common Patterns

### Adding a New Lint Check

1. Add check function in `lintingFunctions.ts`
2. Add error type to `LintError['type']` union in `types/index.ts`
3. Call check in `controller.ts` lint flow
4. Handle display in `BulkErrorListItem.tsx`

### Adding a New Message Type

1. Add type to `PluginMessageType` union in `types/index.ts`
2. Add handler in `controller.ts` `figma.ui.onmessage`
3. Send from UI with `parent.postMessage({ pluginMessage: { type: '...' } }, '*')`

## Testing

- Unit tests in `__tests__/` directories
- Run with `npm run test`
- Mock Figma API using `jest.mock()`

## Performance Guidelines

1. **Batch node operations** - Use chunked iteration with `delay()` for >50 nodes
2. **Avoid sync loops** - Use `Promise.all` or chunked async
3. **Cache style lookups** - Don't call `getStyleById` repeatedly for same ID
4. **Limit UI updates** - Batch state changes, use `useMemo`/`useCallback`

## Dependencies

- **React 18** - UI framework
- **CSS animations** - All animations use pure CSS (no external animation library)
- **webpack 4** - Bundler (requires `NODE_OPTIONS=--openssl-legacy-provider`)
- **TypeScript 5.3** - Type checking
- **ESLint 8** - Linting with `@figma/eslint-plugin-figma-plugins`
