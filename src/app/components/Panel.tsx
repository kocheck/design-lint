import * as React from "react";

import ErrorList from "./ErrorList";
import PanelHeader from "./PanelHeader";
import Preloader from "./Preloader";

import "../styles/panel.css";
import { LintError, NodeWithErrors, IgnoredError } from "../../types";

interface PanelProps {
  visibility: boolean;
  node: { id: string; name: string };
  errorArray: NodeWithErrors[];
  ignoredErrors: IgnoredError[];
  onClick: () => void;
  onSelectedListUpdate: (id: string) => void;
  onIgnoredUpdate: (error: LintError) => void;
  onIgnoreAll: (errors: LintError[]) => void;
}

function Panel(props: PanelProps) {
  const isVisible = props.visibility;
  const node = props.node;

  // Reduce the size of our array of errors by removing
  // nodes with no errors on them.
  const filteredErrorArray = props.errorArray.filter(
    (item) => item.errors.length >= 1,
  );

  filteredErrorArray.forEach((item: NodeWithErrors) => {
    // Check each layer/node to see if an error that matches it's layer id
    if (props.ignoredErrors.some((x: IgnoredError) => x.node.id === item.id)) {
      // When we know a matching error exists loop over all the ignored
      // errors until we find it.
      props.ignoredErrors.forEach((ignoredError: IgnoredError) => {
        if (ignoredError.node.id === item.id) {
          // Loop over every error this layer/node until we find the
          // error that should be ignored, then remove it.
          for (let i = 0; i < item.errors.length; i++) {
            if (item.errors[i].value === ignoredError.value) {
              item.errors.splice(i, 1);
              i--;
            }
          }
        }
      });
    }
  });

  let activeId: NodeWithErrors | undefined = props.errorArray.find(
    (e: NodeWithErrors) => e.id === node.id,
  );
  let errors: LintError[] = [];
  if (activeId !== undefined) {
    errors = activeId.errors;
  }

  function handlePrevNavigation() {
    if (!activeId) return;

    const currentIndex = filteredErrorArray.findIndex(
      (item) => item.id === activeId!.id,
    );
    if (filteredErrorArray[currentIndex + 1] !== undefined) {
      activeId = filteredErrorArray[currentIndex + 1];
    } else if (currentIndex !== 0) {
      activeId = filteredErrorArray[0];
    } else {
      activeId = filteredErrorArray[currentIndex - 1];
    }

    props.onSelectedListUpdate(activeId.id);

    parent.postMessage(
      { pluginMessage: { type: "fetch-layer-data", id: activeId.id } },
      "*",
    );
  }

  function handleNextNavigation() {
    if (!activeId) return;

    const currentIndex = filteredErrorArray.findIndex(
      (item) => item.id === activeId!.id,
    );
    const lastItem = currentIndex + filteredErrorArray.length - 1;

    if (filteredErrorArray[currentIndex - 1] !== undefined) {
      activeId = filteredErrorArray[currentIndex - 1];
    } else if (filteredErrorArray.length === 1) {
      activeId = filteredErrorArray[0];
    } else {
      activeId = filteredErrorArray[lastItem];
    }

    props.onSelectedListUpdate(activeId.id);

    parent.postMessage(
      { pluginMessage: { type: "fetch-layer-data", id: activeId.id } },
      "*",
    );
  }

  // Open and closes the panel.
  function handleChange() {
    props.onClick();
  }

  // Passes the ignored error back to it's parent.
  function handleIgnoreChange(error: LintError) {
    props.onIgnoredUpdate(error);
  }

  function handleSelectAll(error: LintError) {
    const nodesToBeSelected: string[] = [];

    filteredErrorArray.forEach((node: NodeWithErrors) => {
      node.errors.forEach((item: LintError) => {
        if (item.value === error.value) {
          if (item.type === error.type) {
            nodesToBeSelected.push(item.node.id);
          }
        }
      });
    });

    if (nodesToBeSelected.length) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "select-multiple-layers",
            nodeArray: nodesToBeSelected,
          },
        },
        "*",
      );
    }
  }

  function handleIgnoreAll(error: LintError) {
    const errorsToBeIgnored: LintError[] = [];

    filteredErrorArray.forEach((node: NodeWithErrors) => {
      node.errors.forEach((item: LintError) => {
        if (item.value === error.value) {
          if (item.type === error.type) {
            errorsToBeIgnored.push(item);
          }
        }
      });
    });

    if (errorsToBeIgnored.length) {
      props.onIgnoreAll(errorsToBeIgnored);
    }
  }

  // We need an conditional statement for rendering in case the user deletes the selected layer.
  return (
    <React.Fragment>
      {activeId !== undefined ? (
        <div
          className={`panel panel-slide ${isVisible ? "panel-open" : "panel-closed"}`}
        >
          <PanelHeader
            title={node.name}
            handleHide={handleChange}
          ></PanelHeader>

          <div className="panel-body">
            {errors.length ? (
              <React.Fragment>
                <div className="error-label">Errors — {errors.length}</div>
                <ErrorList
                  onIgnoredUpdate={handleIgnoreChange}
                  onIgnoreAll={handleIgnoreAll}
                  onSelectAll={handleSelectAll}
                  errors={errors}
                  allErrors={filteredErrorArray}
                />
              </React.Fragment>
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

          <div className="panel-footer">
            <button
              onClick={handlePrevNavigation}
              disabled={filteredErrorArray.length <= 1}
              className="button previous button--secondary button--flex"
            >
              ← Previous
            </button>

            <button
              onClick={handleNextNavigation}
              disabled={filteredErrorArray.length <= 1}
              className="button next button--secondary button--flex"
            >
              Next →
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`panel panel-slide ${isVisible ? "panel-open" : "panel-closed"}`}
        >
          <div className="name-wrapper">
            <Preloader />
          </div>
        </div>
      )}
      {isVisible ? (
        <div className="overlay" onClick={handleChange}></div>
      ) : null}
    </React.Fragment>
  );
}

export default React.memo(Panel);
