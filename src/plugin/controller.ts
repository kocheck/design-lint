import {
  checkRadius,
  newCheckStrokes,
  checkType,
  newCheckFills,
  newCheckEffects,
  determineFill,
  gradientToCSS,
  updateLintConfig,
  // customCheckTextFills,
  // uncomment this as an example of a custom lint function ^
  // ========== CUSTOM LINT RULES - BreakLine Design System ==========
  checkTextColorUsage,
  checkTextStyleCompliance,
  checkSpacingValues,
  checkComponentUsage,
  checkNamingConventions,
  checkAutoLayoutNesting,
  checkFixedDimensions,
  checkTouchTargetSize,
  checkEmptyFrames,
  checkDetachedInstances,
  checkIconSize,
} from "./lintingFunctions";

import { fetchRemoteStyles, groupLibrary } from "./remoteStyleFunctions";

import {
  getLocalPaintStyles,
  getLocalTextStyles,
  getLocalEffectStyles,
} from "./styles";

import type {
  Library,
  RemoteStyles,
  RemoteFillStyle,
  RemoteStrokeStyle,
  RemoteTextStyle,
  RemoteEffectStyle,
  VariablesInUse,
  VariableData,
  NodeWithErrors,
  LintError,
  BulkError,
  RichLayerContext,
  RichDesignContext,
} from "../types";

figma.showUI(__html__, {
  width: 420,
  height: 580,
  themeColors: true // Enables native resize handles
});

let borderRadiusArray = [0, 2, 4, 8, 16, 24, 32];
let originalNodeTree: readonly SceneNode[] = [];
let lintVectors = false;
let localStylesLibrary: Library = {
  name: "Local Styles",
  fills: [],
  text: [],
  effects: [],
  styles: 0,
};

// Styles used in our page
const usedRemoteStyles: RemoteStyles = {
  name: "Remote Styles",
  fills: [],
  strokes: [],
  text: [],
  effects: [],
};

// Variables object we'll use for storing all the variables
// found in our page.
const variablesInUse: VariablesInUse = {
  name: "Variables",
  variables: [],
};

let colorVariables: VariableData[] | undefined;
let numbervariables: VariableData[] | undefined;
let variablesWithGroupedConsumers:
  | VariablesInUse
  | Record<string, unknown>
  | undefined;

// Performance: Skip invisible instance children
figma.skipInvisibleInstanceChildren = true;

// Performance: Chunk size for async operations to prevent UI freezing
const CHUNK_SIZE = 50;
const YIELD_INTERVAL_MS = 1;

// Function to generate a UUID
// This way we can store ignored errors per document rather than
// sharing ignored errors across all documents.
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c: string): string {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}

function getDocumentUUID(): string {
  // Try to get the UUID from the document's plugin data
  let uuid = figma.root.getPluginData("documentUUID");

  // If the UUID does not exist (empty string), generate a new one and store it
  if (!uuid) {
    uuid = generateUUID();
    figma.root.setPluginData("documentUUID", uuid);
  }

  return uuid;
}

// Set the unique ID we use for client storage.
const documentUUID = getDocumentUUID();

// ============================================
// Rich Design Context Gathering for AI
// ============================================

