// Shared types for the Design Lint plugin
/// <reference types="@figma/plugin-typings" />

// ============================================
// Error Types
// ============================================

export type ErrorSeverity = "error" | "warning" | "info";

export interface LintError {
  message: string;
  type:
    | "fill"
    | "text"
    | "stroke"
    | "radius"
    | "effects"
    | "spacing"
    | "component"
    | "naming"
    | "nesting";
  severity?: ErrorSeverity;
  node: SceneNode;
  value: string;
  matches?: StyleMatch[];
  suggestions?: StyleSuggestion[];
  fillColor?: string | null;
  textProperties?: TextProperties;
  variableMatches?: VariableMatch[];
  variableSuggestions?: VariableSuggestion[];
  nodes?: string[];
  count?: number;
}

export interface NodeWithErrors {
  id: string;
  errors: LintError[];
  children: string[];
}

// ============================================
// Style Types
// ============================================

export interface StyleMatch {
  name: string;
  id: string;
  key: string;
  value: string;
  source: string;
  paint?: Paint;
  count?: number;
  effects?: readonly Effect[];
}

export interface StyleSuggestion extends StyleMatch {
  textProperties?: TextStyleProperties;
}

export interface VariableMatch {
  id: string;
  name: string;
  value: string;
}

export interface VariableSuggestion extends VariableMatch {
  source: string;
}

export interface TextProperties {
  font?: string;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: string | number;
  letterSpacingValue?: number;
  letterSpacingUnit?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  textCase?: string;
}

export interface TextStyleProperties {
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: LineHeight | { value?: number; unit?: string };
  letterSpacing?: LetterSpacing | { value: number; unit: string };
  textCase?: TextCase;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  textDecoration?: TextDecoration;
}

// ============================================
// Library Types
// ============================================

export interface Library {
  name: string;
  fills: LibraryStyle[];
  text: LibraryTextStyle[];
  effects: LibraryEffectStyle[];
  strokes?: LibraryStyle[];
  styles?: number;
}

export interface LibraryStyle {
  id: string;
  name: string;
  key?: string;
  paint?: Paint;
  count?: number;
  consumers?: SceneNode[];
  groupedConsumers?: Record<string, string[]>;
  fillColor?: string;
}

export interface LibraryTextStyle {
  id: string;
  name: string;
  key?: string;
  style: TextStyleProperties;
  count?: number;
  consumers?: SceneNode[];
  groupedConsumers?: Record<string, string[]>;
  description?: string;
}

export interface LibraryEffectStyle {
  id: string;
  name: string;
  key?: string;
  effects: readonly Effect[];
  count?: number;
  consumers?: SceneNode[];
  groupedConsumers?: Record<string, string[]>;
}

// ============================================
// Remote Styles Types
// ============================================

export interface RemoteStyles {
  name: string;
  fills: RemoteFillStyle[];
  strokes: RemoteStrokeStyle[];
  text: RemoteTextStyle[];
  effects: RemoteEffectStyle[];
}

export interface RemoteFillStyle {
  id: string | symbol;
  type: "fill";
  paint: Paint;
  name: string;
  count: number;
  consumers: SceneNode[];
  fillColor: string | null;
  groupedConsumers?: Record<string, string[]>;
}

export interface RemoteStrokeStyle {
  id: string | symbol;
  type: "stroke";
  paint: Paint;
  name: string;
  count: number;
  consumers: SceneNode[];
  fillColor: string | null;
  groupedConsumers?: Record<string, string[]>;
}

export interface RemoteTextStyle {
  id: string | symbol;
  type: "text";
  name: string;
  description: string;
  key: string;
  count: number;
  consumers: SceneNode[];
  style: TextStyleProperties;
  groupedConsumers?: Record<string, string[]>;
}

export interface RemoteEffectStyle {
  id: string | symbol;
  type: "effect";
  effects: readonly Effect[];
  name: string;
  count: number;
  consumers: SceneNode[];
  groupedConsumers?: Record<string, string[]>;
}

// ============================================
// Variables Types
// ============================================

export interface VariablesInUse {
  name: string;
  variables: VariableData[];
}

export interface VariableData {
  id: string;
  resolvedType: string;
  type: string;
  name: string;
  description: string;
  key: string;
  count: number;
  collectionId: string;
  valuesByMode: Record<string, unknown>;
  consumers: SceneNode[];
  value: string;
  cssSyntax: string | null;
  groupedConsumers?: Record<string, string[]>;
}

// ============================================
// Message Types (Plugin <-> UI Communication)
// ============================================

export type PluginMessageType =
  | "close"
  | "step-2"
  | "step-3"
  | "fetch-layer-data"
  | "update-errors"
  | "update-styles-page"
  | "notify-user"
  | "update-storage"
  | "update-storage-from-settings"
  | "update-active-page-in-settings"
  | "update-lint-rules-from-settings"
  | "update-border-radius"
  | "reset-border-radius"
  | "apply-styles"
  | "select-multiple-layers"
  | "create-style"
  | "find-local-styles"
  | "save-library"
  | "remove-library"
  | "run-app"
  | "update-lint-config"
  | "export-lint-report"
  | "batch-fix-errors"
  | "ai-rename-layers"
  | "ai-design-review"
  | "ai-component-suggestions"
  | "request-rich-context";

