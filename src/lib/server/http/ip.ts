'use server';

import { NextRequest } from "next/server";
import { headers } from "next/headers";

export function getIp(req?: NextRequest): string {
    const sourceHeaders = req ? req.headers : headers();
    const forwardedFor = sourceHeaders.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = sourceHeaders.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    // For local development or environments without these headers
    if (req) {
        return req.ip ?? '127.0.0.1';
    }
    return '127.0.0.1';
}
