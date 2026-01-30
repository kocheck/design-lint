# Design Lint - Figma Plugin

## Project Overview

Design Lint is a Figma plugin that helps designers maintain consistency by detecting and fixing style inconsistencies in their designs. It checks for missing fill styles, text styles, stroke styles, effect styles, border radius values, and includes custom lint rules for design system compliance.

**Key Features:**
- Lint errors with severity levels (error, warning, info)
- Configurable lint rules with UI toggles
- Bulk error operations (fix/ignore by type)
- Export lint reports as JSON
- Variables page for tracking design token usage
- Styles page with search and filtering
- AI-powered design review and layer renaming (via Ollama)

## Architecture

```
src/
├── app/                        # React UI (runs in iframe)
│   ├── components/             # React components
│   │   ├── App.tsx             # Main app, state management
│   │   ├── Navigation.tsx      # Tab navigation + settings/AI buttons
│   │   ├── BulkErrorList.tsx   # Grouped errors with bulk actions
│   │   ├── SettingsPanel.tsx   # Settings slide-out panel
│   │   ├── AIPanel.tsx         # AI assistant panel (Ollama integration)
│   │   ├── RuleConfigurationForm.tsx  # Lint rule toggles
│   │   ├── StylesPage.tsx      # Styles viewer with search/filter
│   │   ├── VariablesPage.tsx   # Variables viewer
│   │   └── ...                 # Other UI components
│   ├── hooks/
│   │   └── useOllama.ts        # React hook for Ollama AI features
│   ├── services/
│   │   └── ollamaService.ts    # Non-blocking Ollama API service
│   ├── styles/                 # CSS styles
│   │   ├── figma.ds.css        # Figma design system tokens
│   │   ├── ui.css              # Main UI styles
│   │   ├── panel.css           # Panel and error list styles
│   │   ├── ai-panel.css        # AI panel styles
│   │   └── library.css         # Library and styles page
│   └── assets/                 # SVG icons and images
├── plugin/                     # Figma plugin code (runs on main thread)
│   ├── controller.ts           # Main plugin logic, message handling, rich context
│   ├── lintingFunctions.ts     # Core + custom linting logic
│   ├── remoteStyleFunctions.ts # Remote style fetching
│   └── styles.ts               # Local style fetching
└── types/
    └── index.ts                # Shared TypeScript interfaces
```

### Key Concepts

- **Plugin Code** (`src/plugin/`): Runs on Figma's main thread. Has access to Figma API but can freeze UI if operations take too long.
- **UI Code** (`src/app/`): Runs in an iframe. Communicates with plugin code via `postMessage`.
- **Message Protocol**: Plugin and UI communicate through typed messages (see `PluginMessageType` in types).
- **Non-blocking AI**: Ollama requests are async and don't block the UI.

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
- All animations use pure CSS (no external animation library)

## Key Files

| File | Purpose |
|------|---------|
| `controller.ts` | Main message handler, coordinates all plugin operations, gathers rich design context |
| `lintingFunctions.ts` | Core linting logic + custom rules (spacing, naming, nesting, etc.) |
| `App.tsx` | Main React component, global state management |
| `BulkErrorList.tsx` | Displays grouped errors with bulk actions, export, batch operations |
| `AIPanel.tsx` | AI assistant panel with design review and layer rename features |
| `useOllama.ts` | React hook for Ollama integration with rich context support |
| `ollamaService.ts` | Non-blocking Ollama API service with feature-specific prompts |
| `types/index.ts` | All shared TypeScript interfaces |

## Feature Documentation

### Error Severity Levels

Errors now have a `severity` field: `"error"` | `"warning"` | `"info"`

```typescript
interface LintError {
  type: "fill" | "text" | "stroke" | "radius" | "effects" | "spacing" | "component" | "naming" | "nesting";
  severity?: ErrorSeverity;
  message: string;
  // ...
}
```

Visual indicators in the UI show different colors for each severity level.

### Configurable Lint Rules

The `LintRuleConfig` interface in `types/index.ts` defines toggleable rules:

```typescript
interface LintRuleConfig {
  enableColorCheck: boolean;
  enableTypographyCheck: boolean;
  enableSpacingCheck: boolean;
  enableComponentCheck: boolean;
  enableNamingCheck: boolean;
  enableNestingCheck: boolean;
  // ... more toggles
  allowedSpacingValues: number[];
  allowedIconSizes: number[];
  minTouchTargetSize: number;
  maxAutoLayoutNestingDepth: number;
}
```

Access via Settings panel > "Lint Rules" section.

### AI Integration (Ollama)

