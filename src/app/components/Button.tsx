import React, { useState, useEffect } from "react";
import { BulkError } from "../../types";

interface ButtonProps {
  error: BulkError;
  applyStyle: (error: BulkError) => void;
}

function Button({ error, applyStyle }: ButtonProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Clear the timeout when the component is unmounted
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [timerId]);

  const handleClick = (error: BulkError) => {
    if (!isLoading) {
      setIsLoading(true);

      applyStyle(error);

      const id = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      setTimerId(id);
    }
  };

  return (
    <button
      onClick={() => handleClick(error)}
      className={`tap-effect ${
        isLoading
          ? "loading-button disabled match-button"
          : "loading-button match-button"
      }`}
    >
      {isLoading ? (
        <div className="button-loading-dots match-button-loading">
          <span className="button-dot" />
          <span className="button-dot" />
          <span className="button-dot" />
        </div>
      ) : (
        <>Fix All</>
      )}
    </button>
  );
}

export default Button;
