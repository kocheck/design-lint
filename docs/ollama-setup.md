# Setting Up Ollama for Design Lint

Design Lint includes AI-powered features that use [Ollama](https://ollama.com), a local LLM runner. This guide will help you set up Ollama to work with the Figma plugin.

## Prerequisites

1. **Install Ollama**: Download from [ollama.com](https://ollama.com)
2. **Pull a model**: Run `ollama pull llama3.2` in your terminal

## Why Extra Configuration?

Figma plugins run in a secure sandbox that restricts network access. For Design Lint to communicate with your local Ollama instance, two things must be true:

1. **Plugin manifest** must allow `localhost:11434` (already configured in Design Lint)
2. **Ollama** must accept cross-origin requests from Figma (you need to configure this)

## CORS Configuration (Required)

Figma plugins run in a sandboxed browser environment. By default, Ollama blocks requests from web pages for security. You need to configure Ollama to allow requests from Figma.

### macOS

**Option A: Permanent fix (Recommended)**

1. Open Terminal
2. Run this command:
   ```bash
   launchctl setenv OLLAMA_ORIGINS "*"
   ```
3. Quit the Ollama app completely (click the menu bar icon → Quit)
4. Reopen Ollama
5. Retry the connection in Design Lint

**Option B: Secure fix (specific origins)**

If you prefer to only allow Figma:
```bash
launchctl setenv OLLAMA_ORIGINS "https://www.figma.com,https://figma.com,null"
```

Then restart Ollama.

**Option C: Temporary fix (per session)**

Start Ollama from terminal with the environment variable:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

Note: This only lasts until you close the terminal.

### Windows

1. Open System Properties → Advanced → Environment Variables
2. Under "User variables", click "New"
3. Set:
   - Variable name: `OLLAMA_ORIGINS`
   - Variable value: `*`
4. Click OK, then restart Ollama

Or run in PowerShell (temporary):
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

### Linux

Add to your shell profile (`~/.bashrc` or `~/.zshrc`):
```bash
export OLLAMA_ORIGINS="*"
```

Then restart your terminal and Ollama.

## Verifying the Setup

1. Make sure Ollama is running (you should see the llama icon in your menu bar on macOS)
2. Open Design Lint in Figma
3. Click the **AI** button in the navigation
4. The status should show **Online** in green

## Troubleshooting

### "Ollama is not running"

- Check if Ollama is running: `curl http://localhost:11434/api/tags`
- If you get a response with models, Ollama is running but CORS may not be configured
- If you get "connection refused", start Ollama

### "Online" but requests fail

- Make sure you have a model installed: `ollama list`
- The default model is `llama3.2`. Install it with: `ollama pull llama3.2`

### Still not working after setting OLLAMA_ORIGINS

1. Completely quit Ollama (not just close the window)
2. On macOS: Check Activity Monitor and force quit any `ollama` processes
3. Restart Ollama
4. Try again in Figma

## Recommended Models

| Model | Size | Best For |
|-------|------|----------|
| `llama3.2` | 2GB | Fast responses, good for rename suggestions |
| `llama3.2:3b` | 2GB | Default, balanced performance |
| `mistral` | 4GB | Better reasoning, good for design reviews |
| `codellama` | 4GB | Code-aware suggestions |

Install any model with:
```bash
ollama pull <model-name>
```

## Privacy & Security

- **All AI processing happens locally** on your machine
- No design data is sent to external servers
- Ollama runs entirely offline after initial model download

## Need Help?

If you're still having issues, please [open an issue](https://github.com/kocheck/design-lint/issues) with:
- Your OS and version
- Ollama version (`ollama --version`)
- Any error messages from the plugin or terminal
