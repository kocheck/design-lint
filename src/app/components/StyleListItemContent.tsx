import * as React from "react";
import { StyleSuggestion, StyleMatch, BulkError } from "../../types";

function truncateStyle(string: string): string {
  return string.length > 40 ? string.substring(0, 40) + "..." : string;
}

interface StyleContentProps {
  style: StyleSuggestion | StyleMatch;
  type: string;
  error: BulkError | { fillColor?: string | null; paint?: Paint };
}

const StyleContent: React.FC<StyleContentProps> = ({ style, type, error }) => {
  const renderStylePreview = () => {
    switch (type) {
      case "fill":
        if ("fillColor" in error && error.fillColor) {
          return (
            <div
              className="style-preview fill-preview"
              style={{ background: error.fillColor }}
            ></div>
          );
        } else if (
          "paint" in error &&
          error.paint &&
          error.paint.type === "IMAGE"
        ) {
          return (
            <div className="style-preview">
              <img
                className="style-icon"
                src={require("../assets/image.svg")}
              />
            </div>
          );
        } else if (
          "paint" in error &&
          error.paint &&
          error.paint.type === "VIDEO"
        ) {
          return (
            <div className="style-preview">
              <img
                className="style-icon"
                src={require("../assets/video.svg")}
              />
            </div>
          );
        } else {
          return (
            <div
              className="style-preview fill-preview"
              style={{
                background:
                  ("fillColor" in error && error.fillColor) || undefined,
              }}
            ></div>
          );
        }
      case "stroke":
        return (
          <div
            className="style-preview fill-preview"
            style={{
              background:
                ("fillColor" in error && error.fillColor) || undefined,
            }}
          ></div>
        );
      case "text":
        return (
          <div className="style-preview text-preview">
            <span
              style={{
                fontWeight:
                  ("textProperties" in style &&
                    style.textProperties?.fontStyle) ||
                  "normal",
              }}
            >
              Ag
            </span>
          </div>
        );
      case "effects":
        return (
          <div className="style-preview effect-preview">
            {"effects" in style && style.effects && style.effects[0] && (
              <img
                className="effect-icon"
                src={getEffectIcon(style.effects[0].type)}
                alt={style.effects[0].type}
              />
            )}
          </div>
        );
      case "effect":
        return (
          <div className="style-preview effect-preview">
            {"effects" in style && style.effects && style.effects[0] && (
              <img
                className="effect-icon"
                src={getEffectIcon(style.effects[0].type)}
                alt={style.effects[0].type}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getEffectIcon = (effectType: string): string => {
    switch (effectType) {
      case "DROP_SHADOW":
        return require("../assets/drop-shadow.svg");
      case "INNER_SHADOW":
        return require("../assets/inner-shadow.svg");
      case "LAYER_BLUR":
        return require("../assets/layer-blur.svg");
      case "BACKGROUND_BLUR":
        return require("../assets/background-blur.svg");
      default:
        return "";
    }
  };

  return (
    <div className="style-list-item">
      {renderStylePreview()}
      <span className="style-name">{truncateStyle(style.name)}</span>
    </div>
  );
};

export default StyleContent;
