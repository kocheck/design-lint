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
          <img
            className="panel-collapse-icon"
            src={require("../assets/forward-arrow.svg")}
          />
        </button>
      </div>
      <div className="panel-header__title">{props.title}</div>
    </div>
  );
}

export default PanelHeader;
