import { determineFill, gradientToCSS } from "./lintingFunctions";
import type {
  RemoteStyles,
  RemoteFillStyle,
  RemoteStrokeStyle,
  RemoteTextStyle,
  RemoteEffectStyle,
} from "../types";

// Constants for chunked processing
const CHUNK_SIZE = 50;
const YIELD_INTERVAL_MS = 0;

// Helper to yield to main thread
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface StyleWithConsumers {
  consumers: SceneNode[];
  groupedConsumers?: Record<string, string[]>;
}

export async function fetchRemoteStyles(
  usedRemoteStyles: RemoteStyles,
): Promise<void> {
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
    .filter((node) => {
      // Check for remote styles
      return (
        node.fillStyleId ||
        node.strokeStyleId ||
        (node.type === "TEXT" && node.textStyleId) ||
        node.effectStyleId
      );
    });

  // Process nodes in chunks to prevent UI freezing
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Yield to main thread every CHUNK_SIZE nodes
    if (i > 0 && i % CHUNK_SIZE === 0) {
      await delay(YIELD_INTERVAL_MS);
    }

    if (node.fillStyleId) {
      const styleId = node.fillStyleId;
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
          const style = (await figma.getStyleByIdAsync(
            styleId,
          )) as PaintStyle | null;

          if (style === null) {
            continue;
          }

          // Type guard for fills - ensure it's not mixed
          const nodeFills = node.fills;
          if (
            typeof nodeFills === "symbol" ||
            !nodeFills ||
            nodeFills.length === 0
          ) {
            continue;
          }

          const currentFill = determineFill(nodeFills);
          const nodeFillType = nodeFills[0].type;
          let cssSyntax: string | null = null;

          if (nodeFillType === "SOLID") {
            cssSyntax = currentFill;
          } else if (
            nodeFillType !== "VIDEO" &&
            nodeFillType !== "IMAGE" &&
            nodeFillType !== "PATTERN"
          ) {
            cssSyntax = gradientToCSS(nodeFills[0]);
          }

          usedRemoteStyles.fills.push({
            id: node.fillStyleId,
            type: "fill",
            paint: style.paints[0],
            name: style.name,
            count: 1,
            consumers: [node],
            fillColor: cssSyntax,
          });
        }
      }
    }

    if (node.strokeStyleId) {
      const styleId = node.strokeStyleId;
      if (typeof styleId !== "symbol") {
        // Check if the stroke style with the given styleId already exists in the usedRemoteStyles.strokes array
        const existingStyle = usedRemoteStyles.strokes.find(
          (style: RemoteStrokeStyle) => style.id === styleId,
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

          if (style === null) {
            continue;
          }

          const nodeFillType = style.paints[0].type;
          let cssSyntax = null;

          if (nodeFillType === "SOLID") {
            cssSyntax = determineFill(style.paints);
          } else if (nodeFillType !== "IMAGE" && nodeFillType !== "VIDEO") {
            cssSyntax = gradientToCSS(node.strokes[0]);
          }

          usedRemoteStyles.strokes.push({
            id: node.strokeStyleId,
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

    if (node.type === "TEXT" && node.textStyleId) {
      const styleId = node.textStyleId;
      if (typeof styleId !== "symbol") {
        // Check if the text style with the given styleId already exists in the usedRemoteStyles.text array
        const existingStyle = usedRemoteStyles.text.find(
          (style: RemoteTextStyle) => style.id === styleId,
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

          if (style === null) {
            continue;
          }

          usedRemoteStyles.text.push({
            id: node.textStyleId,
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

    if (node.effectStyleId) {
      const styleId = node.effectStyleId;
      if (typeof styleId !== "symbol") {
        // Check if the effect style with the given styleId already exists in the usedRemoteStyles.effects array
        const existingStyle = usedRemoteStyles.effects.find(
          (style: RemoteEffectStyle) => style.id === styleId,
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

          if (style === null) {
            continue;
          }

          usedRemoteStyles.effects.push({
            id: node.effectStyleId,
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
export const groupLibrary = (
  globalStylesLibrary: RemoteStyles,
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(globalStylesLibrary).map(([key, value]) => {
      // Check if the value is an array (i.e., styles)
      if (Array.isArray(value)) {
        // Apply the groupConsumersByType function to the styles
        const stylesWithGroupedConsumers = value.map(
          (style: StyleWithConsumers) => {
            const groupedConsumers = groupConsumersByType(style.consumers);
            return { ...style, groupedConsumers };
          },
        );
        return [key, stylesWithGroupedConsumers];
      } else {
        // For non-array properties, copy the original value
        return [key, value];
      }
    }),
  );
};
