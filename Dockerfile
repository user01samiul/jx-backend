# Use official Node.js LTS image
FROM node:20

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./

ENV NODE_ENV=development
RUN npm install --include=dev

# Copy source files
COPY . .

# Expose port (match Express app)
EXPOSE 3000

# Start the app
CMD ["npm", "run", "dev"]