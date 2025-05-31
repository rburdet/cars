# 🚗 MercadoLibre Auto Scraper - Workers Static Assets

A full-stack MercadoLibre auto scraper built with **Cloudflare Workers Static Assets**, React, and TypeScript. This application scrapes car listings from MercadoLibre Argentina and provides a modern web interface to browse and analyze the data.

## 🏗️ Architecture

This project uses **Cloudflare Workers Static Assets** for a unified full-stack deployment:

- **Frontend**: React + TypeScript + Vite (served as static assets)
- **Backend**: Cloudflare Worker with API handlers
- **Storage**: Cloudflare KV for persistent data
- **Deployment**: Single domain, same-origin architecture

## ✨ Features

- 🔍 **Real-time scraping** of MercadoLibre car listings
- 📊 **Interactive dashboard** with statistics and filters
- 💾 **Persistent storage** in Cloudflare KV
- 🌐 **Same-domain deployment** (no CORS issues)
- 📱 **Responsive design** with modern UI components
- 💱 **Currency conversion** (ARS to USD)
- 🔄 **Infinite pagination** support
- 📈 **Data visualization** and analytics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd merk2-scrapper

# Install dependencies
npm install

# Build frontend
npm run build:frontend

# Start development server
npm run dev
```

### Deployment

```bash
# Deploy to production
npm run deploy

# Deploy to development environment
npm run deploy:dev
```

## 📁 Project Structure

```
merk2-scrapper/
├── src/                        # Worker source code
│   ├── index.ts               # Main Worker entry point
│   ├── types.ts               # TypeScript interfaces
│   └── api/                   # API handlers
│       ├── search-autos.ts    # MercadoLibre scraper
│       ├── get-cars.ts        # Retrieve stored cars
│       └── get-all-cars.ts    # List all collections
├── frontend/                   # React frontend
│   ├── src/                   # Frontend source code
│   ├── dist/                  # Build output (served as static assets)
│   └── package.json           # Frontend dependencies
├── wrangler.toml              # Worker configuration
├── package.json               # Worker dependencies
└── tsconfig.json              # TypeScript config
```

## 🔧 Configuration

### Environment Variables

The project supports multiple environments:

- **Production**: `NODE_ENV=production`
- **Development**: `NODE_ENV=development`
- **Preview**: `NODE_ENV=preview`

### KV Storage

- **Namespace ID**: `677b8c8790fc44a58eaad0a3f2f89c3f`
- **Binding Name**: `CAR_LISTINGS`

## 📡 API Endpoints

### Search Cars
```
GET /api/search-autos?brand=toyota&model=yaris&limit=20
```

### Infinite Search with Storage
```
GET /api/search-autos?brand=honda&model=civic&limit=infinite&store=true
```

### Get Stored Cars
```
GET /api/get-cars?brand=toyota&model=yaris
```

### Get All Collections
```
GET /api/get-all-cars
```

## 🛠️ Development

### Local Development

```bash
# Start development server
npm run dev

# Build frontend only
npm run build:frontend

# Preview locally
npm run preview
```

### KV Management

```bash
# List KV namespaces
npm run kv:list

# Create new KV namespace
npm run kv:create
```

## 🔄 Migration from Pages

This project was migrated from Cloudflare Pages to Workers Static Assets. See [WORKERS_MIGRATION_GUIDE.md](./WORKERS_MIGRATION_GUIDE.md) for detailed migration information.

### Key Benefits of Migration

- ✅ **Better Performance**: Faster cold starts and edge optimization
- ✅ **Unified Architecture**: Single deployment for frontend and backend
- ✅ **Enhanced Observability**: Workers Logs, Logpush, Tail Workers
- ✅ **Advanced Features**: Better routing, middleware support
- ✅ **Same Domain**: No CORS issues, simplified configuration

## 📊 Features

### Frontend
- Modern React UI with shadcn/ui components
- Real-time data fetching with TanStack Query
- Responsive design with Tailwind CSS
- Interactive data tables with sorting and filtering
- Currency conversion (ARS to USD)
- Statistics dashboard

### Backend
- MercadoLibre scraper with HTML parsing
- Infinite pagination support
- Auto-storage in Cloudflare KV
- CORS handling
- Error handling and logging

## 🔍 Usage Examples

### Basic Search
```bash
curl "https://your-domain.workers.dev/api/search-autos?brand=toyota&model=yaris&limit=10"
```

### Infinite Search with Storage
```bash
curl "https://your-domain.workers.dev/api/search-autos?brand=ford&model=focus&limit=infinite&store=true"
```

### Get Statistics
```bash
curl "https://your-domain.workers.dev/api/get-all-cars"
```

## 🚀 Deployment Options

### 1. CLI Deployment
```bash
npm run deploy
```

### 2. GitHub Integration
Connect your repository to Cloudflare for automatic deployments on push.

### 3. Manual Upload
Use the Cloudflare dashboard to upload your built Worker.

## 📈 Monitoring

- **Workers Analytics**: Built-in request metrics
- **Real-time Logs**: Available in Cloudflare dashboard
- **KV Metrics**: Storage usage and operation counts
- **Error Tracking**: Automatic error logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the [Migration Guide](./WORKERS_MIGRATION_GUIDE.md)
- Review [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
- Open an issue in this repository

---

**Built with ❤️ using Cloudflare Workers Static Assets** 