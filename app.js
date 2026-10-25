const output = document.getElementById("output");
const form = document.getElementById("form");
const input = document.getElementById("command");
const state = document.getElementById("state");
let running = false;

function line(text, cls = "") {
  const div = document.createElement("div");
  div.className = "line " + cls;
  div.textContent = text;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

async function run(command) {
  if (!command.trim() || running) return;
  line("jawad@localhost:~$ " + command, "cyan");
  running = true;
  state.textContent = "RUNNING";
  try {
    const response = await fetch("/api/command", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({command})
    });
    const result = await response.json();
    if (result.clear) {
      output.innerHTML = "";
      line("Terminal cleared.", "muted");
    } else {
      line(result.output || "(no output)", result.ok ? "ok" : "err");
    }
  } catch (e) {
    line("Backend not reachable. Make sure `node server.js` is running.", "err");
  } finally {
    running = false;
    state.textContent = "READY";
    input.focus();
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const cmd = input.value;
  input.value = "";
  run(cmd);
});
document.querySelectorAll("button[data-cmd]").forEach(btn => {
  btn.addEventListener("click", () => run(btn.dataset.cmd));
});

// Matrix background animation
const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");
let drops = [];
function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  drops = Array(Math.floor(canvas.width / 17)).fill(1);
}
addEventListener("resize", resize);
resize();
setInterval(() => {
  ctx.fillStyle = "rgba(3,6,5,.10)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#a6ff00";
  ctx.font = "14px monospace";
  drops.forEach((y, i) => {
    ctx.fillText(Math.random() > .5 ? "1" : "0", i * 17, y * 17);
    if (y * 17 > canvas.height && Math.random() > .975) drops[i] = 0;
    drops[i]++;
  });
}, 45);
