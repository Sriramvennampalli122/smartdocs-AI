import { config } from 'dotenv';
config();

// Note: flows are now plain Next.js server actions, not Genkit flows.
// The genkit.ts plugin is used only by /api/generate route.
import '@/ai/genkit';