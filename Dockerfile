FROM node:22-slim

# Fix Debian CDN hash mismatch issues in Docker
RUN echo 'Acquire::http::Pipeline-Depth "0";' > /etc/apt/apt.conf.d/99fix-hashsum && \
    echo 'Acquire::http::No-Cache "True";' >> /etc/apt/apt.conf.d/99fix-hashsum && \
    echo 'Acquire::BrokenProxy "True";' >> /etc/apt/apt.conf.d/99fix-hashsum

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Playwright Chromium + all system dependencies automatically
RUN npx playwright install --with-deps chromium

# Install Claude Code CLI globally (used by claude-cli LLM provider)
RUN npm install -g @anthropic-ai/claude-code

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user (Claude CLI refuses --dangerously-skip-permissions as root)
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

# Create directories and set ownership
RUN mkdir -p /app/tmp/reports /app/tmp/videos && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

# Run the API server by default
ENTRYPOINT ["node", "dist/server/index.js"]
