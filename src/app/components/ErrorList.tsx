import * as React from "react";
import ErrorListItem from "./ErrorListItem";
import { LintError, NodeWithErrors } from "../../types";

interface ErrorListProps {
  errors: LintError[];
  allErrors: NodeWithErrors[];
  onIgnoredUpdate: (error: LintError) => void;
  onIgnoreAll: (error: LintError) => void;
  onSelectAll: (error: LintError) => void;
}

function ErrorList(props: ErrorListProps) {
  const handleIgnoreClick = (error: LintError) => {
    props.onIgnoredUpdate(error);
  };

  const handleIgnoreAll = (error: LintError) => {
    props.onIgnoreAll(error);
  };

  const handleSelectAll = (error: LintError) => {
    props.onSelectAll(error);
  };

  // Finds how many other nodes have this exact error.
  function countInstancesOfThisError(error: LintError): number {
    const nodesToBeSelected: string[] = [];

    props.allErrors.forEach((node: NodeWithErrors) => {
      node.errors.forEach((item: LintError) => {
        if (item.value === error.value) {
          if (item.type === error.type) {
            nodesToBeSelected.push(item.node.id);
          }
        }
      });
    });

    return nodesToBeSelected.length;
  }

  // ErrorListItem and BulkErrorListItem are nearly indentical bar a
  // few differences in what information and context menu items they have.
  const errorListItems = props.errors.map((error: LintError, index: number) => (
    <ErrorListItem
      error={error}
      errorCount={countInstancesOfThisError(error)}
      index={index}
      key={index}
      handleIgnoreChange={handleIgnoreClick}
      handleSelectAll={handleSelectAll}
      handleIgnoreAll={handleIgnoreAll}
    />
  ));

  return <ul className="errors-list errors-list-panel">{errorListItems}</ul>;
}

export default React.memo(ErrorList);
