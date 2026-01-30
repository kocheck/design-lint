import {
  determineFill,
  gradientToCSS,
  createErrorObject,
  cleanStyleKey,
  checkSpacingValues,
  checkNamingConventions,
  checkAutoLayoutNesting,
  CUSTOM_LINT_CONFIG,
} from "../plugin/lintingFunctions";
import type { LintError } from "../types";

// Mock Figma types
const mockNode = { id: "node-1", name: "Test Node" } as any;

describe("lintingFunctions", () => {
  describe("determineFill", () => {
    it("should return hex value for solid fill", () => {
      const fills = [
        {
          type: "SOLID",
          color: { r: 1, g: 0, b: 0 },
        },
      ];
      const result = determineFill(fills as any);
      expect(result).toMatch(/#[A-F0-9]{6}/i);
    });

    it("should return image description for image fill", () => {
      const fills = [
        {
          type: "IMAGE",
          imageHash: "abc123",
        },
      ];
      expect(determineFill(fills as any)).toBe("Image - abc123");
    });

    it("should return video description for video fill", () => {
      const fills = [
        {
          type: "VIDEO",
        },
      ];
      expect(determineFill(fills as any)).toBe("Video Fill");
    });

    it("should return gradient description for linear gradient", () => {
      const fills = [
        {
          type: "GRADIENT_LINEAR",
          gradientStops: [
            { color: { r: 1, g: 0, b: 0 } },
            { color: { r: 0, g: 0, b: 1 } },
          ],
        },
      ];
      const result = determineFill(fills as any);
      expect(result).toContain("Linear Gradient");
    });

    it("should return gradient description for radial gradient", () => {
      const fills = [
        {
          type: "GRADIENT_RADIAL",
          gradientStops: [
            { color: { r: 1, g: 1, b: 1 } },
            { color: { r: 0, g: 0, b: 0 } },
          ],
        },
      ];
      const result = determineFill(fills as any);
      expect(result).toContain("Radial Gradient");
    });
  });

  describe("createErrorObject", () => {
    it("should create an error object with required fields", () => {
      const error = createErrorObject(
        mockNode,
        "fill",
        "Missing fill style",
        "#FF0000",
      );

      expect(error.type).toBe("fill");
      expect(error.message).toBe("Missing fill style");
      expect(error.node).toBe(mockNode);
      expect(error.value).toBe("#FF0000");
    });

    it("should include optional matches when provided", () => {
      const matches = [
        {
          id: "style-1",
          name: "Red",
          key: "key-1",
          value: "#FF0000",
          source: "local",
        },
      ];
      const error = createErrorObject(
        mockNode,
        "fill",
        "Missing fill style",
        "#FF0000",
        matches,
      );

      expect(error.matches).toEqual(matches);
    });

    it("should include optional suggestions when provided", () => {
      const suggestions = [
        {
          id: "style-2",
          name: "Blue",
          key: "key-2",
          value: "#0000FF",
          source: "library",
        },
      ];
      const error = createErrorObject(
        mockNode,
        "fill",
        "Missing fill style",
        "#FF0000",
        undefined,
        suggestions,
      );

      expect(error.suggestions).toEqual(suggestions);
    });

    it("should handle error without optional values", () => {
      const error = createErrorObject(mockNode, "text", "Missing text style");

      expect(error.type).toBe("text");
      expect(error.message).toBe("Missing text style");
      expect(error.value).toBe("");
    });
  });

  describe("gradientToCSS", () => {
    it("should convert linear gradient to CSS", () => {
      const fill = {
        type: "GRADIENT_LINEAR",
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
        gradientTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
      };
      const result = gradientToCSS(fill as any);
      expect(result).toContain("linear-gradient");
    });

    it("should convert radial gradient to CSS", () => {
      const fill = {
        type: "GRADIENT_RADIAL",
        gradientStops: [
          { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
        ],
      };
      const result = gradientToCSS(fill as any);
      expect(result).toContain("radial-gradient");
    });

    it("should convert angular gradient to CSS", () => {
      const fill = {
        type: "GRADIENT_ANGULAR",
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 0.5, color: { r: 0, g: 1, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
      };
      const result = gradientToCSS(fill as any);
      expect(result).toContain("conic-gradient");
    });
  });

  // ========== CUSTOM LINT RULES TESTS ==========

  describe("cleanStyleKey", () => {
    it("should remove S: prefix from style ID", () => {
      expect(cleanStyleKey("S:abc123,extra-data")).toBe("abc123");
    });

    it("should handle style ID without prefix", () => {
      expect(cleanStyleKey("abc123")).toBe("abc123");
    });

    it("should handle empty string", () => {
      expect(cleanStyleKey("")).toBe("");
    });

    it("should handle undefined gracefully", () => {
      expect(cleanStyleKey(undefined as unknown as string)).toBe("");
    });
  });

  describe("checkSpacingValues", () => {
    it("should not flag allowed spacing values", () => {
      const mockFrame = {
        id: "frame-1",
        name: "Test Frame",
        type: "FRAME",
        visible: true,
        layoutMode: "HORIZONTAL",
        itemSpacing: 16,
        paddingTop: 24,
        paddingBottom: 24,
        paddingLeft: 16,
        paddingRight: 16,
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkSpacingValues(mockFrame, errors);
      expect(errors).toHaveLength(0);
    });

    it("should flag non-standard spacing values", () => {
      const mockFrame = {
        id: "frame-2",
        name: "Test Frame",
        type: "FRAME",
        visible: true,
        layoutMode: "VERTICAL",
        itemSpacing: 15, // Not in allowed list
        paddingTop: 24,
        paddingBottom: 24,
        paddingLeft: 16,
        paddingRight: 16,
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkSpacingValues(mockFrame, errors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("spacing");
      expect(errors[0].value).toContain("Gap: 15px");
    });

    it("should skip non-autolayout frames", () => {
      const mockFrame = {
        id: "frame-3",
        name: "Test Frame",
        type: "FRAME",
        visible: true,
        layoutMode: "NONE",
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkSpacingValues(mockFrame, errors);
      expect(errors).toHaveLength(0);
    });
  });

  describe("checkNamingConventions", () => {
    it("should flag default Figma names", () => {
      const mockFrame = {
        id: "frame-1",
        name: "Frame 1",
        type: "FRAME",
        visible: true,
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkNamingConventions(mockFrame, errors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("naming");
      expect(errors[0].message).toBe("Rename layer");
    });

    it("should flag Rectangle default names", () => {
      const mockRect = {
        id: "rect-1",
        name: "Rectangle 42",
        type: "RECTANGLE",
        visible: true,
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkNamingConventions(mockRect, errors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe("naming");
    });

    it("should allow properly named frames", () => {
      const mockFrame = {
        id: "frame-2",
        name: "Header Section",
        type: "FRAME",
        visible: true,
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkNamingConventions(mockFrame, errors);
      expect(errors).toHaveLength(0);
    });

    it("should skip invisible nodes", () => {
      const mockFrame = {
        id: "frame-3",
        name: "Frame 1",
        type: "FRAME",
        visible: false,
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkNamingConventions(mockFrame, errors);
      expect(errors).toHaveLength(0);
    });
  });

  describe("checkAutoLayoutNesting", () => {
    it("should not flag shallow nesting", () => {
      // Mock a frame with shallow nesting (parent chain not deep)
      const mockFrame = {
        id: "frame-1",
        name: "Test Frame",
        type: "FRAME",
        visible: true,
        layoutMode: "HORIZONTAL",
        parent: {
          type: "FRAME",
          layoutMode: "VERTICAL",
          parent: {
            type: "PAGE",
          },
        },
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkAutoLayoutNesting(mockFrame, errors);
      expect(errors).toHaveLength(0);
    });

    it("should skip non-autolayout frames", () => {
      const mockFrame = {
        id: "frame-2",
        name: "Test Frame",
        type: "FRAME",
        visible: true,
        layoutMode: "NONE",
      } as unknown as SceneNode;

      const errors: LintError[] = [];
      checkAutoLayoutNesting(mockFrame, errors);
      expect(errors).toHaveLength(0);
    });
  });

  describe("CUSTOM_LINT_CONFIG", () => {
    it("should have default spacing values defined", () => {
      expect(CUSTOM_LINT_CONFIG.allowedSpacingValues).toBeDefined();
      expect(CUSTOM_LINT_CONFIG.allowedSpacingValues.length).toBeGreaterThan(0);
      expect(CUSTOM_LINT_CONFIG.allowedSpacingValues).toContain(0);
      expect(CUSTOM_LINT_CONFIG.allowedSpacingValues).toContain(8);
      expect(CUSTOM_LINT_CONFIG.allowedSpacingValues).toContain(16);
    });

    it("should have naming patterns defined", () => {
      expect(CUSTOM_LINT_CONFIG.namingPatterns).toBeDefined();
      expect(CUSTOM_LINT_CONFIG.namingPatterns.frame).toBeInstanceOf(RegExp);
    });

    it("should have placeholder patterns defined", () => {
      expect(CUSTOM_LINT_CONFIG.placeholderPatterns).toBeDefined();
      expect(CUSTOM_LINT_CONFIG.placeholderPatterns.length).toBeGreaterThan(0);
    });

    it("should have feature flags defined", () => {
      expect(typeof CUSTOM_LINT_CONFIG.enableColorCheck).toBe("boolean");
      expect(typeof CUSTOM_LINT_CONFIG.enableTypographyCheck).toBe("boolean");
      expect(typeof CUSTOM_LINT_CONFIG.enableSpacingCheck).toBe("boolean");
      expect(typeof CUSTOM_LINT_CONFIG.enableNamingCheck).toBe("boolean");
      expect(typeof CUSTOM_LINT_CONFIG.enableNestingCheck).toBe("boolean");
    });
  });
});
