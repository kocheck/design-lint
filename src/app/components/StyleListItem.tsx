import React, { useState } from "react";
import StyleContent from "./StyleContent";
import {
  RemoteFillStyle,
  RemoteStrokeStyle,
  RemoteTextStyle,
  RemoteEffectStyle,
} from "../../types";

// Duplicate component that matches styleContent but has very small differences to work on the styles page.

interface StyleListItemProps {
  style:
    | RemoteFillStyle
    | RemoteStrokeStyle
    | RemoteTextStyle
    | RemoteEffectStyle;
  index: number;
}

function ListItem({ style, index }: StyleListItemProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleToggle = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };

  function handleSelectAll(nodeArray: Record<string, string[]>) {
    const arrays = Object.values(nodeArray);

    // Flatten the arrays into a single array using Array.prototype.flat
    const combinedArray = arrays.flat();

    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: combinedArray,
        },
      },
      "*",
    );
  }

  function handleSelect(nodeArray: string[]) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: nodeArray,
        },
      },
      "*",
    );
  }

  function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  const listItemClass = isOpen
    ? "overview-list-item"
    : "overview-list-item list-item--open";

  return (
    <li className={listItemClass} key={`style item - ${style.name}-${index}`}>
      <div className="overview-content">
        <StyleContent
          style={style}
          type={style.type.toLowerCase()}
          error={style}
        />
        <img
          onClick={() => handleSelectAll(style.groupedConsumers || {})}
          className="overview-icon overview-content-select tap-effect-small"
          src={require("../assets/select-all.svg")}
        />
      </div>
      <ul className="consumer-sublist">
        {style.groupedConsumers &&
          Object.entries(style.groupedConsumers).map(
            ([nodeType, nodeIds]: [string, string[]]) => (
              <li
                className="consumer-sublist-item"
                key={`${style.name}-${nodeType}`}
                onClick={() => handleSelect(nodeIds)}
              >
                <img
                  className="sublist-item-icon"
                  src={require(`../assets/${nodeType.toLowerCase()}.svg`)}
                />
                <span className="sublist-item-label">
                  <span className="sublist-item-count">{nodeIds.length}</span>{" "}
                  {capitalizeFirstLetter(nodeType)} Layers
                </span>
              </li>
            ),
          )}
      </ul>
    </li>
  );
}

export default ListItem;
