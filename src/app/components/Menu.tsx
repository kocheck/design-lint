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
        <img src={require("../assets/context.svg")} />
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
