import * as React from "react";
import PanelHeader from "./PanelHeader";
import "../styles/panel.css";
import type { BulkError } from "../../types";

interface StylesPanelProps {
  panelVisible: boolean;
  onHandlePanelVisible: (visible: boolean) => void;
  error: BulkError | null;
  suggestion: number | null;
}

// Panel for comparing styles
function StylesPanel(props: StylesPanelProps) {
  const isVisible = props.panelVisible;
  const error = props.error;

  function handleHide() {
    props.onHandlePanelVisible(false);
  }

  return (
    <React.Fragment>
      <div
        className={`panel panel-slide ${isVisible ? "panel-open" : "panel-closed"}`}
        key="styles-panel"
      >
        <PanelHeader
          title={"Compare Styles"}
          handleHide={handleHide}
        ></PanelHeader>

        <div className="style-comparison">
          {error &&
            error.textProperties &&
            error.suggestions &&
            props.suggestion !== null &&
            error.suggestions[props.suggestion]?.textProperties && (
              <>
                <div className="comparison-wrapper">
                  <h4 className="comparison-title">Current</h4>
                  <div className="comparison-row">
                    <div className="comparison-row-item row-item-grow">
                      <div className="comparison-value">
                        {error.textProperties.font}
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        {error.textProperties.fontStyle}
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        <span className="comparison-label">Size:</span>
                        {error.textProperties.fontSize}
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item">
                      <svg
                        className="comparison-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M14 1H0V0H14V1ZM14 14H0V13H14V14Z" fill="currentColor" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.548 11L6.348 3H7.652L10.452 11H9.498L8.798 9H5.202L4.502 11H3.548ZM7 3.862L8.448 8H5.552L7 3.862Z" fill="currentColor" />
                      </svg>
                      <div className="comparison-value">
                        {error.textProperties.lineHeight}
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <svg
                        className="comparison-icon"
                        width="16"
                        height="12"
                        viewBox="0 0 16 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M0 12V0H1V12H0ZM15 12V0H16V12H15Z" fill="currentColor" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.548 10L7.348 2H8.652L11.452 10H10.498L9.798 8H6.202L5.502 10H4.548ZM8 2.862L9.448 7H6.552L8 2.862Z" fill="currentColor" />
                      </svg>
                      <div className="comparison-value">
                        {error.textProperties.letterSpacingValue}
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <svg
                        className="comparison-icon"
                        width="14"
                        height="16"
                        viewBox="0 0 14 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M14 1H0V0H14V1ZM7 1.793L9.354 4.146L8.646 4.854L7.5 3.707V8.293L8.646 7.146L9.354 7.854L7 10.207L4.646 7.854L5.354 7.146L6.5 8.293V3.707L5.354 4.854L4.646 4.146L7 1.793ZM14 11V12H0V11H14ZM14 15V16H0V15H14Z" fill="currentColor" />
                      </svg>
                      <div className="comparison-value">
                        {error.textProperties.paragraphSpacing}
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        <span className="comparison-label">Align:</span>
                        {error.textProperties.textAlignHorizontal?.toLowerCase() ??
                          "-"}
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        <span className="comparison-label">V Align:</span>
                        {error.textProperties.textAlignVertical?.toLowerCase() ??
                          "-"}
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item row-item-grow">
                      <div className="comparison-value">
                        <span className="comparison-label">Case:</span>
                        {error.textProperties.textCase?.toLowerCase() ?? "-"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="comparison-wrapper">
                  <h4 className="comparison-title">
                    {error.suggestions[props.suggestion].name}
                  </h4>
                  <div className="comparison-row">
                    <div className="comparison-row-item row-item-grow">
                      <div className="comparison-value">
                        {
                          error.suggestions[props.suggestion].textProperties
                            ?.fontFamily
                        }
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        {
                          error.suggestions[props.suggestion].textProperties
                            ?.fontStyle
                        }
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        <span className="comparison-label">Size:</span>
                        {
                          error.suggestions[props.suggestion].textProperties
                            ?.fontSize
                        }
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item">
                      <svg
                        className="comparison-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M14 1H0V0H14V1ZM14 14H0V13H14V14Z" fill="currentColor" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.548 11L6.348 3H7.652L10.452 11H9.498L8.798 9H5.202L4.502 11H3.548ZM7 3.862L8.448 8H5.552L7 3.862Z" fill="currentColor" />
                      </svg>
                      <div className="comparison-value">
                        {
                          (
                            error.suggestions[props.suggestion].textProperties
                              ?.lineHeight as { value?: number }
                          )?.value
                        }
                        {(
                          error.suggestions[props.suggestion].textProperties
                            ?.lineHeight as { value?: number }
                        )?.value !== error.textProperties.lineHeight ? (
                          <span className="difference">*</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <svg
                        className="comparison-icon"
                        width="16"
                        height="12"
                        viewBox="0 0 16 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M0 12V0H1V12H0ZM15 12V0H16V12H15Z" fill="currentColor" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M4.548 10L7.348 2H8.652L11.452 10H10.498L9.798 8H6.202L5.502 10H4.548ZM8 2.862L9.448 7H6.552L8 2.862Z" fill="currentColor" />
                      </svg>
                      <div className="comparison-value">
                        {
                          (
                            error.suggestions[props.suggestion].textProperties
                              ?.letterSpacing as { value?: number }
                          )?.value
                        }
                        {(
                          error.suggestions[props.suggestion].textProperties
                            ?.letterSpacing as { value?: number }
                        )?.value !== error.textProperties.letterSpacingValue ? (
                          <span className="difference">*</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <svg
                        className="comparison-icon"
                        width="14"
                        height="16"
                        viewBox="0 0 14 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M14 1H0V0H14V1ZM7 1.793L9.354 4.146L8.646 4.854L7.5 3.707V8.293L8.646 7.146L9.354 7.854L7 10.207L4.646 7.854L5.354 7.146L6.5 8.293V3.707L5.354 4.854L4.646 4.146L7 1.793ZM14 11V12H0V11H14ZM14 15V16H0V15H14Z" fill="currentColor" />
                      </svg>
                      <div className="comparison-value">
                        {
                          error.suggestions[props.suggestion].textProperties
                            ?.paragraphSpacing
                        }
                        {error.suggestions[props.suggestion].textProperties
                          ?.paragraphSpacing !==
                        error.textProperties.paragraphSpacing ? (
                          <span className="difference">*</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        <span className="comparison-label">Align:</span>
                        {"-"}
                      </div>
                    </div>
                    <div className="comparison-row-item">
                      <div className="comparison-value">
                        <span className="comparison-label">V Align:</span>
                        {"-"}
                      </div>
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="comparison-row-item row-item-grow">
                      <div className="comparison-value">
                        <span className="comparison-label">Case:</span>
                        {(
                          error.suggestions[props.suggestion].textProperties
                            ?.textCase as string
                        )?.toLowerCase() ?? "-"}
                        {error.suggestions[props.suggestion].textProperties
                          ?.textCase !== error.textProperties.textCase ? (
                          <span className="difference">*</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>

      {isVisible ? <div className="overlay" onClick={handleHide}></div> : null}
    </React.Fragment>
  );
}

export default StylesPanel;
