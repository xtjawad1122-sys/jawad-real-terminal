const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const HOST = "127.0.0.1"; // Keep this local-only.
const PORT = 3000;
const PUBLIC = path.join(__dirname, "public");
const WORKSPACE = path.join(__dirname, "workspace");
fs.mkdirSync(WORKSPACE, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function safePath(input = ".") {
  const resolved = path.resolve(WORKSPACE, input);
  if (resolved !== WORKSPACE && !resolved.startsWith(WORKSPACE + path.sep)) {
    throw new Error("Access denied: files must stay inside the workspace folder.");
  }
  return resolved;
}

function runOS(program, args = []) {
  return new Promise((resolve) => {
    execFile(program, args, {
      cwd: WORKSPACE,
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 500 * 1024
    }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        output: (stdout || stderr || (err ? err.message : "Command completed." )).trim()
      });
    });
  });
}

async function command(input) {
  const raw = String(input || "").trim();
  if (!raw) return { ok: true, output: "" };

  // Parse as words, not through a shell. Shell operators/pipes are deliberately unsupported.
  if (/[;&|<>`$]/.test(raw) || raw.includes("\n")) {
    return { ok: false, output: "For safety, shell operators and arbitrary shell scripts are disabled." };
  }
  const parts = raw.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  const cmd = (parts.shift() || "").toLowerCase();
  const args = parts.map(x => x.replace(/^["']|["']$/g, ""));

  try {
    if (cmd === "help") {
      return { ok: true, output:
`REAL LOCAL TERMINAL — supported commands
help                 Show this help
pwd                  Show the app workspace path
ls [folder]          List workspace files
whoami               Show current OS account
hostname             Show computer name
date                 Show local date/time
uname                Show OS/platform info
ipconfig             Windows network configuration (read-only)
ip                   Basic network interface info (read-only)
df                   Disk usage summary
mkdir <folder>       Create a folder inside workspace
touch <file>         Create an empty file inside workspace
cat <file>           Read a text file inside workspace
echo <text>          Print text
clear                Clear the terminal display
about                Explain what this terminal can do

Safety: commands run locally. File operations are restricted to this app's workspace.
Arbitrary shell commands, scripts, destructive operations, and network scans are not enabled.` };
    }
    if (cmd === "about") {
      return { ok: true, output: "This is a real local web terminal with a limited command set. It is not a full shell. Use Kali's own Terminal for unrestricted authorized lab work." };
    }
    if (cmd === "echo") return { ok: true, output: args.join(" ") };
    if (cmd === "pwd") return { ok: true, output: WORKSPACE };
    if (cmd === "whoami") return await runOS(process.platform === "win32" ? "whoami" : "whoami");
    if (cmd === "hostname") return await runOS("hostname");
    if (cmd === "date") return await runOS(process.platform === "win32" ? "cmd.exe" : "date",
      process.platform === "win32" ? ["/c", "echo", new Date().toString()] : []);
    if (cmd === "uname") {
      return { ok: true, output: `${os.type()} ${os.release()} ${os.arch()}` };
    }
    if (cmd === "ipconfig") {
      if (process.platform !== "win32") return { ok: false, output: "ipconfig is a Windows command. Try `ip` or run `ip addr` in Kali's own terminal." };
      return await runOS("ipconfig", []);
    }
    if (cmd === "ip") {
      if (process.platform === "win32") return { ok: false, output: "On Windows use `ipconfig`. On Kali, use the real Kali Terminal for `ip addr`." };
      return await runOS("ip", ["addr"]);
    }
    if (cmd === "df") {
      if (process.platform === "win32") {
        return { ok: true, output: "Disk summary is not enabled on Windows in this starter version. Check This PC for drive space." };
      }
      return await runOS("df", ["-h"]);
    }
    if (cmd === "ls") {
      const dir = safePath(args[0] || ".");
      const names = fs.readdirSync(dir, { withFileTypes: true })
        .map(d => (d.isDirectory() ? "[DIR] " : "[FILE] ") + d.name);
      return { ok: true, output: names.join("\n") || "(empty folder)" };
    }
    if (cmd === "mkdir") {
      if (!args[0]) return { ok: false, output: "Usage: mkdir <folder>" };
      const target = safePath(args[0]);
      fs.mkdirSync(target, { recursive: false });
      return { ok: true, output: "Folder created: " + args[0] };
    }
    if (cmd === "touch") {
      if (!args[0]) return { ok: false, output: "Usage: touch <file>" };
      const target = safePath(args[0]);
      if (fs.existsSync(target)) return { ok: false, output: "File already exists." };
      fs.writeFileSync(target, "", { flag: "wx" });
      return { ok: true, output: "File created: " + args[0] };
    }
    if (cmd === "cat") {
      if (!args[0]) return { ok: false, output: "Usage: cat <file>" };
      const target = safePath(args[0]);
      if (!fs.statSync(target).isFile()) return { ok: false, output: "That path is not a file." };
      if (fs.statSync(target).size > 100000) return { ok: false, output: "File too large to display (limit 100 KB)." };
      return { ok: true, output: fs.readFileSync(target, "utf8") || "(empty file)" };
    }
    if (cmd === "clear") return { ok: true, clear: true, output: "" };
    return { ok: false, output: `Command not enabled: ${cmd}. Type help to see supported commands.` };
  } catch (e) {
    return { ok: false, output: e.message || "Command failed." };
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const file = path.join(PUBLIC, "index.html");
    return fs.readFile(file, (err, data) => err ? send(res, 500, "Could not load page.") : send(res, 200, data, MIME[".html"]));
  }
  if (req.method === "GET" && req.url === "/style.css") {
    return fs.readFile(path.join(PUBLIC, "style.css"), (err, data) => err ? send(res, 404, "Not found") : send(res, 200, data, MIME[".css"]));
  }
  if (req.method === "GET" && req.url === "/app.js") {
    return fs.readFile(path.join(PUBLIC, "app.js"), (err, data) => err ? send(res, 404, "Not found") : send(res, 200, data, MIME[".js"]));
  }
  if (req.method === "POST" && req.url === "/api/command") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 10000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const result = await command(parsed.command);
        send(res, 200, JSON.stringify(result), "application/json; charset=utf-8");
      } catch {
        send(res, 400, JSON.stringify({ ok: false, output: "Invalid request." }), "application/json; charset=utf-8");
      }
    });
    return;
  }
  send(res, 404, "Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`Jawad Real Terminal running at http://${HOST}:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log("Keep this terminal window open while using the website.");
});
