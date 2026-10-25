JAWAD REAL LOCAL TERMINAL
=========================

This project is more than a static HTML mockup: it uses a local Node.js backend for a limited set of real commands.

REQUIREMENTS
- Node.js LTS installed (https://nodejs.org/)
- Windows, macOS, or Linux

RUN ON WINDOWS
1. Extract this ZIP to a folder, e.g. Desktop\jawad_real_terminal
2. Open that folder in VS Code.
3. In VS Code, select Terminal > New Terminal.
4. Run:
   node server.js
5. Keep that terminal window open.
6. Open this address in your browser:
   http://127.0.0.1:3000

Do NOT use Live Server for this project. The Node.js server serves the website and handles commands.

SUPPORTED COMMANDS
help
pwd
ls
whoami
hostname
date
uname
ipconfig     (Windows only)
ip           (Linux/Kali only)
df           (Linux/Kali only)
mkdir <folder>
touch <file>
cat <file>
echo <text>
clear
about

FILES CREATED BY mkdir/touch AND FILES READ BY cat are restricted to the project's `workspace` folder.

SECURITY NOTES
- Server binds only to 127.0.0.1, not to your LAN.
- This starter version deliberately does not execute arbitrary shell commands.
- It rejects shell operators and does not expose PowerShell/bash/cmd arbitrary execution.
- For a full Kali shell, open Terminal inside the Kali VM itself.
- Do not expose this server to the internet or change HOST to 0.0.0.0.
