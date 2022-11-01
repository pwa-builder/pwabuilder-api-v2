import { HttpRequest } from '@azure/functions/Interfaces';
import ExceptionOf, { ExceptionType as Type } from './Exception';
import { Manifest } from './interfaces';

export enum ValidContentType {
  webmanifest = 'application/manifest+json',
  json = 'application/json',
  binary = 'application/octet-stream',
}

export default async function getManifestFromFile(
  req: HttpRequest
): Promise<Manifest> {
  try {
    switch (req.headers['content-type']) {
      case ValidContentType.json:
      case ValidContentType.webmanifest:
        return handleJson(req);
      case ValidContentType.binary:
        return handleBinary(req);
      default:
        throw TypeError('unsupported file type');
    }
  } catch (e: any) {
    throw ExceptionOf(Type.MANIFEST_FILE_UNSUPPORTED, e);
  }
}

export function ifSupportedFile(req: HttpRequest): boolean {
  switch (req.headers['content-type']) {
    case ValidContentType.webmanifest:
    case ValidContentType.json:
    case ValidContentType.binary:
      return true;

    default:
      return false;
  }
}

// conversion is automatic!
function handleJson(req: HttpRequest) {
  return req.body;
}

// Azure wraps in a files in a buffer by default!
async function handleBinary(req: HttpRequest) {
  const jsonFileString = req.body.toString('utf-8');
  return JSON.parse(jsonFileString);
}
