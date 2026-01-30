import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import BulkErrorListItem from "./BulkErrorListItem";
import TotalErrorCount from "./TotalErrorCount";
import PreloaderCSS from "./PreloaderCSS";
import Banner from "./Banner";
import Modal from "./Modal";
import StylesPanel from "./StylesPanel";
import type {
  LintError,
  NodeWithErrors,
  IgnoredError,
  BulkError,
} from "../../types";

interface BulkErrorListProps {
  libraries: unknown[];
  errorArray: NodeWithErrors[];
  ignoredErrorArray: IgnoredError[];
  onIgnoredUpdate: (error: LintError) => void;
  updateBorderRadius: (value: number) => void;
  onIgnoreAll: (errors: LintError[]) => void;
  ignoredErrors: IgnoredError[];
  onClick: () => void;
  onSelectedListUpdate: (id: string) => void;
  initialLoadComplete: boolean;
}

function BulkErrorList(props: BulkErrorListProps): JSX.Element {
  const [currentError, setCurrentError] = useState<BulkError | null>(null);
  const [panelError, setPanelError] = useState<BulkError | null>(null);
  const [panelStyleSuggestion, setPanelStyleSuggestion] = useState<
    number | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(["All"]),
  );
  const [batchMenuOpen, setBatchMenuOpen] = useState<string | null>(null);
  const batchMenuRef = useRef<HTMLDivElement>(null);

  // Close batch menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        batchMenuRef.current &&
        !batchMenuRef.current.contains(event.target as Node)
      ) {
        setBatchMenuOpen(null);
      }
    };

    if (batchMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [batchMenuOpen]);

  const availableFilters = [
    "All",
    "text",
    "fill",
    "stroke",
    "radius",
    "effects",
  ];

  // Memoize the ignored errors map for efficient lookup
  const ignoredErrorsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    props.ignoredErrorArray.forEach((ignoredError: IgnoredError) => {
      const nodeId = ignoredError.node.id;
      if (!map[nodeId]) {
        map[nodeId] = new Set();
      }
      map[nodeId].add(ignoredError.value);
    });
    return map;
  }, [props.ignoredErrorArray]);

  // Memoize filtered error array
  const filteredErrorArray = useMemo(() => {
    return props.errorArray
      .map((item) => ({
        ...item,
        errors: item.errors.filter(
          (error) => !ignoredErrorsMap[item.id]?.has(error.value),
        ),
      }))
      .filter((item) => item.errors.length >= 1);
  }, [props.errorArray, ignoredErrorsMap]);

  // Memoize bulk error list creation
  const bulkErrorList = useMemo(() => {
    const bulkErrorMap: Record<string, BulkError> = {};

    filteredErrorArray.forEach((item) => {
      item.errors.forEach((error) => {
        const hasMatches = error.matches && error.matches.length > 0;
        const hasSuggestions =
          error.suggestions && error.suggestions.length > 0;

        // Sort matches and suggestions by count (how often they're used)
        if (hasMatches && error.matches) {
          error.matches.sort((a, b) => (b.count || 0) - (a.count || 0));
        } else if (hasSuggestions && error.suggestions) {
          error.suggestions.sort((a, b) => (b.count || 0) - (a.count || 0));
          // Remove style suggestions with deprecated in the title.
          error.suggestions = error.suggestions.filter((suggestion) => {
            return !suggestion.name.toLowerCase().includes("deprecated");
          });
        }

        // Create a unique key based on error properties
        const errorKey = `${error.type}_${error.message}_${error.value}_${hasSuggestions}_${hasMatches}`;
        if (bulkErrorMap[errorKey]) {
          bulkErrorMap[errorKey].nodes.push(error.node.id);
          bulkErrorMap[errorKey].count++;
        } else {
          bulkErrorMap[errorKey] = {
            ...error,
            nodes: [error.node.id],
            count: 1,
          };
        }
      });
    });

    return Object.values(bulkErrorMap).sort((a, b) => b.count - a.count);
  }, [filteredErrorArray]);

  // Memoize errors with matches
  const errorsWithMatches = useMemo(() => {
    return bulkErrorList.filter(
      (error) => error.matches && error.matches.length > 0,
    );
  }, [bulkErrorList]);

  // Calculate total errors with matches
  const totalErrorsWithMatches = useMemo(() => {
    return errorsWithMatches.reduce((total, error) => total + error.count, 0);
  }, [errorsWithMatches]);

  // Memoize filtered error list based on selected filters
  const filteredErrorList = useMemo(() => {
    return bulkErrorList.filter(
      (error) => selectedFilters.has("All") || selectedFilters.has(error.type),
    );
  }, [bulkErrorList, selectedFilters]);

  const handleFixAllFromBanner = useCallback(() => {
    errorsWithMatches.forEach((error) => {
      handleFixAll(error);
    });
  }, [errorsWithMatches]);

  const handleIgnoreChange = useCallback(
    (error: LintError) => {
      props.onIgnoredUpdate(error);
    },
    [props.onIgnoredUpdate],
  );

  const handlePanelVisible = useCallback((boolean: boolean) => {
    setPanelVisible(boolean);
  }, []);

  const handleUpdatePanelError = useCallback((error: BulkError) => {
    setPanelError(error);
  }, []);

  const handleUpdatePanelSuggestion = useCallback((index: number) => {
    setPanelStyleSuggestion(index);
  }, []);

  const handleBorderRadiusUpdate = useCallback(
    (value: string) => {
      props.updateBorderRadius(Number(value));
    },
    [props.updateBorderRadius],
  );

  const handleCreateStyle = useCallback((error: BulkError) => {
    setCurrentError(error);
    setIsModalOpen(true);
  }, []);

  const handleSelectAll = useCallback((error: BulkError) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: error.nodes,
        },
      },
      "*",
    );
  }, []);

  const handleFixAll = useCallback((error: BulkError) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "apply-styles",
          error: error,
          field: "matches",
          index: 0,
          count: error.count,
        },
      },
      "*",
    );
  }, []);

  const handleSuggestion = useCallback((error: BulkError, index: number) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "apply-styles",
          error: error,
          field: "suggestions",
          index: index,
          count: error.count,
        },
      },
      "*",
    );
  }, []);

  const handleSelect = useCallback((error: LintError) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "fetch-layer-data",
          id: error.node.id,
        },
      },
      "*",
    );
  }, []);

  const handleIgnoreAll = useCallback(
    (error: BulkError) => {
      const errorsToBeIgnored: LintError[] = [];

      filteredErrorArray.forEach((node) => {
        node.errors.forEach((item) => {
          if (item.value === error.value && item.type === error.type) {
            errorsToBeIgnored.push(item);
          }
        });
      });

      if (errorsToBeIgnored.length) {
        props.onIgnoreAll(errorsToBeIgnored);
      }
    },
    [filteredErrorArray, props.onIgnoreAll],
  );

  const handleFilterClick = useCallback((filter: string) => {
    setSelectedFilters((prev) => {
      const newFilters = new Set(prev);
      if (filter === "All") {
        newFilters.clear();
        newFilters.add("All");
      } else {
        if (newFilters.has(filter)) {
          newFilters.delete(filter);
        } else {
          newFilters.add(filter);
        }
        if (newFilters.size === 0) {
          newFilters.add("All");
        } else {
          newFilters.delete("All");
        }
      }
      return newFilters;
    });
  }, []);

  // Batch operations by error type
  const handleBatchFixByType = useCallback(
    (type: string) => {
      const errorsOfType = bulkErrorList.filter(
        (error) =>
          error.type === type && error.matches && error.matches.length > 0,
      );
      errorsOfType.forEach((error) => {
        handleFixAll(error);
      });
      setBatchMenuOpen(null);
      parent.postMessage(
        {
          pluginMessage: {
            type: "notify-user",
            message: `Fixed all ${type} errors with matches`,
          },
        },
        "*",
      );
    },
    [bulkErrorList],
  );

  const handleBatchIgnoreByType = useCallback(
    (type: string) => {
      const errorsToIgnore: LintError[] = [];
      filteredErrorArray.forEach((node) => {
        node.errors.forEach((error) => {
          if (error.type === type) {
            errorsToIgnore.push(error);
          }
        });
      });
      if (errorsToIgnore.length > 0) {
        props.onIgnoreAll(errorsToIgnore);
      }
      setBatchMenuOpen(null);
      parent.postMessage(
        {
          pluginMessage: {
            type: "notify-user",
            message: `Ignored all ${type} errors`,
          },
        },
        "*",
      );
    },
    [filteredErrorArray, props.onIgnoreAll],
  );

  const handleBatchSelectByType = useCallback(
    (type: string) => {
      const nodeIds: string[] = [];
      bulkErrorList
        .filter((error) => error.type === type)
        .forEach((error) => {
          nodeIds.push(...error.nodes);
        });
      const uniqueIds = [...new Set(nodeIds)];
      if (uniqueIds.length > 0) {
        parent.postMessage(
          {
            pluginMessage: {
              type: "select-multiple-layers",
              nodeArray: uniqueIds,
            },
          },
          "*",
        );
      }
      setBatchMenuOpen(null);
    },
    [bulkErrorList],
  );

  // Get count of errors by type
  const errorCountByType = useMemo(() => {
    const counts: Record<string, { total: number; fixable: number }> = {};
    bulkErrorList.forEach((error) => {
      if (!counts[error.type]) {
        counts[error.type] = { total: 0, fixable: 0 };
      }
      counts[error.type].total += error.count;
      if (error.matches && error.matches.length > 0) {
        counts[error.type].fixable += error.count;
      }
    });
    return counts;
  }, [bulkErrorList]);

  const handleExportReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: bulkErrorList.reduce((sum, e) => sum + e.count, 0),
        totalUniqueErrors: bulkErrorList.length,
        byType: bulkErrorList.reduce(
          (acc, error) => {
            acc[error.type] = (acc[error.type] || 0) + error.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        bySeverity: bulkErrorList.reduce(
          (acc, error) => {
            const severity = error.severity || "error";
            acc[severity] = (acc[severity] || 0) + error.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      errors: bulkErrorList.map((error) => ({
        type: error.type,
        severity: error.severity || "error",
        message: error.message,
        value: error.value,
        count: error.count,
        nodeIds: error.nodes,
        hasMatch: !!(error.matches && error.matches.length > 0),
        hasSuggestion: !!(error.suggestions && error.suggestions.length > 0),
        suggestedFix:
          error.matches?.[0]?.name || error.suggestions?.[0]?.name || null,
      })),
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `design-lint-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    parent.postMessage(
      {
        pluginMessage: {
          type: "notify-user",
          message: "Lint report exported",
        },
      },
      "*",
    );
  }, [bulkErrorList]);

  // Memoize error list items
  const errorListItems = useMemo(() => {
    return filteredErrorList.map((error, index) => (
      <BulkErrorListItem
        error={error}
        index={index}
        key={`${error.node.id}-${error.type}-${index}`}
        handleIgnoreChange={handleIgnoreChange}
        handleSelectAll={handleSelectAll}
        handleCreateStyle={handleCreateStyle}
        handleSelect={handleSelect}
        handleIgnoreAll={handleIgnoreAll}
        handleFixAll={handleFixAll}
        handleSuggestion={handleSuggestion}
        handleBorderRadiusUpdate={handleBorderRadiusUpdate}
        handlePanelVisible={handlePanelVisible}
        handleUpdatePanelError={handleUpdatePanelError}
        handleUpdatePanelSuggestion={handleUpdatePanelSuggestion}
      />
    ));
  }, [
    filteredErrorList,
    handleIgnoreChange,
    handleSelectAll,
    handleCreateStyle,
    handleSelect,
    handleIgnoreAll,
    handleFixAll,
    handleSuggestion,
    handleBorderRadiusUpdate,
    handlePanelVisible,
    handleUpdatePanelError,
    handleUpdatePanelSuggestion,
  ]);

  return (
    <div className="bulk-errors-list page-enter" key="bulk-list">
      <div className="filter-pills">
        {availableFilters.map((filter, index) => (
          <React.Fragment key={filter}>
            <div
              className="pill-wrapper"
              ref={batchMenuOpen === filter ? batchMenuRef : null}
            >
              <button
                className={`pill tap-effect ${
                  selectedFilters.has(filter) ? "selected" : ""
                }`}
                onClick={() => handleFilterClick(filter)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (filter !== "All") {
                    setBatchMenuOpen(batchMenuOpen === filter ? null : filter);
                  }
                }}
              >
                {filter}
                {filter !== "All" && errorCountByType[filter] && (
                  <span className="pill-count">
                    ({errorCountByType[filter].total})
                  </span>
                )}
              </button>
              {batchMenuOpen === filter && filter !== "All" && (
                <div className="batch-menu">
                  <div className="batch-menu-header">
                    Batch Actions: {filter}
                  </div>
                  <button
                    className="batch-menu-item"
                    onClick={() => handleBatchSelectByType(filter)}
                  >
                    Select All ({errorCountByType[filter]?.total || 0})
                  </button>
                  {errorCountByType[filter]?.fixable > 0 && (
                    <button
                      className="batch-menu-item batch-menu-item-primary"
                      onClick={() => handleBatchFixByType(filter)}
                    >
                      Fix All ({errorCountByType[filter].fixable})
                    </button>
                  )}
                  <button
                    className="batch-menu-item batch-menu-item-danger"
                    onClick={() => handleBatchIgnoreByType(filter)}
                  >
                    Ignore All
                  </button>
                </div>
              )}
            </div>
            {index === 0 && <span className="pill-divider">|</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="panel-body panel-body-errors">
        {!props.initialLoadComplete ? (
          <PreloaderCSS />
        ) : bulkErrorList.length ? (
          <>
            {totalErrorsWithMatches > 0 && (
              <Banner
                totalErrorsWithMatches={totalErrorsWithMatches}
                handleFixAllErrors={handleFixAllFromBanner}
              />
            )}
            <ul className="errors-list" key="wrapper-list">
              {errorListItems}
            </ul>
          </>
        ) : (
          <div className="success-message success-enter">
            <div className="success-shape">
              <img
                className="success-icon"
                src={require("../assets/smile.svg")}
              />
            </div>
            All errors fixed in the selection
          </div>
        )}
      </div>
      <div className="footer sticky-footer">
        <TotalErrorCount errorArray={filteredErrorArray} />
        {bulkErrorList.length > 0 && (
          <button
            className="button button--secondary export-button"
            onClick={handleExportReport}
            title="Export lint report as JSON"
          >
            Export Report
          </button>
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        error={currentError}
      />
      <StylesPanel
        panelVisible={panelVisible}
        onHandlePanelVisible={handlePanelVisible}
        error={panelError}
        suggestion={panelStyleSuggestion}
      />
    </div>
  );
}

export default BulkErrorList;
