# Lint Me

> **Note:** This is a fork of [Design Lint](https://github.com/destefanis/design-lint) by Daniel Destefanis. The original plugin is excellent - this fork adds AI features, enhanced lint rules, and other improvements while maintaining compatibility with the original.

![Design Lint Gif Example](https://github.com/destefanis/design-lint/blob/master/assets/lint-example.gif)

Find and fix errors in your designs with Lint Me, a plugin for Figma.

[View Original Plugin](https://www.figma.com/c/plugin/801195587640428208) | [Original Repository](https://github.com/destefanis/design-lint)

Lint Me finds missing styles within your designs on all your layers. Ensure your designs are ready for development or design collaboration by fixing inconsistencies.

## Features

### Core Linting
- **Style Detection**: Finds missing fill, text, stroke, and effect styles
- **Border Radius Validation**: Ensures consistent corner radius values
- **Live Updates**: Automatically detects changes as you fix errors
- **Layer Selection**: Click any error to select and navigate to that layer in Figma
- **Ignore Options**: Skip specific errors or ignore all instances of a value
- **Locked Layer Support**: Automatically skips locked layers (great for illustrations)

### Enhanced Features
- **Error Severity Levels**: Errors categorized as error, warning, or info
- **Configurable Rules**: Toggle individual lint rules on/off in settings
- **Batch Operations**: Fix or ignore all errors of a specific type at once
- **Export Reports**: Download lint results as JSON for documentation or CI/CD
- **Variables Page**: Track design token and variable usage across your design
- **Styles Page**: Browse all styles in use with search and filtering
- **Custom Lint Rules**: Built-in checks for spacing, naming, nesting, and more

### AI-Powered Features (via Ollama)
- **Design Review**: Get AI analysis of your design with actionable recommendations
- **Smart Layer Rename**: AI suggests better names for poorly named layers
- **Rich Context**: AI understands your design's structure, patterns, and style usage

## Installation

### From Figma Community
Install the original plugin from the [Figma Plugin Page](https://www.figma.com/c/plugin/801195587640428208).

### Run Locally
```bash
# Install dependencies
npm install

# Development build with watch mode
npm run watch

# Production build
npm run build

# Run tests
npm run test

# Type checking
npm run typecheck

# Lint code
npm run lint
```

## Setting Up AI Features (Optional)

The AI features require [Ollama](https://ollama.ai) running locally on your machine.

### 1. Install Ollama
Download and install from [ollama.ai](https://ollama.ai)

### 2. Pull a Model
```bash
# Recommended model (good balance of speed and quality)
ollama pull llama3.2

# Alternative lighter model
ollama pull mistral
```

### 3. Start Ollama
Ollama runs as a background service. Once installed, it typically starts automatically. The plugin connects to `localhost:11434`.

### 4. Use in Plugin
1. Open the AI panel (click the "AI" button in the navigation)
2. Check that the status shows "Online"
3. Use "Analyze Design" for a design review
4. Use "Suggest Names" to get rename suggestions for poorly named layers

## Project Structure

```
src/
├── app/                    # React UI (runs in iframe)
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks (useOllama)
│   ├── services/           # API services (ollamaService)
│   ├── styles/             # CSS stylesheets
│   └── assets/             # Icons and images
├── plugin/                 # Figma plugin code (runs on main thread)
│   ├── controller.ts       # Main plugin logic and message handling
│   ├── lintingFunctions.ts # Core and custom linting rules
│   ├── remoteStyleFunctions.ts
│   └── styles.ts
└── types/
    └── index.ts            # Shared TypeScript interfaces
```

## How the Linting Works

Different layers (Nodes in the Figma API) have different properties to lint. First we loop through the layers the user has selected. For each layer we determine that layer's type:

```javascript
function determineType(node) {
  switch (node.type) {
    case "SLICE":
    case "GROUP": {
      // Groups styles apply to their children so we can skip
      return [];
    }
    case "FRAME": {
      return lintFrameRules(node);
    }
    case "TEXT": {
      return lintTextRules(node);
    }
    case "RECTANGLE":
    case "INSTANCE": {
      return lintRectangleRules(node);
    }
    // ... etc
  }
}
```

Each node type has specific linting rules. For example, text layers check for typography, fills, effects, and strokes:

```javascript
function lintTextRules(node) {
  let errors = [];

  checkType(node, errors);        // Text style
  checkFills(node, errors);       // Fill colors
  checkEffects(node, errors);     // Shadows, blurs
  checkStrokes(node, errors);     // Borders

  // Custom rules
  checkTextColorUsage(node, errors);
  checkTextStyleCompliance(node, errors);
  checkNamingConventions(node, errors);

  return errors;
}
```

## Custom Lint Rules

This fork includes additional lint rules for design system compliance:

| Rule | Description | Default |
|------|-------------|---------|
| Spacing Values | Validates auto-layout spacing (4, 8, 12, 16, 24, 32, 48, 64px) | Enabled |
| Naming Conventions | Flags default names like "Frame 1", "Rectangle 2" | Enabled |
| Auto-Layout Nesting | Warns on deeply nested frames (>4 levels) | Enabled |
| Component Usage | Suggests converting elements to components | Enabled |
| Fixed Dimensions | Flags fixed sizes that could be responsive | Enabled |
| Touch Target Size | Ensures minimum 44x44px for interactive elements | Enabled |
| Empty Frames | Flags empty frames that may be placeholders | Enabled |
| Detached Instances | Warns about detached component instances | Enabled |
| Icon Size | Validates icon dimensions (16, 20, 24, 32, 40, 48px) | Enabled |

All rules can be toggled in Settings > Lint Rules.

## Writing Your Own Rules

### Creating a Custom Rule

Add your rule in `lintingFunctions.ts`:

```typescript
export function customCheckTextFills(node: TextNode, errors: LintError[]) {
  // Style keys to flag (get these from figma.getLocalPaintStyles())
  const backgroundFills = [
    "4b93d40f61be15e255e87948a715521c3ae957e6"
  ];

  let nodeFillStyle = node.fillStyleId;

  // Handle mixed styles
  if (typeof nodeFillStyle === "symbol") {
    return errors.push(
      createErrorObject(node, "fill", "Multiple fill styles", "Mixed Styles")
    );
  }

  // Clean the style key
  nodeFillStyle = nodeFillStyle.replace("S:", "").split(",")[0];

  // Check if using a background color on text
  if (nodeFillStyle && backgroundFills.includes(nodeFillStyle)) {
    return errors.push(
      createErrorObject(
        node,
        "fill",
        "Incorrect text color",
        "Using background color on text"
      )
    );
  }
}
```

### Adding Your Rule to the Lint Flow

1. Import your function in `controller.ts`:
```typescript
import { customCheckTextFills } from "./lintingFunctions";
```

2. Add it to the appropriate lint rules function:
```typescript
function lintTextRules(node: TextNode, libraries: Library[]): LintError[] {
  const errors: LintError[] = [];

  // Existing rules...
  checkType(node, errors, libraries);

  // Your custom rule
  customCheckTextFills(node, errors);

  return errors;
}
```

### Error Object Structure

```typescript
interface LintError {
  message: string;           // Main error message
  type: string;              // "fill" | "text" | "stroke" | "radius" | "effects" | etc.
  severity?: "error" | "warning" | "info";
  node: SceneNode;           // The Figma node
  value: string;             // Display value (hex color, style name, etc.)
  matches?: StyleMatch[];    // Matching styles from libraries
  suggestions?: StyleMatch[]; // Suggested fixes
}
```

## Configuration

### Border Radius Values

Default: `[0, 2, 4, 8, 16, 24, 32]`

Change in Settings or modify defaults in:
- `src/app/components/App.tsx` (line ~77)
- `src/plugin/controller.ts` (line ~50)

### Spacing Values

Default: `[0, 4, 8, 12, 16, 24, 32, 48, 64]`

Modify in `src/plugin/lintingFunctions.ts` in the `CUSTOM_LINT_CONFIG` object.

### Lint Rule Toggles

All custom rules can be enabled/disabled via the Settings panel. Configuration persists in Figma client storage.

## API Reference

### Message Types (Plugin ↔ UI)

Communication between the plugin and UI uses typed messages:

```typescript
// Send from UI to Plugin
parent.postMessage({
  pluginMessage: {
    type: "update-errors",
    libraries: [...],
  }
}, "*");

// Receive in Plugin
figma.ui.onmessage = (msg) => {
  if (msg.type === "update-errors") {
    // Handle message
  }
};
```

Key message types:
- `run-app` - Initialize linting
- `update-errors` - Refresh error list
- `apply-styles` - Apply a style to nodes
- `select-multiple-layers` - Select nodes in Figma
- `request-rich-context` - Get detailed design context for AI
- `rename-layer` - Rename a layer (AI feature)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run test`
5. Submit a pull request

## Tech Stack

- **React 18** - UI framework
- **TypeScript 5.3** - Type safety
- **Webpack 4** - Bundling
- **ESLint 8** - Code linting
- **Jest** - Testing
- **Figma Plugin API** - Figma integration
- **Ollama** (optional) - Local AI inference

## Credits

Originally created by [Daniel Destefanis](https://github.com/destefanis). This fork adds enhanced features for design system compliance and AI-powered assistance.

## License

MIT License - feel free to fork and customize for your organization's needs.
