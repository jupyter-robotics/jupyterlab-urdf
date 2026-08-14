import { PageConfig } from '@jupyterlab/coreutils';

/**
 * Decodes a base64 encoded string into raw bytes.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes a base64 encoded string into a UTF-8 string.
 */
export function decodeBase64ToUtf8(base64: string): string {
  return new TextDecoder().decode(base64ToBytes(base64));
}

/**
 * Normalizes a path into a workspace-relative path for the contents manager.
 */
export function normalizeContentsPath(path: string, workingPath = ''): string {
  const baseUrl = PageConfig.getBaseUrl();
  let clean = path.startsWith(baseUrl) ? path.slice(baseUrl.length) : path;
  clean = clean
    .replace(/^\/?files\//, '')
    .replace(/^package:\/\//, '')
    .replace(/^\/+/, '');

  const working = workingPath
    .replace(baseUrl, '')
    .replace(/^\/?files\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return working && !clean.startsWith(working + '/')
    ? `${working}/${clean}`
    : clean;
}
