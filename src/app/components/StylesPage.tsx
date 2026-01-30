import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import StyleListItem from "./StyleListItem";
import { RemoteStyles } from "../../types";

interface StylesPageProps {
  stylesInUse: RemoteStyles | null;
}

type StyleType = "all" | "fills" | "text" | "effects" | "strokes";

const StylesPage: React.FC<StylesPageProps> = ({ stylesInUse }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<StyleType>("all");

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedType(e.target.value as StyleType);
    },
    [],
  );

  // Filter styles based on search query
  const filterStyles = useCallback(
    <T extends { name: string }>(styles: T[]): T[] => {
      if (!searchQuery.trim()) return styles;
      const query = searchQuery.toLowerCase();
      return styles.filter((style) => style.name.toLowerCase().includes(query));
    },
    [searchQuery],
  );

  // Filtered styles
  const filteredFills = useMemo(
    () => (stylesInUse ? filterStyles(stylesInUse.fills) : []),
    [stylesInUse, filterStyles],
  );

  const filteredText = useMemo(
    () => (stylesInUse ? filterStyles(stylesInUse.text) : []),
    [stylesInUse, filterStyles],
  );

  const filteredEffects = useMemo(
    () => (stylesInUse ? filterStyles(stylesInUse.effects) : []),
    [stylesInUse, filterStyles],
  );

  const filteredStrokes = useMemo(
    () => (stylesInUse ? filterStyles(stylesInUse.strokes) : []),
    [stylesInUse, filterStyles],
  );

  // Count totals
  const totalStyles = useMemo(() => {
    if (!stylesInUse) return 0;
    return (
      filteredFills.length +
      filteredText.length +
      filteredEffects.length +
      filteredStrokes.length
    );
  }, [filteredFills, filteredText, filteredEffects, filteredStrokes]);

  const shouldShowSection = useCallback(
    (type: StyleType) => {
      return selectedType === "all" || selectedType === type;
    },
    [selectedType],
  );

  return (
    <div className="styles-overview-wrapper">
      {/* Search and Filter Header */}
      <div className="styles-header">
        <div className="styles-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search styles..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <div className="styles-filters">
          <select
            className="filter-select"
            value={selectedType}
            onChange={handleTypeChange}
          >
            <option value="all">All Types</option>
            <option value="fills">Fills</option>
            <option value="text">Text</option>
            <option value="effects">Effects</option>
            <option value="strokes">Strokes</option>
          </select>
          <span className="styles-count">{totalStyles} styles</span>
        </div>
      </div>

      {stylesInUse ? (
        <div>
          {shouldShowSection("fills") && filteredFills.length > 0 && (
            <>
              <h4>
                Fill Styles{" "}
                <span className="section-count">({filteredFills.length})</span>
              </h4>
              <ul className="style-overview-list">
                {filteredFills.map((style, index: number) => (
                  <StyleListItem
                    style={style}
                    index={index}
                    key={`style item - ${style.name}-${index}`}
                  />
                ))}
              </ul>
            </>
          )}

          {shouldShowSection("text") && filteredText.length > 0 && (
            <>
              <h4>
                Text Styles{" "}
                <span className="section-count">({filteredText.length})</span>
              </h4>
              <ul className="style-overview-list">
                {filteredText.map((style, index: number) => (
                  <StyleListItem
                    style={style}
                    index={index}
                    key={`style item - ${style.name}-${index}`}
                  />
                ))}
              </ul>
            </>
          )}

          {shouldShowSection("effects") && filteredEffects.length > 0 && (
            <>
              <h4>
                Effect Styles{" "}
                <span className="section-count">
                  ({filteredEffects.length})
                </span>
              </h4>
              <ul className="style-overview-list">
                {filteredEffects.map((style, index: number) => (
                  <StyleListItem
                    style={style}
                    index={index}
                    key={`style item - ${style.name}-${index}`}
                  />
                ))}
              </ul>
            </>
          )}

          {shouldShowSection("strokes") && filteredStrokes.length > 0 && (
            <>
              <h4>
                Stroke Styles{" "}
                <span className="section-count">
                  ({filteredStrokes.length})
                </span>
              </h4>
              <ul className="style-overview-list">
                {filteredStrokes.map((style, index: number) => (
                  <StyleListItem
                    style={style}
                    index={index}
                    key={`style item - ${style.name}-${index}`}
                  />
                ))}
              </ul>
            </>
          )}

          {totalStyles === 0 && (
            <div className="empty-styles">
              {searchQuery
                ? `No styles found matching "${searchQuery}"`
                : "No styles in use on this page"}
            </div>
          )}
        </div>
      ) : (
        <div className="empty-styles">Loading styles...</div>
      )}
    </div>
  );
};

export default StylesPage;
