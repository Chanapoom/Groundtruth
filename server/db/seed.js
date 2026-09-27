// ============================================================
// seed.js — CLI entry point for seeding demo data
// Run: node server/db/seed.js
// ============================================================

import 'dotenv/config';
import { seedDemoData } from './seedData.js';

console.log('[Seed] Starting...');
seedDemoData();
