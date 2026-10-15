# Security policy

Conector stores credentials for many services, so security reports are welcome and handled first.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's **Security → Report a vulnerability** form on this repository
(private vulnerability reporting). Don't open a public issue. Include the version (`/healthz` shows it), how to
reproduce the problem and its impact. You should get an answer within a few days.

## Scope

In scope: the server, the panel, the MCP endpoint, the REST API, the CLI, the stdio bridge and the app definitions
(for example, a definition that could send credentials to a host other than the app's own).

Out of scope: vulnerabilities in the apps themselves, and setups that ignore the documented defaults (for example
binding to `0.0.0.0` on a public network without HTTPS).

## How Conector protects your data

- Credentials and OAuth client secrets are encrypted with AES-256-GCM. The key is `master.key` in the data directory,
  readable only by the user that runs Conector.
- Passwords are hashed with scrypt. Access tokens, invitation links and reset links are stored only as SHA-256 hashes.
- The panel uses CSRF tokens, origin checks, a strict Content Security Policy and a `Host` allow-list (against DNS
  rebinding), and it binds to `127.0.0.1` by default.
- URL placeholders filled from user input are validated, so a connection can't send its credentials to another server.
- Secrets that an API echoes back in an answer are masked before the answer reaches the agent or the audit log.
