// This file is safe to import on the client and server.

export interface ISmsProvider {
  send(to: string, body: string): Promise<{ sid: string }>;
}
