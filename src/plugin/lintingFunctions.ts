// Linting functions
/// <reference types="@figma/plugin-typings" />

import type {
  LintError,
  StyleMatch,
  TextProperties,
  VariableMatch,
  VariableSuggestion,
  Library,
  RemoteStyles,
  ColorObject,
  ErrorSeverity,
} from "../types/index";

// Generic function for creating an error object to pass to the app.
export function createErrorObject(
  node: SceneNode,
  type:
    | "fill"
    | "text"
    | "stroke"
    | "radius"
    | "effects"
    | "spacing"
    | "component"
    | "naming"
    | "nesting",
  message: string,
  value?: string,
  matches?: StyleMatch[],
  suggestions?: StyleMatch[],
  fillColor?: string | null,
  textProperties?: TextProperties,
  variableMatches?: VariableMatch[],
  variableSuggestions?: VariableSuggestion[],
  severity?: ErrorSeverity,
): LintError {
  const error: LintError = {
    message: message,
    type: type,
    node: node,
    value: value || "",
    severity: severity || "error", // Default to "error" for backward compatibility
    ...(matches && { matches: matches }),
    ...(suggestions && { suggestions: suggestions }),
    ...(fillColor !== undefined && { fillColor: fillColor }),
    ...(textProperties && { textProperties: textProperties }),
    ...(variableMatches && { variableMatches: variableMatches }),
    ...(variableSuggestions && { variableSuggestions: variableSuggestions }),
  };

  return error;
}

// Determine a nodes fills
export function determineFill(fills: readonly Paint[]): string {
  const fillValues: string[] = [];

  fills.forEach((fill: Paint) => {
    if (fill.type === "SOLID") {
      const rgbObj = convertColor(fill.color);
      fillValues.push(RGBToHex(rgbObj["r"], rgbObj["g"], rgbObj["b"]));
    } else if (fill.type === "IMAGE") {
      fillValues.push("Image - " + fill.imageHash);
    } else if (fill.type === "VIDEO") {
      fillValues.push("Video Fill");
    } else {
      const gradientValues: string[] = [];
      if ("gradientStops" in fill && fill.gradientStops) {
        fill.gradientStops.forEach((gradientStops: ColorStop) => {
          const gradientColorObject = convertColor(gradientStops.color);
          gradientValues.push(
            RGBToHex(
              gradientColorObject["r"],
              gradientColorObject["g"],
              gradientColorObject["b"],
            ),
          );
        });
      }
      let gradientValueString = gradientValues.toString();
      gradientValueString = gradientValueString.replace(/,/g, ", ");
      let gradientType: string | null = null;

      if (fill.type === "GRADIENT_LINEAR") {
        gradientType = "Linear Gradient";
      } else if (fill.type === "GRADIENT_RADIAL") {
        gradientType = "Radial Gradient";
      } else if (fill.type === "GRADIENT_ANGULAR") {
        gradientType = "Angular Gradient";
      } else if (fill.type === "GRADIENT_DIAMOND") {
        gradientType = "Diamond Gradient";
      }

      fillValues.push(`${gradientType} ${gradientValueString}`);
    }
  });

  return fillValues[0];
}

// Lint border radius
export function checkRadius(
  node: SceneNode,
  errors: LintError[],
  radiusValues: number[],
): void {
  if (!("cornerRadius" in node)) {
    return;
  }

  const cornerType = node.cornerRadius;

  if (typeof cornerType !== "symbol") {
    if (cornerType === 0) {
      return;
    }
    if (cornerType === node.height) {
      return;
    }
  }

  if (typeof node.boundVariables !== "undefined") {
    if (typeof node.boundVariables.bottomLeftRadius !== "undefined") {
      return;
    }
  }

  // If the radius isn't even on all sides, check each corner.
  if (typeof cornerType === "symbol") {
    if (
      "topLeftRadius" in node &&
      radiusValues.indexOf(node.topLeftRadius) === -1
    ) {
      errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect Top Left Radius",
          "topLeftRadius" in node ? String(node.topLeftRadius) : "",
        ),
      );
      return;
    } else if (
      "topRightRadius" in node &&
      radiusValues.indexOf(node.topRightRadius) === -1
    ) {
      errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect top right radius",
          "topRightRadius" in node ? String(node.topRightRadius) : "",
        ),
      );
      return;
    } else if (
      "bottomLeftRadius" in node &&
      radiusValues.indexOf(node.bottomLeftRadius) === -1
    ) {
      errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect bottom left radius",
          "bottomLeftRadius" in node ? String(node.bottomLeftRadius) : "",
        ),
      );
      return;
    } else if (
      "bottomRightRadius" in node &&
      radiusValues.indexOf(node.bottomRightRadius) === -1
    ) {
      errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect bottom right radius",
          "bottomRightRadius" in node ? String(node.bottomRightRadius) : "",
        ),
      );
      return;
    } else {
      return;
    }
  } else {
    if (
      "cornerRadius" in node &&
      typeof node.cornerRadius === "number" &&
      radiusValues.indexOf(node.cornerRadius) === -1
    ) {
      errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect border radius",
          String(node.cornerRadius),
        ),
      );
      return;
    } else {
      return;
    }
  }
}

// Custom Lint rule that isn't being used yet!
// that ensures our text fills aren't using styles (design tokens) meant for backgrounds.
export function customCheckTextFills(
  node: TextNode,
  errors: LintError[],
): void {
  // Here we create an array of style keys (https://www.figma.com/plugin-docs/api/PaintStyle/#key)
  // that we want to make sure our text layers aren't using.
  const fillsToCheck = [
    "4b93d40f61be15e255e87948a715521c3ae957e6",
    // To collect style keys, use a plugin like Inspector, or use console commands like figma.getLocalPaintStyles();
    // in your design system file.
  ];

  let nodeFillStyle = node.fillStyleId;

  // If there are multiple text styles on a single text layer, we can't lint it
  // we can return an error instead.
  if (typeof nodeFillStyle === "symbol") {
    errors.push(
      createErrorObject(
        node, // Node object we use to reference the error (id, layer name, etc)
        "fill", // Type of error (fill, text, effect, etc)
        "Mixing two styles together", // Message we show to the user
        "Multiple Styles", // Normally we return a hex value here
      ),
    );
    return;
  }

  // We strip the additional style key characters so we can check
  // to see if the fill is being used incorrectly.
  nodeFillStyle = nodeFillStyle.replace("S:", "");
  nodeFillStyle = nodeFillStyle.split(",")[0];

  // If the node (layer) has a fill style, then check to see if there's an error.
  if (nodeFillStyle !== "") {
    // If we find the layer has a fillStyle that matches in the array create an error.
    if (fillsToCheck.includes(nodeFillStyle)) {
      errors.push(
        createErrorObject(
          node, // Node object we use to reference the error (id, layer name, etc)
          "fill", // Type of error (fill, text, effect, etc)
          "Incorrect text color use", // Message we show to the user
          "Using a background color on a text layer", // Determines the fill, so we can show a hex value.
        ),
      );
      return;
    }
    // If there is no fillStyle on this layer,
    // check to see why with our default linting function for fills.
  } else {
    checkFills(node, errors);
  }
}

// Compares colors to see if they're equal.
function colorsAreEqual(color1: ColorObject, color2: ColorObject): boolean {
  const threshold = 0.0001;
  const rDiff = Math.abs(color1.r - color2.r);
  const gDiff = Math.abs(color1.g - color2.g);
  const bDiff = Math.abs(color1.b - color2.b);
  const aDiff = Math.abs((color1.a || 1) - (color2.a || 1));

  return (
    rDiff < threshold &&
    gDiff < threshold &&
    bDiff < threshold &&
    aDiff < threshold
  );
}

// Helper function for comparing effect types to see if there's a match.
function effectsMatch(
  nodeEffects: readonly Effect[],
  styleEffects: readonly Effect[],
): boolean {
  if (nodeEffects.length !== styleEffects.length) return false;

  return nodeEffects.every((nodeEffect, index) => {
    const styleEffect = styleEffects[index];

    if (nodeEffect.type !== styleEffect.type) return false;

    // Check radius for blur effects
    if ("radius" in nodeEffect && "radius" in styleEffect) {
      if (nodeEffect.radius !== styleEffect.radius) return false;
    }

    // Check color for shadow effects
    if ("color" in nodeEffect && "color" in styleEffect) {
      const nodeColor = convertColor(nodeEffect.color);
      const styleColor = convertColor(styleEffect.color);

      if (!colorsAreEqual(nodeColor, styleColor)) return false;
    }

    // Check offset and spread for shadow effects
    if (
      (nodeEffect.type === "DROP_SHADOW" ||
        nodeEffect.type === "INNER_SHADOW") &&
      (styleEffect.type === "DROP_SHADOW" ||
        styleEffect.type === "INNER_SHADOW")
    ) {
      if (
        "offset" in nodeEffect &&
        "offset" in styleEffect &&
        "spread" in nodeEffect &&
        "spread" in styleEffect
      ) {
        if (
          nodeEffect.offset.x !== styleEffect.offset.x ||
          nodeEffect.offset.y !== styleEffect.offset.y ||
          nodeEffect.spread !== styleEffect.spread
        ) {
          return false;
        }
      }
    }

    return true;
  });
}

