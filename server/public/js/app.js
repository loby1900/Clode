<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clode AI Workbench</title>
    <link rel="stylesheet" href="/css/style.css" />
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <div class="brand-mark">C</div>
          <div>
            <h1>Clode</h1>
            <p>AI workbench</p>
          </div>
        </div>

        <nav class="nav">
          <button class="nav-item active" data-view="workspace">Home</button>
          <button class="nav-item" data-view="chat">Chat</button>
          <button class="nav-item" data-view="logic">Logic</button>
          <button class="nav-item" data-view="projects">Projects</button>
          <button class="nav-item" data-view="files">Files</button>
          <button class="nav-item" data-view="integrations">Integrations</button>
          <button class="nav-item" data-view="settings">Settings</button>
        </nav>

        <div class="status-card">
          <span class="status-label">Provider state</span>
          <strong id="provider-status" class="status-bad">Unconfigured</strong>
        </div>
      </aside>

      <main class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">Project-aware AI assistant</p>
            <h2>Universal development workspace</h2>
          </div>
          <button id="theme-toggle" class="ghost-button" type="button">Toggle theme</button>
        </header>

        <section class="content-grid">
          <div class="main-panel">
            <div class="panel" id="panel-chat">
              <div class="panel-header">
                <h3>Conversation</h3>
                <small id="provider-badge">No provider connected</small>
              </div>
              <div id="chat-messages" class="chat-messages"></div>
              <form id="chat-form" class="composer">
                <textarea id="chat-input" rows="3" placeholder="Describe the project, app, game, website, image or coding task..."></textarea>
                <div class="composer-actions">
                  <button type="submit" class="primary-button">Send</button>
                  <button type="button" id="clear-chat" class="ghost-button">Clear</button>
                </div>
              </form>
            </div>

            <div class="panel hidden" id="panel-logic">
              <div class="panel-header">
                <h3>AI autonomy</h3>
              </div>
              <div class="logic-box">
                <label class="checkbox-row"><input id="agent-mode" type="checkbox" /> Enable controlled agent mode</label>
                <label class="checkbox-row"><input id="allow-destructive" type="checkbox" /> Allow destructive actions after explicit approval</label>
                <button id="plan-task" type="button" class="primary-button">Create task plan</button>
                <div id="agent-plan" class="plan-output"></div>
              </div>
            </div>

            <div class="panel hidden" id="panel-projects">
              <div class="panel-header">
                <h3>Projects</h3>
              </div>
              <form id="project-form" class="inline-form">
                <input id="project-name" type="text" placeholder="Project name" />
                <input id="project-description" type="text" placeholder="Description (optional)" />
                <button type="submit" class="primary-button">Create project</button>
              </form>
              <div id="project-list" class="card-list"></div>
            </div>

            <div class="panel hidden" id="panel-files">
              <div class="panel-header">
                <h3>Files</h3>
              </div>
              <div class="project-tools">
                <select id="project-selector"></select>
                <input id="file-path" type="text" placeholder="path/to/file.txt" />
                <button id="open-file" class="ghost-button" type="button">Open</button>
              </div>
              <div id="file-tree" class="file-tree"></div>
              <textarea id="file-editor" rows="18" placeholder="Select a project file to inspect or edit..."></textarea>
              <div class="editor-actions">
                <button id="save-file" class="primary-button" type="button">Save file</button>
              </div>
            </div>

            <div class="panel hidden" id="panel-integrations">
              <div class="panel-header">
                <h3>Integrations</h3>
              </div>
              <form id="provider-form" class="provider-form">
                <div class="field-grid">
                  <input id="provider-name" type="text" placeholder="Connection label" />
                  <select id="provider-type">
                    <option value="openai-compatible">OpenAI-compatible</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="groq">Groq</option>
                    <option value="mistral">Mistral</option>
                    <option value="xai">xAI</option>
                    <option value="azure-openai">Azure OpenAI</option>
                    <option value="ollama">Ollama</option>
                    <option value="custom">Custom endpoint</option>
                  </select>
                </div>
                <input id="provider-base-url" type="url" placeholder="https://api.openai.com/v1 or http://localhost:11434" />
                <input id="provider-model" type="text" placeholder="Model ID, e.g. gpt-4o-mini, claude-3-5-sonnet, llama3.1" />
                <input id="provider-api-key" type="password" placeholder="API key (if required)" />
                <label class="checkbox-row"><input id="provider-allow-local" type="checkbox" /> Allow local trusted endpoints</label>
                <div class="stack-buttons">
                  <button type="submit" class="primary-button">Save connection</button>
                  <button type="button" id="test-provider" class="ghost-button">Test connection</button>
                </div>
              </form>
              <div id="provider-list" class="card-list"></div>
            </div>

            <div class="panel hidden" id="panel-settings">
              <div class="panel-header">
                <h3>Security and platform notes</h3>
              </div>
              <ul class="feature-list">
                <li>Credentials are stored encrypted on the server side and never exposed to the browser bundle.</li>
                <li>Private-network endpoints are blocked unless explicitly allowed for a local trusted setup.</li>
                <li>AI actions are last-stage execution and remain controlled by explicit permissions and review.</li>
                <li>Destructive tasks require direct approval before they execute.</li>
              </ul>
            </div>
          </div>

          <aside class="context-panel">
            <div class="panel">
              <div class="panel-header">
                <h3>Task plan</h3>
              </div>
              <ol class="task-plan">
                <li>Connect a real AI provider.</li>
                <li>Open or create a project.</li>
                <li>Plan the work and limit permissions.</li>
                <li>Run only approved checks and file edits.</li>
              </ol>
            </div>

            <div class="panel">
              <div class="panel-header">
                <h3>Provider families</h3>
              </div>
              <ul class="feature-list compact">
                <li>OpenAI compatible and OpenAI</li>
                <li>Anthropic, Gemini, Groq, DeepSeek</li>
                <li>Mistral, xAI, Azure OpenAI</li>
                <li>Ollama local mode</li>
                <li>Custom trusted endpoints</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>

    <script src="/js/app.js"></script>
  </body>
</html>

{