import * as React from "react";
import { useState, useMemo } from "react";
import { VariablesInUse, VariableData } from "../../types";

interface VariablesPageProps {
  variablesInUse: VariablesInUse | null;
}

interface VariableItemProps {
  variable: VariableData;
  index: number;
}

const VariableItem: React.FC<VariableItemProps> = ({ variable, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSelectConsumers = (nodeIds: string[]) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "select-multiple-layers",
          nodeArray: nodeIds,
        },
      },
      "*",
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "color":
        return "🎨";
      case "number":
        return "#";
      case "string":
        return "Aa";
      case "boolean":
        return "✓";
      default:
        return "•";
    }
  };

  const consumerCount = variable.count || 0;
  const groupedConsumers = variable.groupedConsumers || {};

  return (
    <li className="style-list-item" key={`variable-${variable.id}-${index}`}>
      <div className="style-list-item-content" onClick={handleClick}>
        <div className="style-list-item-left">
          <span className="variable-type-icon">
            {getTypeIcon(variable.type)}
          </span>
          <div className="style-list-item-info">
            <span className="style-list-item-name">{variable.name}</span>
            {variable.description && (
              <span className="style-list-item-description">
                {variable.description}
              </span>
            )}
          </div>
        </div>
        <div className="style-list-item-right">
          <span className="style-list-item-value">
            {variable.type === "color" && variable.cssSyntax ? (
              <span
                className="color-preview"
                style={{ backgroundColor: variable.cssSyntax }}
              />
            ) : null}
            {variable.value}
          </span>
          <span className="style-list-item-count">{consumerCount} uses</span>
        </div>
      </div>

      {isExpanded && Object.keys(groupedConsumers).length > 0 && (
        <div className="style-list-item-expanded">
          <div className="style-list-item-consumers">
            {Object.entries(groupedConsumers).map(([nodeType, nodeIds]) => (
              <div
                key={nodeType}
                className="consumer-group"
                onClick={() => handleSelectConsumers(nodeIds as string[])}
              >
                <span className="consumer-type">{nodeType}</span>
                <span className="consumer-count">
                  {(nodeIds as string[]).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  );
};

const VariablesPage: React.FC<VariablesPageProps> = ({ variablesInUse }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredVariables = useMemo(() => {
    if (!variablesInUse?.variables) return [];

    return variablesInUse.variables.filter((variable) => {
      const matchesSearch = variable.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || variable.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [variablesInUse, searchTerm, filterType]);

  const colorVariables = useMemo(
    () => filteredVariables.filter((v) => v.type === "color"),
    [filteredVariables],
  );

  const numberVariables = useMemo(
    () => filteredVariables.filter((v) => v.type === "number"),
    [filteredVariables],
  );

  const stringVariables = useMemo(
    () => filteredVariables.filter((v) => v.type === "string"),
    [filteredVariables],
  );

  const booleanVariables = useMemo(
    () => filteredVariables.filter((v) => v.type === "boolean"),
    [filteredVariables],
  );

  const totalCount = variablesInUse?.variables?.length || 0;

  const handleExportCSS = () => {
    if (!variablesInUse?.variables) return;

    const cssLines = variablesInUse.variables
      .filter((v) => v.type === "color" || v.type === "number")
      .map((v) => {
        const cssName = v.name
          .replace(/\//g, "-")
          .replace(/\s+/g, "-")
          .toLowerCase();
        const value = v.type === "color" && v.cssSyntax ? v.cssSyntax : v.value;
        return `  --${cssName}: ${value};`;
      });

    const css = `:root {\n${cssLines.join("\n")}\n}`;

    // Copy to clipboard
    navigator.clipboard.writeText(css).then(() => {
      parent.postMessage(
        {
          pluginMessage: {
            type: "notify-user",
            message: "CSS variables copied to clipboard!",
          },
        },
        "*",
      );
    });
  };

  if (!variablesInUse || totalCount === 0) {
    return (
      <div className="styles-overview-wrapper">
        <div className="empty-variables">
          <p>No variables found in this page.</p>
          <p className="empty-variables-hint">
            Variables will appear here when you use Figma variables in your
            designs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="styles-overview-wrapper">
      <div className="variables-header">
        <div className="variables-search">
          <input
            type="text"
            placeholder="Search variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="variables-actions">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="color">Colors</option>
            <option value="number">Numbers</option>
            <option value="string">Strings</option>
            <option value="boolean">Booleans</option>
          </select>
          <button onClick={handleExportCSS} className="export-button">
            Export CSS
          </button>
        </div>
      </div>

      <div className="variables-summary">
        <span>{totalCount} variables</span>
        <span>•</span>
        <span>{colorVariables.length} colors</span>
        <span>•</span>
        <span>{numberVariables.length} numbers</span>
      </div>

      {colorVariables.length > 0 && (
        <div>
          <h4>Color Variables</h4>
          <ul className="style-overview-list">
            {colorVariables.map((variable, index) => (
              <VariableItem
                variable={variable}
                index={index}
                key={`color-var-${variable.id}-${index}`}
              />
            ))}
          </ul>
        </div>
      )}

      {numberVariables.length > 0 && (
        <div>
          <h4>Number Variables</h4>
          <ul className="style-overview-list">
            {numberVariables.map((variable, index) => (
              <VariableItem
                variable={variable}
                index={index}
                key={`number-var-${variable.id}-${index}`}
              />
            ))}
          </ul>
        </div>
      )}

      {stringVariables.length > 0 && (
        <div>
          <h4>String Variables</h4>
          <ul className="style-overview-list">
            {stringVariables.map((variable, index) => (
              <VariableItem
                variable={variable}
                index={index}
                key={`string-var-${variable.id}-${index}`}
              />
            ))}
          </ul>
        </div>
      )}

      {booleanVariables.length > 0 && (
        <div>
          <h4>Boolean Variables</h4>
          <ul className="style-overview-list">
            {booleanVariables.map((variable, index) => (
              <VariableItem
                variable={variable}
                index={index}
                key={`bool-var-${variable.id}-${index}`}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VariablesPage;
