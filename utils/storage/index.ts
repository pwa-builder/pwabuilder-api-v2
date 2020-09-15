import * as crypto from "crypto";

export function createId(siteUrl: string): string {
  return crypto.createHmac("sha512", siteUrl).digest("hex");
}