export function newCheckEffects(
  node: SceneNode,
  errors: LintError[],
  libraries: Library[],
  localStylesLibrary: Library,
  importedStyles: RemoteStyles,
): void {
  if (!("effects" in node) || !node.effects.length || node.visible !== true) {
    return;
  }

  {
    const effectStyleId = node.effectStyleId;

    if (typeof effectStyleId === "symbol") {
      return;
    }

    if (node.effectStyleId === "") {
      let matchingEffects: StyleMatch[] = [];

      // Generate currentStyle string
      const currentStyle = node.effects
        .map((effect: Effect) => {
          const type = effect.type
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b[a-z]/g, (l: string) => l.toUpperCase());
          const radius = "radius" in effect ? effect.radius : 0;
          const offsetX =
            "offset" in effect && effect.offset ? effect.offset.x : "";
          const offsetY =
            "offset" in effect && effect.offset ? effect.offset.y : "";
          let color = "";
          if ("color" in effect && effect.color) {
            const colorObj = convertColor(effect.color);
            color = RGBToHex(colorObj["r"], colorObj["g"], colorObj["b"]);
          }

          if (type === "Drop Shadow" || type === "Inner Shadow") {
            return `${type} ${color} ${radius}px X: ${offsetX}, Y: ${offsetY}`;
          } else {
            return `${type} ${radius}px`;
          }
        })
        .join(", ");

      if (importedStyles && importedStyles.effects) {
        matchingEffects = importedStyles.effects
          .map((effectStyle) => ({
            name: effectStyle.name,
            id:
              typeof effectStyle.id === "string"
                ? effectStyle.id
                : String(effectStyle.id),
            key:
              typeof effectStyle.id === "string"
                ? effectStyle.id.replace(/S:|,/g, "")
                : String(effectStyle.id),
            value: effectStyle.name,
            source: "Remote Style",
            effects: effectStyle.effects,
          }))
          .filter((effectStyle) =>
            effectsMatch(node.effects, effectStyle.effects),
          );
      }

      if (matchingEffects.length === 0) {
        if (localStylesLibrary && localStylesLibrary.effects) {
          matchingEffects = localStylesLibrary.effects
            .map((effectStyle) => ({
              name: effectStyle.name,
              id: effectStyle.id,
              key: effectStyle.id.replace(/S:|,/g, ""),
              value: effectStyle.name,
              source: "Local Library",
              effects: effectStyle.effects,
            }))
            .filter((effectStyle) =>
              effectsMatch(node.effects, effectStyle.effects),
            );
        }
      }

      if (libraries && libraries.length > 0) {
        for (const library of libraries) {
          if (library.effects && library.effects.length > 0) {
            for (const effectStyle of library.effects) {
              if (effectsMatch(node.effects, effectStyle.effects)) {
                matchingEffects.push({
                  name: effectStyle.name,
                  key: effectStyle.id.replace(/S:|,/g, ""),
                  id: effectStyle.id,
                  value: effectStyle.name,
                  source: library.name,
                });
              }
            }
          }
        }
      }

      if (matchingEffects.length > 0) {
        errors.push(
          createErrorObject(
            node,
            "effects",
            "Missing effects style",
            currentStyle,
            matchingEffects,
          ),
        );
        return;
      } else {
        errors.push(
          createErrorObject(
            node,
            "effects",
            "Missing effects style",
            currentStyle,
          ),
        );
        return;
      }
    } else {
      return;
    }
  }
}

// Check for effects like shadows, blurs etc.
export function checkEffects(node: SceneNode, errors: LintError[]): void {
  if (!("effects" in node) || !node.effects.length || node.visible !== true) {
    return;
  }

  {
    if (node.effectStyleId === "") {
      const effectsArray: Array<{
        type: string;
        radius: number;
        offsetX: number | string;
        offsetY: number | string;
        fill: string;
        value: string;
      }> = [];

      node.effects.forEach((effect: Effect) => {
        const effectsObject: {
          type: string;
          radius: number;
          offsetX: number | string;
          offsetY: number | string;
          fill: string;
          value: string;
        } = {
          type: "",
          radius: 0,
          offsetX: "",
          offsetY: "",
          fill: "",
          value: "",
        };

        // All effects have a radius.
        effectsObject.radius = "radius" in effect ? effect.radius : 0;

        if (effect.type === "DROP_SHADOW") {
          effectsObject.type = "Drop Shadow";
        } else if (effect.type === "INNER_SHADOW") {
          effectsObject.type = "Inner Shadow";
        } else if (effect.type === "LAYER_BLUR") {
          effectsObject.type = "Layer Blur";
        } else {
          effectsObject.type = "Background Blur";
        }

        if ("color" in effect && effect.color) {
          const effectsFill = convertColor(effect.color);
          effectsObject.fill = RGBToHex(
            effectsFill["r"],
            effectsFill["g"],
            effectsFill["b"],
          );
          if ("offset" in effect && effect.offset) {
            effectsObject.offsetX = effect.offset.x;
            effectsObject.offsetY = effect.offset.y;
          }
          effectsObject.value = `${effectsObject.type} ${effectsObject.fill} ${effectsObject.radius}px X: ${effectsObject.offsetX}, Y: ${effectsObject.offsetY}`;
        } else {
          effectsObject.value = `${effectsObject.type} ${effectsObject.radius}px`;
        }

        effectsArray.unshift(effectsObject);
      });

      const currentStyle = effectsArray[0].value;

      errors.push(
        createErrorObject(
          node,
          "effects",
          "Missing effects style",
          currentStyle,
        ),
      );
      return;
    } else {
      return;
    }
  }
}

export function gradientToCSS(nodeFill: Paint): string {
  const nodeFillType = nodeFill.type;
  let cssGradient = "";

  if (
    nodeFillType === "GRADIENT_LINEAR" &&
    "gradientStops" in nodeFill &&
    nodeFill.gradientStops
  ) {
    const stops = nodeFill.gradientStops
      .map((stop: ColorStop) => {
        const color = `rgba(${Math.round(stop.color.r * 255)}, ${Math.round(
          stop.color.g * 255,
        )}, ${Math.round(stop.color.b * 255)}, ${stop.color.a})`;
        return `${color} ${Math.round(stop.position * 100)}%`;
      })
      .join(", ");
    cssGradient = `linear-gradient(${stops})`;
  } else if (
    (nodeFillType === "GRADIENT_RADIAL" ||
      nodeFillType === "GRADIENT_DIAMOND") &&
    "gradientStops" in nodeFill &&
    nodeFill.gradientStops
  ) {
    const stops = nodeFill.gradientStops
      .map((stop: ColorStop) => {
        const color = `rgba(${Math.round(stop.color.r * 255)}, ${Math.round(
          stop.color.g * 255,
        )}, ${Math.round(stop.color.b * 255)}, ${stop.color.a})`;
        return `${color} ${Math.round(stop.position * 100)}%`;
      })
      .join(", ");
    cssGradient = `radial-gradient(${stops})`;
  } else if (
    nodeFillType === "GRADIENT_ANGULAR" &&
    "gradientStops" in nodeFill &&
    nodeFill.gradientStops
  ) {
    const stops = nodeFill.gradientStops
      .map((stop: ColorStop) => {
        const color = `rgba(${Math.round(stop.color.r * 255)}, ${Math.round(
          stop.color.g * 255,
        )}, ${Math.round(stop.color.b * 255)}, ${stop.color.a})`;
        return `${color} ${Math.round(stop.position * 100)}%`;
      })
      .join(", ");
    cssGradient = `conic-gradient(${stops})`;
  }

  return cssGradient;
}

// Check library and local styles for matching
function checkMatchingFills(
  style: Paint | undefined,
  nodeFill: Paint | readonly Paint[],
): boolean {
  // If style or nodeFill is undefined, return false
  if (!style || !nodeFill) {
    return false;
  }

  // If we pass an array, we need to just check the first fill as that's what is visible.
  const fillToCheck: Paint = Array.isArray(nodeFill)
    ? nodeFill[nodeFill.length - 1]
    : nodeFill;

  if (fillToCheck.type === "SOLID" && style.type === "SOLID") {
    return (
      "color" in style &&
      "color" in fillToCheck &&
      style.color.r === fillToCheck.color.r &&
      style.color.g === fillToCheck.color.g &&
      style.color.b === fillToCheck.color.b &&
      style.opacity === fillToCheck.opacity
    );
  } else if (
    (fillToCheck.type === "GRADIENT_LINEAR" &&
      style.type === "GRADIENT_LINEAR") ||
    (fillToCheck.type === "GRADIENT_RADIAL" &&
      style.type === "GRADIENT_RADIAL") ||
    (fillToCheck.type === "GRADIENT_ANGULAR" &&
      style.type === "GRADIENT_ANGULAR") ||
    (fillToCheck.type === "GRADIENT_DIAMOND" &&
      style.type === "GRADIENT_DIAMOND")
  ) {
    return determineFill([style]) === determineFill([fillToCheck]);
  }

  return false;
}

