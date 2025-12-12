# Stage 1: Build the backend and plugins
FROM node:22-bookworm-slim AS build

# Set Python interpreter for node-gyp
ENV PYTHON=/usr/bin/python3

# Install dependencies for building (python3, g++, build-essential)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /app

# Copy Yarn configuration and lockfiles
COPY --chown=node:node .yarn ./.yarn
COPY --chown=node:node .yarnrc.yml package.json yarn.lock backstage.json ./

# Copy all package.jsons first to leverage cache for install
COPY --chown=node:node packages/backend/package.json packages/backend/
# We need to copy other packages' package.json if they exist. 
# Since we don't know exactly which ones, we'll copy the whole source for now, 
# but a better optimization would be to copy just package.jsons. 
# For simplicity in this refactor, we proceed with copying source after install/immutable which might impact cache slightly if dependencies change often,
# but `yarn install` is fast with cache.
# Actually, for monorepos, typically we need to copy everything to run install if we don't have a refined 'copy package.json only' step.
# Let's try to follow the standard pattern: copy everything, install, build.

COPY --chown=node:node . .

# Install dependencies (immutable for CI)
RUN --mount=type=cache,target=/home/node/.cache/yarn,sharing=locked,uid=1000,gid=1000 \
    yarn install --immutable

# Build the backend
RUN yarn tsc
RUN yarn build:backend

# Verify plugin builds (migrated from workflow)
RUN if [ -d "plugins/eda-common/dist" ]; then \
      echo "✓ eda-common/dist exists"; \
    else \
      # It might not exist if not part of the build, checking if source exists first
      if [ -d "plugins/eda-common" ]; then \
         echo "Checking plugins/eda-common/dist..." && ls -la plugins/eda-common/dist/ || echo "Dist missing"; \
      fi \
    fi

# Check if eda-common is in the bundle
RUN tar -tzf packages/backend/dist/bundle.tar.gz | grep -q "eda-common/dist/index.cjs.js" || \
    (echo "✗ eda-common/dist NOT in bundle!" && exit 1)

# Stage 2: Run the backend
FROM node:22-bookworm-slim AS runner

# Set Python interpreter for node-gyp
ENV PYTHON=/usr/bin/python3

# Install runtime dependencies (sqlite3, python3, build-essential for native modules rebuild if needed by isolate-vm)
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /app

# Copy Yarn configuration
COPY --chown=node:node .yarn ./.yarn
COPY --chown=node:node .yarnrc.yml ./
COPY --chown=node:node backstage.json ./

ENV NODE_ENV=production
# This disables node snapshot for Node 20+ to work with the Scaffolder
ENV NODE_OPTIONS="--no-node-snapshot"

# Copy the built artifacts from the build stage
COPY --from=build --chown=node:node /app/packages/backend/dist/skeleton.tar.gz ./
COPY --from=build --chown=node:node /app/package.json /app/yarn.lock ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

# Install production dependencies
RUN --mount=type=cache,target=/home/node/.cache/yarn,sharing=locked,uid=1000,gid=1000 \
    yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# Copy app config and other resources
COPY --from=build --chown=node:node /app/packages/backend/dist/bundle.tar.gz ./
COPY --from=build --chown=node:node /app/app-config.yaml ./
# Copy examples if they exist
COPY --from=build --chown=node:node /app/examples ./examples

RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

CMD ["node", "packages/backend", "--config", "app-config.yaml"]
