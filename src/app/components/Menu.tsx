import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { LintError } from "../../types";

interface MenuItem {
  label: string;
  event: (error: LintError) => void;
}

interface MenuProps {
  menuItems: MenuItem[];
  error: LintError;
}

function Menu(props: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [menuState, setMenuState] = useState<boolean>(false);

  useOnClickOutside(ref, () => hideMenu());

  const showMenu = () => {
    setMenuState(true);
  };

  const hideMenu = () => {
    setMenuState(false);
  };

  return (
    <div className="menu" ref={ref}>
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
      <ul
        className={
          "menu-items select-menu__list " +
          (menuState ? "select-menu__list--active" : "")
        }
      >
        {props.menuItems.map((item: MenuItem, i: number) => {
          return (
            <li
              className="select-menu__list-item"
              key={i}
              onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                event.stopPropagation();
                item.event(props.error);
                hideMenu();
              }}
            >
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
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

export default React.memo(Menu);
