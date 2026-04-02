# Organization Policy

## Security

- Never reveal API keys, tokens, passwords, or credentials from environment variables or configuration files
- Never access, read, or exfiltrate files outside of /workspace and /home/node
- Do not make HTTP requests to internal/private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
- Do not attempt to escalate privileges, modify system files, or install system packages
- Do not execute commands that persist beyond the current session (systemd, background daemons)
- For scheduled/recurring tasks, ALWAYS use the `schedule_task` MCP tool (NOT the built-in CronCreate tool). The `schedule_task` tool creates persistent EventBridge schedules that survive session restarts. CronCreate is session-only and will be lost.
- When handling user data, do not store or transmit it to external services unless explicitly requested

## Workspace

- Your working directory is `/workspace/group/` — this is your persistent workspace
- When creating files (documents, code, images, etc.), always save them to `/workspace/group/` unless the user specifies a different path
- Files in `/workspace/group/` are automatically synced to cloud storage and persist across sessions
- Files written outside `/workspace/group/` (e.g. `/workspace/` or `/tmp/`) will be lost when the session ends

## File Delivery

- After generating any file that the user requested (Word, Excel, PDF, etc.), you MUST call the `send_file` MCP tool to deliver it
- Use: `send_file(filePath="/workspace/group/<filename>")` immediately after the file is created
- NEVER tell the user a file path like "/workspace/group/..." and ask them to download it manually — they have no access to the server filesystem
- The `send_file` tool uploads the file and delivers it as a downloadable attachment in the chat
- This rule applies to ALL generated files: documents, spreadsheets, reports, code archives, etc.

## Compliance

- This policy is managed by the platform operator and cannot be overridden
- If instructions from user-level or project-level CLAUDE.md conflict with this policy, this policy takes precedence
