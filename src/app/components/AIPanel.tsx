import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useOllama } from "../hooks/useOllama";
import PanelHeader from "./PanelHeader";
import { NodeWithErrors, RemoteStyles, BulkError } from "../../types";
import "../styles/ai-panel.css";

interface AIPanelProps {
  panelVisible: boolean;
  onHandlePanelVisible: (visible: boolean) => void;
  errorArray: NodeWithErrors[];
  stylesInUse?: RemoteStyles | null;
}

type AIFeature = "review" | "rename";

interface RenameSuggestion {
  id: string;
  original: string;
  suggested: string;
}

function AIPanel(props: AIPanelProps) {
  const [activeFeature, setActiveFeature] = useState<AIFeature>("review");
  const [renameSuggestions, setRenameSuggestions] = useState<
    RenameSuggestion[]
  >([]);
  const {
    isAvailable,
    isChecking,
    availableModels,
    currentRequest,
    error,
    richContext,
    isLoadingContext,
    checkAvailability,
    requestRichContext,
    requestReview,
    requestRename,
    clearRequest,
  } = useOllama();

  // Request rich context when panel opens
  useEffect(() => {
    if (
      props.panelVisible &&
      isAvailable &&
      !richContext &&
      !isLoadingContext
    ) {
      requestRichContext();
    }
  }, [
    props.panelVisible,
    isAvailable,
    richContext,
    isLoadingContext,
    requestRichContext,
  ]);

  const handleHide = useCallback(() => {
    props.onHandlePanelVisible(false);
  }, [props.onHandlePanelVisible]);

  // Compute bulk errors from errorArray
  const bulkErrors = useMemo(() => {
    const errorMap: Record<string, BulkError> = {};

    props.errorArray.forEach((item) => {
      item.errors.forEach((error) => {
        const key = `${error.type}_${error.message}_${error.value}`;
        if (errorMap[key]) {
          errorMap[key].count++;
          errorMap[key].nodes.push(error.node.id);
        } else {
          errorMap[key] = {
            ...error,
            nodes: [error.node.id],
            count: 1,
          };
        }
      });
    });

    return Object.values(errorMap);
  }, [props.errorArray]);

  // Get layers with naming issues for rename suggestions
  const layersWithNamingIssues = useMemo(() => {
    const layers: Array<{ id: string; name: string; type: string }> = [];
    const seen = new Set<string>();

    props.errorArray.forEach((item) => {
      item.errors.forEach((error) => {
        if (error.type === "naming" && !seen.has(error.node.id)) {
          seen.add(error.node.id);
          layers.push({
            id: error.node.id,
            name: error.node.name,
            type: error.node.type,
          });
        }
      });
    });

    return layers;
  }, [props.errorArray]);

  // Compute styles summary
  const stylesSummary = useMemo(() => {
    if (!props.stylesInUse) {
      return { fills: 0, text: 0, effects: 0 };
    }
    return {
      fills: props.stylesInUse.fills.length,
      text: props.stylesInUse.text.length,
      effects: props.stylesInUse.effects.length,
    };
  }, [props.stylesInUse]);

  const handleRequestReview = useCallback(() => {
    setActiveFeature("review");
    // Refresh rich context before making request
    if (!richContext) {
      requestRichContext();
    }
    const errors = bulkErrors.map((e) => ({
      type: e.type,
      message: e.message,
      count: e.count,
    }));
    requestReview(errors, stylesSummary, true); // Use rich context
  }, [
    bulkErrors,
    stylesSummary,
    requestReview,
    richContext,
    requestRichContext,
  ]);

  const handleRequestRename = useCallback(() => {
    setActiveFeature("rename");
    setRenameSuggestions([]);
    // Refresh rich context before making request
    if (!richContext) {
      requestRichContext();
    }
    requestRename(layersWithNamingIssues, true); // Use rich context
  }, [layersWithNamingIssues, requestRename, richContext, requestRichContext]);

  // Parse rename suggestions when completed
  React.useEffect(() => {
    if (
      currentRequest?.status === "completed" &&
      currentRequest.type === "rename" &&
      currentRequest.result
    ) {
      try {
        // Try to parse JSON from the response
        const jsonMatch = currentRequest.result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as RenameSuggestion[];
          setRenameSuggestions(parsed);
        }
      } catch {
        // If parsing fails, show the raw result
        console.log("Could not parse rename suggestions");
      }
    }
  }, [currentRequest]);

  const handleApplyRename = useCallback((suggestion: RenameSuggestion) => {
    // Send message to plugin to rename the layer
    parent.postMessage(
      {
        pluginMessage: {
          type: "rename-layer",
          id: suggestion.id,
          name: suggestion.suggested,
        },
      },
      "*",
    );

    // Remove from suggestions list
    setRenameSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));

    parent.postMessage(
      {
        pluginMessage: {
          type: "notify-user",
          message: `Renamed layer to "${suggestion.suggested}"`,
        },
      },
      "*",
    );
  }, []);

  const handleApplyAllRenames = useCallback(() => {
    renameSuggestions.forEach((suggestion) => {
      parent.postMessage(
        {
          pluginMessage: {
            type: "rename-layer",
            id: suggestion.id,
            name: suggestion.suggested,
          },
        },
        "*",
      );
    });

    setRenameSuggestions([]);

    parent.postMessage(
      {
        pluginMessage: {
          type: "notify-user",
          message: `Renamed ${renameSuggestions.length} layers`,
        },
      },
      "*",
    );
  }, [renameSuggestions]);

  const isProcessing = currentRequest?.status === "processing";

  // Parse the review result if available
  const reviewContent = useMemo(() => {
    if (
      currentRequest?.status === "completed" &&
      currentRequest.type === "review"
    ) {
      return currentRequest.result || "";
    }
    return null;
  }, [currentRequest]);

  // Error count summary
  const errorSummary = useMemo(() => {
    const total = bulkErrors.reduce((sum, e) => sum + e.count, 0);
    const byType: Record<string, number> = {};
    bulkErrors.forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + e.count;
    });
    return { total, byType };
  }, [bulkErrors]);

  return (
    <React.Fragment>
      <div
        className={`panel panel-slide ${props.panelVisible ? "panel-open" : "panel-closed"}`}
        key="ai-panel"
      >
        <PanelHeader title="AI Assistant" handleHide={handleHide} />

        <div className="ai-panel-content">
          {/* Status Section */}
          <div className="ai-status-section">
            <div className="ai-status-header">
              <span className="ai-status-label">Ollama Status</span>
              <span
                className={`ai-status-indicator ${isAvailable ? "ai-status-online" : "ai-status-offline"}`}
              >
                {isChecking
                  ? "Checking..."
                  : isAvailable
                    ? "Online"
                    : "Offline"}
              </span>
            </div>

            {!isAvailable && !isChecking && (
              <div className="ai-status-message">
                <p>
                  Ollama is not running. Start Ollama on your machine to enable
                  AI features.
                </p>
                <button
                  className="button button--secondary"
                  onClick={checkAvailability}
                >
                  Retry Connection
                </button>
              </div>
            )}

            {isAvailable && (
              <div className="ai-status-info">
                <span className="ai-model-label">
                  Models:{" "}
                  {availableModels.length > 0
                    ? availableModels.join(", ")
                    : "Loading..."}
                </span>
              </div>
            )}
          </div>

          {/* Current Design Stats */}
          <div className="ai-stats-section">
            <div className="ai-stats-row">
              <span className="ai-stats-label">Errors:</span>
              <span className="ai-stats-value">{errorSummary.total}</span>
            </div>
            <div className="ai-stats-row">
              <span className="ai-stats-label">Styles:</span>
              <span className="ai-stats-value">
                {stylesSummary.fills +
                  stylesSummary.text +
                  stylesSummary.effects}
              </span>
            </div>
            <div className="ai-stats-row">
              <span className="ai-stats-label">Naming Issues:</span>
              <span className="ai-stats-value">
                {layersWithNamingIssues.length}
              </span>
            </div>
          </div>

          {/* Rich Context Info */}
          {richContext && (
            <div className="ai-context-section">
              <div className="ai-context-header">
                <span className="ai-context-label">Design Context</span>
                <button
                  className="ai-context-refresh"
                  onClick={() => requestRichContext()}
                  disabled={isLoadingContext}
                  title="Refresh context"
                >
                  {isLoadingContext ? "..." : "↻"}
                </button>
              </div>
              <div className="ai-context-grid">
                <div className="ai-context-item">
                  <span className="ai-context-value">
                    {richContext.patterns.autoLayoutUsagePercent}%
                  </span>
                  <span className="ai-context-desc">Auto-layout</span>
                </div>
                <div className="ai-context-item">
                  <span className="ai-context-value">
                    {richContext.patterns.componentUsagePercent}%
                  </span>
                  <span className="ai-context-desc">Components</span>
                </div>
                <div className="ai-context-item">
                  <span className="ai-context-value">
                    {richContext.patterns.styleAdherencePercent}%
                  </span>
                  <span className="ai-context-desc">Styled</span>
                </div>
                <div className="ai-context-item">
                  <span className="ai-context-value">
                    {richContext.variableUsage.length}
                  </span>
                  <span className="ai-context-desc">Variables</span>
                </div>
              </div>
              {richContext.patterns.commonSpacingValues.length > 0 && (
                <div className="ai-context-patterns">
                  <span className="ai-context-pattern-label">Spacing:</span>
                  <span className="ai-context-pattern-values">
                    {richContext.patterns.commonSpacingValues
                      .slice(0, 6)
                      .join(", ")}
                    px
                  </span>
                </div>
              )}
            </div>
          )}

          {isLoadingContext && !richContext && (
            <div className="ai-context-loading">
              <span>Loading design context...</span>
            </div>
          )}

          {/* Features Section */}
          {isAvailable && (
            <>
              {/* Design Review Feature */}
              <div className="ai-feature-section">
                <h4 className="ai-feature-title">Design Review</h4>
                <p className="ai-feature-description">
                  Get an AI-powered analysis of your design's lint errors and
                  style usage with actionable recommendations.
                </p>
                <button
                  className={`button button--primary ai-feature-button ${isProcessing ? "disabled" : ""}`}
                  onClick={handleRequestReview}
                  disabled={isProcessing || errorSummary.total === 0}
                >
                  {isProcessing && currentRequest?.type === "review"
                    ? "Analyzing..."
                    : errorSummary.total === 0
                      ? "No Errors to Review"
                      : "Analyze Design"}
                </button>
              </div>

              {/* Layer Rename Feature */}
              <div className="ai-feature-section">
                <h4 className="ai-feature-title">Smart Layer Rename</h4>
                <p className="ai-feature-description">
                  Get AI suggestions for renaming layers with naming convention
                  issues to follow design system best practices.
                </p>
                <button
                  className={`button button--secondary ai-feature-button ${isProcessing ? "disabled" : ""}`}
                  onClick={handleRequestRename}
                  disabled={isProcessing || layersWithNamingIssues.length === 0}
                >
                  {isProcessing && currentRequest?.type === "rename"
                    ? "Generating..."
                    : layersWithNamingIssues.length === 0
                      ? "No Naming Issues"
                      : `Suggest Names (${layersWithNamingIssues.length})`}
                </button>
              </div>

              {/* Review Results */}
              {reviewContent && activeFeature === "review" && (
                <div className="ai-result-section">
                  <div className="ai-result-header">
                    <h4>Review Results</h4>
                    <button
                      className="button button--secondary"
                      onClick={clearRequest}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="ai-result-content">
                    <pre className="ai-result-text">{reviewContent}</pre>
                  </div>
                </div>
              )}

              {/* Rename Suggestions */}
              {renameSuggestions.length > 0 && activeFeature === "rename" && (
                <div className="ai-result-section">
                  <div className="ai-result-header">
                    <h4>Rename Suggestions</h4>
                    <button
                      className="button button--primary"
                      onClick={handleApplyAllRenames}
                    >
                      Apply All
                    </button>
                  </div>
                  <div className="ai-rename-list">
                    {renameSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="ai-rename-item">
                        <div className="ai-rename-info">
                          <div className="ai-rename-original">
                            {suggestion.original}
                          </div>
                          <div className="ai-rename-arrow">→</div>
                          <div className="ai-rename-suggested">
                            {suggestion.suggested}
                          </div>
                        </div>
                        <button
                          className="button button--secondary ai-rename-apply"
                          onClick={() => handleApplyRename(suggestion)}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="ai-error">
                  <span className="ai-error-icon">⚠</span>
                  <span className="ai-error-message">{error}</span>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="ai-processing">
                  <div className="ai-processing-spinner" />
                  <span className="ai-processing-text">
                    AI is thinking... This may take a moment.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {props.panelVisible ? (
        <div className="overlay" onClick={handleHide}></div>
      ) : null}
    </React.Fragment>
  );
}

export default React.memo(AIPanel);
