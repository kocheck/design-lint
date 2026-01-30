/**
 * Ollama Service - Non-blocking AI integration for Design Lint
 *
 * This service communicates with a local Ollama instance (default: localhost:11434)
 * All requests are async and non-blocking to allow the plugin to continue working.
 */

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

export interface OllamaResponse {
  success: boolean;
  data?: string;
  error?: string;
}

export interface OllamaStreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaRequest {
  id: string;
  type: "rename" | "review" | "suggestions";
  status: "pending" | "processing" | "completed" | "error";
  prompt: string;
  result?: string;
  error?: string;
}

// Default configuration
const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: "http://localhost:11434",
  model: "llama3.2",
  timeout: 60000, // 60 seconds timeout
};

// Request queue for managing concurrent requests
const requestQueue: Map<string, OllamaRequest> = new Map();

// Callbacks for request status updates
type RequestCallback = (request: OllamaRequest) => void;
const requestCallbacks: Map<string, RequestCallback> = new Map();

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `ollama-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaAvailability(
  config: Partial<OllamaConfig> = {},
): Promise<boolean> {
  const { baseUrl } = { ...DEFAULT_CONFIG, ...config };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available models from Ollama
 */
export async function getAvailableModels(
  config: Partial<OllamaConfig> = {},
): Promise<string[]> {
  const { baseUrl } = { ...DEFAULT_CONFIG, ...config };

  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) return [];

    const data = (await response.json()) as { models: Array<{ name: string }> };
    return data.models?.map((m) => m.name) || [];
  } catch {
    return [];
  }
}

/**
 * Send a prompt to Ollama (non-blocking)
 * Returns a request ID that can be used to track progress
 */
export async function sendPrompt(
  prompt: string,
  type: OllamaRequest["type"],
  config: Partial<OllamaConfig> = {},
  onUpdate?: RequestCallback,
): Promise<string> {
  const { baseUrl, model, timeout } = { ...DEFAULT_CONFIG, ...config };
  const requestId = generateRequestId();

  // Create request entry
  const request: OllamaRequest = {
    id: requestId,
    type,
    status: "pending",
    prompt,
  };

  requestQueue.set(requestId, request);

  if (onUpdate) {
    requestCallbacks.set(requestId, onUpdate);
    onUpdate(request);
  }

  // Start the request in the background (non-blocking)
  processRequest(requestId, prompt, baseUrl, model, timeout);

  return requestId;
}

/**
 * Process the request asynchronously
 */
async function processRequest(
  requestId: string,
  prompt: string,
  baseUrl: string,
  model: string,
  timeout: number,
): Promise<void> {
  const request = requestQueue.get(requestId);
  if (!request) return;

  // Update status to processing
  request.status = "processing";
  notifyCallback(requestId);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false, // Non-streaming for simplicity
        options: {
          temperature: 0.7,
          num_predict: 1024,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    request.status = "completed";
    request.result = data.response;
  } catch (error) {
    request.status = "error";
    request.error =
      error instanceof Error ? error.message : "Unknown error occurred";
  }

  notifyCallback(requestId);
}

/**
 * Notify the callback for a request
 */
function notifyCallback(requestId: string): void {
  const request = requestQueue.get(requestId);
  const callback = requestCallbacks.get(requestId);

  if (request && callback) {
    callback(request);
  }
}

/**
 * Get the status of a request
 */
export function getRequestStatus(requestId: string): OllamaRequest | null {
  return requestQueue.get(requestId) || null;
}

/**
 * Cancel a pending request
 */
export function cancelRequest(requestId: string): void {
  const request = requestQueue.get(requestId);
  if (request && request.status === "pending") {
    request.status = "error";
    request.error = "Request cancelled";
    notifyCallback(requestId);
  }
}

/**
 * Clean up completed requests older than specified age (in ms)
 */
export function cleanupRequests(maxAge: number = 300000): void {
  const now = Date.now();
  const requestIdPattern = /^ollama-(\d+)-/;

  requestQueue.forEach((request, id) => {
    const match = id.match(requestIdPattern);
    if (match) {
      const timestamp = parseInt(match[1], 10);
      if (
        now - timestamp > maxAge &&
        (request.status === "completed" || request.status === "error")
      ) {
        requestQueue.delete(id);
        requestCallbacks.delete(id);
      }
    }
  });
}

// ============================================
// Rich Context Types (imported from main types for reference)
// ============================================

export interface RichLayerContext {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  parentName: string | null;
  parentType: string | null;
  depth: number;
  childCount: number;
  isAutoLayout: boolean;
  autoLayoutDirection?: "HORIZONTAL" | "VERTICAL" | "NONE";
  autoLayoutGap?: number;
  isComponent: boolean;
  isInstance: boolean;
  mainComponentName?: string;
  variantProperties?: Record<string, string>;
  hasFillStyle: boolean;
  hasTextStyle: boolean;
  fillStyleName?: string;
  textStyleName?: string;
  visible: boolean;
  boundVariables: Array<{
    property: string;
    variableName: string;
    variableCollection: string;
  }>;
  textContent?: string;
  fontSize?: number;
  fontFamily?: string;
  primaryFillColor?: string;
  cornerRadius?: number | "mixed";
}

export interface RichDesignContext {
  selectionCount: number;
  selectionTypes: Record<string, number>;
  pageName: string;
  documentColorStyles: number;
  documentTextStyles: number;
  documentEffectStyles: number;
  documentComponents: number;
  layers: RichLayerContext[];
  componentUsage: Array<{
    name: string;
    instanceCount: number;
    isLocal: boolean;
  }>;
  styleUsage: {
    fills: Array<{ name: string; count: number }>;
    text: Array<{ name: string; count: number }>;
    effects: Array<{ name: string; count: number }>;
  };
  variableUsage: Array<{
    name: string;
    collection: string;
    count: number;
    type: string;
  }>;
  patterns: {
    commonSpacingValues: number[];
    commonCornerRadii: number[];
    commonFontSizes: number[];
    autoLayoutUsagePercent: number;
    componentUsagePercent: number;
    styleAdherencePercent: number;
  };
}

// ============================================
// AI Feature-specific Prompts
// ============================================

/**
 * Generate layer rename suggestions with rich context
 */
export async function generateLayerRenameSuggestions(
  layers: Array<{ id: string; name: string; type: string }>,
  config?: Partial<OllamaConfig>,
  onUpdate?: RequestCallback,
  richContext?: RichDesignContext,
): Promise<string> {
  // Build context-aware prompt
  let contextInfo = "";
  if (richContext) {
    contextInfo = `
