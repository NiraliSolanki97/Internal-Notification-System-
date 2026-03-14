* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg: #0f0f0f;
  --surface: #1a1a1a;
  --surface2: #222222;
  --border: #2e2e2e;
  --green: #1a7a4a;
  --green-bright: #22c55e;
  --green-dim: #16532f;
  --text: #e8e8e8;
  --text-muted: #888;
  --text-dim: #555;
  --danger: #c0392b;
  --font: 'Courier New', 'Consolas', monospace;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  min-height: 100vh;
}

button {
  cursor: pointer;
  font-family: var(--font);
  border: none;
  transition: all 0.15s ease;
}

input, textarea, select {
  font-family: var(--font);
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
  width: 100%;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--green-bright);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50% { box-shadow: 0 0 0 12px rgba(34,197,94,0); }
}
