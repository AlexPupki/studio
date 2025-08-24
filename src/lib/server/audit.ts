'use server';

import { db } from "./db";
import { auditEvents } from "./db/schema";
import type { actorTypeEnum, entityTypeEnum } from "./db/schema";
import { logger } from "../logger";

const auditLogger = logger.withCategory('AUDIT');


interface AuditLog {
  traceId: string;
  actor: {
    type: (typeof actorTypeEnum.enumValues)[number];
    id?: string;
  };
  action: string;
  entity: {
    type: (typeof entityTypeEnum.enumValues)[number];
    id: string;
  };
  data?: Record<string, any>;
}

/**
 * Logs a domain event to the audit trail.
 * This should be called whenever a significant business action occurs.
 * @param log The audit log entry.
 */
export async function audit(log: AuditLog): Promise<void> {
  try {
    await db.insert(auditEvents).values({
      traceId: log.traceId,
      actorType: log.actor.type,
      actorId: log.actor.id,
      action: log.action,
      entityType: log.entity.type,
      entityId: log.entity.id,
      data: log.data,
    });
    auditLogger.info(log.action, { actor: log.actor, entity: log.entity, traceId: log.traceId });
  } catch (error) {
    auditLogger.error("Failed to write to audit log", { error, log });
    // In a real production system, you might want to send this to a fallback logger.
  }
}
