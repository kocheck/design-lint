import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion/dist/framer-motion";
import { BulkError } from "../../types";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: BulkError | null;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, error }) => {
  const [title, setTitle] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null); // Create a reference to the input element

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus the input element when the modal is opened
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "create-style",
          error: error,
          title: title,
        },
      },
      "*",
    );
    setTitle("");
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSubmit();
    } else if (event.key === "Escape") {
      setTitle("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Background with fade-in animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={handleClose}
          />

          {/* Modal content with scale animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.2, delay: 0 }} // Add delay to start after background animation
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
            }}
            className="modal-wrapper"
            onClick={(e: React.MouseEvent<HTMLDivElement>) =>
              e.stopPropagation()
            }
          >
            <h3 className="modal-title">Create Style</h3>
            <p className="modal-subtitle">{error?.value}</p>
            <div className="modal-close" onClick={handleClose}>
              <img
                className="modal-close-icon"
                src={require("../assets/close.svg")}
              />
            </div>
            <input
              className="modal-input"
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={`Style Name`}
            />
            <div className="modal-button-wrapper">
              <motion.div
                whileTap={{ scale: 0.98, opacity: 0.8 }}
                onClick={handleClose}
                className="modal-button modal-cancel"
              >
                Cancel
              </motion.div>
              <motion.div
                whileTap={{ scale: 0.98, opacity: 0.8 }}
                className="modal-button modal-confirm"
                onClick={handleSubmit}
              >
                Create
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
