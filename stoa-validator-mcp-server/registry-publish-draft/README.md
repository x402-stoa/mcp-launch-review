# Registry Publish Draft

Draft-only MCP Registry metadata for the Stoa Validator MCP Server.

This directory is not proof of a published package, created repository, directory listing, marketplace acceptance, buyer demand, production readiness, or external income. It exists so Atlas/Launch can convert the local server bundle into a real server-distribution path without misclassifying the static Stoa skill page as an MCP server.

Current primary-source constraints checked on 2026-06-26:

- The official MCP Registry is still preview infrastructure.
- The official registry hosts server metadata, not code artifacts.
- For npm-package publication, `package.json` needs an `mcpName` value that matches the registry `server.json` name.
- The package must be published to a public package registry before registry publication.
- Publishing to the official registry requires authenticated `mcp-publisher` use.

Before using `server.template.json` as a real `server.json`, verify or complete these gates:

1. Decide whether the registry metadata should keep pointing at a future dedicated repo or the current public subdirectory.
2. Sean approval for npm/package publishing and any account authentication.
3. A clean no-secret scan of the exact public bundle.
4. A passing `npm run smoke:stoa-validator-public-bundle` result.
5. Confirmation that the chosen npm identifier is available and owned by the intended Stoa publishing account.
