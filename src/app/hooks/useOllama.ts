/**
 * React hook for using Ollama AI features with rich design context
 */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  OllamaRequest,
  OllamaConfig,
  checkOllamaAvailability,
  getAvailableModels,
  generateLayerRenameSuggestions,
  generateDesignReview,
  generateComponentSuggestions,
  getRequestStatus,
  RichDesignContext,
} from "../services/ollamaService";

interface UseOllamaReturn {
  isAvailable: boolean;
  isChecking: boolean;
  availableModels: string[];
  currentRequest: OllamaRequest | null;
  error: string | null;
  richContext: RichDesignContext | null;
  isLoadingContext: boolean;
  checkAvailability: () => Promise<void>;
  requestRichContext: (nodeIds?: string[]) => void;
  requestRename: (
    layers: Array<{ id: string; name: string; type: string }>,
    useRichContext?: boolean,
  ) => Promise<void>;
  requestReview: (
    errors: Array<{ type: string; message: string; count: number }>,
    stylesSummary: { fills: number; text: number; effects: number },
    useRichContext?: boolean,
  ) => Promise<void>;
  requestComponentSuggestions: (
    layerInfo: Array<{
      name: string;
      type: string;
      width: number;
      height: number;
      hasChildren: boolean;
    }>,
    useRichContext?: boolean,
  ) => Promise<void>;
  clearRequest: () => void;
}

const DEFAULT_CONFIG: Partial<OllamaConfig> = {
  model: "llama3.2",
  timeout: 60000,
};

export function useOllama(config?: Partial<OllamaConfig>): UseOllamaReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentRequest, setCurrentRequest] = useState<OllamaRequest | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [richContext, setRichContext] = useState<RichDesignContext | null>(
    null,
  );
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Listen for rich context responses from the plugin
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, context } = event.data.pluginMessage || {};
      if (type === "rich-context-response") {
        setRichContext(context);
        setIsLoadingContext(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Check Ollama availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const available = await checkOllamaAvailability(mergedConfig);
      setIsAvailable(available);

      if (available) {
        const models = await getAvailableModels(mergedConfig);
        setAvailableModels(models);
      }
    } catch (err) {
      setError("Failed to check Ollama availability");
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Request rich context from the plugin
  const requestRichContext = useCallback((nodeIds?: string[]) => {
    setIsLoadingContext(true);
    parent.postMessage(
      {
        pluginMessage: {
          type: "request-rich-context",
          nodeIds: nodeIds || [],
        },
      },
      "*",
    );
  }, []);

  const handleRequestUpdate = useCallback((request: OllamaRequest) => {
    setCurrentRequest({ ...request });

    if (request.status === "error") {
      setError(request.error || "Unknown error");
    }
  }, []);

  const requestRename = useCallback(
    async (
      layers: Array<{ id: string; name: string; type: string }>,
      useRichContext: boolean = true,
    ) => {
      if (!isAvailable) {
        setError("Ollama is not available");
        return;
      }

      setError(null);
      const requestId = await generateLayerRenameSuggestions(
        layers,
        mergedConfig,
        handleRequestUpdate,
        useRichContext ? richContext || undefined : undefined,
      );

      // Poll for completion
      const checkStatus = () => {
        const status = getRequestStatus(requestId);
        if (status) {
          setCurrentRequest(status);
        }
      };
      checkStatus();
    },
    [isAvailable, handleRequestUpdate, richContext],
  );

  const requestReview = useCallback(
    async (
      errors: Array<{ type: string; message: string; count: number }>,
      stylesSummary: { fills: number; text: number; effects: number },
      useRichContext: boolean = true,
    ) => {
      if (!isAvailable) {
        setError("Ollama is not available");
        return;
      }

      setError(null);
      await generateDesignReview(
        errors,
        stylesSummary,
        mergedConfig,
        handleRequestUpdate,
        useRichContext ? richContext || undefined : undefined,
      );
    },
    [isAvailable, handleRequestUpdate, richContext],
  );

  const requestComponentSuggestions = useCallback(
    async (
      layerInfo: Array<{
        name: string;
        type: string;
        width: number;
        height: number;
        hasChildren: boolean;
      }>,
      useRichContext: boolean = true,
    ) => {
      if (!isAvailable) {
        setError("Ollama is not available");
        return;
      }

      setError(null);
      await generateComponentSuggestions(
        layerInfo,
        mergedConfig,
        handleRequestUpdate,
        useRichContext ? richContext || undefined : undefined,
      );
    },
    [isAvailable, handleRequestUpdate, richContext],
  );

  const clearRequest = useCallback(() => {
    setCurrentRequest(null);
    setError(null);
  }, []);

  return {
    isAvailable,
    isChecking,
    availableModels,
    currentRequest,
    error,
    richContext,
    isLoadingContext,
    checkAvailability,
    requestRichContext,
    requestRename,
    requestReview,
    requestComponentSuggestions,
    clearRequest,
  };
}
