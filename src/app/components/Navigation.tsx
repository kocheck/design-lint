import * as React from "react";
import SettingsPanel from "./SettingsPanel";
import AIPanel from "./AIPanel";
import {
  ActivePage,
  IgnoredError,
  LintRuleConfig,
  NodeWithErrors,
  RemoteStyles,
} from "../../types";

interface NavigationProps {
  activePage: ActivePage | "bulk";
  ignoredErrorArray: IgnoredError[];
  borderRadiusValues: number[];
  lintVectors: boolean;
  onPageSelection: (page: ActivePage | "bulk") => void;
  updateLintRules: (boolean: boolean) => void;
  onRefreshSelection: () => void;
  lintRuleConfig?: Partial<LintRuleConfig>;
  onLintRuleConfigChange?: (config: LintRuleConfig) => void;
  errorArray?: NodeWithErrors[];
  stylesInUse?: RemoteStyles | null;
}

function Navigation(props: NavigationProps) {
  const [panelVisible, setPanelVisible] = React.useState<boolean>(false);
  const [aiPanelVisible, setAiPanelVisible] = React.useState<boolean>(false);
  const activePage = props.activePage;

  const layersClick = () => {
    props.onPageSelection("layers");
  };

  const bulkListClick = () => {
    props.onPageSelection("bulk");
  };

  const libraryClick = () => {
    props.onPageSelection("library");
  };

  const stylesClick = () => {
    if (activePage !== "styles") {
      parent.postMessage(
        {
          pluginMessage: {
            type: "update-styles-page",
          },
        },
        "*",
      );
    }

    props.onPageSelection("styles");
  };

  const variablesClick = () => {
    props.onPageSelection("variables");
  };

  const handleLintRulesChange = (boolean: boolean) => {
    props.updateLintRules(boolean);
  };

  const handlePanelVisible = (boolean: boolean) => {
    setPanelVisible(boolean);
  };

  const handleAiPanelVisible = (boolean: boolean) => {
    setAiPanelVisible(boolean);
  };

  const handleRefreshSelection = () => {
    props.onRefreshSelection();
  };

  return (
    <div key="nav">
      <div className="navigation-wrapper">
        <nav className="nav">
          <div
            className={`nav-item tap-effect ${activePage === "bulk" ? "active" : ""}`}
            onClick={bulkListClick}
          >
            Errors List
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "layers" ? "active" : ""}`}
            onClick={layersClick}
          >
            Layers
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "library" ? "active" : ""}`}
            onClick={libraryClick}
          >
            Library
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "styles" ? "active" : ""}`}
            onClick={stylesClick}
          >
            Styles
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "variables" ? "active" : ""}`}
            onClick={variablesClick}
          >
            Variables
          </div>

          <div className="nav-icon-wrapper">
            <button
              className="icon icon--refresh icon--button settings-button tap-effect-small"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handleRefreshSelection();
              }}
            >
              <img src={require("../assets/refresh.svg")} />
            </button>
            <button
              className="icon icon--button settings-button tap-effect-small ai-button"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handleAiPanelVisible(true);
              }}
              title="AI Assistant"
            >
              <span className="ai-icon">AI</span>
            </button>
            <button
              className="icon icon--adjust icon--button settings-button tap-effect-small"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handlePanelVisible(true);
              }}
            ></button>
          </div>
        </nav>
      </div>
      <SettingsPanel
        panelVisible={panelVisible}
        onHandlePanelVisible={handlePanelVisible}
        ignoredErrorArray={props.ignoredErrorArray}
        borderRadiusValues={props.borderRadiusValues}
        updateLintRules={handleLintRulesChange}
        lintVectors={props.lintVectors}
        lintRuleConfig={props.lintRuleConfig}
        onLintRuleConfigChange={props.onLintRuleConfigChange}
      />
      <AIPanel
        panelVisible={aiPanelVisible}
        onHandlePanelVisible={handleAiPanelVisible}
        errorArray={props.errorArray || []}
        stylesInUse={props.stylesInUse}
      />
    </div>
  );
}

export default Navigation;
