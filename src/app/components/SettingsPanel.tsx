import * as React from "react";
import PanelHeader from "./PanelHeader";
import SettingsForm from "./SettingsForm";
import "../styles/panel.css";
import type { IgnoredError } from "../../types";

interface SettingsPanelProps {
  panelVisible: boolean;
  onHandlePanelVisible: (visible: boolean) => void;
  lintVectors: boolean;
  updateLintRules: (value: boolean) => void;
  ignoredErrorArray: IgnoredError[];
  borderRadiusValues: number[];
}

function SettingsPanel(props: SettingsPanelProps) {
  const isVisible = props.panelVisible;

  function handleHide() {
    props.onHandlePanelVisible(false);
  }

  function handleCheckbox() {
    if (props.lintVectors === false) {
      props.updateLintRules(true);
    } else if (props.lintVectors === true) {
      props.updateLintRules(false);
    }
  }

  function clearIgnoredErrors() {
    parent.postMessage(
      {
        pluginMessage: {
          type: "update-storage-from-settings",
          storageArray: [],
        },
      },
      "*",
    );
    props.onHandlePanelVisible(false);
  }

  return (
    <React.Fragment>
      <div
        className={`panel panel-slide ${isVisible ? "panel-open" : "panel-closed"}`}
        key="settings-panel"
      >
        <PanelHeader title={"Settings"} handleHide={handleHide}></PanelHeader>

        <div className="settings-wrapper">
          <div className="settings-row">
            <h3 className="settings-title">Skipping Layers</h3>
            <div className="settings-label settings-no-padding">
              If you have an illustration or set of layers you want the linter
              to ignore, lock them 🔒 in the layer panel.
            </div>
          </div>
          <SettingsForm
            borderRadiusValues={props.borderRadiusValues.join(", ")}
          />
          <div className="settings-row">
            <h3 className="settings-title">Lint Vectors (Default Off)</h3>
            <div className="settings-label settings-no-padding">
              Illustrations, vectors, and boolean shapes often throw a lot of
              errors as they rarely use styles for fills. If you'd like to lint
              them as well, check the box below.
              <div className="settings-checkbox-group" onClick={handleCheckbox}>
                <input
                  name="vectorsCheckbox"
                  type="checkbox"
                  checked={props.lintVectors}
                  onChange={handleCheckbox}
                />
                <label>Lint Vectors and Boolean Shapes</label>
              </div>
            </div>
          </div>
          <div className="settings-row">
            <h3 className="settings-title">Ignored Errors</h3>
            {props.ignoredErrorArray.length > 0 ? (
              <React.Fragment>
                <div className="settings-label">
                  {props.ignoredErrorArray.length} errors are being ignored in
                  selection.
                </div>
                <button
                  className="button button--primary"
                  onClick={clearIgnoredErrors}
                >
                  Reset ignored errors
                </button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="settings-label">
                  You haven't ignored any errors yet.
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      </div>

      {isVisible ? <div className="overlay" onClick={handleHide}></div> : null}
    </React.Fragment>
  );
}

export default React.memo(SettingsPanel);