Design Context:
- Page: "${richContext.pageName}"
- Document has ${richContext.documentComponents} components, ${richContext.documentColorStyles} color styles, ${richContext.documentTextStyles} text styles
- Auto-layout usage: ${richContext.patterns.autoLayoutUsagePercent}%
- Component usage: ${richContext.patterns.componentUsagePercent}%
${
  richContext.componentUsage.length > 0
    ? `- Common components: ${richContext.componentUsage
        .slice(0, 5)
        .map((c) => c.name)
        .join(", ")}`
    : ""
}
${
  richContext.styleUsage.fills.length > 0
    ? `- Common fill styles: ${richContext.styleUsage.fills
        .slice(0, 5)
        .map((s) => s.name)
        .join(", ")}`
    : ""
}
`;
  }

  // Build layer details with hierarchy info
  const layerDetails = layers
    .map((l) => {
      const richLayer = richContext?.layers.find((rl) => rl.id === l.id);
      if (richLayer) {
        let detail = `- "${l.name}" (${l.type})`;
        if (richLayer.parentName) detail += ` in "${richLayer.parentName}"`;
        if (richLayer.isInstance && richLayer.mainComponentName)
          detail += ` [instance of ${richLayer.mainComponentName}]`;
        if (richLayer.childCount > 0)
          detail += ` [${richLayer.childCount} children]`;
        if (richLayer.textContent)
          detail += ` [text: "${richLayer.textContent.substring(0, 30)}..."]`;
        return detail;
      }
      return `- "${l.name}" (${l.type})`;
    })
    .join("\n");

  const prompt = `You are a Figma design system expert. Analyze these layer names and suggest better names following these conventions:
