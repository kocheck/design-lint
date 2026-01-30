import * as React from "react";
import StyleListItemContent from "./StyleListItemContent";
import { useState, useRef, useEffect } from "react";
import Button from "./Button";
import SuggestionButton from "./SuggestionButton";
import "../styles/modal.css";
import { BulkError } from "../../types";

interface BulkErrorListItemProps {
  error: BulkError;
  index: number;
  handlePanelVisible: (visible: boolean) => void;
  handleUpdatePanelError: (error: BulkError) => void;
  handleUpdatePanelSuggestion: (index: number) => void;
  handleIgnoreChange: (error: BulkError) => void;
  handleSelectAll: (error: BulkError) => void;
  handleSelect: (error: BulkError) => void;
  handleIgnoreAll: (error: BulkError) => void;
  handleFixAll: (error: BulkError) => void;
  handleBorderRadiusUpdate: (value: string) => void;
  handleCreateStyle: (error: BulkError) => void;
  handleSuggestion: (error: BulkError, index: number) => void;
}

function BulkErrorListItem(props: BulkErrorListItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [menuState, setMenuState] = useState<boolean>(false);
  const error = props.error;

  useOnClickOutside(ref, () => hideMenu());

  const showMenu = () => {
    setMenuState(true);
  };

  const hideMenu = () => {
    setMenuState(false);
  };

  function handlePanelVisible(
    boolean: boolean,
    error: BulkError,
    index: number,
  ) {
    props.handlePanelVisible(boolean);
    props.handleUpdatePanelError(error);
    props.handleUpdatePanelSuggestion(index);
  }

  function handleIgnoreChange(error: BulkError) {
    props.handleIgnoreChange(error);
  }

  function handleSelectAll(error: BulkError) {
    props.handleSelectAll(error);
  }

  function handleSelect(error: BulkError) {
    props.handleSelect(error);
  }

  function handleIgnoreAll(error: BulkError) {
    props.handleIgnoreAll(error);
  }

  function handleFixAll(error: BulkError) {
    props.handleFixAll(error);
  }

  function handleBorderRadiusUpdate(value: string) {
    props.handleBorderRadiusUpdate(value);
  }

  function handleCreateStyle(error: BulkError) {
    if (error.value !== "Mixed values") {
      props.handleCreateStyle(error);
    } else {
      parent.postMessage(
        {
          pluginMessage: {
            type: "notify-user",
            message: "Sorry! You can't create styles from mixed fill values.",
          },
        },
        "*",
      );
    }
  }

  function handleSuggestion(error: BulkError, index: number) {
    props.handleSuggestion(error, index);
  }

  function truncate(string: string): string {
    return string.length > 46 ? string.substring(0, 46) + "..." : string;
  }

  const hasNoMatches = !error.matches || error.matches.length === 0;
  const errorTypeIsNotRadius = error.type !== "radius";
  const severity = error.severity || "error";

  // Get severity indicator
  const getSeverityIndicator = () => {
    switch (severity) {
      case "warning":
        return { icon: "⚠", className: "severity-warning" };
      case "info":
        return { icon: "ℹ", className: "severity-info" };
      default:
        return { icon: "", className: "severity-error" };
    }
  };

  const severityInfo = getSeverityIndicator();

  return (
    <li
      className={`error-list-item list-item-enter ${severityInfo.className}`}
      key={error.node.id + props.index}
      data-type={error.type.toLowerCase()}
      data-severity={severity}
    >
      <div className="flex-row" ref={ref} onClick={showMenu}>
        <span
          className={`error-type error-background-${error.type.toLowerCase()} ${severityInfo.className}`}
        >
          {severityInfo.icon && (
            <span className="severity-icon">{severityInfo.icon}</span>
          )}
          <img
            src={require(
              "../assets/error-type/" + error.type.toLowerCase() + ".svg",
            )}
          />
        </span>
        <span className="error-description">
          {error.nodes.length > 1 ? (
            <div className="error-description__message">
              {error.message}{" "}
              <span className="error-description__count">
                · ({error.count})
              </span>
            </div>
          ) : (
            <div className="error-description__message">{error.message}</div>
          )}
          {error.value ? (
            <div className="current-value tooltip" data-text="Tooltip">
              {truncate(error.value)}
            </div>
          ) : null}
        </span>
        <span className="context-icon tap-effect">
          <div className="menu" ref={ref}>
            <div className="menu-trigger" onClick={showMenu}>
              <img src={require("../assets/context.svg")} />
            </div>
          </div>
        </span>

        {error.nodes.length > 1 ? (
          <ul
            className={
              "menu-items select-menu__list " +
              (menuState ? "select-menu__list--active" : "")
            }
          >
            <li
              className="select-menu__list-item"
              key="list-item-1"
              onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                event.stopPropagation();
                handleSelectAll(error);
                hideMenu();
              }}
            >
              Select All ({error.count})
            </li>
            <li
              className="select-menu__list-item"
              key="list-item-3"
              onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                event.stopPropagation();
                handleIgnoreAll(error);
                hideMenu();
              }}
            >
              Ignore All
            </li>
            {errorTypeIsNotRadius && hasNoMatches && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-create-style"
                onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                  event.stopPropagation();
                  handleCreateStyle(error);
                  hideMenu();
                }}
              >
                Create Style
              </li>
            )}
            {error.type === "radius" && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-radius"
                onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                  event.stopPropagation();
                  handleBorderRadiusUpdate(error.value);
                  hideMenu();
                }}
              >
                Allow This Radius
              </li>
            )}
          </ul>
        ) : (
          <ul
            className={
              "menu-items select-menu__list " +
              (menuState ? "select-menu__list--active" : "")
            }
          >
            <li
              className="select-menu__list-item"
              key="list-item-1"
              onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                event.stopPropagation();
                handleSelect(error);
                hideMenu();
              }}
            >
              Select
            </li>
            <li
              className="select-menu__list-item"
              key="list-item-2"
              onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                event.stopPropagation();
                handleIgnoreChange(error);
                hideMenu();
              }}
            >
              Ignore
            </li>
            {errorTypeIsNotRadius && hasNoMatches && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-create-style"
                onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                  event.stopPropagation();
                  handleCreateStyle(error);
                  hideMenu();
                }}
              >
                Create Style
              </li>
            )}
            {error.type === "radius" && (
              <li
                className="select-menu__list-item select-menu__list-border"
                key="list-item-radius"
                onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                  event.stopPropagation();
                  handleBorderRadiusUpdate(error.value);
                  hideMenu();
                }}
              >
                Allow This Radius
              </li>
            )}
          </ul>
        )}
      </div>
      {error.matches && (
        <div className="auto-fix-content">
          <div className="auto-fix-style">
            <StyleListItemContent
              style={error.matches[0]}
              type={error.type.toLowerCase()}
              error={error}
            />
          </div>
          <Button error={error} applyStyle={handleFixAll} />
        </div>
      )}
      {error.suggestions && (
        <>
          <span className="suggestion-label">Suggestions</span>
          <div className="auto-fix-suggestion">
            <div
              className="auto-fix-style auto-fix-style-clickable"
              onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                event.stopPropagation();
                handlePanelVisible(true, error, 0);
              }}
            >
              <StyleListItemContent
                style={error.suggestions[0]}
                type={error.type.toLowerCase()}
                error={error}
              />
            </div>
            <SuggestionButton
              error={error}
              index={0}
              applyStyle={handleSuggestion}
            />
          </div>
          {error.suggestions[1] && (
            <div className="auto-fix-suggestion suggestion-last">
              <div
                className="auto-fix-style auto-fix-style-clickable"
                onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                  event.stopPropagation();
                  handlePanelVisible(true, error, 1);
                }}
              >
                <StyleListItemContent
                  style={error.suggestions[1]}
                  type={error.type.toLowerCase()}
                  error={error}
                />
              </div>
              <SuggestionButton
                error={error}
                index={1}
                applyStyle={handleSuggestion}
              />
            </div>
          )}
        </>
      )}
    </li>
  );
}

// React hook click outside the component
function useOnClickOutside(
  ref: React.RefObject<HTMLDivElement>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export default BulkErrorListItem;
