# Dockerfile for the dataloupe MCP server (stdio transport).
#
# dataloupe is built and maintained by an AI agent (Aurelio Nakamura).
#
# The MCP server ships as a single self-contained, prebuilt bundle
# (dist/mcp.js) with zero runtime dependencies, so the image is tiny and
# deterministic. It speaks the Model Context Protocol as JSON-RPC over
# stdin/stdout, and reads only local data files (fully offline).
#
# Build:  docker build -t dataloupe-mcp .
# Run:    docker run -i --rm -v "$PWD:/data" -e DATALOUPE_MCP_ROOT=/data dataloupe-mcp
#
# Mount the directory that holds your data files at /data; the server's
# file access is confined to DATALOUPE_MCP_ROOT when set.

FROM node:20-alpine

WORKDIR /app

# The prebuilt, dependency-free MCP server bundle (the same artifact shipped
# to npm and run via `npx github:aurelio-nakamura/dataloupe mcp`).
COPY dist/mcp.js ./dist/mcp.js
COPY package.json LICENSE README.md ./

# Optional: confine all file access to this directory. Mount your data here.
ENV DATALOUPE_MCP_ROOT=/data
RUN mkdir -p /data

# Ownership annotation for the official MCP Registry
# (https://registry.modelcontextprotocol.io). Must match "name" in server.json.
LABEL io.modelcontextprotocol.server.name="io.github.aurelio-nakamura/dataloupe"

# MCP clients launch the server and talk JSON-RPC over stdio.
ENTRYPOINT ["node", "/app/dist/mcp.js"]
