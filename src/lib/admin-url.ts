// The admin app is a separate site (built from admin.html with vite.admin.config.ts).
export const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || 'https://admin.assetmx.com.au').replace(/\/$/, '');
