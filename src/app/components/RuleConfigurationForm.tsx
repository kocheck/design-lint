import * as React from "react";
import { useState, useEffect, useCallback } from "react";

export interface LintRuleConfig {
  enableColorCheck: boolean;
  enableTypographyCheck: boolean;
  enableSpacingCheck: boolean;
  enableComponentCheck: boolean;
  enableNamingCheck: boolean;
  enableNestingCheck: boolean;
  enableFixedDimensionsCheck: boolean;
  enableTouchTargetCheck: boolean;
  enableEmptyFrameCheck: boolean;
  enableDetachedInstanceCheck: boolean;
  enableIconSizeCheck: boolean;
  allowedSpacingValues: number[];
  allowedIconSizes: number[];
  minTouchTargetSize: number;
  maxAutoLayoutNestingDepth: number;
}

interface RuleConfigurationFormProps {
  initialConfig?: Partial<LintRuleConfig>;
  onConfigChange?: (config: LintRuleConfig) => void;
}

const DEFAULT_CONFIG: LintRuleConfig = {
  enableColorCheck: false,
  enableTypographyCheck: false,
  enableSpacingCheck: true,
  enableComponentCheck: true,
  enableNamingCheck: true,
  enableNestingCheck: true,
  enableFixedDimensionsCheck: true,
  enableTouchTargetCheck: true,
  enableEmptyFrameCheck: true,
  enableDetachedInstanceCheck: true,
  enableIconSizeCheck: true,
  allowedSpacingValues: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128],
  allowedIconSizes: [12, 16, 20, 24, 32, 40, 48],
  minTouchTargetSize: 44,
  maxAutoLayoutNestingDepth: 5,
};

const RULE_DESCRIPTIONS: Record<
  string,
  { label: string; description: string }
> = {
  enableColorCheck: {
    label: "Color Token Check",
    description: "Warn when fills don't use color tokens/variables",
  },
  enableTypographyCheck: {
    label: "Typography Check",
    description: "Warn when text doesn't use typography tokens",
  },
  enableSpacingCheck: {
    label: "Spacing Check",
    description: "Enforce consistent spacing values in auto-layout",
  },
  enableComponentCheck: {
    label: "Component Usage Check",
    description: "Warn about placeholder components",
  },
  enableNamingCheck: {
    label: "Naming Convention Check",
    description: "Enforce proper layer naming conventions",
  },
  enableNestingCheck: {
    label: "Nesting Depth Check",
    description: "Warn about excessive auto-layout nesting",
  },
  enableFixedDimensionsCheck: {
    label: "Fixed Dimensions Check",
    description: "Warn about large elements with fixed dimensions",
  },
  enableTouchTargetCheck: {
    label: "Touch Target Check",
    description: "Ensure interactive elements meet minimum size",
  },
  enableEmptyFrameCheck: {
    label: "Empty Frame Check",
    description: "Detect empty frames that may be unused",
  },
  enableDetachedInstanceCheck: {
    label: "Detached Instance Check",
    description: "Flag detached component instances",
  },
  enableIconSizeCheck: {
    label: "Icon Size Check",
    description: "Enforce standard icon sizes",
  },
};

