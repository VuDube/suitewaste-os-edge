# SuiteWaste OS — Edge Weighing & Compliance PWA

SuiteWaste OS is a dark-mode-first, offline-first Progressive Web App (PWA) designed for waste collection points and scrap-buyers in South Africa. Built entirely on the Cloudflare serverless stack (Workers, D1, R2, Workers AI), it provides a robust Quick-Weight POS for fast local weighing, an audit-grade inventory ledger, and a transaction engine that embeds South African EPR/WEEE compliance metadata. The app ensures reliability during load-shedding and poor connectivity through Service Workers and TanStack Query for offline synchronization. Hardware integration is hardware-agnostic via modern Web APIs like Web Serial for scales and IP cameras.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/VuDube/suitewaste-os)

## Key Features

- **Offline-First Design**: Captures weights and transactions locally using IndexedDB, with automatic background sync to Cloudflare D1 when connectivity is restored.
- **Quick-Weight POS**: Touch-first interface for operators with large weight readouts, manual overrides, and transaction confirmation.
- **Hardware Integration**: Driverless communication with industrial scales (Web Serial API) and IP cameras (proxied snapshots via Workers).
- **Compliance & Auditing**: Immutable ledger with EPR/WEEE metadata, transaction history, CSV exports, and regulatory retention (5+ years).
- **Supplier Management**: Searchable directory with compliance records and EPR fee tracking.
- **Responsive & Industrial UI**: High-contrast dark theme (#0B0B0B background, #38761d primary, #FFFFFF text), optimized for gloved-hand use and mobile devices.
- **Edge Computing**: All API logic runs on Cloudflare Workers for low-latency, global performance.

## Tech Stack

### Frontend
- **React 18** + **TypeScript 5** for component-based UI
- **Tailwind CSS 3** + **shadcn/ui** for styling and components
- **React Router 6** for navigation
- **TanStack Query 5** for data fetching, caching, and offline sync
- **Zustand** for lightweight state management
- **Framer Motion** for animations and micro-interactions
- **Lucide React** for icons
- **idb-keyval** and **localforage** for IndexedDB offline storage
- **Workbox** for PWA Service Worker functionality
- **Sonner** for toast notifications
- **Recharts** for ledger visualizations

### Backend
- **Cloudflare Workers** with **Hono** for API routing
- **Cloudflare D1** (SQLite) for structured data persistence (suppliers, ledger, transactions)
- **Cloudflare R2** for storing photos, receipts, and attachments
- **Cloudflare KV** for configuration and secrets (e.g., camera credentials)
- **Cloudflare Workers AI** for optional OCR and material classification
- **IndexedEntity Pattern** for atomic, conflict-free operations on Durable Objects

### Additional Tools
- **Bun** for package management and scripting
- **Vite** for fast development and builds
- **ESLint + TypeScript** for code quality

## Quick Start

### Prerequisites
- Node.js 18+ (or Bun 1.0+)
- Cloudflare account with Workers enabled
- Wrangler CLI installed: `bun install -g wrangler`

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd suitewaste-os
   ```

2. Install dependencies using Bun:
   ```
   bun install
   ```

3. Set up environment variables (if needed, e.g., for production secrets):
   - Create a `.env` file in the root (not committed) and add any required vars.
   - For Cloudflare bindings, configure via Wrangler secrets: `wrangler secret put <SECRET_NAME>`.

4. Provision Cloudflare resources (D1, KV, R2):
   - Run the setup script:
     ```
     bun run scripts/setup-environment.sh
     ```
   - This creates the D1 database, applies the schema, sets up KV namespace `PRICING_CONFIG`, and binds resources.

## Development

### Running Locally
1. Start the development server:
   ```
   bun run dev
   ```
   - Access the app at `http://localhost:3000`.
   - The Worker API is proxied automatically.

2. In a separate terminal, start the Worker in dev mode (optional for API testing):
   ```
   wrangler dev
   ```

3. Type generation for Worker bindings:
   ```
   bun run cf-typegen
   ```

### Key Development Notes
- **Offline Testing**: Use browser dev tools to simulate offline mode and test sync queues.
- **Hardware Simulation**: For Web Serial testing, enable USB devices in Chrome flags (`chrome://flags/#enable-experimental-web-platform-features`).
- **Theme**: The app defaults to dark mode; toggle via the UI or localStorage.
- **API Endpoints**: Test via `/api/transactions`, `/api/suppliers`, etc. (see `worker/user-routes.ts`).
- **PWA Install**: The app registers a Service Worker for offline caching; test installation prompts.
- **Linting and Building**:
  ```
  bun run lint
  bun run build
  ```

### Usage Examples

#### Quick-Weight POS
- Navigate to `/quick-weight` (or home CTA).
- Connect scale: Tap "Connect Device" to request Web Serial port.
- Capture weight: Live readout updates; tap "Capture" to queue transaction offline.
- Sync: On reconnect, transactions sync to D1 with compliance metadata.

#### Offline Transaction
```typescript
// Example: Queuing a transaction (from React component)
const queueTransaction = async (weight: number, supplierId: string) => {
  const tx = { id: uuid(), weight, supplierId, timestamp: Date.now(), synced: false };
  await set('pending-tx', tx); // idb-keyval
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
};
```

#### API Call (TanStack Query)
```typescript
const { data } = useQuery({
  queryKey: ['suppliers'],
  queryFn: () => api<Supplier[]>('/api/suppliers'),
});
```

## Deployment

Deploy to Cloudflare Workers for global edge execution. The app is pre-configured as a PWA with automatic asset bundling.

1. Build the project:
   ```
   bun run build
   ```

2. Deploy using Wrangler:
   ```
   wrangler deploy
   ```
   - This deploys the Worker, static assets, and binds D1/KV/R2.
   - Preview URL: Available in Wrangler output.

3. Custom Domain (Optional):
   ```
   wrangler pages publish dist --project-name <project> --branch main
   ```
   - For Pages integration if needed.

4. Post-Deployment:
   - Monitor via Cloudflare Dashboard (Workers > Metrics).
   - Seed initial data: Run `wrangler tail` and POST to `/api/suppliers` endpoints.
   - PWA: Users can install from the deployed URL; Service Worker caches assets.

For one-click deployment:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/VuDube/suitewaste-os)

### Production Considerations
- **Secrets**: Use `wrangler secret put` for camera credentials and API keys.
- **D1 Schema Migrations**: Update `migrations` in `wrangler.jsonc` for schema changes.
- **R2 Buckets**: Create via dashboard; bind in Wrangler.
- **Monitoring**: Enable Workers Analytics Engine for sync queue depth and error rates.

## Contributing

Contributions are welcome! Please:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Ensure code passes linting and tests. Focus on offline resilience and compliance features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. Note: Compliance features are tailored for South African EPR/WEEE regulations; consult legal experts for production use.