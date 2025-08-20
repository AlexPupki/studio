'use server';

import { getFeature } from '@/lib/server/config.server';
import { YclientsAdapter, StubYclientsAdapter } from './adapter';
import type { IYclientsAdapter } from './contracts';

let yclientsService: IYclientsAdapter | undefined;

/**
 * Factory function to get the YCLIENTS service instance.
 * It returns a real adapter if the feature is enabled, otherwise a stub.
 * This prevents direct instantiation and ensures consistent behavior.
 */
export function createYclientsService(): IYclientsAdapter {
  if (yclientsService) {
    return yclientsService;
  }

  if (getFeature('FEATURE_UCLIENTS_ENABLED')) {
    console.log("Initializing REAL YclientsAdapter");
    yclientsService = new YclientsAdapter();
  } else {
    console.log("Initializing STUB YclientsAdapter");
    yclientsService = new StubYclientsAdapter();
  }

  return yclientsService;
}
