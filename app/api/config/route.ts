import {googleConfigured} from '@/packages/auth/runtime';
import {settings} from '@/packages/db/demo';
import {demoAllowed} from '@/packages/domain/policies';
export const dynamic='force-dynamic';
export function GET(){const cfg=settings();return Response.json({demo:demoAllowed(cfg.DEPLOYMENT_MODE,cfg.DEMO_ENABLED),google:googleConfigured(),authConfigured:!!cfg.AUTH_SECRET},{headers:{'Cache-Control':'no-store'}});}
