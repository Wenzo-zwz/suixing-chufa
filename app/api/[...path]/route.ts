import { env } from 'cloudflare:workers';
import { handleApi } from '../../../server/cloud-api.mjs';

const allowedOrigins = [
  'https://wenzo-zwz.github.io',
  'http://127.0.0.1:4177',
  'http://localhost:4177',
];

function handle(request: Request) {
  return handleApi(request, env.DB, { allowedOrigins });
}

export { handle as GET, handle as POST, handle as OPTIONS };