export function newCheckFills(
  node: SceneNode,
  errors: LintError[],
  libraries: Library[],
  localStylesLibrary: Library,
  importedStyles: RemoteStyles,
  variables?: unknown,
): void {
  if (!("fills" in node)) {
    return;
  }

  if ("boundVariables" in node && typeof node.boundVariables !== "undefined") {
    if (typeof node.boundVariables.fills !== "undefined") {
      return;
    }
  }

  const nodeFills = node.fills;

  if (
    (typeof nodeFills !== "symbol" &&
      nodeFills.length &&
      node.visible === true) ||
    typeof nodeFills === "symbol"
  ) {
    const fillStyleId = "fillStyleId" in node ? node.fillStyleId : "";

    if (typeof nodeFills === "symbol") {
      errors.push(
        createErrorObject(node, "fill", "Missing fill style", "Mixed values"),
      );
      return;
    }

    if (typeof fillStyleId === "symbol") {
      return;
    }

    // If the fills are visible, aren't an image or a video, then lint them.
    if (
      "fillStyleId" in node &&
      node.fillStyleId === "" &&
      typeof nodeFills !== "symbol" &&
      nodeFills[0] &&
      nodeFills[0].type !== "IMAGE" &&
      nodeFills[0].type !== "VIDEO" &&
      nodeFills[0].visible === true
    ) {
      let matchingFills: StyleMatch[] = [];
      const suggestedFills: StyleMatch[] = [];

      if (importedStyles && importedStyles.fills) {
        matchingFills = importedStyles.fills
          .map((fillStyle) => ({
            name: fillStyle.name,
            id:
              typeof fillStyle.id === "string"
                ? fillStyle.id
                : String(fillStyle.id),
            key:
              typeof fillStyle.id === "string"
                ? fillStyle.id.replace(/S:|,/g, "")
                : String(fillStyle.id),
            value: fillStyle.name,
            source: "Remote Style",
            paint: fillStyle.paint,
            count: fillStyle.count,
          }))
          .filter((fillStyle) =>
            checkMatchingFills(fillStyle.paint, nodeFills),
          );
      }

      if (matchingFills.length === 0) {
        if (localStylesLibrary && localStylesLibrary.fills) {
          matchingFills = localStylesLibrary.fills
            .map((fillStyle) => ({
              name: fillStyle.name,
              id: fillStyle.id,
              key: fillStyle.id.replace(/S:|,/g, ""),
              value: fillStyle.name,
              source: "Local Library",
              paint: fillStyle.paint,
            }))
            .filter((fillStyle) =>
              checkMatchingFills(fillStyle.paint, nodeFills),
            );
        }
      }

      if (matchingFills.length === 0 && libraries && libraries.length > 0) {
        for (const library of libraries) {
          if (library.fills && library.fills.length > 0) {
            for (const fillStyle of library.fills) {
              const style = fillStyle;

              if (checkMatchingFills(style.paint, nodeFills)) {
                matchingFills.push({
                  name: style.name,
                  id: style.id,
                  key: style.id.replace(/S:|,/g, ""),
                  value: style.name,
                  source: library.name,
                });
              } else if (
                style.paint &&
                (style.paint.type === "GRADIENT_LINEAR" ||
                  style.paint.type === "GRADIENT_RADIAL" ||
                  style.paint.type === "GRADIENT_ANGULAR" ||
                  style.paint.type === "GRADIENT_DIAMOND") &&
                (nodeFills[0].type === "GRADIENT_LINEAR" ||
                  nodeFills[0].type === "GRADIENT_RADIAL" ||
                  nodeFills[0].type === "GRADIENT_ANGULAR" ||
                  nodeFills[0].type === "GRADIENT_DIAMOND")
              ) {
                suggestedFills.push({
                  name: fillStyle.name,
                  id: fillStyle.id,
                  key: fillStyle.id.replace(/S:|,/g, ""),
                  value: fillStyle.name,
                  source: library.name,
                  paint: fillStyle.paint,
                });
              }
            }
          }
        }
      }

      const currentFill =
        typeof nodeFills !== "symbol" ? determineFill(nodeFills) : "";
      const nodeFillType = nodeFills[0].type;
      let cssSyntax = null;

      if (nodeFillType === "SOLID") {
        cssSyntax = currentFill;
      } else {
        cssSyntax = gradientToCSS(nodeFills[0]);
      }

      if (matchingFills.length > 0) {
        errors.push(
          createErrorObject(
            node,
            "fill",
            "Missing fill style",
            currentFill,
            matchingFills,
            undefined,
            cssSyntax,
          ),
        );
        return;
      } else if (suggestedFills.length > 0) {
        errors.push(
          createErrorObject(
            node,
            "fill",
            "Missing fill style",
            currentFill,
            undefined,
            suggestedFills,
            cssSyntax,
          ),
        );
        return;
      } else {
        errors.push(
          createErrorObject(node, "fill", "Missing fill style", currentFill),
        );
        return;
      }
    } else {
      return;
    }
  }
}

export function checkFills(node: SceneNode, errors: LintError[]): void {
  if (!("fills" in node) || !("fillStyleId" in node)) {
    return;
  }

  if (
    "boundVariables" in node &&
    typeof node.boundVariables !== "undefined" &&
    typeof node.boundVariables.fills !== "undefined"
  ) {
    return;
  }

  const nodeFills = node.fills;
  const fillStyleId = node.fillStyleId;

  if (
    (typeof nodeFills !== "symbol" &&
      nodeFills.length &&
      node.visible === true) ||
    typeof nodeFills === "symbol"
  ) {
    if (typeof nodeFills === "symbol") {
      errors.push(
        createErrorObject(node, "fill", "Missing fill style", "Mixed values"),
      );
      return;
    }

    if (typeof fillStyleId === "symbol") {
      errors.push(
        createErrorObject(node, "fill", "Missing fill style", "Mixed values"),
      );
      return;
    }

    if (
      fillStyleId === "" &&
      nodeFills[0] &&
      nodeFills[0].type !== "IMAGE" &&
      nodeFills[0].type !== "VIDEO" &&
      nodeFills[0].visible === true
    ) {
      // We may need an array to loop through fill types.
      errors.push(
        createErrorObject(
          node,
          "fill",
          "Missing fill style",
          determineFill(nodeFills),
        ),
      );
      return;
    } else {
      return;
    }
  }
}

export function newCheckStrokes(
  node: SceneNode,
  errors: LintError[],
  libraries: Library[],
  localStylesLibrary: Library,
  importedStyles: RemoteStyles,
): void {
  if (!("strokes" in node)) {
    return;
  }

  if ("boundVariables" in node && typeof node.boundVariables !== "undefined") {
    if (typeof node.boundVariables.strokes !== "undefined") {
      return;
    }
  }

  if (!("strokeStyleId" in node)) {
    return;
  }

  if (node.strokes.length && node.visible === true) {
    const strokeStyleId = node.strokeStyleId;

    if (typeof strokeStyleId === "symbol") {
      return;
    }

    if (node.strokeStyleId === "") {
      let matchingStrokes: StyleMatch[] = [];

      const strokeObject: {
        strokeWeight: number | string;
        strokeAlign: string;
        strokeFills: string;
      } = {
        strokeWeight: 0,
        strokeAlign: "",
        strokeFills: "",
      };

      let strokeWeight: number | string | symbol =
        "strokeWeight" in node ? node.strokeWeight : 0;

      if (typeof strokeWeight === "symbol") {
        if (
          "strokeTopWeight" in node &&
          "strokeRightWeight" in node &&
          "strokeBottomWeight" in node &&
          "strokeLeftWeight" in node
        ) {
          strokeObject.strokeWeight = `${node.strokeTopWeight}, ${node.strokeRightWeight}, ${node.strokeBottomWeight}, ${node.strokeLeftWeight}`;
        }
      } else {
        strokeObject.strokeWeight = strokeWeight;
      }

      strokeObject.strokeAlign = "strokeAlign" in node ? node.strokeAlign : "";
      strokeObject.strokeFills = determineFill(node.strokes);

      // If there are multiple strokes on a node,
      // it's probbaly intentional or shouldn't be matched.
      if (node.strokes.length > 1) {
        errors.push(
          createErrorObject(
            node,
            "stroke",
            "Mutiple fills on a stroke",
            `Stroke: ${strokeObject.strokeWeight} / ${strokeObject.strokeAlign}`,
          ),
        );
        return;
      }

      // We only want to check the first stroke for a missing color.
      const firstStroke = node.strokes[node.strokes.length - 1];

      if (importedStyles && importedStyles.fills) {
        matchingStrokes = importedStyles.fills
          .map((strokeStyle) => ({
            name: strokeStyle.name,
            id:
              typeof strokeStyle.id === "string"
                ? strokeStyle.id
                : String(strokeStyle.id),
            key:
              typeof strokeStyle.id === "string"
                ? strokeStyle.id.replace(/S:|,/g, "")
                : String(strokeStyle.id),
            value: strokeStyle.name,
            source: "Remote Style",
            paint: strokeStyle.paint,
            count: strokeStyle.count,
          }))
          .filter((strokeStyle) =>
            checkMatchingFills(strokeStyle.paint, firstStroke),
          );
      }

      if (matchingStrokes.length === 0) {
        if (localStylesLibrary && localStylesLibrary.fills) {
          matchingStrokes = localStylesLibrary.fills
            .map((strokeStyle) => ({
              name: strokeStyle.name,
              id: strokeStyle.id,
              key: strokeStyle.id.replace(/S:|,/g, ""),
              value: strokeStyle.name,
              source: "Local Library",
              paint: strokeStyle.paint,
            }))
            .filter((strokeStyle) =>
              checkMatchingFills(strokeStyle.paint, firstStroke),
            );
        }
      }

      if (matchingStrokes.length === 0 && libraries && libraries.length > 0) {
        for (const library of libraries) {
          if (library.fills && library.fills.length > 0) {
            for (const fillStyle of library.fills) {
              const style = fillStyle;

              if (checkMatchingFills(style.paint, firstStroke)) {
                matchingStrokes.push({
                  name: style.name,
                  id: style.id,
                  key: style.id.replace(/S:|,/g, ""),
                  value: style.name,
                  source: library.name,
                  paint: style.paint,
                });
              }
            }
          }
        }
      }

      const currentStroke = `${strokeObject.strokeFills} / ${strokeObject.strokeWeight} / ${strokeObject.strokeAlign}`;
      const strokeFill = strokeObject.strokeFills;

      const nodeFillType = node.strokes[0].type;
      let cssSyntax = null;

      if (nodeFillType === "SOLID") {
        cssSyntax = strokeFill;
      } else {
        cssSyntax = gradientToCSS(node.strokes[0]);
      }

      if (matchingStrokes.length > 0) {
        errors.push(
          createErrorObject(
            node,
            "stroke",
            "Missing stroke style",
            currentStroke,
            matchingStrokes,
            undefined,
            cssSyntax,
          ),
        );
        return;
      } else {
        errors.push(
          createErrorObject(
            node,
            "stroke",
            "Missing stroke style",
            currentStroke,
            undefined,
            undefined,
            cssSyntax,
          ),
        );
        return;
      }
    } else {
      return;
    }
  }
}

