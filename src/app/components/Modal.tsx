import React, { useState, useEffect, useRef } from "react";
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

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Background with fade-in animation */}
      <div
        className="modal-backdrop"
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
      <div
        className="modal-wrapper modal-content"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
        }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
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
          <div
            onClick={handleClose}
            className="modal-button modal-cancel tap-effect"
          >
            Cancel
          </div>
          <div
            className="modal-button modal-confirm tap-effect"
            onClick={handleSubmit}
          >
            Create
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
