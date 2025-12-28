// API Client exports
export { default as apiClient, getApiErrorMessage } from './client';
export type { ApiError } from './client';

// Token manager
export { tokenManager } from '@/lib/auth/tokenManager';

// Auth - now uses unified auth
export { unifiedAuth } from '@/lib/auth';
export type { User, AuthResponse } from '@/lib/auth';

// Menu API
export { menuApi } from './menu';

// Orders API
export { ordersApi } from './orders';

// Inventory API
export { inventoryApi } from './inventory';

// Staff API
export { staffApi } from './staff';

// Settings API
export { settingsApi } from './settings';
