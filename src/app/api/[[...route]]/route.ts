// This file is intentionally left blank for now.
// It can be used in the future to expose Genkit flows as API endpoints.
import {NextRequest} from 'next/server';
import {genkitNext} from '@genkit-ai/next';

const handler = genkitNext({
  // Flows here
});

export async function POST(req: NextRequest) {
  return handler(req);
}
