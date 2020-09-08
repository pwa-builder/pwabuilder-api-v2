import { HttpRequest } from "@azure/functions"

enum ValidContentTypes {
  webmanifest = "application/manifest+json",
  json = "application/json",
  binary = "application/octet-stream"
}

export function ifFile(req: HttpRequest): boolean {
  switch (req.headers['content-type']) {
    case ValidContentTypes.webmanifest:
    case ValidContentTypes.json:
      return true

    case ValidContentTypes.binary:
    default:
      // handle binary later
      return false
  }
}