import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";

import Navigation from "./Navigation";
import NodeList from "./NodeList";
import LibraryPage from "./LibraryPage";
import StylesPage from "./StylesPage";
import PreloaderCSS from "./PreloaderCSS";
import EmptyState from "./EmptyState";
import Panel from "./Panel";
import BulkErrorList from "./BulkErrorList";

import "../styles/figma.ds.css";
import "../styles/ui.css";
import "../styles/empty-state.css";
import "react-tooltip/dist/react-tooltip.css";

import type {
  NodeWithErrors,
  LintError,
  IgnoredError,
  Library,
  RemoteStyles,
  ActivePage,
} from "../../types";

interface SelectedNode {
  id: string;
  name: string;
  type?: string;
  fills?: unknown[];
  [key: string]: unknown;
}

interface PluginMessageEvent {
  data: {
    pluginMessage: {
      type: string;
      message?: string;
      errors?: NodeWithErrors[];
      storage?: string;
    };
  };
}

const App: React.FC = () => {
  const [errorArray, setErrorArray] = useState<NodeWithErrors[]>([]);
  const [activePage, setActivePage] = useState<ActivePage | "bulk">("page");
  const [ignoredErrorArray, setIgnoreErrorArray] = useState<IgnoredError[]>([]);
  const [activeError, setActiveError] = useState<
    LintError | Record<string, never>
  >({});
  const [selectedNode, setSelectedNode] = useState<SelectedNode>({
    id: "",
    name: "",
  });
  const [isVisible, setIsVisible] = useState(false);
  const [nodeArray, setNodeArray] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
      children?: Array<{
        id: string;
        name: string;
        type: string;
        children?: unknown[];
      }>;
    }>
  >([]);
  const [selectedListItems, setSelectedListItem] = useState<string[]>([]);
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const [borderRadiusValues, setBorderRadiusValues] = useState<number[]>([
    0, 2, 4, 8, 16, 24, 32,
  ]);
  const [lintVectors, setLintVectors] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);
  const [emptyState, setEmptyState] = useState(false);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [localStyles, setLocalStyles] = useState<
    Library | Record<string, never>
  >({});
  const [stylesInUse, setStylesInUse] = useState<RemoteStyles | null>(null);

  const librariesRef = useRef<Library[]>([]);
  const activePageRef = useRef<ActivePage | "bulk">(activePage);

  // Fix: Move event listener to useEffect with cleanup to prevent memory leaks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.parent.postMessage({ pluginMessage: { type: "close" } }, "*");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const updateSelectedList = useCallback((id: string) => {
    setSelectedListItem((prevItems) => {
      const newItems = [...prevItems];
      newItems.splice(0, newItems.length);
      return newItems.concat(id);
    });

    setActiveNodeIds((prevIds) => {
      if (prevIds.includes(id)) {
        if (prevIds.length !== 1) {
          return prevIds.filter((activeNodeId) => activeNodeId !== id);
        }
        return prevIds;
      }
      return prevIds.concat(id);
    });
  }, []);

  const updateNavigation = useCallback((page: ActivePage | "bulk") => {
    setActivePage(page);

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-active-page-in-settings",
          page: page,
        },
      },
      "*",
    );
  }, []);

  const handleUpdateLibraries = useCallback((updatedLibraries: Library[]) => {
    setLibraries(updatedLibraries);
  }, []);

  const updateActiveError = useCallback((node: NodeWithErrors) => {
    // NodeList passes a NodeWithErrors, so we extract the first error if available
    if (node.errors && node.errors.length > 0) {
      setActiveError(node.errors[0]);
    }
  }, []);

  const ignoreAll = useCallback((errors: LintError[]) => {
    setIgnoreErrorArray((prevArray) => [
      ...prevArray,
      ...(errors as IgnoredError[]),
    ]);
  }, []);

  const updateIgnoredErrors = useCallback((error: LintError) => {
    setIgnoreErrorArray((prevArray) => {
      const hasNode = prevArray.some((e) => e.node.id === error.node.id);
      const hasValue = prevArray.some((e) => e.value === error.value);

      if (hasNode && hasValue) {
        return prevArray;
      }
      return [error as IgnoredError, ...prevArray];
    });
  }, []);

  const updateBorderRadius = useCallback(
    (value: number) => {
      const borderArray = [...borderRadiusValues, value];
      setBorderRadiusValues((prev) => [...prev, value]);

      parent.postMessage(
        {
          pluginMessage: {
            type: "update-border-radius",
            radiusValues: borderArray,
          },
        },
        "*",
      );

      parent.postMessage(
        {
          pluginMessage: {
            type: "update-errors",
            libraries: librariesRef.current,
          },
        },
        "*",
      );
    },
    [borderRadiusValues],
  );

  const updateErrorArray = useCallback((errors: NodeWithErrors[]) => {
    setErrorArray(errors);
  }, []);

  const updateVisible = useCallback((val: boolean) => {
    setIsVisible(val);
  }, []);

  const updateLintRules = useCallback((boolean: boolean) => {
    setLintVectors(boolean);

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-lint-rules-from-settings",
          boolean: boolean,
        },
      },
      "*",
    );
  }, []);

  const updateVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  // Update client storage when ignored errors change
  useEffect(() => {
    if (initialLoad && ignoredErrorArray.length) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "update-storage",
            storageArray: ignoredErrorArray,
          },
        },
        "*",
      );
    }
  }, [ignoredErrorArray, initialLoad]);

  const onRunApp = useCallback(() => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "run-app",
          lintVectors: lintVectors,
          selection: "user",
        },
      },
      "*",
    );
  }, [lintVectors]);

  const onScanEntirePage = useCallback(() => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "run-app",
          lintVectors: lintVectors,
          selection: "page",
        },
      },
      "*",
    );
  }, [lintVectors]);

  // Keep libraries ref in sync
  useEffect(() => {
    librariesRef.current = libraries;
  }, [libraries]);

  // Keep active page ref in sync
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  // Main message handler
  useEffect(() => {
    onRunApp();

    const handleMessage = (event: PluginMessageEvent) => {
      const { type, message, errors, storage } = event.data.pluginMessage;

      switch (type) {
        case "show-preloader":
          setEmptyState(false);
          break;

        case "show-empty-state":
          setEmptyState(true);
          break;

        case "step-1": {
          const nodeObject = JSON.parse(message || "[]");
          setNodeArray(nodeObject);
          updateErrorArray(errors || []);

          setSelectedListItem((prev) => {
            const newItems = [...prev];
            newItems.splice(0, newItems.length);
            return newItems.concat(nodeObject[0]?.id || "");
          });

          setActiveNodeIds((prev) => prev.concat(nodeObject[0]?.id || ""));

          parent.postMessage(
            {
              pluginMessage: {
                type: "step-2",
                id: nodeObject[0]?.id,
                nodeArray: nodeObject,
              },
            },
            "*",
          );
          break;
        }

        case "step-2-complete":
          setSelectedNode(JSON.parse(message || "{}"));
          parent.postMessage(
            {
              pluginMessage: {
                type: "step-3",
                libraries: librariesRef.current,
              },
            },
            "*",
          );
          break;

        case "step-3-complete":
          updateErrorArray(errors || []);
          setInitialLoad(true);
          break;

        case "fetched storage": {
          const clientStorage = JSON.parse(storage || "[]");
          setIgnoreErrorArray((prev) => [...prev, ...clientStorage]);
          break;
        }

        case "fetched active page": {
          const storedPage = JSON.parse(storage || '"page"');
          setActivePage(storedPage);
          break;
        }

        case "fetched border radius": {
          let clientStorageBR = JSON.parse(storage || "[]");
          clientStorageBR = clientStorageBR.sort(
            (a: number, b: number) => a - b,
          );
          setBorderRadiusValues([...clientStorageBR]);
          break;
        }

        case "reset storage":
          setIgnoreErrorArray([]);
          parent.postMessage(
            {
              pluginMessage: {
                type: "update-errors",
                libraries: librariesRef.current,
              },
            },
            "*",
          );
          break;

        case "fetched layer":
          setSelectedNode(JSON.parse(message || "{}"));
          parent.postMessage(
            {
              pluginMessage: {
                type: "update-errors",
                libraries: librariesRef.current,
              },
            },
            "*",
          );
          break;

        case "change":
          parent.postMessage(
            {
              pluginMessage: {
                type: "update-errors",
                libraries: librariesRef.current,
              },
            },
            "*",
          );
          if (activePageRef.current === "styles") {
            parent.postMessage(
              {
                pluginMessage: {
                  type: "update-styles-page",
                },
              },
              "*",
            );
          }
          break;

        case "updated errors":
          updateErrorArray(errors || []);
          break;

        case "library-imported":
        case "library-imported-from-storage":
          setLibraries(message as unknown as Library[]);
          break;

        case "local-styles-imported":
          setLocalStyles(message as unknown as Library);
          break;

        case "remote-styles-imported":
          setStylesInUse(message as unknown as RemoteStyles);
          break;
      }
    };

    window.onmessage = handleMessage as (ev: MessageEvent) => void;

    // Note: We can't properly clean up window.onmessage in this pattern
    // as the original code uses assignment. This would need a larger refactor.
  }, [onRunApp, updateErrorArray]);

  return (
    <div className="container">
      <Navigation
        onPageSelection={updateNavigation}
        activePage={activePage}
        updateLintRules={updateLintRules}
        ignoredErrorArray={ignoredErrorArray}
        borderRadiusValues={borderRadiusValues}
        lintVectors={lintVectors}
        onRefreshSelection={onRunApp}
      />
      {activeNodeIds.length !== 0 ? (
        <div>
          {activePage === "layers" ? (
            <NodeList
              onErrorUpdate={updateActiveError}
              onVisibleUpdate={updateVisible}
              onSelectedListUpdate={updateSelectedList}
              visibility={isVisible}
              nodeArray={nodeArray}
              errorArray={errorArray}
              ignoredErrorArray={ignoredErrorArray}
              selectedListItems={selectedListItems}
              activeNodeIds={activeNodeIds}
            />
          ) : activePage === "library" ? (
            <LibraryPage
              libraries={libraries}
              onUpdateLibraries={handleUpdateLibraries}
              localStyles={localStyles}
            />
          ) : activePage === "styles" ? (
            <StylesPage stylesInUse={stylesInUse} />
          ) : (
            <BulkErrorList
              libraries={libraries}
              errorArray={errorArray}
              ignoredErrorArray={ignoredErrorArray}
              onIgnoredUpdate={updateIgnoredErrors}
              updateBorderRadius={updateBorderRadius}
              onIgnoreAll={ignoreAll}
              ignoredErrors={ignoredErrorArray}
              onClick={updateVisibility}
              onSelectedListUpdate={updateSelectedList}
              initialLoadComplete={initialLoad}
            />
          )}
        </div>
      ) : emptyState === false ? (
        <PreloaderCSS />
      ) : (
        <EmptyState
          onHandleRunApp={onRunApp}
          onScanEntirePage={onScanEntirePage}
        />
      )}

      {Object.keys(activeError).length !== 0 && errorArray.length ? (
        <Panel
          visibility={isVisible}
          node={selectedNode}
          errorArray={errorArray}
          onIgnoredUpdate={updateIgnoredErrors}
          onIgnoreAll={ignoreAll}
          ignoredErrors={ignoredErrorArray}
          onClick={updateVisibility}
          onSelectedListUpdate={updateSelectedList}
        />
      ) : null}
    </div>
  );
};

export default App;
