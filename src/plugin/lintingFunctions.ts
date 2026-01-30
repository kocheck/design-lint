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
} from "../types/index";

// Generic function for creating an error object to pass to the app.
export function createErrorObject(
  node: SceneNode,
  type: "fill" | "text" | "stroke" | "radius" | "effects",
  message: string,
  value?: string,
  matches?: StyleMatch[],
  suggestions?: StyleMatch[],
  fillColor?: string | null,
  textProperties?: TextProperties,
  variableMatches?: VariableMatch[],
  variableSuggestions?: VariableSuggestion[],
): LintError {
  const error: LintError = {
    message: message,
    type: type,
    node: node,
    value: value || "",
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
          "topRightRadius" in node ? String(node.topRightRadius) : "",
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

        let lineHeightCheck: string | number;

        if (
          "lineHeight" in node &&
          typeof node.lineHeight !== "symbol" &&
          node.lineHeight.unit !== "AUTO"
        ) {
          if (
            typeof style.lineHeight === "object" &&
            "value" in style.lineHeight
          ) {
            lineHeightCheck = style.lineHeight.value || 0;
          } else {
            lineHeightCheck = 0;
          }
        } else {
          lineHeightCheck = "Auto";
        }

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
