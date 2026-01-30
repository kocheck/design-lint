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
        <svg
          onClick={() => handleSelectAll(style.groupedConsumers || {})}
          className="overview-icon overview-content-select tap-effect-small"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.5 6V3.025C5.138 3.259 3.26 5.138 3.025 7.5H6V8.5H3.025C3.259 10.862 5.138 12.74 7.5 12.975V10H8.5V12.975C10.862 12.741 12.74 10.862 12.975 8.5H10V7.5H12.975C12.741 5.138 10.862 3.26 8.5 3.025V6H7.5ZM13.98 7.5C13.739 4.585 11.415 2.261 8.5 2.02V0H7.5V2.02C4.585 2.261 2.261 4.585 2.02 7.5H0V8.5H2.02C2.261 11.415 4.585 13.739 7.5 13.98V16H8.5V13.98C11.415 13.739 13.739 11.415 13.98 8.5H16V7.5H13.98Z"
            fill="currentColor"
          />
        </svg>
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