async function gatherRichDesignContext(
  nodeIds: string[],
): Promise<RichDesignContext> {
  const layers: RichLayerContext[] = [];
  const componentUsageMap = new Map<
    string,
    { name: string; instanceCount: number; isLocal: boolean }
  >();
  const styleUsageMap = {
    fills: new Map<string, number>(),
    text: new Map<string, number>(),
    effects: new Map<string, number>(),
  };
  const variableUsageMap = new Map<
    string,
    { name: string; collection: string; count: number; type: string }
  >();
  const spacingValues = new Set<number>();
  const cornerRadii = new Set<number>();
  const fontSizes = new Set<number>();
  let autoLayoutCount = 0;
  let componentCount = 0;
  let styledCount = 0;
  let totalNodes = 0;

  // Get nodes to analyze - either specified nodes or current selection
  let nodesToAnalyze: SceneNode[] = [];
  if (nodeIds && nodeIds.length > 0) {
    for (const id of nodeIds) {
      const node = await figma.getNodeByIdAsync(id);
      if (node && "id" in node) {
        nodesToAnalyze.push(node as SceneNode);
      }
    }
  } else {
    nodesToAnalyze = [...figma.currentPage.selection];
  }

  // Helper to get node depth
  function getNodeDepth(node: SceneNode): number {
    let depth = 0;
    let current: BaseNode | null = node.parent;
    while (current && current.type !== "PAGE") {
      depth++;
      current = current.parent;
    }
    return depth;
  }

  // Helper to get sibling info
  function getSiblingInfo(node: SceneNode): { index: number; count: number } {
    const parent = node.parent;
    if (parent && "children" in parent) {
      const children = parent.children;
      const index = children.indexOf(node);
      return { index, count: children.length };
    }
    return { index: 0, count: 1 };
  }

  // Helper to extract color from fill
  function getFillColor(fills: readonly Paint[] | symbol): string | undefined {
    if (typeof fills === "symbol" || !fills.length) return undefined;
    const fill = fills[0];
    if (fill.type === "SOLID") {
      const r = Math.round(fill.color.r * 255);
      const g = Math.round(fill.color.g * 255);
      const b = Math.round(fill.color.b * 255);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
    return fill.type;
  }

  // Process each node recursively
  async function processNode(
    node: SceneNode,
    depth: number = 0,
  ): Promise<void> {
    totalNodes++;
    const siblingInfo = getSiblingInfo(node);

    // Build rich layer context
    const layerContext: RichLayerContext = {
      id: node.id,
      name: node.name,
      type: node.type,
      width: "width" in node ? node.width : 0,
      height: "height" in node ? node.height : 0,
      x: "x" in node ? node.x : 0,
      y: "y" in node ? node.y : 0,
      parentName:
        node.parent && "name" in node.parent ? node.parent.name : null,
      parentType: node.parent ? node.parent.type : null,
      depth: depth,
      childCount:
        "children" in node ? (node as ChildrenMixin).children.length : 0,
      siblingIndex: siblingInfo.index,
      siblingCount: siblingInfo.count,
      isAutoLayout: false,
      isComponent: node.type === "COMPONENT" || node.type === "COMPONENT_SET",
      isInstance: node.type === "INSTANCE",
      hasFillStyle: false,
      hasTextStyle: false,
      hasEffectStyle: false,
      hasStrokeStyle: false,
      opacity: "opacity" in node ? node.opacity : 1,
      visible: node.visible,
      locked: node.locked,
      boundVariables: [],
      fillCount: 0,
      strokeCount: 0,
      effectCount: 0,
    };

    // Auto-layout info
    if ("layoutMode" in node && node.layoutMode !== "NONE") {
      layerContext.isAutoLayout = true;
      layerContext.autoLayoutDirection = node.layoutMode as
        | "HORIZONTAL"
        | "VERTICAL";
      layerContext.autoLayoutGap = node.itemSpacing;
      layerContext.autoLayoutPadding = {
        top: node.paddingTop,
        right: node.paddingRight,
        bottom: node.paddingBottom,
        left: node.paddingLeft,
      };
      layerContext.autoLayoutAlign = node.primaryAxisAlignItems;
      autoLayoutCount++;

      // Track spacing values
      if (node.itemSpacing > 0) spacingValues.add(node.itemSpacing);
      if (node.paddingTop > 0) spacingValues.add(node.paddingTop);
      if (node.paddingRight > 0) spacingValues.add(node.paddingRight);
      if (node.paddingBottom > 0) spacingValues.add(node.paddingBottom);
      if (node.paddingLeft > 0) spacingValues.add(node.paddingLeft);
    }

    // Constraints
    if ("constraints" in node) {
      layerContext.constraintsHorizontal = node.constraints.horizontal;
      layerContext.constraintsVertical = node.constraints.vertical;
    }

    // Component/Instance info
    if (node.type === "INSTANCE") {
      const mainComponent = node.mainComponent;
      if (mainComponent) {
        layerContext.mainComponentName = mainComponent.name;
        componentCount++;

        // Track component usage
        const existing = componentUsageMap.get(mainComponent.id);
        if (existing) {
          existing.instanceCount++;
        } else {
          componentUsageMap.set(mainComponent.id, {
            name: mainComponent.name,
            instanceCount: 1,
            isLocal: mainComponent.parent?.type !== "DOCUMENT",
          });
        }
      }
    }

    // Variant properties
    if (
      node.type === "INSTANCE" &&
      "variantProperties" in node &&
      node.variantProperties
    ) {
      layerContext.variantProperties = node.variantProperties as Record<
        string,
        string
      >;
    }

    // Fill styles
    if ("fillStyleId" in node && node.fillStyleId) {
      const styleId = node.fillStyleId;
      if (typeof styleId === "string") {
        layerContext.hasFillStyle = true;
        styledCount++;
        const style = await figma.getStyleByIdAsync(styleId);
        if (style) {
          layerContext.fillStyleName = style.name;
          styleUsageMap.fills.set(
            style.name,
            (styleUsageMap.fills.get(style.name) || 0) + 1,
          );
        }
      }
    }

    // Text styles
    if (node.type === "TEXT" && "textStyleId" in node && node.textStyleId) {
      const styleId = node.textStyleId;
      if (typeof styleId === "string") {
        layerContext.hasTextStyle = true;
        styledCount++;
        const style = await figma.getStyleByIdAsync(styleId);
        if (style) {
          layerContext.textStyleName = style.name;
          styleUsageMap.text.set(
            style.name,
            (styleUsageMap.text.get(style.name) || 0) + 1,
          );
        }
      }
    }

    // Effect styles
    if ("effectStyleId" in node && node.effectStyleId) {
      const styleId = node.effectStyleId;
      if (typeof styleId === "string") {
        layerContext.hasEffectStyle = true;
        const style = await figma.getStyleByIdAsync(styleId);
        if (style) {
          layerContext.effectStyleName = style.name;
          styleUsageMap.effects.set(
            style.name,
            (styleUsageMap.effects.get(style.name) || 0) + 1,
          );
        }
      }
    }

    // Stroke styles
    if ("strokeStyleId" in node && node.strokeStyleId) {
      const styleId = node.strokeStyleId;
      if (typeof styleId === "string") {
        layerContext.hasStrokeStyle = true;
      }
    }

    // Blend mode
    if ("blendMode" in node) {
      layerContext.blendMode = node.blendMode;
    }

    // Text-specific properties
    if (node.type === "TEXT") {
      layerContext.textContent = node.characters.substring(0, 100); // Truncate for size
      if (typeof node.fontSize === "number") {
        layerContext.fontSize = node.fontSize;
        fontSizes.add(node.fontSize);
      }
      if (node.fontName && typeof node.fontName !== "symbol") {
        layerContext.fontFamily = node.fontName.family;
      }
    }

    // Fill info
    if ("fills" in node) {
      const fills = node.fills;
      if (typeof fills !== "symbol") {
        layerContext.fillCount = fills.length;
        if (fills.length > 0) {
          layerContext.primaryFillType = fills[0].type;
          layerContext.primaryFillColor = getFillColor(fills);
        }
      }
    }

    // Stroke info
    if ("strokes" in node) {
      const strokes = node.strokes;
      layerContext.strokeCount = strokes.length;
      if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
        layerContext.strokeWeight = node.strokeWeight;
      }
    }

    // Effects
    if ("effects" in node) {
      layerContext.effectCount = node.effects.length;
      if (node.effects.length > 0) {
        layerContext.effectTypes = node.effects.map((e) => e.type);
      }
    }

    // Corner radius
    if ("cornerRadius" in node) {
      if (typeof node.cornerRadius === "number") {
        layerContext.cornerRadius = node.cornerRadius;
        if (node.cornerRadius > 0) cornerRadii.add(node.cornerRadius);
      } else {
        layerContext.cornerRadius = "mixed";
      }
    }

    // Bound variables
    if ("boundVariables" in node && node.boundVariables) {
      const boundVars = node.boundVariables as Record<string, any>;
      for (const [property, binding] of Object.entries(boundVars)) {
        if (binding) {
          const varId = Array.isArray(binding) ? binding[0]?.id : binding.id;
          if (varId) {
            try {
              const variable =
                await figma.variables.getVariableByIdAsync(varId);
              if (variable) {
                const collection =
                  await figma.variables.getVariableCollectionByIdAsync(
                    variable.variableCollectionId,
                  );
                layerContext.boundVariables.push({
                  property,
                  variableName: variable.name,
                  variableCollection: collection?.name || "Unknown",
                });

                // Track variable usage
                const existing = variableUsageMap.get(varId);
                if (existing) {
                  existing.count++;
                } else {
                  variableUsageMap.set(varId, {
                    name: variable.name,
                    collection: collection?.name || "Unknown",
                    count: 1,
                    type: variable.resolvedType,
                  });
                }
              }
            } catch {
              // Variable might not be accessible
            }
          }
        }
      }
    }

    layers.push(layerContext);

    // Process children (limit depth to prevent too much data)
    if ("children" in node && depth < 5) {
      for (const child of (node as ChildrenMixin).children) {
        await processNode(child, depth + 1);
      }
    }
  }

  // Process all nodes
  for (const node of nodesToAnalyze) {
    await processNode(node, 0);
  }

  // Get document-level stats
  const localPaintStyles = await figma.getLocalPaintStylesAsync();
  const localTextStyles = await figma.getLocalTextStylesAsync();
  const localEffectStyles = await figma.getLocalEffectStylesAsync();
  const localComponents = await figma.currentPage.findAllWithCriteria({
    types: ["COMPONENT"],
  });

  // Build selection type counts
  const selectionTypes: Record<string, number> = {};
  for (const layer of layers) {
    selectionTypes[layer.type] = (selectionTypes[layer.type] || 0) + 1;
  }

  // Build the rich context object
  const richContext: RichDesignContext = {
    selectionCount: nodesToAnalyze.length,
    selectionTypes,
    pageName: figma.currentPage.name,
    pageChildCount: figma.currentPage.children.length,
    documentColorStyles: localPaintStyles.length,
    documentTextStyles: localTextStyles.length,
    documentEffectStyles: localEffectStyles.length,
    documentComponents: localComponents.length,
    layers: layers.slice(0, 50), // Limit to 50 layers for token efficiency
    componentUsage: Array.from(componentUsageMap.values()),
    styleUsage: {
      fills: Array.from(styleUsageMap.fills.entries()).map(([name, count]) => ({
        name,
        count,
      })),
      text: Array.from(styleUsageMap.text.entries()).map(([name, count]) => ({
        name,
        count,
      })),
      effects: Array.from(styleUsageMap.effects.entries()).map(
        ([name, count]) => ({ name, count }),
      ),
    },
    variableUsage: Array.from(variableUsageMap.values()),
    patterns: {
      commonSpacingValues: Array.from(spacingValues)
        .sort((a, b) => a - b)
        .slice(0, 10),
      commonCornerRadii: Array.from(cornerRadii)
        .sort((a, b) => a - b)
        .slice(0, 10),
      commonFontSizes: Array.from(fontSizes)
        .sort((a, b) => a - b)
        .slice(0, 10),
      autoLayoutUsagePercent:
        totalNodes > 0 ? Math.round((autoLayoutCount / totalNodes) * 100) : 0,
      componentUsagePercent:
        totalNodes > 0 ? Math.round((componentCount / totalNodes) * 100) : 0,
      styleAdherencePercent:
        totalNodes > 0 ? Math.round((styledCount / totalNodes) * 100) : 0,
    },
  };

  return richContext;
}

figma.on("documentchange", (_event: DocumentChangeEvent) => {
  // When a change happens in the document
  // send a message to the plugin to look for changes.'
  figma.ui.postMessage({
    type: "change",
  });
});

