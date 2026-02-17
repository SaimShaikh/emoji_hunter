# Use Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Expose Vite default port
EXPOSE 5173

# Command to run the app
CMD ["npm", "run", "dev"]
