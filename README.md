## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **HTML5 Canvas** for particle effects
- **Web Audio API** for sound effects
- **Docker** for containerization
- **Nginx** for production serving

## Docker Configuration

The Dockerfile uses a multi-stage build:
1. **Build stage**: Installs dependencies and builds the React app
2. **Production stage**: Serves the built app with Nginx

Features:
- Optimized Alpine Linux base images
- Gzip compression enabled
- Static asset caching
- Security headers
- Client-side routing support

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Docker
The easiest way to deploy is using Docker:

```bash
# Build and run
docker build -t emoji-hunt .
docker run -p 80:80 emoji-hunt
```

### Manual Deployment
1. Run `npm run build`
2. Deploy the `dist/` folder to any static hosting service
3. Configure your web server to handle client-side routing
