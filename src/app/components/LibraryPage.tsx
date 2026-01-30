import * as React from "react";
import "../styles/library.css";
import type { Library } from "../../types";

interface LibraryPageProps {
  libraries: Library[];
  onUpdateLibraries: (libraries: Library[]) => void;
  localStyles: { styles?: number } | Library;
}

const LibraryPage: React.FC<LibraryPageProps> = ({
  libraries = [],
  onUpdateLibraries,
  localStyles,
}) => {
  const onLibraryImport = () => {
    parent.postMessage({ pluginMessage: { type: "save-library" } }, "*");
  };

  const removeLibrary = (index: number) => {
    // Remove the library from the libraries array
    const updatedLibraries = [...libraries];
    updatedLibraries.splice(index, 1);

    // Update the state with the new libraries array
    onUpdateLibraries(updatedLibraries);

    // Send a message to the plugin layer to remove the library from client storage
    parent.postMessage(
      {
        pluginMessage: {
          type: "remove-library",
          index: index,
          storageArray: updatedLibraries,
        },
      },
      "*",
    );
  };

  return (
    <div className="library-wrapper">
      <div className="library-description">
        <h4 className="library-title">Local Styles</h4>
        <p>
          Design Lint uses styles found in your file for suggestions and
          automatic fixes first.
        </p>
      </div>
      <ul className="library-list">
        <li className="library-list-item" key="local-styles">
          <div className="library-icon-wrapper">
            <img
              className="library-icon"
              src={require("../assets/map-marker.svg")}
            />
          </div>
          <div className="library-list-item-content">
            <h3 className="item-content-title">Local Styles</h3>
            <span className="item-content-styles">
              {localStyles.styles ?? 0} styles
            </span>
          </div>
        </li>
      </ul>
      <div className="library-description library-saved-section">
        <h4 className="library-title">Saved Libraries</h4>
        <div>
          <p>Want to automatically fix errors using styles from a library?</p>
          <ul>
            <li>Open the file where the styles are defined.</li>
            <li>Run the plugin and click "Save as Library."</li>
            <li>Restart Design Lint—your library is ready to use!</li>
          </ul>
        </div>
      </div>

      <ul className="library-list">
        {libraries.map((library, index) => (
          <li
            className="library-list-item list-item-enter"
            key={index}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="library-icon-wrapper">
              <img
                className="library-icon"
                src={require("../assets/library.svg")}
              />
            </div>
            <div className="library-list-item-content">
              <h3 className="item-content-title">{library.name}</h3>
              <span className="item-content-styles">
                {library.styles} styles
              </span>
            </div>
            <button
              onClick={() => removeLibrary(index)}
              className="icon icon--button library-remove tap-effect-small"
            >
              <img src={require("../assets/subtract.svg")} />
            </button>
          </li>
        ))}
        <li
          className="library-list-item save-library tap-effect"
          key="import"
          onClick={onLibraryImport}
        >
          <div className="library-icon-wrapper">
            <img
              className="library-icon"
              src={require("../assets/add-blue.svg")}
            />
          </div>
          <h3 className="save-library-label">Save Library</h3>
        </li>
      </ul>
    </div>
  );
};

export default LibraryPage;
