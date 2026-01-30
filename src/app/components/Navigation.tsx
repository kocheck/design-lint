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
            title="View all lint errors grouped by type"
          >
            Errors
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "layers" ? "active" : ""}`}
            onClick={layersClick}
            title="View errors by individual layer"
          >
            Layers
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "library" ? "active" : ""}`}
            onClick={libraryClick}
            title="Browse connected libraries"
          >
            Library
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "styles" ? "active" : ""}`}
            onClick={stylesClick}
            title="View all styles in use"
          >
            Styles
          </div>
          <div
            className={`nav-item tap-effect ${activePage === "variables" ? "active" : ""}`}
            onClick={variablesClick}
            title="View variables and design tokens"
          >
            Variables
          </div>

          <div className="nav-icon-wrapper">
            <button
              className="icon icon--button nav-icon-button tap-effect-small"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handleRefreshSelection();
              }}
              data-tooltip="Refresh"
              data-tooltip-position="bottom"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.8426 8.94932C12.8426 9.7567 12.188 10.4113 11.3806 10.4113H1.8358L3.76073 8.48638L3.07162 7.79726L0.314802 10.5541C0.124558 10.7444 0.124558 11.0528 0.314802 11.2432L3.07162 14L3.76073 13.3109L1.8358 11.386H11.3806C12.7256 11.3843 13.8156 10.2944 13.8173 8.94932V7H12.8426V8.94932Z" fill="currentColor"/>
                <path d="M1.14669 5.05069C1.14669 4.24319 1.80118 3.5887 2.60867 3.5887H12.1535L10.2286 5.51363L10.9177 6.20274L13.6745 3.44593C13.8647 3.25557 13.8647 2.94718 13.6745 2.75681L10.9177 0L10.2286 0.689114L12.1535 2.61404H2.60867C1.26364 2.61559 0.173574 3.70565 0.172028 5.05069V7.00001H1.14669V5.05069Z" fill="currentColor"/>
              </svg>
            </button>
            <button
              className="icon icon--button nav-icon-button tap-effect-small"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handleAiPanelVisible(true);
              }}
              data-tooltip="AI Assistant"
              data-tooltip-position="bottom"
            >
              <span className="ai-icon">AI</span>
            </button>
            <button
              className="icon icon--button nav-icon-button tap-effect-small"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handlePanelVisible(true);
              }}
              data-tooltip="Settings"
              data-tooltip-position="bottom"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 1V4M3.5 4C2.67157 4 2 4.67157 2 5.5C2 6.32843 2.67157 7 3.5 7C4.32843 7 5 6.32843 5 5.5C5 4.67157 4.32843 4 3.5 4ZM3.5 9V13M10.5 7V13M10.5 4C11.3284 4 12 3.32843 12 2.5C12 1.67157 11.3284 1 10.5 1C9.67157 1 9 1.67157 9 2.5C9 3.32843 9.67157 4 10.5 4ZM10.5 4V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
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
