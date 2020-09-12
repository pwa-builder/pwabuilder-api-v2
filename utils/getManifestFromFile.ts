import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import ExceptionOf, { ExceptionType } from "./Exception";

export type Manifest = any;
export enum ValidContentType {
  webmanifest = "application/manifest+json",
  json = "application/json",
  binary = "application/octet-stream",
}


export default function getManifestFromFile(context: Context, req: HttpRequest): Manifest {
  try {
    const jsonData = req.body

    


  } catch (e) {
    throw ExceptionOf(ExceptionType.MANIFEST_FILE_UNSUPPORTED, e);
  }
}

export function ifSupportedFile(req: HttpRequest): boolean {
  switch (req.headers["content-type"]) {
    case ValidContentType.webmanifest:
    case ValidContentType.json:
      return true;

    case ValidContentType.binary:
    default:
      // handle binary later
      return false;
  }
}

function convertToJson() {

}