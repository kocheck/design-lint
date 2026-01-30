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
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6 10.5C6 11.3284 5.3284 12 4.5 12C3.67157 12 3 11.3284 3 10.5C3 9.6716 3.67157 9 4.5 9C5.3284 9 6 9.6716 6 10.5ZM12 10.5C12 11.3284 11.3284 12 10.5 12C9.6716 12 9 11.3284 9 10.5C9 9.6716 9.6716 9 10.5 9C11.3284 9 12 9.6716 12 10.5ZM16.5 12C17.3284 12 18 11.3284 18 10.5C18 9.6716 17.3284 9 16.5 9C15.6716 9 15 9.6716 15 10.5C15 11.3284 15.6716 12 16.5 12Z"
                  fill="currentColor"
                />
              </svg>
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