export function checkStrokes(node: SceneNode, errors: LintError[]): void {
  if (!("strokes" in node) || !node.strokes.length) {
    return;
  }

  {
    if (
      "boundVariables" in node &&
      typeof node.boundVariables !== "undefined"
    ) {
      if (typeof node.boundVariables.strokes !== "undefined") {
        return;
      }
    }

    if (
      "strokeStyleId" in node &&
      node.strokeStyleId === "" &&
      node.visible === true
    ) {
      const strokeObject: {
        strokeWeight: number | string;
        strokeAlign: string;
        strokeFills: string;
      } = {
        strokeWeight: "",
        strokeAlign: "",
        strokeFills: "",
      };

      // With the update to stroke alignment, sometimes
      // strokes can be symhols (figma.mixed)
      const strokeWeight = "strokeWeight" in node ? node.strokeWeight : 0;

      // Check for a mixed stroke weight and return a generic error
      if (typeof strokeWeight === "symbol") {
        errors.push(
          createErrorObject(
            node,
            "stroke",
            "Missing stroke style",
            "Mixed sizes or alignment",
          ),
        );
        return;
      }

      const finalStrokeWeight = "strokeWeight" in node ? node.strokeWeight : 0;
      strokeObject.strokeWeight =
        typeof finalStrokeWeight === "symbol" ? "Mixed" : finalStrokeWeight;
      strokeObject.strokeAlign = "strokeAlign" in node ? node.strokeAlign : "";
      strokeObject.strokeFills = determineFill(node.strokes);

      const currentStyle = `${strokeObject.strokeFills} / ${strokeObject.strokeWeight} / ${strokeObject.strokeAlign}`;

      errors.push(
        createErrorObject(node, "stroke", "Missing stroke style", currentStyle),
      );
      return;
    } else {
      return;
    }
  }
}

function checkMatchingStyles(
  style: {
    fontFamily?: string;
    fontStyle?: string;
    fontSize?: number;
    lineHeight?: LineHeight | { value?: number; unit?: string };
    letterSpacing?: LetterSpacing | { value: number; unit: string };
    textCase?: TextCase | string;
    paragraphSpacing?: number;
  },
  textObject: {
    font: string;
    fontStyle: string;
    fontSize: number;
    lineHeight: string | number;
    letterSpacingValue: number;
    letterSpacingUnit: string;
    textCase: string;
    paragraphSpacing: number;
  },
): boolean {
  let lineHeightCheck: string | number = "Auto";

  if (
    style.lineHeight &&
    typeof style.lineHeight === "object" &&
    "value" in style.lineHeight &&
    style.lineHeight.value !== undefined
  ) {
    lineHeightCheck = style.lineHeight.value;
  }

  return (
    style.fontFamily === textObject.font &&
    style.fontStyle === textObject.fontStyle &&
    style.fontSize === textObject.fontSize &&
    lineHeightCheck === textObject.lineHeight &&
    (style.letterSpacing &&
    typeof style.letterSpacing === "object" &&
    "value" in style.letterSpacing
      ? style.letterSpacing.value
      : 0) === textObject.letterSpacingValue &&
    (style.letterSpacing &&
    typeof style.letterSpacing === "object" &&
    "unit" in style.letterSpacing
      ? style.letterSpacing.unit
      : "") === textObject.letterSpacingUnit &&
    style.textCase === textObject.textCase &&
    style.paragraphSpacing === textObject.paragraphSpacing
  );
}

function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(value * multiplier) / multiplier;
}

export function checkType(
  node: SceneNode,
  errors: LintError[],
  libraries: Library[],
  localStylesLibrary: Library,
  importedStyles: RemoteStyles,
): void {
  if (!("textStyleId" in node)) {
    return;
  }

  if (node.textStyleId === "" && node.visible === true) {
    const textObject: {
      font: string;
      fontStyle: string;
      fontSize: number;
      lineHeight: string | number;
      letterSpacingValue: number;
      letterSpacingUnit: string;
      textAlignHorizontal: string;
      textAlignVertical: string;
      paragraphIndent: number;
      paragraphSpacing: number;
      textCase: string;
    } = {
      font: "",
      fontStyle: "",
      fontSize: 0,
      lineHeight: 0,
      letterSpacingValue: 0,
      letterSpacingUnit: "",
      textAlignHorizontal: "",
      textAlignVertical: "",
      paragraphIndent: 0,
      paragraphSpacing: 0,
      textCase: "",
    };

    if (!("fontName" in node) || !("fontSize" in node)) {
      return;
    }

    const fontStyle = node.fontName;
    const fontSize = node.fontSize;

    if (typeof fontStyle === "symbol" || typeof fontSize === "symbol") {
      errors.push(
        createErrorObject(
          node,
          "text",
          "Missing text style",
          "Mixed sizes or families",
        ),
      );
      return;
    }

    textObject.font =
      typeof node.fontName !== "symbol" ? node.fontName.family : "";
    textObject.fontStyle =
      typeof node.fontName !== "symbol" ? node.fontName.style : "";
    textObject.fontSize = typeof node.fontSize !== "symbol" ? node.fontSize : 0;
    textObject.letterSpacingValue =
      "letterSpacing" in node && typeof node.letterSpacing !== "symbol"
        ? node.letterSpacing.value
        : 0;
    textObject.letterSpacingUnit =
      "letterSpacing" in node && typeof node.letterSpacing !== "symbol"
        ? node.letterSpacing.unit
        : "";
    textObject.textAlignHorizontal =
      "textAlignHorizontal" in node
        ? typeof node.textAlignHorizontal === "symbol"
          ? ""
          : node.textAlignHorizontal
        : "";
    textObject.textAlignVertical =
      "textAlignVertical" in node
        ? typeof node.textAlignVertical === "symbol"
          ? ""
          : node.textAlignVertical
        : "";
    textObject.paragraphIndent =
      "paragraphIndent" in node ? node.paragraphIndent : 0;
    textObject.paragraphSpacing =
      "paragraphSpacing" in node ? node.paragraphSpacing : 0;
    textObject.textCase =
      "textCase" in node
        ? typeof node.textCase === "symbol"
          ? "ORIGINAL"
          : node.textCase
        : "ORIGINAL";

    // Line height can be "auto" or a pixel value
    if ("lineHeight" in node && typeof node.lineHeight !== "symbol") {
      if (node.lineHeight.unit === "AUTO") {
        textObject.lineHeight = "Auto";
      } else {
        textObject.lineHeight = node.lineHeight.value;
      }
    } else {
      textObject.lineHeight = "Auto";
    }

    const matchingStyles: StyleMatch[] = [];
    const suggestedStyles: StyleMatch[] = [];

    const checkSuggestions = (library: Library | RemoteStyles) => {
      if (!library.text || !library.text.length) {
        return;
      }

      for (const textStyle of library.text) {
        const style = textStyle.style;

        if (checkMatchingStyles(style, textObject)) {
          let lineHeightValue: string | number = "Auto";
          if (
            typeof style.lineHeight === "object" &&
            "value" in style.lineHeight &&
            style.lineHeight.value !== undefined
          ) {
            lineHeightValue = style.lineHeight.value;
          }
          matchingStyles.push({
            name: textStyle.name,
            id:
              typeof textStyle.id === "symbol"
                ? String(textStyle.id)
                : textStyle.id,
            key: textStyle.key || "",
            count: textStyle.count,
            value:
              textStyle.name + " · " + style.fontSize + "/" + lineHeightValue,
            source: library.name,
          });
        } else if (
          style.fontFamily === textObject.font &&
          style.fontStyle === textObject.fontStyle &&
          style.fontSize === textObject.fontSize
        ) {
          if (!suggestedStyles.some((obj) => obj.name === textStyle.name)) {
            let lineHeightValue: string | number = "Auto";
            if (
              typeof style.lineHeight === "object" &&
              "value" in style.lineHeight &&
              style.lineHeight.value !== undefined
            ) {
              lineHeightValue = style.lineHeight.value;
            }
            suggestedStyles.push({
              name: textStyle.name,
              id:
                typeof textStyle.id === "symbol"
                  ? String(textStyle.id)
                  : textStyle.id,
              key: textStyle.key || "",
              count: textStyle.count,
              value:
                textStyle.name + " · " + style.fontSize + "/" + lineHeightValue,
              source: library.name,
            });
          }
        }
      }
    };

    // See if we have matches with remote styles
    if (importedStyles && importedStyles.text) {
      checkSuggestions(importedStyles);
    }

    if (localStylesLibrary && localStylesLibrary.text) {
      checkSuggestions(localStylesLibrary);
    }

    if (matchingStyles.length === 0 && libraries && libraries.length > 0) {
      for (const library of libraries) {
        if (library.text && library.text.length > 0) {
          checkSuggestions(library);
        }
      }
    }

    let lineHeightFormatted = null;

    if (textObject.lineHeight === "Auto") {
      lineHeightFormatted = "Auto";
    } else {
      const roundedLineHeight = roundToDecimalPlaces(
        typeof textObject.lineHeight === "number" ? textObject.lineHeight : 0,
        1,
      );
      if (
        "lineHeight" in node &&
        typeof node.lineHeight !== "symbol" &&
        node.lineHeight.unit === "PERCENT"
      ) {
        lineHeightFormatted = roundedLineHeight + "%";
      } else {
        lineHeightFormatted = String(roundedLineHeight);
      }
    }

    const currentStyle = `${textObject.font} ${textObject.fontStyle} · ${textObject.fontSize}/${lineHeightFormatted}`;

    // Create error object with fixes if matching styles are found
    if (matchingStyles.length > 0) {
      errors.push(
        createErrorObject(
          node,
          "text",
          "Missing text style",
          currentStyle,
          matchingStyles,
        ),
      );
      return;
    } else if (suggestedStyles.length > 0) {
      // We may not have exact matches, so we'll suggest some that are very close.
      errors.push(
        createErrorObject(
          node,
          "text",
          "Missing text style",
          currentStyle,
          undefined,
          suggestedStyles,
          undefined,
          textObject,
        ),
      );
      return;
    } else {
      // If nothing is remotely close, just keep the error as is.
      errors.push(
        createErrorObject(node, "text", "Missing text style", currentStyle),
      );
      return;
    }
  } else {
    return;
  }
}