- Use PascalCase for frames and components (e.g., "HeaderNav", "PrimaryButton")
- Use descriptive names that indicate purpose (e.g., "SearchInput" instead of "Rectangle 1")
- Keep names concise but meaningful
- Group related elements with consistent prefixes
- Consider the layer's parent context and purpose
- For text layers, name based on content purpose (e.g., "HeadingText", "BodyCopy")
- For instances, keep the component name but add context if needed
${contextInfo}
Layers to rename:
${layerDetails}

Respond with ONLY a JSON array of objects with "id", "original", and "suggested" fields. No explanations.
Example: [{"id": "1:2", "original": "Frame 1", "suggested": "HeaderSection"}]`;

  return sendPrompt(prompt, "rename", config, onUpdate);
}

/**
 * Generate design review summary with rich context
 */
export async function generateDesignReview(
  errors: Array<{ type: string; message: string; count: number }>,
  stylesSummary: { fills: number; text: number; effects: number },
  config?: Partial<OllamaConfig>,
  onUpdate?: RequestCallback,
  richContext?: RichDesignContext,
): Promise<string> {
  // Build comprehensive context
  let contextInfo = "";
  if (richContext) {
    contextInfo = `
Design Structure:
- Page: "${richContext.pageName}" with ${richContext.selectionCount} selected elements
- Layer types: ${Object.entries(richContext.selectionTypes)
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ")}

Document Resources:
- ${richContext.documentColorStyles} color styles, ${richContext.documentTextStyles} text styles, ${richContext.documentEffectStyles} effect styles
- ${richContext.documentComponents} local components

Design Patterns Detected:
- Auto-layout usage: ${richContext.patterns.autoLayoutUsagePercent}% of frames
- Component usage: ${richContext.patterns.componentUsagePercent}% of elements are instances
- Style adherence: ${richContext.patterns.styleAdherencePercent}% of elements use defined styles
- Common spacing values: ${richContext.patterns.commonSpacingValues.join(", ") || "none detected"}px
- Common corner radii: ${richContext.patterns.commonCornerRadii.join(", ") || "none detected"}px
- Common font sizes: ${richContext.patterns.commonFontSizes.join(", ") || "none detected"}px

${
  richContext.componentUsage.length > 0
    ? `Most Used Components:\n${richContext.componentUsage
        .slice(0, 10)
        .map(
          (c) =>
            `- ${c.name}: ${c.instanceCount} instances${c.isLocal ? " (local)" : " (library)"}`,
        )
        .join("\n")}`
    : ""
}

${
  richContext.styleUsage.fills.length > 0
    ? `Most Used Fill Styles:\n${richContext.styleUsage.fills
        .slice(0, 10)
        .map((s) => `- ${s.name}: ${s.count} uses`)
        .join("\n")}`
    : ""
}

${
  richContext.styleUsage.text.length > 0
    ? `Most Used Text Styles:\n${richContext.styleUsage.text
        .slice(0, 10)
        .map((s) => `- ${s.name}: ${s.count} uses`)
        .join("\n")}`
    : ""
}

${
  richContext.variableUsage.length > 0
    ? `Variables in Use:\n${richContext.variableUsage
        .slice(0, 10)
        .map(
          (v) =>
            `- ${v.name} (${v.type}) from "${v.collection}": ${v.count} bindings`,
        )
        .join("\n")}`
    : ""
}
`;
  }

  const prompt = `You are a senior design system auditor conducting a thorough review. Analyze this design lint report and design context to provide actionable recommendations.
${contextInfo}
Lint Errors Found:
${errors.length > 0 ? errors.map((e) => `- ${e.type}: ${e.message} (${e.count} instances)`).join("\n") : "No lint errors found - great job!"}

Styles Currently Applied:
- Fill styles in use: ${stylesSummary.fills}
- Text styles in use: ${stylesSummary.text}
- Effect styles in use: ${stylesSummary.effects}

Provide a comprehensive but concise review covering:

1. **Overall Score** (1-10): Rate the design system adherence based on style usage, component usage, and patterns

2. **Critical Issues** (if any): Most important problems to fix first

3. **Pattern Analysis**:
   - Comment on the spacing, typography, and radius consistency
   - Note any good patterns worth maintaining

4. **Quick Wins**: Easy improvements with high impact

5. **Recommendations**:
   - Suggest which elements should become components
   - Identify styles that should be created
   - Note any variables that would improve maintainability

Keep each section brief (2-3 bullet points max). Focus on actionable insights.`;

  return sendPrompt(prompt, "review", config, onUpdate);
}

/**
 * Generate component suggestions with rich context
 */
export async function generateComponentSuggestions(
  layerInfo: Array<{
    name: string;
    type: string;
    width: number;
    height: number;
    hasChildren: boolean;
  }>,
  config?: Partial<OllamaConfig>,
  onUpdate?: RequestCallback,
  richContext?: RichDesignContext,
): Promise<string> {
  // Build context about existing components
  let contextInfo = "";
  if (richContext) {
    contextInfo = `
Existing Design System:
- ${richContext.documentComponents} components already defined
${
  richContext.componentUsage.length > 0
    ? `- Commonly used: ${richContext.componentUsage
        .slice(0, 5)
        .map((c) => `${c.name} (${c.instanceCount}x)`)
        .join(", ")}`
    : ""
}
- Common sizes: ${richContext.patterns.commonCornerRadii.length > 0 ? `radii: ${richContext.patterns.commonCornerRadii.join(", ")}px` : ""} ${richContext.patterns.commonSpacingValues.length > 0 ? `spacing: ${richContext.patterns.commonSpacingValues.join(", ")}px` : ""}
`;
  }

  // Enhanced layer info
  const layerDetails = layerInfo
    .map((l) => {
      const richLayer = richContext?.layers.find((rl) => rl.name === l.name);
      let detail = `- "${l.name}" (${l.type}, ${l.width}x${l.height}px, ${l.hasChildren ? "has children" : "no children"})`;
      if (richLayer) {
        if (richLayer.isAutoLayout)
          detail += ` [auto-layout: ${richLayer.autoLayoutDirection}]`;
        if (richLayer.hasFillStyle)
          detail += ` [styled fill: ${richLayer.fillStyleName}]`;
        if (richLayer.hasTextStyle)
          detail += ` [styled text: ${richLayer.textStyleName}]`;
        if (richLayer.boundVariables.length > 0)
          detail += ` [uses ${richLayer.boundVariables.length} variables]`;
      }
      return detail;
    })
    .join("\n");

  const prompt = `You are a Figma component architecture expert. Analyze these layers and suggest which ones should be converted to reusable components.
${contextInfo}
Layers to analyze:
${layerDetails}

For each layer that should become a component:
1. **Why**: Explain the reusability benefit
2. **Component Name**: Suggest a PascalCase name following naming conventions
3. **Variants**: Suggest useful variants (size, state, theme)
4. **Props**: Suggest boolean or text properties that should be exposed

Consider:
- Repeated patterns (similar sizes, naming conventions)
- Interactive elements that need states
- Text/icon combinations that appear frequently
- Containers with consistent padding/spacing

Respond in a structured, scannable format. Skip layers that don't need to be components.`;

  return sendPrompt(prompt, "suggestions", config, onUpdate);
}
