'use server';

import fs from 'fs/promises';
import path from 'path';

const LOG_FILE_PATH = path.join(process.cwd(), 'public', 'debug.log');

/**
 * Reads the content and size of the log file.
 * @returns An object containing the log content and its size in bytes.
 */
export async function getLogsAction(): Promise<{ content: string; size: number }> {
  try {
    const stats = await fs.stat(LOG_FILE_PATH);
    const content = await fs.readFile(LOG_FILE_PATH, 'utf-8');
    return { content, size: stats.size };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, which is not an error in this context
      return { content: 'Log file does not exist.', size: 0 };
    }
    console.error('Error reading log file:', error);
    throw new Error('Failed to read log file.');
  }
}

/**
 * Clears the content of the log file.
 */
export async function clearLogsAction(): Promise<void> {
  try {
    await fs.writeFile(LOG_FILE_PATH, '');
  } catch (error) {
    console.error('Error clearing log file:', error);
    throw new Error('Failed to clear log file.');
  }
}