// Utility functions for color conversion.
export const convertColor = (color: RGB | RGBA): ColorObject => {
  const colorObj = color;
  const figmaColor: ColorObject = { r: 0, g: 0, b: 0, a: 1 };

  Object.entries(colorObj).forEach((cf: [string, unknown]) => {
    const [key, value] = cf;

    if (["r", "g", "b"].includes(key)) {
      figmaColor[key as "r" | "g" | "b"] = Number(
        (255 * (value as number)).toFixed(0),
      );
    }
    if (key === "a") {
      figmaColor[key] = value as number;
    }
  });
  return figmaColor;
};

export function RGBToHex(r: number, g: number, b: number): string {
  let rHex = Number(r).toString(16);
  let gHex = Number(g).toString(16);
  let bHex = Number(b).toString(16);

  if (rHex.length == 1) rHex = "0" + rHex;
  if (gHex.length == 1) gHex = "0" + gHex;
  if (bHex.length == 1) bHex = "0" + bHex;

  return "#" + rHex + gHex + bHex;
}

// ============================================
// CUSTOM LINT RULES - BreakLine Design System
// ============================================
// These rules enforce BreakLine's design system standards.
// Update the configuration values below with your actual
// style keys and token values from your Figma files.

// --------------------------------------------
// CONFIGURATION - Update these values
// --------------------------------------------

/**
 * Configuration for custom lint rules.
 * To find style keys, run `figma.getLocalPaintStyles()` in the Figma console
 * or use a plugin like "Inspector" to view style metadata.
 */
export const CUSTOM_LINT_CONFIG = {
  // ========== COLOR TOKENS ==========
  // Add your allowed fill style keys here.
  // These are the "key" property from paint styles (without "S:" prefix).
  // Run `figma.getLocalPaintStyles().forEach(s => console.log(s.key, s.name))` to get these.
  allowedFillStyleKeys: [
    // TODO: Add your style keys from figma.getLocalPaintStyles()
    // Example: "4b93d40f61be15e255e87948a715521c3ae957e6", // color/primary/500
  ] as string[],

  // Colors that should NOT be used on text (background-only colors)
  backgroundOnlyStyleKeys: [
    // TODO: Add style keys for background colors that shouldn't appear on text
    // Example: "abc123def456...", // color/background/surface
  ] as string[],

  // Colors that CAN be used on text
  textColorStyleKeys: [
    // TODO: Add style keys for text-appropriate colors
    // Example: "abc123def456...", // color/text/primary
  ] as string[],

  // ========== TYPOGRAPHY TOKENS ==========
  // Add your allowed text style keys here.
  // Run `figma.getLocalTextStyles().forEach(s => console.log(s.key, s.name))` to get these.
  allowedTextStyleKeys: [
    // TODO: Add your style keys from figma.getLocalTextStyles()
    // Example: "text-style-key-123", // typography/heading/h1
  ] as string[],

  // ========== SPACING VALUES ==========
  // Allowed spacing values in pixels for auto-layout padding and gaps.
  // These should match your design system's spacing scale.
  allowedSpacingValues: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128],

  // ========== COMPONENT PATTERNS ==========
  // Patterns that indicate a raw element should be a component instance.
  // Key: description of what to look for, Value: component name to suggest.
  componentPatterns: {
    // Button-like patterns: rectangles with specific characteristics
    button: {
      description: "Button",
      // Detect rectangles with specific sizing and rounded corners
      minWidth: 80,
      maxWidth: 400,
      minHeight: 32,
      maxHeight: 64,
      hasText: true, // Should have text child
    },
    // Input-like patterns
    input: {
      description: "Input field",
      minWidth: 120,
      maxWidth: 600,
      minHeight: 32,
      maxHeight: 56,
      hasBorder: true,
    },
    // Card-like patterns
    card: {
      description: "Card",
      minWidth: 200,
      minHeight: 100,
      hasMultipleChildren: true,
    },
    // Avatar-like patterns: circles/ellipses at specific sizes
    avatar: {
      description: "Avatar",
      sizes: [24, 32, 40, 48, 64, 80],
      isCircle: true,
    },
  },

  // ========== NAMING CONVENTIONS ==========
  // Regex patterns for layer naming conventions.
  namingPatterns: {
    // Frames should use PascalCase or kebab-case with optional slashes
    frame: /^[A-Z][a-zA-Z0-9]*(?:[\s/-][A-Za-z0-9]+)*$/,
    // Components should use PascalCase
    component: /^[A-Z][a-zA-Z0-9]*(?:\/[A-Z][a-zA-Z0-9]*)*$/,
    // Text layers can be anything (usually the content itself)
    text: null, // No restriction
    // Instances should maintain component naming
    instance: null, // No restriction
    // Groups should be descriptive
    group: /^[A-Za-z][a-zA-Z0-9\s\-_]*$/,
    // Rectangles, ellipses should be descriptive (not "Rectangle 1")
    shape:
      /^(?!Rectangle\s*\d*$)(?!Ellipse\s*\d*$)(?!Star\s*\d*$)(?!Polygon\s*\d*$).+$/,
  },

  // Names that indicate placeholder/untouched layers
  placeholderPatterns: [
    /^Frame\s*\d*$/i,
    /^Group\s*\d*$/i,
    /^Rectangle\s*\d*$/i,
    /^Ellipse\s*\d*$/i,
    /^Vector\s*\d*$/i,
    /^Star\s*\d*$/i,
    /^Polygon\s*\d*$/i,
    /^Line\s*\d*$/i,
    /^Image\s*\d*$/i,
  ],

  // ========== NESTING LIMITS ==========
  // Maximum recommended nesting depth for auto-layout frames.
  // Beyond this depth, the rule will warn (not error).
  maxAutoLayoutNestingDepth: 5,

  // ========== ICON SIZES ==========
  // Standard icon sizes in pixels
  allowedIconSizes: [12, 16, 20, 24, 32, 40, 48],

  // ========== TOUCH TARGETS ==========
  // Minimum touch target size (Apple HIG recommends 44px, Material recommends 48px)
  minTouchTargetSize: 44,

  // Layer name patterns that indicate interactive elements
  interactivePatterns: [
    /button/i,
    /btn/i,
    /link/i,
    /cta/i,
    /clickable/i,
    /tap/i,
    /press/i,
    /toggle/i,
    /switch/i,
    /checkbox/i,
    /radio/i,
    /icon-button/i,
    /fab/i,
    /chip/i,
    /tag/i,
  ],

  // ========== FIXED DIMENSIONS ==========
  // Minimum size to flag fixed dimensions (smaller elements are often intentionally fixed)
  fixedDimensionMinSize: 100,

  // ========== FEATURE FLAGS ==========
  // Enable/disable specific rules
  enableColorCheck: false, // Disabled - existing library-based rules handle this
  enableTypographyCheck: false, // Disabled - existing library-based rules handle this
  enableSpacingCheck: true,
  enableComponentCheck: true,
  enableNamingCheck: true,
  enableNestingCheck: true,
  enableFixedDimensionsCheck: true,
  enableTouchTargetCheck: true,
  enableEmptyFrameCheck: true,
  enableDetachedInstanceCheck: true,
  enableIconSizeCheck: true,
};

/**
 * Updates the CUSTOM_LINT_CONFIG with new values from the UI.
 * Only updates boolean flags and numeric values, not complex patterns.
 */
