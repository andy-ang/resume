import { CHAT_API, SPACE_URL } from "./config.js";

const GRADIO_CLIENT_URL =
  "https://cdn.jsdelivr.net/npm/@gradio/client@1.13.3/dist/index.min.js";

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

  if (!fab || !panel || !closeBtn || !form || !input || !thread || !status) {
    return;
  }

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
      const { Client } = await import(GRADIO_CLIENT_URL);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT);

      client = await Client.connect(SPACE_URL, {
        events: { signal: controller.signal },
      }).catch((err) => {
        if (controller.signal.aborted) {
          throw new Error("Connection timed out. The assistant may be waking up.");
        }
        throw err;
      });

      clearTimeout(timer);
      setStatus("");
    } catch (err) {
      console.error("Chat connect failed:", err);
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

  function extractReply(result) {
    const payload = result?.data ?? result;

    if (typeof payload === "string") {
      return payload;
    }

    if (Array.isArray(payload)) {
      const first = payload[0];
      if (typeof first === "string") {
        return first;
      }
      if (first && typeof first === "object") {
        return first.content ?? first.text ?? JSON.stringify(first);
      }
      return payload.filter(Boolean).join("\n");
    }

    if (payload && typeof payload === "object") {
      return payload.content ?? payload.text ?? JSON.stringify(payload);
    }

    return "";
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
        appendMessage(
          "assistant",
          "Sorry, I could not connect to the assistant. Please try again in a moment or email andyangjunlong@outlook.sg."
        );
        setStatus("");
        setInputEnabled(true);
        return;
      }
    }

    try {
      let result;
      try {
        result = await Promise.race([
          client.predict(CHAT_API, {
            message: text,
            history,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), PREDICT_TIMEOUT)
          ),
        ]);
      } catch (primaryErr) {
        if (CHAT_API !== "/chat") {
          result = await Promise.race([
            client.predict("/chat", { message: text }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), PREDICT_TIMEOUT)
            ),
          ]);
        } else {
          throw primaryErr;
        }
      }

      const replyText = extractReply(result).trim();
      if (!replyText) {
        throw new Error("Empty response");
      }

      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: replyText });

      appendMessage("assistant", replyText);
      setStatus("");
    } catch (err) {
      console.error("Chat predict failed:", err);
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
