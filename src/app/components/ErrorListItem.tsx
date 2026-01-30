import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { LintError } from "../../types";

interface ErrorListItemProps {
  error: LintError;
  errorCount: number;
  index: number;
  handleIgnoreChange: (error: LintError) => void;
  handleSelectAll: (error: LintError) => void;
  handleIgnoreAll: (error: LintError) => void;
}

function ErrorListItem(props: ErrorListItemProps) {
  const listRef = useRef<HTMLLIElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuState, setMenuState] = useState<boolean>(false);
  const error = props.error;

  useOnClickOutside(listRef, () => hideMenu());

  const showMenu = () => {
    setMenuState(true);
  };

  const hideMenu = () => {
    setMenuState(false);
  };

  function handleIgnoreChange(error: LintError) {
    props.handleIgnoreChange(error);
  }

  function handleSelectAll(error: LintError) {
    props.handleSelectAll(error);
  }

  function handleIgnoreAll(error: LintError) {
    props.handleIgnoreAll(error);
  }

  return (
    <li className="error-list-item" ref={listRef} onClick={showMenu}>
      <div className="flex-row">
        <span className="error-type">
          <img
            src={require(
              "../assets/error-type/" + error.type.toLowerCase() + ".svg",
            )}
          />
        </span>
        <span className="error-description">
          <div className="error-description__message">{error.message}</div>
          {error.value ? (
            <div className="current-value">{error.value}</div>
          ) : null}
        </span>
        <span className="context-icon">
          <div className="menu" ref={menuRef}>
            <div className="menu-trigger" onClick={showMenu}>
              <img src={require("../assets/context.svg")} />
            </div>
          </div>
        </span>

        {props.errorCount > 1 ? (
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
              Select All ({props.errorCount})
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
              key="list-item-2"
              onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                event.stopPropagation();
                handleIgnoreChange(error);
                hideMenu();
              }}
            >
              Ignore
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
          </ul>
        )}
      </div>
    </li>
  );
}

// React hook click outside the component
function useOnClickOutside(
  ref: React.RefObject<HTMLLIElement>,
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

export default ErrorListItem;