export function updateLintConfig(
  newConfig: Partial<{
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
  }>,
): void {
  // Update boolean flags
  if (typeof newConfig.enableColorCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableColorCheck = newConfig.enableColorCheck;
  }
  if (typeof newConfig.enableTypographyCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableTypographyCheck = newConfig.enableTypographyCheck;
  }
  if (typeof newConfig.enableSpacingCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableSpacingCheck = newConfig.enableSpacingCheck;
  }
  if (typeof newConfig.enableComponentCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableComponentCheck = newConfig.enableComponentCheck;
  }
  if (typeof newConfig.enableNamingCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableNamingCheck = newConfig.enableNamingCheck;
  }
  if (typeof newConfig.enableNestingCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableNestingCheck = newConfig.enableNestingCheck;
  }
  if (typeof newConfig.enableFixedDimensionsCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableFixedDimensionsCheck =
      newConfig.enableFixedDimensionsCheck;
  }
  if (typeof newConfig.enableTouchTargetCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableTouchTargetCheck =
      newConfig.enableTouchTargetCheck;
  }
  if (typeof newConfig.enableEmptyFrameCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableEmptyFrameCheck = newConfig.enableEmptyFrameCheck;
  }
  if (typeof newConfig.enableDetachedInstanceCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableDetachedInstanceCheck =
      newConfig.enableDetachedInstanceCheck;
  }
  if (typeof newConfig.enableIconSizeCheck === "boolean") {
    CUSTOM_LINT_CONFIG.enableIconSizeCheck = newConfig.enableIconSizeCheck;
  }

  // Update numeric values
  if (Array.isArray(newConfig.allowedSpacingValues)) {
    CUSTOM_LINT_CONFIG.allowedSpacingValues = newConfig.allowedSpacingValues;
  }
  if (Array.isArray(newConfig.allowedIconSizes)) {
    CUSTOM_LINT_CONFIG.allowedIconSizes = newConfig.allowedIconSizes;
  }
  if (
    typeof newConfig.minTouchTargetSize === "number" &&
    newConfig.minTouchTargetSize > 0
  ) {
    CUSTOM_LINT_CONFIG.minTouchTargetSize = newConfig.minTouchTargetSize;
  }
  if (
    typeof newConfig.maxAutoLayoutNestingDepth === "number" &&
    newConfig.maxAutoLayoutNestingDepth > 0
  ) {
    CUSTOM_LINT_CONFIG.maxAutoLayoutNestingDepth =
      newConfig.maxAutoLayoutNestingDepth;
  }
}

// --------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------

/**
 * Cleans a style ID by removing the "S:" prefix and any trailing data after comma.
 * Figma style IDs come in format "S:abc123,optional-data"
 * @param styleId - The raw style ID from Figma
 * @returns The cleaned style key for comparison
 */
export function cleanStyleKey(styleId: string): string {
  if (!styleId || typeof styleId !== "string") {
    return "";
  }
  return styleId.replace("S:", "").split(",")[0];
}

/**
 * Checks if a node has auto-layout enabled.
 * @param node - The node to check
 * @returns True if the node uses auto-layout
 */
export function hasAutoLayout(
  node: SceneNode,
): node is FrameNode | ComponentNode | InstanceNode {
  return (
    "layoutMode" in node &&
    node.layoutMode !== "NONE" &&
    node.layoutMode !== undefined
  );
}

/**
 * Gets the auto-layout nesting depth of a node by traversing up the tree.
 * @param node - The node to check
 * @returns The nesting depth (0 if not in auto-layout)
 */
export function getAutoLayoutDepth(node: SceneNode): number {
  let depth = 0;
  let current: BaseNode | null = node;

  while (current && "parent" in current && current.parent) {
    if (
      current.parent.type === "FRAME" ||
      current.parent.type === "COMPONENT" ||
      current.parent.type === "INSTANCE"
    ) {
      const parent = current.parent as FrameNode | ComponentNode | InstanceNode;
      if (parent.layoutMode && parent.layoutMode !== "NONE") {
        depth++;
      }
    }
    current = current.parent;
  }

  return depth;
}

/**
 * Checks if a node has visible text children.
 * @param node - The node to check
 * @returns True if the node has text children
 */
function hasTextChildren(node: SceneNode): boolean {
  if (!("children" in node)) {
    return false;
  }
  return (node as ChildrenMixin).children.some(
    (child) => child.type === "TEXT" && child.visible,
  );
}

/**
 * Checks if a node has visible strokes.
 * @param node - The node to check
 * @returns True if the node has visible strokes
 */
function hasVisibleStrokes(node: SceneNode): boolean {
  if (!("strokes" in node)) {
    return false;
  }
  const strokes = (node as MinimalStrokesMixin).strokes;
  if (typeof strokes === "symbol" || !strokes.length) {
    return false;
  }
  return strokes.some((stroke) => stroke.visible !== false);
}

/**
 * Checks if a shape node is circular (equal width/height and has corner radius).
 * @param node - The node to check
 * @returns True if the node appears to be a circle
 */
function isCircular(node: SceneNode): boolean {
  if (node.type === "ELLIPSE") {
    return Math.abs(node.width - node.height) < 1;
  }
  if (
    "cornerRadius" in node &&
    typeof node.cornerRadius === "number" &&
    node.cornerRadius > 0
  ) {
    const minDimension = Math.min(node.width, node.height);
    return (
      Math.abs(node.width - node.height) < 1 &&
      node.cornerRadius >= minDimension / 2
    );
  }
  return false;
}

// --------------------------------------------
// RULE 1: COLOR TOKEN VALIDATION
// --------------------------------------------

/**
 * Validates that text layers use appropriate color tokens.
 * Flags text using background-only colors or unlisted fill styles.
 * STRICT: All violations are flagged as errors.
 *
 * @param node - The Figma text node to check
 * @param errors - Array to push errors to
 */
export function checkTextColorUsage(
  node: SceneNode,
  errors: LintError[],
): void {
  // Only run on text nodes
  if (node.type !== "TEXT" || !CUSTOM_LINT_CONFIG.enableColorCheck) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  const fillStyleId = node.fillStyleId;

  // Handle mixed styles (multiple styles on one text layer)
  if (typeof fillStyleId === "symbol") {
    errors.push(
      createErrorObject(
        node,
        "fill",
        "Mixed fill styles on text",
        "Text layer has multiple fill styles - consolidate to a single style",
      ),
    );
    return;
  }

  // No style applied - this will be caught by the default fill checker
  if (!fillStyleId || fillStyleId === "") {
    return;
  }

  // Parse style key for comparison
  const cleanKey = cleanStyleKey(fillStyleId);

  // Skip if no background-only styles are configured
  if (CUSTOM_LINT_CONFIG.backgroundOnlyStyleKeys.length === 0) {
    return;
  }

  // Check if using a background-only color on text
  if (CUSTOM_LINT_CONFIG.backgroundOnlyStyleKeys.includes(cleanKey)) {
    errors.push(
      createErrorObject(
        node,
        "fill",
        "Background color on text",
        "This color token is meant for backgrounds, not text. Use a text color token instead.",
      ),
    );
    return;
  }

  // Optionally check if using any recognized style
  if (
    CUSTOM_LINT_CONFIG.textColorStyleKeys.length > 0 &&
    !CUSTOM_LINT_CONFIG.textColorStyleKeys.includes(cleanKey) &&
    !CUSTOM_LINT_CONFIG.allowedFillStyleKeys.includes(cleanKey)
  ) {
    errors.push(
      createErrorObject(
        node,
        "fill",
        "Unrecognized text color",
        "This fill style is not in the design system's text color tokens.",
      ),
    );
  }
}

// --------------------------------------------
// RULE 2: TYPOGRAPHY STYLE VALIDATION
// --------------------------------------------

/**
 * Validates that text layers use defined text styles from the design system.
 * STRICT: All violations are flagged as errors.
 *
 * Note: The existing `checkType` function already handles missing text styles.
 * This rule adds additional validation for custom text style requirements.
 *
 * @param node - The Figma text node to check
 * @param errors - Array to push errors to
 */
export function checkTextStyleCompliance(
  node: SceneNode,
  errors: LintError[],
): void {
  // Only run on text nodes
  if (node.type !== "TEXT" || !CUSTOM_LINT_CONFIG.enableTypographyCheck) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  const textStyleId = node.textStyleId;

  // Handle mixed text styles
  if (typeof textStyleId === "symbol") {
    errors.push(
      createErrorObject(
        node,
        "text",
        "Mixed text styles",
        "Text layer has multiple text styles - use a single consistent style",
      ),
    );
    return;
  }

  // If no text style is applied, defer to the existing checkType function
  if (!textStyleId || textStyleId === "") {
    return;
  }

  // If we have a configured allowlist, validate against it
  if (CUSTOM_LINT_CONFIG.allowedTextStyleKeys.length > 0) {
    const cleanKey = cleanStyleKey(textStyleId);

    if (!CUSTOM_LINT_CONFIG.allowedTextStyleKeys.includes(cleanKey)) {
      errors.push(
        createErrorObject(
          node,
          "text",
          "Non-standard text style",
          "This text style is not in the approved design system typography scale.",
        ),
      );
    }
  }
}

// --------------------------------------------
// RULE 3: SPACING/PADDING VALIDATION
// --------------------------------------------

