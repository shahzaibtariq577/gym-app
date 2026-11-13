# Start from a small Linux image that has Node 22
FROM node:22-alpine

# Work inside the folder /app in the container
WORKDIR /app

# Copy only the package files first, and install the packages
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend code
COPY . .

# Run as a normal user, not as root
USER node

ENV NODE_ENV=production
EXPOSE 5000

# Start the server (the host gives the port in PORT)
CMD ["node", "server.js"]