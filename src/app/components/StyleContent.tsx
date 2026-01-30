import * as React from "react";
import {
  RemoteFillStyle,
  RemoteStrokeStyle,
  RemoteTextStyle,
  RemoteEffectStyle,
} from "../../types";

function truncateStyle(string: string): string {
  return string.length > 28 ? string.substring(0, 28) + "..." : string;
}

interface StyleContentProps {
  style:
    | RemoteFillStyle
    | RemoteStrokeStyle
    | RemoteTextStyle
    | RemoteEffectStyle;
  type: string;
  error:
    | RemoteFillStyle
    | RemoteStrokeStyle
    | RemoteTextStyle
    | RemoteEffectStyle;
}

const StyleContent: React.FC<StyleContentProps> = ({ style, type, error }) => {
  const renderStylePreview = () => {
    switch (type) {
      case "fill":
        return (
          <div
            className="style-preview fill-preview"
            style={{
              background:
                "fillColor" in error ? error.fillColor || undefined : undefined,
            }}
          ></div>
        );
      case "stroke":
        return (
          <div
            className="style-preview fill-preview"
            style={{
              background:
                "fillColor" in error ? error.fillColor || undefined : undefined,
            }}
          ></div>
        );
      case "text":
        return (
          <div className="style-preview text-preview">
            <span style={{ fontWeight: "normal" }}>Ag</span>
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
