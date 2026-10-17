# Installing Conector (instructions for AI agents)

Conector is a self-hosted MCP gateway. It has two parts: a web panel where the user connects their apps (sign-in or API
key), and an MCP server that gives agents tools for every connected app. Credentials stay encrypted in `~/.conector`
on the user's machine.

## 1. Check Node.js

Run `node --version`. Conector needs Node.js 22 or later.

## 2. Add the MCP server

Add this entry to your MCP settings. It needs no API key or token: it reads the local data in `~/.conector`.

```json
{
  "mcpServers": {
    "conector": {
      "command": "npx",
      "args": ["-y", "conector", "mcp"]
    }
  }
}
```

## 3. Ask the user to connect apps

Connecting an app needs a person (an OAuth sign-in or pasting an API key in the panel), so tell the user to:

1. Run `npx conector start` in a terminal and open the setup link it prints.
2. Create the admin account.
3. Open **Apps**, pick the apps they want and connect them.

Never ask the user to paste API keys or passwords into the chat. They go in the panel only.

## 4. Check it works

Call the `conector_apps` tool. It lists the connected apps and their tools. An empty list means no app is connected yet.
Each connected app adds a `<app>_request` tool for its API, and some add specific tools (for example
`slack_send_message`).

## Teams and remote servers

To share one Conector between several people or machines, run it on a server (Docker image
`ghcr.io/secra-solutions/conector`) and connect each agent to `https://<server>/mcp` with its own access token, as the
README explains.