function RuleConfigurationForm(props: RuleConfigurationFormProps) {
  const [config, setConfig] = useState<LintRuleConfig>({
    ...DEFAULT_CONFIG,
    ...props.initialConfig,
  });
  const [spacingInput, setSpacingInput] = useState(
    config.allowedSpacingValues.join(", "),
  );
  const [iconSizesInput, setIconSizesInput] = useState(
    config.allowedIconSizes.join(", "),
  );
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (props.initialConfig) {
      setConfig({ ...DEFAULT_CONFIG, ...props.initialConfig });
      if (props.initialConfig.allowedSpacingValues) {
        setSpacingInput(props.initialConfig.allowedSpacingValues.join(", "));
      }
      if (props.initialConfig.allowedIconSizes) {
        setIconSizesInput(props.initialConfig.allowedIconSizes.join(", "));
      }
    }
  }, [props.initialConfig]);

  const handleToggle = useCallback((key: keyof LintRuleConfig) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  }, []);

  const handleNumberChange = useCallback(
    (key: keyof LintRuleConfig, value: string) => {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num > 0) {
        setConfig((prev) => ({
          ...prev,
          [key]: num,
        }));
        setHasChanges(true);
      }
    },
    [],
  );

  const handleSave = useCallback(() => {
    // Parse spacing values
    const spacingValues = spacingInput
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v));

    // Parse icon sizes
    const iconSizes = iconSizesInput
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v));

    const finalConfig = {
      ...config,
      allowedSpacingValues:
        spacingValues.length > 0
          ? spacingValues
          : DEFAULT_CONFIG.allowedSpacingValues,
      allowedIconSizes:
        iconSizes.length > 0 ? iconSizes : DEFAULT_CONFIG.allowedIconSizes,
    };

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-lint-config",
          config: finalConfig,
        },
      },
      "*",
    );

    if (props.onConfigChange) {
      props.onConfigChange(finalConfig);
    }

    setHasChanges(false);
  }, [config, spacingInput, iconSizesInput, props.onConfigChange]);

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setSpacingInput(DEFAULT_CONFIG.allowedSpacingValues.join(", "));
    setIconSizesInput(DEFAULT_CONFIG.allowedIconSizes.join(", "));
    setHasChanges(true);
  }, []);

  const toggleKeys = Object.keys(RULE_DESCRIPTIONS) as Array<
    keyof LintRuleConfig
  >;

  return (
    <div className="settings-row">
      <h3 className="settings-title">Custom Lint Rules</h3>
      <div className="settings-label">
        Enable or disable specific lint rules for your project.
      </div>

      <div className="rule-config-list">
        {toggleKeys.map((key) => {
          const rule = RULE_DESCRIPTIONS[key];
          const isEnabled = config[key] as boolean;
          return (
            <div
              key={key}
              className="rule-config-item"
              onClick={() => handleToggle(key)}
            >
              <div className="rule-config-checkbox">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleToggle(key)}
                />
              </div>
              <div className="rule-config-content">
                <div className="rule-config-label">{rule.label}</div>
                <div className="rule-config-description">
                  {rule.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rule-config-section">
        <h4 className="settings-title">Allowed Spacing Values</h4>
        <div className="settings-label settings-no-padding">
          Comma-separated list of valid spacing values (px)
        </div>
        <input
          type="text"
          className="settings-input"
          value={spacingInput}
          onChange={(e) => {
            setSpacingInput(e.target.value);
            setHasChanges(true);
          }}
          placeholder="0, 4, 8, 12, 16, 20, 24, 32"
        />
      </div>

      <div className="rule-config-section">
        <h4 className="settings-title">Allowed Icon Sizes</h4>
        <div className="settings-label settings-no-padding">
          Comma-separated list of valid icon sizes (px)
        </div>
        <input
          type="text"
          className="settings-input"
          value={iconSizesInput}
          onChange={(e) => {
            setIconSizesInput(e.target.value);
            setHasChanges(true);
          }}
          placeholder="12, 16, 20, 24, 32, 40, 48"
        />
      </div>

      <div className="rule-config-section">
        <h4 className="settings-title">Touch Target Size</h4>
        <div className="settings-label settings-no-padding">
          Minimum touch target size (px)
        </div>
        <input
          type="number"
          className="settings-input"
          value={config.minTouchTargetSize}
          onChange={(e) =>
            handleNumberChange("minTouchTargetSize", e.target.value)
          }
          min="32"
          max="64"
        />
      </div>

      <div className="rule-config-section">
        <h4 className="settings-title">Max Nesting Depth</h4>
        <div className="settings-label settings-no-padding">
          Maximum auto-layout nesting depth before warning
        </div>
        <input
          type="number"
          className="settings-input"
          value={config.maxAutoLayoutNestingDepth}
          onChange={(e) =>
            handleNumberChange("maxAutoLayoutNestingDepth", e.target.value)
          }
          min="2"
          max="10"
        />
      </div>

      <div className="form-button-group">
        <button
          className={`button ${hasChanges ? "button--primary" : "button--secondary"}`}
          onClick={handleSave}
        >
          Save Rules
        </button>
        <button className="button button--secondary" onClick={handleReset}>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

export default RuleConfigurationForm;
