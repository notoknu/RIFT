FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_WALLETCONNECT_PROJECT_ID
ARG VITE_DROP_FACTORY_ADDRESS
ENV VITE_DROP_FACTORY_ADDRESS=$VITE_DROP_FACTORY_ADDRESS
ARG VITE_MARKETPLACE_ADDRESS
ENV VITE_WALLETCONNECT_PROJECT_ID=$VITE_WALLETCONNECT_PROJECT_ID
ENV VITE_MARKETPLACE_ADDRESS=$VITE_MARKETPLACE_ADDRESS
RUN npm run contracts:export && npm run build
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
COPY --chown=node:node config ./config
COPY --chown=node:node scripts/backup-index.js scripts/backup-scheduler.js scripts/database-snapshot.js scripts/creator-ops.js scripts/encrypted-snapshot.js scripts/replicate-backups.js scripts/monitor.js scripts/ops-supervisor.js scripts/verify-car.js scripts/d1-recovery.js ./scripts/
RUN mkdir -p /app/data /app/backups && chown node:node /app/data /app/backups
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4173/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","server/production.js"]
