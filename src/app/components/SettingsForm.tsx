import * as React from "react";
import { useState } from "react";

interface SettingsFormProps {
  borderRadiusValues: string;
}

function SettingsForm(props: SettingsFormProps) {
  const [radiusValue, setRadiusValue] = useState("");

  const handleSubmit = (event: React.FormEvent | React.MouseEvent) => {
    event.preventDefault();

    if (radiusValue.length) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "update-border-radius",
            radiusValues: radiusValue,
          },
        },
        "*",
      );
    }
  };

  function handleClear() {
    parent.postMessage(
      {
        pluginMessage: {
          type: "reset-border-radius",
        },
      },
      "*",
    );
  }

  return (
    <div className="settings-row">
      <div className="settings-form" onSubmit={handleSubmit}>
        <h3 className="settings-title">Border Radius</h3>
        <div className="settings-label">
          Set your preferred border radius values separated by commas (ex: "2,
          4, 6, 8").
        </div>

        <div className="input-icon">
          <div className="input-icon__icon">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.5, marginTop: '10px', marginLeft: '10px' }}
            >
              <path
                d="M12 1H7C3.68629 1 1 3.68629 1 7V12H0V7C0 3.13401 3.13401 0 7 0H12V1Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <input
            type="input"
            className="input-icon__input"
            value={radiusValue}
            onChange={(e) => setRadiusValue(e.target.value)}
            placeholder={props.borderRadiusValues}
          />
        </div>
      </div>
      <div className="form-button-group">
        <button className="button button--primary" onClick={handleSubmit}>
          Save
        </button>
        <button className="button button--secondary" onClick={handleClear}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default SettingsForm;
