import * as React from "react";

interface EmptyStateProps {
  onHandleRunApp: () => void;
  onScanEntirePage: () => void;
}

function EmptyState(props: EmptyStateProps) {
  const onRunApp = () => {
    props.onHandleRunApp();
  };

  const onScanEntirePage = () => {
    props.onScanEntirePage();
  };

  return (
    <div className="empty-state-wrapper empty-state-enter">
      <div className="background-wrapper">
        <img
          className="empty-state-background"
          src={require("../assets/mesh-background.png")}
        />
      </div>
      <div className="empty-state">
        <div className="empty-state__image">
          <img className="layer-icon" src={require("../assets/new-logo.svg")} />
        </div>
        <div className="empty-state__title">Select a layer to get started.</div>
        <button
          className="button button--primary button--full"
          onClick={onRunApp}
        >
          Run Design Lint
        </button>
        <button
          className="button button--primary button-scan-page"
          onClick={onScanEntirePage}
        >
          Scan Entire Page
        </button>
      </div>
    </div>
  );
}

export default EmptyState;
