import * as React from "react";

interface PanelHeaderProps {
  title: string;
  handleHide: () => void;
}

function PanelHeader(props: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <div className="panel-header__action">
        <button
          className="button--icon tap-effect-small"
          onClick={props.handleHide}
        >
          <svg
            className="panel-collapse-icon"
            width="14"
            height="14"
            viewBox="0 0 25 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.9389 21L12.1889 19.2727L19.3935 12.0682H0.734375V9.56818H19.3935L12.1889 2.38636L13.9389 0.636364L24.1207 10.8182L13.9389 21Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <div className="panel-header__title">{props.title}</div>
    </div>
  );
}

export default PanelHeader;
