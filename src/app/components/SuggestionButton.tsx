import React, { useState, useEffect } from "react";
import { motion } from "framer-motion/dist/framer-motion";
import { BulkError } from "../../types";

interface SuggestionButtonProps {
  error: BulkError;
  index: number;
  applyStyle: (error: BulkError, index: number) => void;
}

function SuggestionButton({ error, index, applyStyle }: SuggestionButtonProps) {
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

  const handleClick = (error: BulkError, index: number) => {
    if (!isLoading) {
      setIsLoading(true);

      applyStyle(error, index);

      const id = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      setTimerId(id);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98, opacity: 0.8 }}
      onClick={() => handleClick(error, index)}
      className={
        isLoading
          ? "loading-button disabled match-button"
          : "loading-button match-button"
      }
    >
      {isLoading ? (
        <div className="button-loading-dots match-button-loading">
          <span className="button-dot" />
          <span className="button-dot" />
          <span className="button-dot" />
        </div>
      ) : (
        <>Apply</>
      )}
    </motion.button>
  );
}

export default SuggestionButton;