The plugin integrates with a local Ollama instance for AI-powered features.

**Architecture:**
1. `ollamaService.ts` - Handles HTTP requests to Ollama API (localhost:11434)
2. `useOllama.ts` - React hook managing state and requests
3. `AIPanel.tsx` - UI component for AI features
4. `controller.ts` - `gatherRichDesignContext()` function provides detailed design context

**Rich Design Context:**
The plugin gathers comprehensive context for better AI recommendations:
- Layer hierarchy (parent, depth, siblings)
- Auto-layout settings (direction, gap, padding)
- Component/instance info with variant properties
- Style bindings and variable usage
- Design patterns (common spacing, radii, font sizes)
- Adherence percentages (auto-layout %, component %, style %)

**Features:**
- **Design Review**: Analyzes errors and provides actionable recommendations
- **Smart Layer Rename**: Suggests better names for layers with naming issues

**Non-blocking:** All Ollama requests are async - the plugin continues working while AI processes.

### Batch Operations

In `BulkErrorList.tsx`, users can:
- Select all errors of a specific type
- Fix all errors of a type (apply style)
- Ignore all errors of a type
- Export lint report as JSON

### Export Lint Report

Generates a JSON file with:
```typescript
{
  timestamp: string;
  summary: {
    totalErrors: number;
    totalUniqueErrors: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  errors: Array<{
    type: string;
    message: string;
    value: string;
    count: number;
    nodeIds: string[];
  }>;
}
```

## Common Patterns

### Adding a New Lint Check

1. Add check function in `lintingFunctions.ts`
2. Add error type to `LintError['type']` union in `types/index.ts`
3. Add toggle to `LintRuleConfig` if configurable
4. Call check in `controller.ts` lint flow (e.g., `lintFrameRules`)
5. Handle display in `BulkErrorListItem.tsx`

### Adding a New Message Type

1. Add type to `PluginMessageType` union in `types/index.ts`
2. Add handler in `controller.ts` `figma.ui.onmessage`
3. Send from UI with `parent.postMessage({ pluginMessage: { type: '...' } }, '*')`

### Adding Rich Context Data

1. Update `RichLayerContext` or `RichDesignContext` in `types/index.ts`
2. Gather data in `gatherRichDesignContext()` in `controller.ts`
3. Use in AI prompts in `ollamaService.ts`

## Testing

- Unit tests in `__tests__/` directories
- Run with `npm run test`
- Mock Figma API using `jest.mock()`
- Current test coverage focuses on `lintingFunctions.ts`

## Performance Guidelines

1. **Batch node operations** - Use chunked iteration with `delay()` for >50 nodes
2. **Avoid sync loops** - Use `Promise.all` or chunked async
3. **Cache style lookups** - Don't call `getStyleById` repeatedly for same ID
4. **Limit UI updates** - Batch state changes, use `useMemo`/`useCallback`
5. **Limit rich context depth** - `gatherRichDesignContext` limits to 50 layers and 5 depth levels

## Dependencies

- **React 18** - UI framework
- **CSS animations** - All animations use pure CSS (no external animation library)
- **webpack 4** - Bundler (requires `NODE_OPTIONS=--openssl-legacy-provider`)
- **TypeScript 5.3** - Type checking
- **ESLint 8** - Linting with `@figma/eslint-plugin-figma-plugins`
- **Ollama** (optional) - Local LLM for AI features (not bundled, user-installed)

## Custom Lint Rules (BreakLine Design System)

The plugin includes custom lint rules in `lintingFunctions.ts`:

| Rule | Description | Configurable |
|------|-------------|--------------|
| `checkSpacingValues` | Validates auto-layout spacing against allowed values | Yes |
| `checkNamingConventions` | Flags default Figma names (Frame 1, Rectangle 2, etc.) | Yes |
| `checkAutoLayoutNesting` | Warns on deeply nested auto-layout frames | Yes (max depth) |
| `checkComponentUsage` | Suggests converting repeated elements to components | Yes |
| `checkFixedDimensions` | Flags fixed width/height that could be responsive | Yes |
| `checkTouchTargetSize` | Ensures interactive elements meet minimum size | Yes (min size) |
| `checkEmptyFrames` | Flags empty frames that may be placeholders | Yes |
| `checkDetachedInstances` | Warns about detached component instances | Yes |
| `checkIconSize` | Validates icon dimensions against standard sizes | Yes |
| `checkTextColorUsage` | Ensures text uses appropriate color styles | Yes |
| `checkTextStyleCompliance` | Validates text style usage | Yes |

Configuration is stored in Figma client storage and persists across sessions.