export interface PluginMessage {
  type: PluginMessageType;
  id?: string;
  message?: string;
  nodeArray?: string[];
  libraries?: Library[];
  storageArray?: LintError[];
  page?: string;
  boolean?: boolean;
  radiusValues?: string | number[];
  error?: BulkError;
  field?: "matches" | "suggestions";
  index?: number;
  count?: number;
  title?: string;
  lintVectors?: boolean;
  selection?: "user" | "page";
  config?: Partial<LintRuleConfig>;
  errors?: BulkError[];
  prompt?: string;
}

export interface BulkError extends LintError {
  nodes: string[];
  count: number;
}

// ============================================
// UI State Types
// ============================================

export interface IgnoredError {
  node: { id: string };
  value: string;
  type: string;
}

export type ActivePage = "page" | "layers" | "library" | "styles" | "variables";

// ============================================
// Utility Types
// ============================================

export interface ColorObject {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// ============================================
// Lint Configuration Types
// ============================================

export interface LintRuleConfig {
  enableColorCheck: boolean;
  enableTypographyCheck: boolean;
  enableSpacingCheck: boolean;
  enableComponentCheck: boolean;
  enableNamingCheck: boolean;
  enableNestingCheck: boolean;
  enableFixedDimensionsCheck: boolean;
  enableTouchTargetCheck: boolean;
  enableEmptyFrameCheck: boolean;
  enableDetachedInstanceCheck: boolean;
  enableIconSizeCheck: boolean;
  allowedSpacingValues: number[];
  allowedIconSizes: number[];
  minTouchTargetSize: number;
  maxAutoLayoutNestingDepth: number;
}

// ============================================
// AI/Ollama Types
// ============================================

export interface OllamaRequest {
  id: string;
  type: "rename" | "review" | "suggestions";
  status: "pending" | "processing" | "completed" | "error";
  prompt: string;
  result?: string;
  error?: string;
}

export interface AIRenameResult {
  nodeId: string;
  originalName: string;
  suggestedName: string;
}

export interface AIDesignReviewResult {
  summary: string;
  issues: Array<{
    severity: ErrorSeverity;
    message: string;
    suggestion?: string;
  }>;
  score: number;
}

// ============================================
// Rich Design Context Types (for AI analysis)
// ============================================

export interface RichLayerContext {
  id: string;
  name: string;
  type: string;
  // Dimensions
  width: number;
  height: number;
  x: number;
  y: number;
  // Hierarchy
  parentName: string | null;
  parentType: string | null;
  depth: number;
  childCount: number;
  siblingIndex: number;
  siblingCount: number;
  // Auto-layout
  isAutoLayout: boolean;
  autoLayoutDirection?: "HORIZONTAL" | "VERTICAL" | "NONE";
  autoLayoutGap?: number;
  autoLayoutPadding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  autoLayoutAlign?: string;
  // Constraints
  constraintsHorizontal?: string;
  constraintsVertical?: string;
  // Component info
  isComponent: boolean;
  isInstance: boolean;
  mainComponentName?: string;
  variantProperties?: Record<string, string>;
  // Styles
  hasFillStyle: boolean;
  hasTextStyle: boolean;
  hasEffectStyle: boolean;
  hasStrokeStyle: boolean;
  fillStyleName?: string;
  textStyleName?: string;
  effectStyleName?: string;
  // Visual properties
  opacity: number;
  blendMode?: string;
  visible: boolean;
  locked: boolean;
  // Variables
  boundVariables: Array<{
    property: string;
    variableName: string;
    variableCollection: string;
  }>;
  // Text-specific (if text node)
  textContent?: string;
  fontSize?: number;
  fontFamily?: string;
  // Fill info
  fillCount: number;
  primaryFillType?: string;
  primaryFillColor?: string;
  // Stroke info
  strokeCount: number;
  strokeWeight?: number;
  // Effects
  effectCount: number;
  effectTypes?: string[];
  // Corner radius
  cornerRadius?: number | "mixed";
}

export interface RichDesignContext {
  // Selection info
  selectionCount: number;
  selectionTypes: Record<string, number>;
  // Page info
  pageName: string;
  pageChildCount: number;
  // Document-level
  documentColorStyles: number;
  documentTextStyles: number;
  documentEffectStyles: number;
  documentComponents: number;
  // Layer details
  layers: RichLayerContext[];
  // Component usage
  componentUsage: Array<{
    name: string;
    instanceCount: number;
    isLocal: boolean;
  }>;
  // Style usage summary
  styleUsage: {
    fills: Array<{ name: string; count: number }>;
    text: Array<{ name: string; count: number }>;
    effects: Array<{ name: string; count: number }>;
  };
  // Variable usage
  variableUsage: Array<{
    name: string;
    collection: string;
    count: number;
    type: string;
  }>;
  // Common patterns detected
  patterns: {
    commonSpacingValues: number[];
    commonCornerRadii: number[];
    commonFontSizes: number[];
    autoLayoutUsagePercent: number;
    componentUsagePercent: number;
    styleAdherencePercent: number;
  };
}