/**
 * Validates that auto-layout frames use standard spacing values.
 * Checks padding (all sides) and gap spacing.
 * STRICT: All non-standard values are flagged as errors.
 *
 * @param node - The Figma frame node to check
 * @param errors - Array to push errors to
 */
export function checkSpacingValues(node: SceneNode, errors: LintError[]): void {
  // Only run on frames/components with auto-layout
  if (!CUSTOM_LINT_CONFIG.enableSpacingCheck) {
    return;
  }

  if (!hasAutoLayout(node)) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  const allowedValues = CUSTOM_LINT_CONFIG.allowedSpacingValues;

  // Check if value is in allowed list (with small tolerance for floating point)
  const isAllowedSpacing = (value: number): boolean => {
    return allowedValues.some((allowed) => Math.abs(value - allowed) < 0.5);
  };

  // Collect all spacing violations for this node
  const violations: string[] = [];

  // Check gap (itemSpacing)
  if (
    "itemSpacing" in node &&
    typeof node.itemSpacing === "number" &&
    !isAllowedSpacing(node.itemSpacing)
  ) {
    violations.push(`Gap: ${node.itemSpacing}px`);
  }

  // Check padding - Figma uses individual padding properties
  if ("paddingTop" in node) {
    if (
      typeof node.paddingTop === "number" &&
      !isAllowedSpacing(node.paddingTop)
    ) {
      violations.push(`Top padding: ${node.paddingTop}px`);
    }
    if (
      typeof node.paddingBottom === "number" &&
      !isAllowedSpacing(node.paddingBottom)
    ) {
      violations.push(`Bottom padding: ${node.paddingBottom}px`);
    }
    if (
      typeof node.paddingLeft === "number" &&
      !isAllowedSpacing(node.paddingLeft)
    ) {
      violations.push(`Left padding: ${node.paddingLeft}px`);
    }
    if (
      typeof node.paddingRight === "number" &&
      !isAllowedSpacing(node.paddingRight)
    ) {
      violations.push(`Right padding: ${node.paddingRight}px`);
    }
  }

  // If we found violations, create an error
  if (violations.length > 0) {
    const allowedStr = allowedValues.join(", ");
    errors.push(
      createErrorObject(
        node,
        "spacing",
        "Non-standard spacing",
        `${violations.join("; ")}. Use values from spacing scale: ${allowedStr}`,
      ),
    );
  }
}

// --------------------------------------------
// RULE 4: COMPONENT USAGE VALIDATION
// --------------------------------------------

