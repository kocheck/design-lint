import * as React from "react";
import SettingsPanel from "./SettingsPanel";
import { motion } from "framer-motion/dist/framer-motion";
import { ActivePage, IgnoredError } from "../../types";

interface NavigationProps {
  activePage: ActivePage | "bulk";
  ignoredErrorArray: IgnoredError[];
  borderRadiusValues: number[];
  lintVectors: boolean;
  onPageSelection: (page: ActivePage | "bulk") => void;
  updateLintRules: (boolean: boolean) => void;
  onRefreshSelection: () => void;
}

function Navigation(props: NavigationProps) {
  const [panelVisible, setPanelVisible] = React.useState<boolean>(false);
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

  const handleLintRulesChange = (boolean: boolean) => {
    props.updateLintRules(boolean);
  };

  const handlePanelVisible = (boolean: boolean) => {
    setPanelVisible(boolean);
  };

  const handleRefreshSelection = () => {
    props.onRefreshSelection();
  };

  return (
    <div key="nav">
      <div className="navigation-wrapper">
        <nav className="nav">
          <motion.div
            className={`nav-item ${activePage === "bulk" ? "active" : ""}`}
            onClick={bulkListClick}
            whileTap={{ scale: 0.98, opacity: 0.8 }}
          >
            Errors List
          </motion.div>
          <motion.div
            className={`nav-item ${activePage === "layers" ? "active" : ""}`}
            onClick={layersClick}
            whileTap={{ scale: 0.98, opacity: 0.8 }}
          >
            Layers
          </motion.div>
          <motion.div
            className={`nav-item ${activePage === "library" ? "active" : ""}`}
            onClick={libraryClick}
            whileTap={{ scale: 0.98, opacity: 0.8 }}
          >
            Library
          </motion.div>
          <motion.div
            className={`nav-item ${activePage === "styles" ? "active" : ""}`}
            onClick={stylesClick}
            whileTap={{ scale: 0.98, opacity: 0.8 }}
          >
            Styles
          </motion.div>

          <div className="nav-icon-wrapper">
            <motion.button
              className="icon icon--refresh icon--button settings-button"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handleRefreshSelection();
              }}
              whileTap={{ scale: 0.9, opacity: 0.8 }}
            >
              <img src={require("../assets/refresh.svg")} />
            </motion.button>
            <motion.button
              className="icon icon--adjust icon--button settings-button"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handlePanelVisible(true);
              }}
              whileTap={{ scale: 0.9, opacity: 0.8 }}
            ></motion.button>
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
      />
    </div>
  );
}

export default Navigation;
