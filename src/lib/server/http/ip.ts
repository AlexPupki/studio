'use server';

import { headers } from "next/headers";

export function getIp(): string {
    const forwardedFor = headers().get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = headers().get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    // For local development or environments without these headers
    return '127.0.0.1';
}