figma.ui.onmessage = async (msg: Record<string, any>) => {
  if (msg.type === "close") {
    figma.closePlugin();
  }

  if (msg.type === "step-2") {
    const layer = await figma.getNodeByIdAsync(msg.id);

    if (!layer || !("id" in layer)) {
      return;
    }

    const layerArray: SceneNode[] = [];

    // Using figma UI selection and scroll to viewport requires an array.
    layerArray.push(layer as SceneNode);

    // Moves the layer into focus and selects so the user can update it.
    // uncomment the line below if you want to notify something has been selected.
    // figma.notify(`Layer ${layer.name} selected`, { timeout: 750 });
    figma.currentPage.selection = layerArray;
    figma.viewport.scrollAndZoomIntoView(layerArray);

    const layerData = JSON.stringify(layer, [
      "id",
      "name",
      "description",
      "fills",
      "key",
      "type",
      "remote",
      "paints",
      "fontName",
      "fontSize",
      "font",
    ]);

    figma.ui.postMessage({
      type: "step-2-complete",
      message: layerData,
    });
  }

  // Fetch a specific node by ID.
  if (msg.type === "fetch-layer-data") {
    const layer = await figma.getNodeByIdAsync(msg.id);

    if (!layer || !("id" in layer)) {
      return;
    }

    const layerArray: SceneNode[] = [];

    // Using figma UI selection and scroll to viewport requires an array.
    layerArray.push(layer as SceneNode);

    // Moves the layer into focus and selects so the user can update it.
    // uncomment the line below if you want to notify something has been selected.
    // figma.notify(`Layer ${layer.name} selected`, { timeout: 750 });
    figma.currentPage.selection = layerArray;
    figma.viewport.scrollAndZoomIntoView(layerArray);

    const layerData = JSON.stringify(layer, [
      "id",
      "name",
      "description",
      "fills",
      "key",
      "type",
      "remote",
      "paints",
      "fontName",
      "fontSize",
      "font",
    ]);

    figma.ui.postMessage({
      type: "fetched layer",
      message: layerData,
    });
  }

  // Called when an update in the Figma file happens
  // so we can check what changed.
  if (msg.type === "update-errors") {
    figma.ui.postMessage({
      type: "updated errors",
      errors: lint(originalNodeTree, msg.libraries),
    });
  }

  // Used only to update the styles page when its selected.
  async function handleUpdateStylesPage(): Promise<void> {
    const resetRemoteStyles: RemoteStyles = {
      name: "Remote Styles",
      fills: [],
      strokes: [],
      text: [],
      effects: [],
    };

    await fetchRemoteStyles(resetRemoteStyles);

    const libraryWithGroupedConsumers = groupLibrary(resetRemoteStyles) as {
      fills: Array<{ name: string }>;
      text: Array<{ name: string }>;
      strokes: Array<{ name: string }>;
      effects: Array<{ name: string }>;
    };

    libraryWithGroupedConsumers.fills.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    libraryWithGroupedConsumers.text.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    libraryWithGroupedConsumers.strokes.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    libraryWithGroupedConsumers.effects.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    figma.ui.postMessage({
      type: "remote-styles-imported",
      message: libraryWithGroupedConsumers,
    });
  }

  // Updates all the styles listed on the styles page.
  if (msg.type === "update-styles-page") {
    handleUpdateStylesPage();
  }

  // Notify the user of an issue.
  if (msg.type === "notify-user") {
    figma.notify(msg.message, { timeout: 1000 });
  }

  // Updates client storage with a new ignored error
  // when the user selects "ignore" from the context menu
  if (msg.type === "update-storage") {
    const arrayToBeStored = JSON.stringify(msg.storageArray);
    figma.clientStorage.setAsync(documentUUID, arrayToBeStored);
  }

  // Clears all ignored errors
  // invoked from the settings menu
  if (msg.type === "update-storage-from-settings") {
    const arrayToBeStored = JSON.stringify(msg.storageArray);
    figma.clientStorage.setAsync(documentUUID, arrayToBeStored);

    figma.ui.postMessage({
      type: "reset storage",
      storage: arrayToBeStored,
    });

    figma.notify("Cleared ignored errors", { timeout: 1000 });
  }

  // Remembers the last tab selected in the UI and sets it
  // to be active (layers vs error by category view)
  if (msg.type === "update-active-page-in-settings") {
    const pageToBeStored = JSON.stringify(msg.page);
    figma.clientStorage.setAsync("storedActivePage", pageToBeStored);
  }

  // Changes the linting rules, invoked from the settings menu
  if (msg.type === "update-lint-rules-from-settings") {
    lintVectors = msg.boolean;
  }

  // Updates the custom lint rules configuration
  if (msg.type === "update-lint-config") {
    if (msg.config) {
      updateLintConfig(msg.config);

      // Save to client storage for persistence
      const configToStore = JSON.stringify(msg.config);
      figma.clientStorage.setAsync("lintRuleConfig", configToStore);

      figma.notify("Lint rules configuration saved", { timeout: 1000 });

      // Let the UI know the config was updated
      figma.ui.postMessage({
        type: "lint-config-updated",
        config: msg.config,
      });
    }
  }

  // Rename a layer (AI-assisted)
  if (msg.type === "rename-layer") {
    (async function () {
      const node = await figma.getNodeByIdAsync(msg.id);
      if (node && "name" in node) {
        node.name = msg.name;
      }
    })();
  }

  // Request rich design context for AI analysis
  if (msg.type === "request-rich-context") {
    (async function () {
      const richContext = await gatherRichDesignContext(msg.nodeIds || []);
      figma.ui.postMessage({
        type: "rich-context-response",
        context: richContext,
      });
    })();
  }

  // For when the user updates the border radius values to lint from the settings menu.
  if (msg.type === "update-border-radius") {
    let newRadiusArray = null;
    if (typeof msg.radiusValues === "string") {
      const newString = msg.radiusValues.replace(/\s+/g, "");
      newRadiusArray = newString.split(",");
      newRadiusArray = newRadiusArray
        .filter((x: string) => x.trim().length && !isNaN(Number(x)))
        .map(Number);

      // Most users won't add 0 to the array of border radius so let's add it in for them.
      if (newRadiusArray.indexOf(0) === -1) {
        newRadiusArray.unshift(0);
      }
    } else {
      newRadiusArray = msg.radiusValues;
    }

    // Update the array we pass into checkRadius for linting.
    newRadiusArray = newRadiusArray.sort((a: number, b: number) => a - b);
    borderRadiusArray = newRadiusArray;

    // Save this value in client storage.
    const radiusToBeStored = JSON.stringify(borderRadiusArray);
    figma.clientStorage.setAsync("storedRadiusValues", radiusToBeStored);

    figma.ui.postMessage({
      type: "fetched border radius",
      storage: JSON.stringify(borderRadiusArray),
    });

    figma.notify("Saved border radius, this can be changed in settings", {
      timeout: 1500,
    });
  }

  if (msg.type === "reset-border-radius") {
    borderRadiusArray = [0, 2, 4, 8, 16, 24, 32];
    figma.clientStorage.setAsync("storedRadiusValues", []);

    figma.ui.postMessage({
      type: "fetched border radius",
      storage: JSON.stringify(borderRadiusArray),
    });

    figma.notify("Reset border radius value", { timeout: 1000 });
  }

  // Function to check if a style key exists locally for text layers.
  async function isStyleKeyLocal(styleKey: string): Promise<boolean> {
    const localStyles = await figma.getLocalTextStylesAsync();

    for (const style of localStyles) {
      if (style.key === styleKey) {
        return true;
      }
    }

    return false;
  }

  // Check if a style key exists in use, like local styles but checks remote styles too.
  async function isStyleInUse(styleId: string): Promise<boolean> {
    const style = await figma.getStyleByIdAsync(styleId);
    return style !== null;
  }

  // If a style is local, we can apply it
  function applyLocalStyle(node: TextNode, styleId: string): void {
    // const localStyles = figma.getLocalTextStyles();
    // const style = localStyles.find(style => style.key === styleKey);
    node.textStyleId = styleId;
  }

  // Some styles are remote so we need to import them first.
  async function applyRemoteStyle(
    node: TextNode,
    importedStyle: TextStyle,
  ): Promise<void> {
    try {
      node.textStyleId = importedStyle.id;
    } catch (error) {
      console.error("Error applying remote style:", error);
    }
  }

  // Called from BulkErrorList when updating matching styles
  // or applying suggestion styles.
  if (msg.type === "apply-styles") {
    function applyLocalFillStyle(
      node: MinimalFillsMixin,
      styleId: string,
    ): void {
      node.fillStyleId = styleId;
    }

    function applyLocalStrokeStyle(
      node: MinimalStrokesMixin,
      styleId: string,
    ): void {
      node.strokeStyleId = styleId;
    }

    function applyLocalEffectStyle(node: BlendMixin, styleId: string): void {
      node.effectStyleId = styleId;
    }

    async function applyStylesToNodes(
      field: "matches" | "suggestions",
      index: number,
    ): Promise<void> {
      const styleKey = msg.error[field][index].key;
      const styleId = msg.error[field][index].id;

      if (
        (msg.error.type === "text" && (await isStyleInUse(styleId))) ||
        (msg.error.type === "text" && (await isStyleKeyLocal(styleKey)))
      ) {
        for (const nodeId of msg.error.nodes) {
          const node = await figma.getNodeByIdAsync(nodeId);

          if (node && node.type === "TEXT") {
            applyLocalStyle(node, styleId);
          }
        }
      } else if (
        (msg.error.type === "fill" && (await isStyleInUse(styleId))) ||
        (msg.error.type === "fill" && (await isStyleKeyLocal(styleKey)))
      ) {
        for (const nodeId of msg.error.nodes) {
          const node = await figma.getNodeByIdAsync(nodeId);

          if (node && "fillStyleId" in node) {
            applyLocalFillStyle(node as MinimalFillsMixin, styleId);
          }
        }
      } else if (
        (msg.error.type === "stroke" && (await isStyleInUse(styleId))) ||
        (msg.error.type === "stroke" && (await isStyleKeyLocal(styleKey)))
      ) {
        for (const nodeId of msg.error.nodes) {
          const node = await figma.getNodeByIdAsync(nodeId);

          if (node && "strokeStyleId" in node) {
            applyLocalStrokeStyle(node as MinimalStrokesMixin, styleId);
          }
        }
      } else if (
        (msg.error.type === "effects" && (await isStyleInUse(styleId))) ||
        (msg.error.type === "effects" && (await isStyleKeyLocal(styleKey)))
      ) {
        for (const nodeId of msg.error.nodes) {
          const node = await figma.getNodeByIdAsync(nodeId);

          if (node && "effectStyleId" in node) {
            applyLocalEffectStyle(node as BlendMixin, styleId);
          }
        }
      } else {
        // Import the remote style
        let importedStyle: BaseStyle | null = null;
        try {
          importedStyle = await figma.importStyleByKeyAsync(styleKey);
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            !error.message.includes("Cannot find style")
          ) {
            console.error("Error importing style:", error);
          }
        }

        // Apply the imported style to all layers
        if (importedStyle) {
          const batchSize = 10;
          for (let i = 0; i < msg.error.nodes.length; i += batchSize) {
            const batch = msg.error.nodes.slice(i, i + batchSize);
            for (const nodeId of batch) {
              const node = await figma.getNodeByIdAsync(nodeId);

              if (
                node &&
                node.type === "TEXT" &&
                msg.error.type === "text" &&
                importedStyle.type === "TEXT"
              ) {
                await applyRemoteStyle(node, importedStyle as TextStyle);
              } else if (
                node &&
                msg.error.type === "fill" &&
                "setFillStyleIdAsync" in node
              ) {
                await (node as MinimalFillsMixin).setFillStyleIdAsync(
                  importedStyle.id,
                );
              } else if (
                node &&
                msg.error.type === "stroke" &&
                "setStrokeStyleIdAsync" in node
              ) {
                await (node as MinimalStrokesMixin).setStrokeStyleIdAsync(
                  importedStyle.id,
                );
              }
            }
            await delay(3);
          }
        }
      }
    }
    ``;
    // we pass in suggestions or messages as fields
    // index is which of the multiple styles they chose from in the suggestions array.
    applyStylesToNodes(msg.field, msg.index);
    figma.notify(`Fixed ${msg.count} missing ${msg.error.type} styles`, {
      timeout: 500,
    });
  }

  if (msg.type === "select-multiple-layers") {
    const layerArray: string[] = msg.nodeArray;

    // Use Promise.all to properly await all async node lookups
    const nodesToBeSelected = (
      await Promise.all(
        layerArray.map(async (item: string) => {
          const layer = await figma.getNodeByIdAsync(item);
          return layer as SceneNode;
        }),
      )
    ).filter((node): node is SceneNode => node !== null);

    // Moves the layer into focus and selects so the user can update it.
    figma.currentPage.selection = nodesToBeSelected;
    figma.viewport.scrollAndZoomIntoView(nodesToBeSelected);
    figma.notify(`${nodesToBeSelected.length} layers selected`, {
      timeout: 750,
    });
  }

  async function createPaintStyleFromNode(
    node: MinimalFillsMixin & SceneNode,
    nodeArray: string[],
    title: string,
  ): Promise<void> {
    // Check if the node has at least one fill
    if (node.fills && node.fills !== figma.mixed && node.fills.length > 0) {
      // Get the first fill of the node
      const fill = node.fills[0];
      const currentFill = determineFill(node.fills);

      // Create a new paint style based on the fill properties of the node
      const newPaintStyle = figma.createPaintStyle();

      // Set the name and paint of the new paint style
      if (title !== "") {
        newPaintStyle.name = title;
      } else {
        newPaintStyle.name = `New Fill - ${currentFill}`;
      }

      newPaintStyle.paints = [fill];

      // Apply the new style to all of the layers the error exists on
      for (const nodeId of nodeArray) {
        const layer = await figma.getNodeByIdAsync(nodeId);
        if (layer && "setFillStyleIdAsync" in layer) {
          await (layer as MinimalFillsMixin).setFillStyleIdAsync(
            newPaintStyle.id,
          );
        }
      }

      // Notify the user that the paint style has been created and applied
      figma.notify(
        `Fill style created and applied to ${nodeArray.length} layers`,
      );
    }
  }

  function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(value * multiplier) / multiplier;
  }

  async function createStrokeStyleFromNode(
    node: MinimalStrokesMixin & SceneNode,
    nodeArray: string[],
    title: string,
  ): Promise<void> {
    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];

      const newStrokeStyle = figma.createPaintStyle();

      newStrokeStyle.name = "New Stroke Style";

      if (title !== "") {
        newStrokeStyle.name = title;
      } else {
        newStrokeStyle.name = "New Stroke Style";
      }

      newStrokeStyle.paints = [stroke];

      // Apply the new style to all of the layers the error exists on
      for (const nodeId of nodeArray) {
        const layer = await figma.getNodeByIdAsync(nodeId);
        if (layer && "setStrokeStyleIdAsync" in layer) {
          await (layer as MinimalStrokesMixin).setStrokeStyleIdAsync(
            newStrokeStyle.id,
          );
        }
      }

      figma.notify(
        `Stroke style created and applied to ${nodeArray.length} layers`,
      );
    }
  }

  async function createEffectStyleFromNode(
    node: BlendMixin & SceneNode,
    nodeArray: string[],
    title: string,
  ): Promise<void> {
    // Check if the node has at least one effect
    if (node.effects && node.effects.length > 0) {
      // Get the effects of the node
      const effects = node.effects;

      let effectType: string = node.effects[0].type;
      if (effectType === "DROP_SHADOW") {
        effectType = "Drop Shadow";
      } else if (effectType === "INNER_SHADOW") {
        effectType = "Inner Shadow";
      } else if (effectType === "LAYER_BLUR") {
        effectType = "Layer Blur";
      } else {
        effectType = "Background Blur";
      }

      const effectRadius = (
        node.effects[0] as DropShadowEffect | InnerShadowEffect | BlurEffect
      ).radius;
      const roundedRadius = roundToDecimalPlaces(effectRadius, 1);

      // Create a new effect style based on the effect properties of the node
      const newEffectStyle = figma.createEffectStyle();

      if (title !== "") {
        newEffectStyle.name = title;
      } else {
        newEffectStyle.name = `${effectType} - Radius: ${roundedRadius}`;
      }

      newEffectStyle.effects = effects;

      // Apply the new style to all of the layers the error exists on
      for (const nodeId of nodeArray) {
        const layer = await figma.getNodeByIdAsync(nodeId);
        if (layer && "setEffectStyleIdAsync" in layer) {
          await (layer as BlendMixin).setEffectStyleIdAsync(newEffectStyle.id);
        }
      }

      // Notify the user that the effect style has been created and applied
      figma.notify(
        `Effect style created and applied to ${nodeArray.length} layers`,
      );
    }
  }

  // Utility for creating new text styles from the select menu
  async function createTextStyleFromNode(
    node: TextNode,
    nodeArray: string[],
    title: string,
  ): Promise<void> {
    if (node.type === "TEXT") {
      // // Load the font used in the text node
      // await figma.loadFontAsync(node.fontName);

      try {
        await figma.loadFontAsync(node.fontName as FontName);
      } catch (error) {
        figma.notify(
          `Couldn't create a style because the following font isn't available: ${(node.fontName as FontName).family}`,
        );
        return;
      }

      // Get the properties of the text node
      const textStyle = {
        fontFamily: (node.fontName as FontName).family,
        fontStyle: (node.fontName as FontName).style,
        fontSize: node.fontSize as number,
        letterSpacing: node.letterSpacing as LetterSpacing,
        lineHeight: node.lineHeight as LineHeight,
        paragraphIndent: node.paragraphIndent as number,
        paragraphSpacing: node.paragraphSpacing as number,
        textCase: node.textCase as TextCase,
        textDecoration: node.textDecoration as TextDecoration,
      };

      // Create a new text style based on the properties of the text node
      const newTextStyle = figma.createTextStyle();

      if (title !== "") {
        newTextStyle.name = title;
      } else {
        newTextStyle.name = `${textStyle.fontFamily} ${textStyle.fontStyle}`;
      }

      newTextStyle.fontName = {
        family: textStyle.fontFamily,
        style: textStyle.fontStyle,
      };
      newTextStyle.fontSize = textStyle.fontSize;
      newTextStyle.letterSpacing = textStyle.letterSpacing;
      newTextStyle.lineHeight = textStyle.lineHeight;
      newTextStyle.paragraphIndent = textStyle.paragraphIndent;
      newTextStyle.paragraphSpacing = textStyle.paragraphSpacing;
      newTextStyle.textCase = textStyle.textCase;
      newTextStyle.textDecoration = textStyle.textDecoration;

      // Apply the new style to all of the layers the error exists on
      for (const textNodeId of nodeArray) {
        const layer = await figma.getNodeByIdAsync(textNodeId);

        if (layer && layer.type === "TEXT") {
          await layer.setTextStyleIdAsync(newTextStyle.id);
        }
      }

      figma.notify(
        `Text style created and applied to ${nodeArray.length} layers`,
      );
    }
  }

  if (msg.type === "create-style") {
    // Grab a node to use so we have properties to create a style
    const node = await figma.getNodeByIdAsync(msg.error.nodes[0]);

    if (!node) {
      return;
    }

    if (msg.error.type === "text" && node.type === "TEXT") {
      createTextStyleFromNode(node as TextNode, msg.error.nodes, msg.title);
    } else if (msg.error.type === "fill" && "fills" in node) {
      createPaintStyleFromNode(
        node as MinimalFillsMixin & SceneNode,
        msg.error.nodes,
        msg.title,
      );
    } else if (msg.error.type === "effects" && "effects" in node) {
      createEffectStyleFromNode(
        node as BlendMixin & SceneNode,
        msg.error.nodes,
        msg.title,
      );
    } else if (msg.error.type === "stroke" && "strokes" in node) {
      createStrokeStyleFromNode(
        node as MinimalStrokesMixin & SceneNode,
        msg.error.nodes,
        msg.title,
      );
    }
  }

  // Serialize nodes to pass back to the UI.
  function serializeNodes(nodes: readonly SceneNode[]): string {
    const serializedNodes = JSON.stringify(nodes, [
      "name",
      "type",
      "children",
      "id",
    ]);

    return serializedNodes;
  }

  function lint(
    nodes: readonly SceneNode[],
    libraries: Library[],
    lockedParentNode: boolean = false,
  ): NodeWithErrors[] {
    const errorArray: NodeWithErrors[] = [];

    // Use a for loop instead of forEach
    for (const node of nodes) {
      // Determine if the layer or its parent is locked.
      const isLayerLocked = lockedParentNode || node.locked;
      const nodeChildren = (node as ChildrenMixin).children;

      // Create a new object.
      const newObject: NodeWithErrors = {
        id: node.id,
        errors: isLayerLocked ? [] : determineType(node, libraries),
        children: [],
      };

      // Check if the node has children.
      if (nodeChildren) {
        // Recursively run this function to flatten out children and grandchildren nodes.
        newObject.children = (node as ChildrenMixin).children.map(
          (childNode: SceneNode) => childNode.id,
        );
        errorArray.push(
          ...lint((node as ChildrenMixin).children, libraries, isLayerLocked),
        );
      }

      errorArray.push(newObject);
    }

    return errorArray;
  }

  // Utility function to yield to the main thread and prevent UI freezing
  async function delay(time: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  // Counter to keep track of the total number of processed nodes
  let nodeCounter = 0;

  async function* lintAsync(
    nodes: readonly SceneNode[],
    libraries: Library[],
    lockedParentNode: boolean = false,
  ): AsyncGenerator<NodeWithErrors[], void, unknown> {
    let errorArray: NodeWithErrors[] = [];

    for (const node of nodes) {
      // Determine if the layer or its parent is locked.
      const isLayerLocked = lockedParentNode || node.locked;

      // Create a new object.
      const newObject: NodeWithErrors = {
        id: node.id,
        errors: isLayerLocked ? [] : determineType(node, libraries),
        children: [],
      };

      // Check if the node has children.
      if ((node as ChildrenMixin).children) {
        // Recursively run this function to flatten out children and grandchildren nodes.
        newObject.children = (node as ChildrenMixin).children.map(
          (childNode: SceneNode) => childNode.id,
        );
        for await (const result of lintAsync(
          (node as ChildrenMixin).children,
          libraries,
          isLayerLocked,
        )) {
          errorArray.push(...result);
        }
      }

      errorArray.push(newObject);

      // Increment the node counter, this is our number of layers total.
      nodeCounter++;
      // console.log(nodeCounter);

      // Yield the result after processing a certain number of nodes
      if (nodeCounter % 1000 === 0) {
        yield errorArray;
        errorArray = [];
        await delay(5);
      }
    }

    // Yield any remaining results
    if (errorArray.length > 0) {
      yield errorArray;
    }
  }

  if (msg.type === "step-3") {
    // Use an async function to handle the asynchronous generator
    async function processLint(): Promise<void> {
      const finalResult: NodeWithErrors[] = [];

      for await (const result of lintAsync(originalNodeTree, msg.libraries)) {
        finalResult.push(...result);
      }

      // Pass the final result back to the UI to be displayed.
      figma.ui.postMessage({
        type: "step-3-complete",
        errors: finalResult,
        message: serializeNodes(originalNodeTree),
      });
    }

    // Start the lint process
    figma.notify(`Design Lint is running and automatically detect changes`, {
      timeout: 1500,
    });

    processLint();
  }

  // Import local styles to use as recommendations
  // This function doesn't save the styles, that's "save-library"
  if (msg.type === "find-local-styles") {
    (async function () {
      const paintStylesData = await getLocalPaintStyles();
      const textStylesData = await getLocalTextStyles();
      const effectStylesData = await getLocalEffectStyles();
      const fileName = figma.root.name;
      const totalStyles =
        effectStylesData.length +
        textStylesData.length +
        paintStylesData.length;

      const localStyles = {
        name: fileName,
        effects: effectStylesData,
        fills: paintStylesData,
        text: textStylesData,
        styles: totalStyles,
      };

      // Send the updated libraries array to the UI layer
      figma.ui.postMessage({
        type: "local-styles-imported",
        message: localStyles,
      });
    })();
  }

  // Saves local styles as a library to use in every file.
  if (msg.type === "save-library") {
    (async function () {
      const paintStylesData = await getLocalPaintStyles();
      const textStylesData = await getLocalTextStyles();
      const effectStylesData = await getLocalEffectStyles();
      const fileName = figma.root.name;
      const totalStyles =
        effectStylesData.length +
        textStylesData.length +
        paintStylesData.length;
      const key = "libraryKey";

      const library = {
        name: fileName,
        effects: effectStylesData,
        fills: paintStylesData,
        text: textStylesData,
        styles: totalStyles,
      };

      // Fetch the stored libraries from client storage
      const storedLibraries = (await figma.clientStorage.getAsync(key)) || [];

      // Check if a library with the same name already exists in the libraries array
      const existingLibraryIndex = storedLibraries.findIndex(
        (storedLibrary: Library) => storedLibrary.name === library.name,
      );

      if (existingLibraryIndex !== -1) {
        // If the library exists, update the existing library
        storedLibraries[existingLibraryIndex] = library;
      } else {
        // If the library doesn't exist, add it to the libraries array
        storedLibraries.push(library);
      }

      // Save the updated libraries array to client storage
      await figma.clientStorage.setAsync(key, storedLibraries);

      // Send the updated libraries array to the UI layer
      figma.ui.postMessage({
        type: "library-imported",
        message: storedLibraries,
      });
    })();
  }

  if (msg.type === "remove-library") {
    figma.clientStorage.setAsync("libraryKey", msg.storageArray);
  }

  // Initialize the app
  if (msg.type === "run-app") {
    if (figma.currentPage.selection.length === 0 && msg.selection === "user") {
      figma.notify(`Select some layers, then try running again!`, {
        timeout: 2000,
      });

      // If the user hasn't selected anything, show the empty state.
      figma.ui.postMessage({
        type: "show-empty-state",
      });

      return;
    } else {
      let nodes: readonly SceneNode[] = [];
      const firstNode: SceneNode[] = [];

      // Determine whether we scan the page for the user,
      // or use their selection
      if (msg.selection === "user") {
        nodes = figma.currentPage.selection;
        firstNode.push(figma.currentPage.selection[0]);
      } else if (msg.selection === "page") {
        nodes = figma.currentPage.children;
        firstNode.push(nodes[0]);
      }

      // Maintain the original tree structure so we can enable
      // refreshing the tree and live updating errors.
      originalNodeTree = nodes;

      // Show the preloader until we're ready to render content.
      figma.ui.postMessage({
        type: "show-preloader",
      });

      // Fetch the ignored errors and libraries from client storage
      const ignoredErrorsPromise = figma.clientStorage.getAsync(documentUUID);
      const librariesPromise = figma.clientStorage.getAsync("libraryKey");

      Promise.all([ignoredErrorsPromise, librariesPromise]).then(
        async ([ignoredErrors, libraries]) => {
          if (ignoredErrors && ignoredErrors.length) {
            figma.ui.postMessage({
              type: "fetched storage",
              storage: ignoredErrors,
            });
          }

          if (libraries && libraries.length) {
            figma.ui.postMessage({
              type: "library-imported-from-storage",
              message: libraries,
            });
          }

          async function findRemoteStyles(): Promise<void> {
            const currentPage = figma.currentPage;

            const nodes = currentPage
              .findAllWithCriteria({
                types: [
                  "TEXT",
                  "FRAME",
                  "COMPONENT",
                  "RECTANGLE",
                  "ELLIPSE",
                  "INSTANCE",
                  "VECTOR",
                  "LINE",
                ],
              })
              .filter((node: SceneNode) => {
                // Check for remote styles
                return (
                  (node as MinimalFillsMixin).fillStyleId ||
                  (node as MinimalStrokesMixin).strokeStyleId ||
                  (node.type === "TEXT" && (node as TextNode).textStyleId) ||
                  (node as BlendMixin).effectStyleId
                );
              });

            // Process nodes in chunks to prevent UI freezing
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];

              // Yield to main thread every CHUNK_SIZE nodes
              if (i > 0 && i % CHUNK_SIZE === 0) {
                await delay(YIELD_INTERVAL_MS);
              }

              if ((node as MinimalFillsMixin).fillStyleId) {
                const styleId = (node as MinimalFillsMixin).fillStyleId;

                if (typeof styleId !== "symbol") {
                  // Check if the style with the given styleId already exists in the usedRemoteStyles.fills array
                  const existingStyle = usedRemoteStyles.fills.find(
                    (style) => style.id === styleId,
                  );

                  if (existingStyle) {
                    // If the style exists, update the count and consumers properties
                    existingStyle.count += 1;
                    existingStyle.consumers.push(node);
                  } else {
                    // If the style does not exist, create a new style object and push it to the usedRemoteStyles.fills array
                    const style = await figma.getStyleByIdAsync(styleId);

                    // Prevents against broken image fills.
                    if (style === null) {
                      return;
                    }

                    const currentFill = determineFill(
                      (node as MinimalFillsMixin).fills as readonly Paint[],
                    );
                    const nodeFillType = (
                      (node as MinimalFillsMixin).fills as readonly Paint[]
                    )[0].type;
                    let cssSyntax = null;

                    if (nodeFillType === "SOLID") {
                      cssSyntax = currentFill;
                    } else if (
                      nodeFillType !== "VIDEO" &&
                      nodeFillType !== "IMAGE" &&
                      nodeFillType !== "PATTERN"
                    ) {
                      cssSyntax = gradientToCSS(
                        (
                          (node as MinimalFillsMixin).fills as readonly Paint[]
                        )[0],
                      );
                    }

                    usedRemoteStyles.fills.push({
                      id: (node as MinimalFillsMixin).fillStyleId,
                      type: "fill",
                      paint: (style as PaintStyle).paints[0],
                      name: style.name,
                      count: 1,
                      consumers: [node],
                      fillColor: cssSyntax,
                    });
                  }
                }
              }

              if ((node as MinimalStrokesMixin).strokeStyleId) {
                const styleId = (node as MinimalStrokesMixin).strokeStyleId;
                if (typeof styleId !== "symbol") {
                  // Check if the stroke style with the given styleId already exists in the usedRemoteStyles.strokes array
                  const existingStyle = usedRemoteStyles.strokes.find(
                    (style) => style.id === styleId,
                  );

                  if (existingStyle) {
                    // If the stroke style exists, update the count and consumers properties
                    existingStyle.count += 1;
                    existingStyle.consumers.push(node);
                  } else {
                    // If the stroke style does not exist, create a new style object and push it to the usedRemoteStyles.strokes array
                    const style = (await figma.getStyleByIdAsync(
                      styleId,
                    )) as PaintStyle | null;
                    if (!style) continue;

                    const nodeFillType = style.paints[0].type;
                    let cssSyntax = null;

                    if (nodeFillType === "SOLID") {
                      cssSyntax = determineFill(style.paints);
                    } else if (
                      nodeFillType !== "IMAGE" &&
                      nodeFillType !== "VIDEO"
                    ) {
                      cssSyntax = gradientToCSS(
                        (
                          (node as MinimalStrokesMixin)
                            .strokes as readonly Paint[]
                        )[0],
                      );
                    }

                    usedRemoteStyles.strokes.push({
                      id: (node as MinimalStrokesMixin).strokeStyleId,
                      type: "stroke",
                      paint: style.paints[0],
                      name: style.name,
                      count: 1,
                      consumers: [node],
                      fillColor: cssSyntax,
                    });
                  }
                }
              }

              if (node.type === "TEXT" && (node as TextNode).textStyleId) {
                const styleId = (node as TextNode).textStyleId;
                if (typeof styleId !== "symbol") {
                  // Check if the text style with the given styleId already exists in the usedRemoteStyles.text array
                  const existingStyle = usedRemoteStyles.text.find(
                    (style) => style.id === styleId,
                  );

                  if (existingStyle) {
                    // If the text style exists, update the count and consumers properties
                    existingStyle.count += 1;
                    existingStyle.consumers.push(node);
                  } else {
                    // If the text style does not exist, create a new style object and push it to the usedRemoteStyles.text array
                    const style = (await figma.getStyleByIdAsync(
                      styleId,
                    )) as TextStyle | null;
                    if (!style) continue;

                    usedRemoteStyles.text.push({
                      id: (node as TextNode).textStyleId,
                      type: "text",
                      name: style.name,
                      description: style.description,
                      key: style.key,
                      count: 1,
                      consumers: [node],
                      style: {
                        fontStyle: style.fontName.style,
                        fontSize: style.fontSize,
                        textDecoration: style.textDecoration,
                        letterSpacing: style.letterSpacing,
                        lineHeight: style.lineHeight,
                        paragraphIndent: style.paragraphIndent,
                        paragraphSpacing: style.paragraphSpacing,
                        fontFamily: style.fontName.family,
                        textCase: style.textCase,
                      },
                    });
                  }
                }
              }

              if ((node as BlendMixin).effectStyleId) {
                const styleId = (node as BlendMixin).effectStyleId;
                if (typeof styleId !== "symbol") {
                  // Check if the effect style with the given styleId already exists in the usedRemoteStyles.effects array
                  const existingStyle = usedRemoteStyles.effects.find(
                    (style) => style.id === styleId,
                  );

                  if (existingStyle) {
                    // If the effect style exists, update the count and consumers properties
                    existingStyle.count += 1;
                    existingStyle.consumers.push(node);
                  } else {
                    // If the effect style does not exist, create a new style object and push it to the usedRemoteStyles.effects array
                    const style = (await figma.getStyleByIdAsync(
                      styleId,
                    )) as EffectStyle | null;
                    if (!style) continue;

                    usedRemoteStyles.effects.push({
                      id: (node as BlendMixin).effectStyleId,
                      type: "effect",
                      effects: style.effects,
                      name: style.name,
                      count: 1,
                      consumers: [node],
                    });
                  }
                }
              }
            }

            // console.log("Remote styles:", usedRemoteStyles);
          }

          await findRemoteStyles();

          const groupConsumersByType = (
            consumers: SceneNode[],
          ): Record<string, string[]> => {
            const groupedConsumers: Record<string, string[]> = {};

            consumers.forEach((consumer: SceneNode) => {
              const nodeType = consumer.type;
              const nodeId = consumer.id;

              if (!groupedConsumers[nodeType]) {
                groupedConsumers[nodeType] = [];
              }

              groupedConsumers[nodeType].push(nodeId);
            });

            return groupedConsumers;
          };

          // Function to apply groupConsumersByType to the global styles library
          const applyGroupingToLibrary = (
            globalStylesLibrary: RemoteStyles,
          ): Record<string, any> => {
            return Object.fromEntries(
              Object.entries(globalStylesLibrary).map(([key, value]) => {
                // Check if the value is an array (i.e., styles)
                if (Array.isArray(value)) {
                  // Apply the groupConsumersByType function to the styles
                  const stylesWithGroupedConsumers = value.map((style: any) => {
                    const groupedConsumers = groupConsumersByType(
                      style.consumers,
                    );
                    return { ...style, groupedConsumers };
                  });
                  return [key, stylesWithGroupedConsumers];
                } else {
                  // For non-array properties, copy the original value
                  return [key, value];
                }
              }),
            );
          };

          // Organize the array alphabtically
          usedRemoteStyles.fills.sort((a, b) => a.name.localeCompare(b.name));
          usedRemoteStyles.text.sort((a, b) => a.name.localeCompare(b.name));
          usedRemoteStyles.strokes.sort((a, b) => a.name.localeCompare(b.name));
          usedRemoteStyles.effects.sort((a, b) => a.name.localeCompare(b.name));

          const libraryWithGroupedConsumers =
            applyGroupingToLibrary(usedRemoteStyles);

          figma.ui.postMessage({
            type: "remote-styles-imported",
            message: libraryWithGroupedConsumers,
          });

          const updateLocalStylesLibrary = async (): Promise<void> => {
            const paintStylesData = await getLocalPaintStyles();
            const textStylesData = await getLocalTextStyles();
            const effectStylesData = await getLocalEffectStyles();
            const totalStyles =
              effectStylesData.length +
              textStylesData.length +
              paintStylesData.length;

            const localStyles: Library = {
              name: "Local Styles",
              effects: effectStylesData,
              fills: paintStylesData,
              text: textStylesData,
              styles: totalStyles,
            };

            // Update the global variable
            localStylesLibrary = localStyles;

            // Send the updated libraries array to the UI layer
            figma.ui.postMessage({
              type: "local-styles-imported",
              message: localStyles,
            });
          };

          // Wait for the localStylesLibrary to be updated
          await updateLocalStylesLibrary();

          // Find all the variables in the page.
          async function findVariables(): Promise<void> {
            const currentPage = figma.currentPage;

            const nodes = currentPage
              .findAllWithCriteria({
                types: [
                  "TEXT",
                  "BOOLEAN_OPERATION",
                  "FRAME",
                  "COMPONENT",
                  "COMPONENT_SET",
                  "GROUP",
                  "SECTION",
                  "STAR",
                  "RECTANGLE",
                  "POLYGON",
                  "ELLIPSE",
                  "INSTANCE",
                  "VECTOR",
                  "LINE",
                ],
              })
              .filter((node: SceneNode) => {
                return (node as any).boundVariables;
              });

            const isNotEmpty = (obj: Record<string, any>): boolean => {
              return Object.keys(obj).length !== 0;
            };

            // Check each node for variables with chunked processing
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];

              // Yield to main thread every CHUNK_SIZE nodes
              if (i > 0 && i % CHUNK_SIZE === 0) {
                await delay(YIELD_INTERVAL_MS);
              }

              // Check to see if the node has any variables being used.
              if (isNotEmpty((node as any).boundVariables)) {
                // console.log(node.boundVariables);

                const boundVariables = (node as any).boundVariables;

                // Loop through all the variables on this node using for...of to properly await
                for (const key of Object.keys(boundVariables)) {
                  const variableObject = boundVariables[key];
                  let variableId: string;
                  let isFill = false;

                  // Some boundVariable objects have slightly different syntax
                  // depending on how they're used, so the variable id may deeper
                  // in the object, so we check for that here.

                  if (key === "fills") {
                    // Use the first fill since variables are only one fill in length.
                    variableId = variableObject[0].id;
                    isFill = true;
                  } else if (key === "componentProperties") {
                    // We may need a loop if components can have multiple properties
                    variableId = variableObject["Has Items"].id;
                  } else {
                    // All other variable types
                    variableId = variableObject.id;
                  }

                  // Check if a variable already exists in the variablesInUse array
                  const existingVariable = variablesInUse.variables.find(
                    (variable) => variable.id === variableId,
                  );

                  if (existingVariable) {
                    // If the variable exists, update the count and consumers properties
                    existingVariable.count += 1;
                    existingVariable.consumers.push(node);
                  } else {
                    try {
                      // If the variable does not exist, create a new variable object and push it to the variablesInUse fills array
                      const variable =
                        await figma.variables.getVariableByIdAsync(variableId);

                      // console.log(variable);

                      if (variable === null) {
                        continue;
                      }

                      const keys = Object.keys(variable.valuesByMode);
                      const firstKey = keys[0];
                      let typeLabel;

                      if (variable.resolvedType === "FLOAT") {
                        typeLabel = "number";
                      } else if (variable.resolvedType === "BOOLEAN") {
                        typeLabel = "boolean";
                      } else if (variable.resolvedType === "STRING") {
                        typeLabel = "string";
                      } else if (variable.resolvedType === "COLOR") {
                        typeLabel = "color";
                      }

                      if (isFill === true) {
                        const nodeWithFills = node as SceneNode & {
                          fills: readonly Paint[] | symbol;
                        };
                        if (typeof nodeWithFills.fills === "symbol") {
                          continue;
                        }
                        const currentFill = determineFill(nodeWithFills.fills);
                        const nodeFillType = nodeWithFills.fills[0].type;
                        let cssSyntax: string | null = null;

                        if (nodeFillType === "SOLID") {
                          cssSyntax = currentFill;
                        } else if (
                          nodeFillType !== "VIDEO" &&
                          nodeFillType !== "IMAGE" &&
                          nodeFillType !== "PATTERN"
                        ) {
                          cssSyntax = gradientToCSS(nodeWithFills.fills[0]);
                        }

                        const capitalizedHexValue = currentFill
                          .toUpperCase()
                          .replace("#", "");

                        variablesInUse.variables.push({
                          id: variableId,
                          resolvedType: variable.resolvedType,
                          type: typeLabel || "unknown",
                          name: variable.name,
                          description: variable.description,
                          key: variable.key,
                          count: 1,
                          collectionId: variable.variableCollectionId,
                          valuesByMode: variable.valuesByMode,
                          consumers: [node],
                          value: capitalizedHexValue,
                          cssSyntax: cssSyntax,
                        });
                      } else {
                        let formattedValue: string;

                        if (variable.valuesByMode[firstKey] === true) {
                          formattedValue = "True";
                        } else if (variable.valuesByMode[firstKey] === false) {
                          formattedValue = "False";
                        } else {
                          formattedValue = String(
                            variable.valuesByMode[firstKey],
                          );
                        }

                        variablesInUse.variables.push({
                          id: variableId,
                          resolvedType: variable.resolvedType,
                          type: typeLabel || "unknown",
                          name: variable.name,
                          description: variable.description,
                          key: variable.key,
                          count: 1,
                          collectionId: variable.variableCollectionId,
                          valuesByMode: variable.valuesByMode,
                          consumers: [node],
                          value: formattedValue,
                          cssSyntax: null,
                        });
                      }
                    } catch (err) {
                      continue;
                    }
                  }
                }
              }
            }
          }

          findVariables().then(() => {
            const groupConsumersByType = (
              consumers: SceneNode[],
            ): Record<string, string[]> => {
              const groupedConsumers: Record<string, string[]> = {};

              consumers.forEach((consumer: SceneNode) => {
                const nodeType = consumer.type;
                const nodeId = consumer.id;

                if (!groupedConsumers[nodeType]) {
                  groupedConsumers[nodeType] = [];
                }

                groupedConsumers[nodeType].push(nodeId);
              });

              return groupedConsumers;
            };

            // Function to apply groupConsumersByType to the global variable library
            const applyGroupingToLibrary = (
              variablesLibrary: VariablesInUse,
            ): Record<string, any> => {
              return Object.fromEntries(
                Object.entries(variablesLibrary).map(([key, value]) => {
                  // Check if the value is an array
                  if (Array.isArray(value)) {
                    // Apply the groupConsumersByType function to the variables
                    const variablesWithGroupedConsumers = value.map(
                      (variable: VariableData) => {
                        const groupedConsumers = groupConsumersByType(
                          variable.consumers,
                        );
                        return { ...variable, groupedConsumers };
                      },
                    );
                    return [key, variablesWithGroupedConsumers];
                  } else {
                    // For non-array properties, copy the original value
                    return [key, value];
                  }
                }),
              );
            };

            // Organize the array alphabtically
            variablesInUse.variables.sort((a, b) =>
              a.name.localeCompare(b.name),
            );
            colorVariables = variablesInUse.variables.filter(
              (variable) => variable.type === "color",
            );
            numbervariables = variablesInUse.variables.filter(
              (variable) => variable.type === "number",
            );

            variablesWithGroupedConsumers =
              applyGroupingToLibrary(variablesInUse);

            // Let the UI know we're done and send the
            // variables back to be displayed.
            figma.ui.postMessage({
              type: "variables-imported",
              message: variablesWithGroupedConsumers,
            });
          });

          // Now that libraries are available, call lint with libraries and localStylesLibrary, then send the message
          figma.ui.postMessage({
            type: "step-1",
            message: serializeNodes(nodes),
            errors: lint(firstNode, libraries),
          });
        },
      );

      figma.clientStorage.getAsync("storedActivePage").then((result) => {
        if (result.length) {
          figma.ui.postMessage({
            type: "fetched active page",
            storage: result,
          });
        }
      });

      figma.clientStorage.getAsync("storedRadiusValues").then((result) => {
        if (result.length) {
          borderRadiusArray = JSON.parse(result);
          borderRadiusArray = borderRadiusArray.sort((a, b) => a - b);

          figma.ui.postMessage({
            type: "fetched border radius",
            storage: result,
          });
        }
      });

      // Load saved lint rule configuration
      figma.clientStorage.getAsync("lintRuleConfig").then((result) => {
        if (result && result.length) {
          try {
            const savedConfig = JSON.parse(result);
            updateLintConfig(savedConfig);

            figma.ui.postMessage({
              type: "lint-config-loaded",
              config: savedConfig,
            });
          } catch (e) {
            console.error("Error loading lint config:", e);
          }
        }
      });
    }
  }

  function determineType(node: SceneNode, libraries: Library[]): LintError[] {
    switch (node.type) {
      case "SLICE":
      case "GROUP": {
        // Groups styles apply to their children so we can skip this node type.
        const errors: LintError[] = [];
        return errors;
      }
      case "BOOLEAN_OPERATION":
      case "VECTOR": {
        return lintVectorRules(
          node as VectorNode | BooleanOperationNode,
          libraries,
        );
      }
      case "POLYGON":
      case "STAR":
      case "ELLIPSE": {
        return lintShapeRules(
          node as PolygonNode | StarNode | EllipseNode,
          libraries,
        );
      }
      case "FRAME": {
        return lintFrameRules(node as FrameNode, libraries);
      }
      case "SECTION": {
        return lintSectionRules(node as SectionNode, libraries);
      }
      case "INSTANCE":
      case "RECTANGLE": {
        return lintRectangleRules(
          node as RectangleNode | InstanceNode,
          libraries,
        );
      }
      case "COMPONENT": {
        return lintComponentRules(node as ComponentNode, libraries);
      }
      case "COMPONENT_SET": {
        // Component Set is the frame that wraps a set of variants
        // the variants within the set are still linted as components (lintComponentRules)
        // this type is generally only present where the variant is defined so it
        // doesn't need as many linting requirements.
        return lintVariantWrapperRules(node as ComponentSetNode, libraries);
      }
      case "TEXT": {
        return lintTextRules(node as TextNode, libraries);
      }
      case "LINE": {
        return lintLineRules(node as LineNode, libraries);
      }
      default: {
        // Do nothing
        return [];
      }
    }
  }

  function lintComponentRules(
    node: ComponentNode,
    libraries: Library[],
  ): LintError[] {
    const errors: LintError[] = [];

    // Example of how we can make a custom rule specifically for components
    // if (node.remote === false) {
    //   errors.push(
    //     createErrorObject(node, "component", "Component isn't from library")
    //   );
    // }

    newCheckFills(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
      colorVariables,
    );
    checkRadius(node, errors, borderRadiusArray);
    newCheckEffects(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );
    newCheckStrokes(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );

    // ========== CUSTOM LINT RULES ==========
    checkSpacingValues(node, errors);
    checkAutoLayoutNesting(node, errors);
    checkNamingConventions(node, errors);
    checkFixedDimensions(node, errors);
    checkIconSize(node, errors);

    return errors;
  }

  function lintVariantWrapperRules(
    node: ComponentSetNode,
    libraries: Library[],
  ): LintError[] {
    const errors: LintError[] = [];

    // checkFills(node, errors);
    newCheckFills(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
      colorVariables,
    );

    return errors;
  }

  function lintLineRules(node: LineNode, libraries: Library[]): LintError[] {
    const errors: LintError[] = [];

    newCheckStrokes(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );
    newCheckEffects(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );

    // ========== CUSTOM LINT RULES ==========
    checkNamingConventions(node, errors);

    return errors;
  }

  function lintFrameRules(node: FrameNode, libraries: Library[]): LintError[] {
    const errors: LintError[] = [];

    // checkFills(node, errors);
    newCheckFills(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
      colorVariables,
    );
    newCheckStrokes(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );
    checkRadius(node, errors, borderRadiusArray);
    newCheckEffects(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );

    // ========== CUSTOM LINT RULES ==========
    checkSpacingValues(node, errors);
    checkAutoLayoutNesting(node, errors);
    checkNamingConventions(node, errors);
    checkComponentUsage(node, errors);
    checkFixedDimensions(node, errors);
    checkEmptyFrames(node, errors);
    checkDetachedInstances(node, errors);
    checkTouchTargetSize(node, errors);
    checkIconSize(node, errors);

    return errors;
  }

  function lintSectionRules(
    node: SectionNode,
    libraries: Library[],
  ): LintError[] {
    const errors: LintError[] = [];

    newCheckFills(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
      colorVariables,
    );
    // For some reason section strokes aren't accessible via the API yet.
    // checkStrokes(node, errors);
    checkRadius(node, errors, borderRadiusArray);

    // ========== CUSTOM LINT RULES ==========
    checkNamingConventions(node, errors);

    return errors;
  }

  function lintTextRules(node: TextNode, libraries: Library[]): LintError[] {
    const errors: LintError[] = [];

    checkType(node, errors, libraries, localStylesLibrary, usedRemoteStyles);
    newCheckFills(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
      colorVariables,
    );

    newCheckEffects(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );
    newCheckStrokes(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );

    // ========== CUSTOM LINT RULES ==========
    checkTextColorUsage(node, errors);
    checkTextStyleCompliance(node, errors);
    checkNamingConventions(node, errors);

    return errors;
  }

  function lintRectangleRules(
    node: RectangleNode | InstanceNode,
    libraries: Library[],
  ): LintError[] {
    const errors: LintError[] = [];

    newCheckFills(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
      colorVariables,
    );
    checkRadius(node, errors, borderRadiusArray);
    newCheckStrokes(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );
    newCheckEffects(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );

    // ========== CUSTOM LINT RULES ==========
    checkNamingConventions(node, errors);
    checkComponentUsage(node, errors);
    checkTouchTargetSize(node, errors);
    checkIconSize(node, errors);

    return errors;
  }

  function lintVectorRules(
    node: VectorNode | BooleanOperationNode,
    libraries: Library[],
  ): LintError[] {
    const errors: LintError[] = [];

    // This can be enabled by the user in settings.
    if (lintVectors === true) {
      newCheckFills(
        node,
        errors,
        libraries,
        localStylesLibrary,
        usedRemoteStyles,
        variablesWithGroupedConsumers,
      );
      newCheckStrokes(
        node,
        errors,
        libraries,
        localStylesLibrary,
        usedRemoteStyles,
      );
      newCheckEffects(
        node,
        errors,
        libraries,
        localStylesLibrary,
        usedRemoteStyles,
      );
    }

    // ========== CUSTOM LINT RULES ==========
    // Naming conventions apply even when vector linting is disabled
    checkNamingConventions(node, errors);
    checkIconSize(node, errors);

    return errors;
  }

  function lintShapeRules(
    node: PolygonNode | StarNode | EllipseNode,
    libraries: Library[],
  ): LintError[] {
    const errors: LintError[] = [];

    newCheckFills(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
      colorVariables,
    );
    newCheckStrokes(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );
    newCheckEffects(
      node,
      errors,
      libraries,
      localStylesLibrary,
      usedRemoteStyles,
    );

    // ========== CUSTOM LINT RULES ==========
    checkNamingConventions(node, errors);
    checkComponentUsage(node, errors);
    checkIconSize(node, errors);

    return errors;
  }
};