/**
 * Detects raw elements that should be component instances.
 * Looks for common patterns (buttons, inputs, cards, avatars) built from primitives.
 * STRICT: All matches are flagged as errors.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkComponentUsage(
  node: SceneNode,
  errors: LintError[],
): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableComponentCheck) {
    return;
  }

  // Skip instances (already using components), components themselves, and invisible nodes
  if (node.type === "INSTANCE" || node.type === "COMPONENT" || !node.visible) {
    return;
  }

  const patterns = CUSTOM_LINT_CONFIG.componentPatterns;

  // Check for button-like patterns
  if ((node.type === "FRAME" || node.type === "RECTANGLE") && patterns.button) {
    const { minWidth, maxWidth, minHeight, maxHeight, hasText } =
      patterns.button;

    const isButtonSized =
      node.width >= minWidth &&
      node.width <= maxWidth &&
      node.height >= minHeight &&
      node.height <= maxHeight;

    if (isButtonSized) {
      // For frames, check if it has text children
      if (node.type === "FRAME") {
        if (!hasText || hasTextChildren(node)) {
          errors.push(
            createErrorObject(
              node,
              "component",
              "Use Button component",
              `This ${node.width}x${node.height}px frame with text looks like a button. Consider using a Button component from the library.`,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              "info",
            ),
          );
          return;
        }
      }
    }
  }

  // Check for input-like patterns
  if (node.type === "FRAME" && patterns.input) {
    const { minWidth, maxWidth, minHeight, maxHeight, hasBorder } =
      patterns.input;

    const isInputSized =
      node.width >= minWidth &&
      node.width <= maxWidth &&
      node.height >= minHeight &&
      node.height <= maxHeight;

    if (isInputSized && (!hasBorder || hasVisibleStrokes(node))) {
      errors.push(
        createErrorObject(
          node,
          "component",
          "Use Input component",
          `This ${node.width}x${node.height}px frame with border looks like an input field. Consider using an Input component.`,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "info",
        ),
      );
      return;
    }
  }

  // Check for card-like patterns
  if (node.type === "FRAME" && patterns.card) {
    const { minWidth, minHeight, hasMultipleChildren } = patterns.card;

    const isCardSized = node.width >= minWidth && node.height >= minHeight;

    if (isCardSized) {
      const childCount = "children" in node ? node.children.length : 0;
      if (!hasMultipleChildren || childCount >= 2) {
        // Only flag if it has fill and multiple children (looks intentional)
        const hasFill =
          "fills" in node &&
          typeof node.fills !== "symbol" &&
          node.fills.length > 0 &&
          node.fills.some((f) => f.visible !== false);

        if (hasFill && childCount >= 3) {
          errors.push(
            createErrorObject(
              node,
              "component",
              "Consider Card component",
              `This ${node.width}x${node.height}px frame with ${childCount} children looks like a card. Consider using a Card component.`,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              "info",
            ),
          );
          return;
        }
      }
    }
  }

  // Check for avatar-like patterns
  if (
    (node.type === "ELLIPSE" ||
      node.type === "FRAME" ||
      node.type === "RECTANGLE") &&
    patterns.avatar
  ) {
    const { sizes } = patterns.avatar;

    // Check if the node is circular and matches an avatar size
    if (isCircular(node)) {
      const nodeSize = Math.round(node.width);
      const matchesAvatarSize = sizes.some(
        (size) => Math.abs(nodeSize - size) < 2,
      );

      if (matchesAvatarSize) {
        // Check if it has an image fill (common for avatars)
        const hasImageFill =
          "fills" in node &&
          typeof node.fills !== "symbol" &&
          node.fills.some((f) => f.type === "IMAGE");

        if (hasImageFill) {
          errors.push(
            createErrorObject(
              node,
              "component",
              "Use Avatar component",
              `This ${nodeSize}px circular image looks like an avatar. Consider using an Avatar component.`,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              "info",
            ),
          );
        }
      }
    }
  }
}

// --------------------------------------------
// RULE 5: NAMING CONVENTION VALIDATION
// --------------------------------------------

/**
 * Validates that layer names follow design system naming conventions.
 * STRICT: All violations are flagged as errors.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkNamingConventions(
  node: SceneNode,
  errors: LintError[],
): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableNamingCheck) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  const name = node.name;
  const patterns = CUSTOM_LINT_CONFIG.namingPatterns;
  const placeholders = CUSTOM_LINT_CONFIG.placeholderPatterns;

  // First check for placeholder/default names (applies to all types)
  const isPlaceholder = placeholders.some((pattern) => pattern.test(name));

  if (isPlaceholder) {
    errors.push(
      createErrorObject(
        node,
        "naming",
        "Rename layer",
        `"${name}" is a default Figma name. Give this layer a descriptive name that reflects its purpose.`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "warning",
      ),
    );
    return;
  }

  // Type-specific naming validation
  let pattern: RegExp | null = null;
  let patternDescription = "";

  switch (node.type) {
    case "FRAME":
      pattern = patterns.frame;
      patternDescription = "PascalCase with optional separators (/ - space)";
      break;
    case "COMPONENT":
    case "COMPONENT_SET":
      pattern = patterns.component;
      patternDescription = "PascalCase (e.g., Button, Card/Large)";
      break;
    case "GROUP":
      pattern = patterns.group;
      patternDescription = "Descriptive alphanumeric name";
      break;
    case "RECTANGLE":
    case "ELLIPSE":
    case "POLYGON":
    case "STAR":
    case "VECTOR":
    case "LINE":
      pattern = patterns.shape;
      patternDescription = "Descriptive name (not default)";
      break;
    case "TEXT":
      pattern = patterns.text;
      break;
    case "INSTANCE":
      pattern = patterns.instance;
      break;
    default:
      return;
  }

  // Validate against pattern if one is defined
  if (pattern && !pattern.test(name)) {
    errors.push(
      createErrorObject(
        node,
        "naming",
        "Naming convention",
        `"${name}" doesn't follow naming conventions. Expected: ${patternDescription}`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "warning",
      ),
    );
  }
}

// --------------------------------------------
// RULE 6: NESTED AUTO-LAYOUT WARNING
// --------------------------------------------

/**
 * Warns about excessive auto-layout nesting depth.
 * LENIENT: Issues are flagged as warnings, not errors.
 * Deep nesting can indicate overly complex component structures.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkAutoLayoutNesting(
  node: SceneNode,
  errors: LintError[],
): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableNestingCheck) {
    return;
  }

  // Only check frames with auto-layout
  if (!hasAutoLayout(node)) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  const depth = getAutoLayoutDepth(node);
  const maxDepth = CUSTOM_LINT_CONFIG.maxAutoLayoutNestingDepth;

  if (depth > maxDepth) {
    errors.push(
      createErrorObject(
        node,
        "nesting",
        "Deep auto-layout nesting",
        `This frame is nested ${depth} levels deep in auto-layout (max recommended: ${maxDepth}). Consider simplifying the structure or extracting into a component.`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "warning", // Lenient - advisory only
      ),
    );
  }
}

// --------------------------------------------
// RULE 7: FIXED DIMENSIONS CHECK
// --------------------------------------------

/**
 * Flags frames with fixed dimensions that should likely use hug/fill constraints.
 * Fixed dimensions often cause responsive issues when implemented in code.
 * STRICT: All violations are flagged.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkFixedDimensions(
  node: SceneNode,
  errors: LintError[],
): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableFixedDimensionsCheck) {
    return;
  }

  // Only check frames with auto-layout
  if (!hasAutoLayout(node)) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  // Skip small elements (often intentionally fixed)
  const minSize = CUSTOM_LINT_CONFIG.fixedDimensionMinSize;
  if (node.width < minSize && node.height < minSize) {
    return;
  }

  const issues: string[] = [];

  // Check primary axis sizing
  // In HORIZONTAL layout, width is primary axis
  // In VERTICAL layout, height is primary axis
  if (node.layoutMode === "HORIZONTAL") {
    // Check if width is fixed when it could be hug/fill
    if (
      node.primaryAxisSizingMode === "FIXED" &&
      node.width >= minSize &&
      "children" in node &&
      node.children.length > 0
    ) {
      issues.push(`Fixed width (${Math.round(node.width)}px)`);
    }
  } else if (node.layoutMode === "VERTICAL") {
    // Check if height is fixed when it could be hug/fill
    if (
      node.primaryAxisSizingMode === "FIXED" &&
      node.height >= minSize &&
      "children" in node &&
      node.children.length > 0
    ) {
      issues.push(`Fixed height (${Math.round(node.height)}px)`);
    }
  }

  // Check counter axis sizing (perpendicular to layout direction)
  if (node.layoutMode === "HORIZONTAL") {
    if (
      node.counterAxisSizingMode === "FIXED" &&
      node.height >= minSize &&
      "children" in node &&
      node.children.length > 0
    ) {
      issues.push(`Fixed height (${Math.round(node.height)}px)`);
    }
  } else if (node.layoutMode === "VERTICAL") {
    if (
      node.counterAxisSizingMode === "FIXED" &&
      node.width >= minSize &&
      "children" in node &&
      node.children.length > 0
    ) {
      issues.push(`Fixed width (${Math.round(node.width)}px)`);
    }
  }

  if (issues.length > 0) {
    errors.push(
      createErrorObject(
        node,
        "fill", // Using 'fill' type as it relates to layout
        "Fixed dimensions",
        `${issues.join(", ")}. Consider using "Hug" or "Fill" for responsive layouts.`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "info",
      ),
    );
  }
}

// --------------------------------------------
// RULE 8: TOUCH TARGET SIZE CHECK
// --------------------------------------------

/**
 * Flags interactive elements that are smaller than the minimum touch target size.
 * Apple HIG recommends 44x44px, Material Design recommends 48x48px.
 * STRICT: All violations are flagged.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkTouchTargetSize(
  node: SceneNode,
  errors: LintError[],
): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableTouchTargetCheck) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  // Check if this looks like an interactive element based on name
  const name = node.name.toLowerCase();
  const isInteractive = CUSTOM_LINT_CONFIG.interactivePatterns.some((pattern) =>
    pattern.test(name),
  );

  // Also check if it's an instance of a component that looks interactive
  const isInteractiveInstance =
    node.type === "INSTANCE" &&
    CUSTOM_LINT_CONFIG.interactivePatterns.some((pattern) =>
      pattern.test(name),
    );

  if (!isInteractive && !isInteractiveInstance) {
    return;
  }

  const minSize = CUSTOM_LINT_CONFIG.minTouchTargetSize;
  const width = Math.round(node.width);
  const height = Math.round(node.height);

  if (width < minSize || height < minSize) {
    const issues: string[] = [];
    if (width < minSize) issues.push(`width: ${width}px`);
    if (height < minSize) issues.push(`height: ${height}px`);

    errors.push(
      createErrorObject(
        node,
        "radius", // Using 'radius' type as it relates to sizing
        "Touch target too small",
        `${issues.join(", ")} is below ${minSize}px minimum. Small touch targets are hard to tap on mobile.`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "warning",
      ),
    );
  }
}

// --------------------------------------------
// RULE 9: EMPTY FRAME CHECK
// --------------------------------------------

/**
 * Flags frames that have no children.
 * Empty frames are often forgotten placeholders or accidental creations.
 * STRICT: All violations are flagged.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkEmptyFrames(node: SceneNode, errors: LintError[]): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableEmptyFrameCheck) {
    return;
  }

  // Only check frames
  if (node.type !== "FRAME") {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  // Check for empty children
  if ("children" in node && node.children.length === 0) {
    // Skip if it has a fill (might be intentional spacer or background)
    const hasFill =
      "fills" in node &&
      typeof node.fills !== "symbol" &&
      node.fills.length > 0 &&
      node.fills.some((f) => f.visible !== false);

    // Skip small frames that might be spacers
    const isSpacer = node.width <= 32 && node.height <= 32;

    if (!hasFill && !isSpacer) {
      errors.push(
        createErrorObject(
          node,
          "fill", // Using 'fill' type
          "Empty frame",
          `"${node.name}" has no children. Remove if unused or add content.`,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "warning",
        ),
      );
    }
  }
}

// --------------------------------------------
// RULE 10: DETACHED INSTANCE CHECK
// --------------------------------------------

/**
 * Flags instances that have been detached from their main component.
 * Detached instances break design system consistency and make updates harder.
 * Note: This checks for frames that were likely instances based on naming patterns.
 * STRICT: All violations are flagged.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkDetachedInstances(
  node: SceneNode,
  errors: LintError[],
): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableDetachedInstanceCheck) {
    return;
  }

  // Only check frames (detached instances become frames)
  if (node.type !== "FRAME") {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  // Look for naming patterns that suggest this was a component instance
  // Common patterns: "ComponentName", "Component / Variant", component naming conventions
  const name = node.name;

  // Check for component-like naming (PascalCase with optional slash variants)
  const componentPattern = /^[A-Z][a-zA-Z0-9]*(?:\s*\/\s*[A-Z][a-zA-Z0-9]*)*$/;

  // Check for common component prefixes/suffixes
  const componentKeywords =
    /^(Button|Card|Input|Modal|Dialog|Dropdown|Menu|Nav|Header|Footer|Sidebar|Avatar|Badge|Chip|Tag|Icon|Alert|Toast|Banner|Tooltip|Popover|Tab|Accordion|List|Table|Form|Field|Label|Checkbox|Radio|Switch|Toggle|Slider|Progress|Spinner|Skeleton|Divider|Spacer)/i;

  if (componentPattern.test(name) && componentKeywords.test(name)) {
    // Additional check: if it has the structure of a component (auto-layout, multiple children)
    const hasAutoLayoutStructure =
      "layoutMode" in node && node.layoutMode !== "NONE";
    const hasMultipleChildren = "children" in node && node.children.length >= 1;

    if (hasAutoLayoutStructure && hasMultipleChildren) {
      errors.push(
        createErrorObject(
          node,
          "component",
          "Possibly detached instance",
          `"${name}" looks like a detached component. Re-link to the library component for consistency.`,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "warning",
        ),
      );
    }
  }
}

// --------------------------------------------
// RULE 11: ICON SIZE CHECK
// --------------------------------------------

/**
 * Flags icons that don't use standard sizes.
 * Consistent icon sizing improves visual harmony and simplifies implementation.
 * STRICT: All violations are flagged.
 *
 * @param node - The Figma node to check
 * @param errors - Array to push errors to
 */
export function checkIconSize(node: SceneNode, errors: LintError[]): void {
  // Skip if feature is disabled
  if (!CUSTOM_LINT_CONFIG.enableIconSizeCheck) {
    return;
  }

  // Skip invisible nodes
  if (!node.visible) {
    return;
  }

  // Detect icons by name pattern or node type
  const name = node.name.toLowerCase();
  const isIconByName =
    name.includes("icon") ||
    name.includes("ico-") ||
    name.includes("ic-") ||
    name.includes("ic_") ||
    name.startsWith("icon/") ||
    name.startsWith("icons/");

  // Also check for vector nodes that might be icons (small, square-ish)
  const isVectorIcon =
    (node.type === "VECTOR" ||
      node.type === "BOOLEAN_OPERATION" ||
      node.type === "FRAME" ||
      node.type === "INSTANCE") &&
    Math.abs(node.width - node.height) < 4 && // Roughly square
    node.width <= 64 && // Not too large
    node.width >= 8; // Not too small

  if (!isIconByName && !isVectorIcon) {
    return;
  }

  // For icon detection by name, always check. For vector detection, be more lenient.
  if (!isIconByName && !isVectorIcon) {
    return;
  }

  const allowedSizes = CUSTOM_LINT_CONFIG.allowedIconSizes;
  const width = Math.round(node.width);
  const height = Math.round(node.height);

  // Check if size matches allowed icon sizes (with 1px tolerance)
  const isAllowedWidth = allowedSizes.some((s) => Math.abs(width - s) <= 1);
  const isAllowedHeight = allowedSizes.some((s) => Math.abs(height - s) <= 1);

  if (!isAllowedWidth || !isAllowedHeight) {
    const allowedStr = allowedSizes.join(", ");
    errors.push(
      createErrorObject(
        node,
        "radius", // Using 'radius' type for sizing issues
        "Non-standard icon size",
        `${width}×${height}px is not a standard icon size. Use: ${allowedStr}px`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "warning",
      ),
    );
  }
}
