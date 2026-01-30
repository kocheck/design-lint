import * as React from "react";
import classNames from "classnames";
import { NodeWithErrors, IgnoredError } from "../../types";

interface ListItemNode {
  id: string;
  name: string;
  type: string;
  children?: ListItemNode[];
}

interface ListItemProps {
  node: ListItemNode;
  errorArray: NodeWithErrors[];
  ignoredErrorArray: IgnoredError[];
  activeNodeIds: string[];
  selectedListItems: string[];
  onClick: (id: string) => void;
}

function ListItem(props: ListItemProps) {
  const { onClick } = props;
  const node = props.node;
  let childNodes: JSX.Element[] | null = null;
  let errorObject: NodeWithErrors = { id: "", errors: [], children: [] };
  let childErrorsCount = 0;

  const filteredErrorArray = props.errorArray;

  // Check to see if this node has corresponding errors.
  if (filteredErrorArray.some((e: NodeWithErrors) => e.id === node.id)) {
    const foundError = filteredErrorArray.find(
      (e: NodeWithErrors) => e.id === node.id,
    );
    if (foundError) {
      errorObject = foundError;
    }
  }

  // The component calls itself if there are children
  if (node.children && node.children.length) {
    // Find errors in this node's children.
    childErrorsCount = findNestedErrors(node);

    const reversedArray = node.children.slice().reverse();
    childNodes = reversedArray.map(function (childNode: ListItemNode) {
      return (
        <ListItem
          ignoredErrorArray={props.ignoredErrorArray}
          activeNodeIds={props.activeNodeIds}
          selectedListItems={props.selectedListItems}
          errorArray={filteredErrorArray}
          onClick={onClick}
          key={childNode.id}
          node={childNode}
        />
      );
    });
  }

  // Recursive function for finding the amount of errors
  // nested within this nodes children.
  function findNestedErrors(node: ListItemNode): number {
    let errorCount = 0;

    node.children?.forEach((childNode: ListItemNode) => {
      if (
        filteredErrorArray.some((e: NodeWithErrors) => e.id === childNode.id)
      ) {
        const childErrorObject = filteredErrorArray.find(
          (e: NodeWithErrors) => e.id === childNode.id,
        );
        if (childErrorObject) {
          errorCount = errorCount + childErrorObject.errors.length;
        }
      }

      if (childNode.children) {
        errorCount = errorCount + findNestedErrors(childNode);
      }
    });

    return errorCount;
  }

  return (
    <li
      id={node.id}
      className={classNames(`list-item`, {
        "list-item--active": props.activeNodeIds.includes(node.id),
        "list-item--selected": props.selectedListItems.includes(node.id),
      })}
      onClick={(event: React.MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();
        onClick(node.id);
      }}
    >
      <div className="list-flex-row">
        <span className="list-arrow">
          {childNodes ? (
            <img
              className="list-arrow-icon"
              src={require("../assets/caret.svg")}
            />
          ) : null}
        </span>
        <span className="list-icon">
          <img src={require("../assets/" + node.type.toLowerCase() + ".svg")} />
        </span>
        <span className="list-name">{node.name}</span>
        {childErrorsCount >= 1 && <span className="dot"></span>}
        {errorObject.errors.length >= 1 && (
          <span className="badge">{errorObject.errors.length}</span>
        )}
      </div>
      {childNodes ? <ul className="sub-list">{childNodes}</ul> : null}
    </li>
  );
}

export default ListItem;
