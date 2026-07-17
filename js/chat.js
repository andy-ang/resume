import { CHAT_API, SPACE_URL } from "./config.js";

(() => {
  const PREDICT_TIMEOUT = 90000;

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
  let busy = false;

  function toggle() {
    const isOpen = panel.classList.toggle("is-open");
    fab.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) input.focus();
  }

  fab.addEventListener("click", toggle);
  closeBtn.addEventListener("click", toggle);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) toggle();
  });

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

  function extractReply(payload) {
    if (typeof payload === "string") return payload;
    if (Array.isArray(payload)) {
      const first = payload[0];
      if (typeof first === "string") return first;
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

  function parseSseComplete(raw) {
    let lastData = null;
    let sawError = false;

    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith("event: error")) {
        sawError = true;
      }
      if (line.startsWith("data: ")) {
        const body = line.slice(6).trim();
        if (!body || body === "null") continue;
        try {
          lastData = JSON.parse(body);
        } catch {
          lastData = body;
        }
      }
    }

    if (sawError && lastData == null) {
      throw new Error("Assistant returned an error");
    }
    return lastData;
  }

  async function callResumeChat(message, conversationHistory) {
    const endpoint = CHAT_API.startsWith("/") ? CHAT_API : `/${CHAT_API}`;
    const callUrl = `${SPACE_URL}/gradio_api/call${endpoint}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PREDICT_TIMEOUT);

    try {
      const startRes = await fetch(callUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [message, conversationHistory] }),
        signal: controller.signal,
      });

      if (!startRes.ok) {
        throw new Error(`Start failed: ${startRes.status}`);
      }

      const { event_id: eventId } = await startRes.json();
      if (!eventId) throw new Error("Missing event_id");

      const streamRes = await fetch(`${callUrl}/${eventId}`, {
        signal: controller.signal,
      });

      if (!streamRes.ok) {
        throw new Error(`Stream failed: ${streamRes.status}`);
      }

      const raw = await streamRes.text();
      return parseSseComplete(raw);
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    appendMessage("user", text);
    busy = true;
    setInputEnabled(false);
    setStatus("Thinking\u2026");

    try {
      const result = await callResumeChat(text, history);
      const replyText = extractReply(result).trim();
      if (!replyText) throw new Error("Empty response");

      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: replyText });

      appendMessage("assistant", replyText);
      setStatus("");
    } catch (err) {
      console.error("Chat failed:", err);
      const timedOut = err?.name === "AbortError";
      appendMessage(
        "assistant",
        timedOut
          ? "The assistant is taking longer than usual (it may be waking up). Please try again in a moment."
          : "Sorry, something went wrong. Please try again or email andyangjunlong@outlook.sg."
      );
      setStatus("");
    }

    busy = false;
    setInputEnabled(true);
    input.focus();
  });
})();
