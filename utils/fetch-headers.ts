import { HttpRequest } from '@azure/functions';

export enum MimeTypes {
  formData = 'multipart/form-data',
  png = 'image/png',
  jpeg = 'image/jpeg',
}

export function getContentType(req: HttpRequest): string {
  return req.headers['Content-Type'] || req.headers['content-type'];
}

export function headerHasMimeType(req: HttpRequest, type: MimeTypes): boolean {
  return (getContentType(req) || '').includes(type);
}

export function isValidImage(req: HttpRequest): boolean {
  return (
    headerHasMimeType(req, MimeTypes.png) ||
    headerHasMimeType(req, MimeTypes.jpeg)
  );
}

export function isFormData(req: HttpRequest): boolean {
  return headerHasMimeType(req, MimeTypes.formData);
}
