import * as React from "react";

import ListItem from "./ListItem";
import TotalErrorCount from "./TotalErrorCount";
import { NodeWithErrors, IgnoredError } from "../../types";

interface NodeListProps {
  errorArray: NodeWithErrors[];
  ignoredErrorArray: IgnoredError[];
  activeNodeIds: string[];
  selectedListItems: string[];
  visibility: boolean;
  nodeArray: Array<{
    id: string;
    name: string;
    type: string;
    children?: Array<{
      id: string;
      name: string;
      type: string;
      children?: any[];
    }>;
  }>;
  onErrorUpdate: (node: NodeWithErrors) => void;
  onVisibleUpdate: (visible: boolean) => void;
  onSelectedListUpdate: (id: string) => void;
}

function NodeList(props: NodeListProps) {
  // Reduce the size of our array of errors by removing
  // nodes with no errors on them.
  const filteredErrorArray = props.errorArray.filter(
    (item) => item.errors.length >= 1,
  );

  filteredErrorArray.forEach((item: NodeWithErrors) => {
    // Check each layer/node to see if an error that matches it's layer id
    if (
      props.ignoredErrorArray.some((x: IgnoredError) => x.node.id === item.id)
    ) {
      // When we know a matching error exists loop over all the ignored
      // errors until we find it.
      props.ignoredErrorArray.forEach((ignoredError: IgnoredError) => {
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

  const handleNodeClick = (id: string) => {
    // Opens the panel if theres an error.
    const activeId = props.errorArray.find((e: NodeWithErrors) => e.id === id);

    if (activeId && activeId.errors.length) {
      // Pass the plugin the ID of the layer we want to fetch.
      parent.postMessage(
        { pluginMessage: { type: "fetch-layer-data", id: id } },
        "*",
      );

      props.onErrorUpdate(activeId);

      if (props.visibility === true) {
        props.onVisibleUpdate(false);
      } else {
        props.onVisibleUpdate(true);
      }
    }

    props.onSelectedListUpdate(id);
  };

  const handleOpenFirstError = () => {
    const lastItem = filteredErrorArray[filteredErrorArray.length - 1];
    handleNodeClick(lastItem.id);
  };

  if (props.nodeArray.length) {
    const nodes = props.nodeArray;

    const listItems = nodes.map((node: (typeof nodes)[0]) => (
      <ListItem
        ignoredErrorArray={props.ignoredErrorArray}
        activeNodeIds={props.activeNodeIds}
        onClick={handleNodeClick}
        selectedListItems={props.selectedListItems}
        errorArray={filteredErrorArray}
        key={node.id}
        node={node}
      />
    ));

    return (
      <div className="page page-enter" key="node-list">
        <ul className="list">{listItems}</ul>
        <div className="footer">
          <TotalErrorCount errorArray={filteredErrorArray} />
          <div className="actions-row">
            <button
              className="button button--primary button--flex"
              disabled={filteredErrorArray.length === 0}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handleOpenFirstError();
              }}
            >
              Jump to next error →
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <React.Fragment>
        <ul className="list"></ul>
        <TotalErrorCount errorArray={filteredErrorArray} />
      </React.Fragment>
    );
  }
}

export default React.memo(NodeList);
