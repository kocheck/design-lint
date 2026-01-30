import {
  determineFill,
  gradientToCSS,
  createErrorObject,
} from "../plugin/lintingFunctions";

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
});
