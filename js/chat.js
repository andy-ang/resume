import { SPACE_URL } from "./config.js";

(() => {
  const CONNECT_TIMEOUT = 90000;
  const PREDICT_TIMEOUT = 60000;

  const fab = document.getElementById("chat-fab");
  const panel = document.getElementById("chat-panel");
  const closeBtn = document.getElementById("chat-close");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const thread = document.getElementById("chat-thread");
  const status = document.getElementById("chat-status");

  if (!fab || !panel) return;

  let history = [];
  let client = null;
  let connecting = false;

  function toggle() {
    const isOpen = panel.classList.toggle("is-open");
    fab.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      input.focus();
      if (!client && !connecting) connect();
    }
  }

  fab.addEventListener("click", toggle);
  closeBtn.addEventListener("click", toggle);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) toggle();
  });

  async function connect() {
    connecting = true;
    setStatus("Connecting to assistant\u2026");

    try {
      const { Client } = await import(
        "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js"
      );

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT);

      client = await Client.connect(SPACE_URL, {
        events: { signal: controller.signal },
      }).catch((err) => {
        if (controller.signal.aborted)
          throw new Error("Connection timed out. The assistant may be waking up.");
        throw err;
      });

      clearTimeout(timer);
      setStatus("");
    } catch (err) {
      setStatus("Could not reach assistant. Try again shortly.");
      connecting = false;
      client = null;
      return;
    }

    connecting = false;
  }

  function setStatus(msg) {
    status.textContent = msg;
    status.hidden = !msg;
  }

  function appendMessage(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `chat-msg chat-msg--${role}`;
    bubble.textContent = text;
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
  }

  function setInputEnabled(enabled) {
    input.disabled = !enabled;
    form.querySelector("button").disabled = !enabled;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    appendMessage("user", text);
    setInputEnabled(false);
    setStatus("Thinking\u2026");

    if (!client) {
      await connect();
      if (!client) {
        setInputEnabled(true);
        return;
      }
    }

    try {
      const result = await Promise.race([
        client.predict("/chat", {
          message: text,
          history: history,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), PREDICT_TIMEOUT)
        ),
      ]);

      const reply = result?.data?.[0] ?? result?.data ?? "";
      const replyText =
        typeof reply === "string"
          ? reply
          : Array.isArray(reply)
            ? (reply.find((m) => m.role === "assistant") || {}).content || JSON.stringify(reply)
            : JSON.stringify(reply);

      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: replyText });

      appendMessage("assistant", replyText);
      setStatus("");
    } catch (err) {
      appendMessage(
        "assistant",
        "Sorry, something went wrong. Please try again or email andyangjunlong@outlook.sg."
      );
      setStatus("");
      client = null;
    }

    setInputEnabled(true);
    input.focus();
  });
})();
