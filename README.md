# nuvra-landing

A fullstack application built with React, TypeScript, and Tailwind CSS.

## Feature Management

This project uses **dormant feature management**, allowing you to enable/disable features without regenerating code. All feature files are included in the project but remain dormant until explicitly activated.

### Feature Status

| Feature | Status | Description |
|---------|--------|-------------|
| Payment & Billing | ✅ Active | Stripe integration with subscriptions, billing, and payment processing |
| AI Assistant | ✅ Active | AI-powered features including content generation and assistant functionality |
| Authentication | ✅ Active | User authentication with login, signup, and protected routes |

### Activating Dormant Features

### Environment Configuration

Create a `.env.local` file with the following variables to activate features:

```bash
# Feature Activation

# Configuration Variables
AI_CONTENT_SETTINGS=your_value_here
OPENAI_MODEL=your_value_here
STRIPE_SECRET_KEY=your_value_here
STRIPE_WEBHOOK_SECRET=your_value_here
SUPABASE_SERVICE_ROLE_KEY=your_value_here
VITE_OPENAI_API_KEY=your_value_here
VITE_STRIPE_PUBLISHABLE_KEY=your_value_here
VITE_SUPABASE_ANON_KEY=your_value_here
VITE_SUPABASE_URL=your_value_here
```

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Checking Feature Status

You can check which features are currently active/dormant:

```typescript
import { getActiveFeatures, isFeatureDormant } from './src/lib/features';

console.log('Active features:', getActiveFeatures());
console.log('Payment dormant:', isFeatureDormant('payment'));
console.log('AI dormant:', isFeatureDormant('ai'));
console.log('Auth dormant:', isFeatureDormant('auth'));
```

---

*Documentation generated on 2026-01-22 08:01:45 for fullstack project with 3 active and 0 dormant features.*
