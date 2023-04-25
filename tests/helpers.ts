import { APIRequestContext } from "@playwright/test";

export async function UrlIsAvailable(request: APIRequestContext, url: string): Promise<boolean> {
  try {
    const checkURL = await request.get(`${url}`, { timeout: 15000 });
    if (!checkURL.ok /* && checkURL.status() != 302*/) {
      return false;
    }
  } catch (error) {
    return false;
  }

  return true;
}

export const AZURE_FUNC_TIMEOUT = 2 * 60 * 1000;