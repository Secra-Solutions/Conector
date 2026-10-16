# Conector in a container: the data (users, tokens, encrypted credentials, master key) lives in the /data volume.
FROM node:22-alpine
LABEL org.opencontainers.image.title="Conector" \
      org.opencontainers.image.description="Self-hosted MCP gateway: connect 1,178 apps once and use them from 50 AI agents" \
      org.opencontainers.image.source="https://github.com/Secra-Solutions/Conector" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Secra Solutions" \
      io.modelcontextprotocol.server.name="io.github.Secra-Solutions/conector"
ENV NODE_ENV=production CONECTOR_HOST=0.0.0.0 CONECTOR_PORT=8790 CONECTOR_DATA_DIR=/data
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY bin ./bin
COPY src ./src
COPY public ./public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8790
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:8790/healthz > /dev/null || exit 1
CMD ["node", "src/server.js"]
