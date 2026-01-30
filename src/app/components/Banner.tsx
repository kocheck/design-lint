import React, { useState, useEffect } from "react";

interface BannerProps {
  totalErrorsWithMatches: number;
  handleFixAllErrors: () => void;
}

function Banner({ totalErrorsWithMatches, handleFixAllErrors }: BannerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    if (!isLoading) {
      setIsLoading(true);

      handleFixAllErrors();

      const id = setTimeout(() => {
        setIsLoading(false);
      }, 2000);

      setTimeoutId(id);
    }
  };

  // Set up a cleanup function to cancel the timeout when the component is unmounted
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <div className="banner-wrapper fade-slide-enter">
      <div className="banner">
        <span className={`error-type error-background-banner`}>
          <img src={require("../assets/sparkles.svg")} />
        </span>
        <span className="banner-label">
          Automatic Fixes{" "}
          <span className="error-description__count">
            · ({totalErrorsWithMatches})
          </span>
        </span>
        <button
          onClick={handleClick}
          className={`tap-effect ${
            isLoading
              ? "loading-button disabled auto-fix-button"
              : "loading-button auto-fix-button"
          }`}
        >
          {isLoading ? (
            <div className="button-loading-dots">
              <span className="button-dot" />
              <span className="button-dot" />
              <span className="button-dot" />
            </div>
          ) : (
            <>
              <span className="auto-fix-button-label">Fix All</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Banner;
