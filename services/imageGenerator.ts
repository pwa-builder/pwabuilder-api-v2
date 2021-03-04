import { Context } from '@azure/functions';
import FormData from 'form-data';
import * as Jimp from 'jimp';
import JSZip from 'jszip';
import fetch, { Response } from 'node-fetch';
import ExceptionOf, { ExceptionType } from '../utils/Exception';
import { IconManifestImageResource } from '../utils/interfaces';

const baseUrl = 'https://appimagegenerator-prod.azurewebsites.net';
const uriUrl = `${baseUrl}/api/image`;

export async function generateAllImages(
  context: Context,
  form: FormData
): Promise<Response | undefined> {
  try {
    context.log.info('before generate all images');

    const generate = await fetch(uriUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'content-type': 'multipart/form-data',
      },
      body: form,
    });

    context.log.info(generate.status, generate.statusText);

    const generateResponse: {
      Uri?: string | '/api/image/<hash>';
      Message?: string;
    } = await generate.json();

    context.log.info('after post', generateResponse);
    if (generateResponse.Message) {
      // returned message means error

      throw ExceptionOf(
        ExceptionType.IMAGE_GEN_IMG_SERVICE_ERROR,
        new Error(generateResponse.Message)
      );
    } else if (generateResponse.Uri) {
      return fetch(`${baseUrl}${generateResponse.Uri}`, {
        method: 'GET',
      });
    }
  } catch (e) {
    context.log.error(e);
  }

  return undefined;
}

export async function getBase64Images(
  context: Context,
  zip: JSZip
): Promise<Array<IconManifestImageResource>> {
  const output: Array<IconManifestImageResource> = [];
  try {
    const iconsFileRef = zip.file('icons.json') ?? undefined;
    const iconsFile = await iconsFileRef?.async('string');

    if (iconsFile) {
      const json = JSON.parse(iconsFile) as {
        icons: Array<Partial<IconManifestImageResource>>;
      };

      const len = json.icons.length;
      for (let i = 0; i < len; i++) {
        const icon = json.icons[i];
        const { src } = icon;

        if (src) {
          const file = zip.file(src) ?? undefined;
          const buf = await file?.async('nodebuffer');

          if (!buf) {
            throw ExceptionOf(
              ExceptionType.IMAGE_GEN_FILE_NOT_FOUND,
              new Error(`could not get node buffer of: ${src}`)
            );
          }

          const img = await Jimp.read(buf);

          output.push({
            src: await img.getBase64Async(img.getMIME()),
            sizes: icon.sizes ?? `${img.getWidth()}x${img.getHeight()}`,
            type: img.getMIME(),
            purpose: 'any',
          });
        }
      }
    }
  } catch (e) {
    context.log.error(e);
  }

  return output;
}

export function setupFormData(): FormData {
  const form = new FormData();
  form.append('padding', '0.0');
  form.append('colorOption', 'transparent');
  form.append('platform', 'windows10');
  form.append('platform', 'windows');
  form.append('platform', 'msteams');
  form.append('platform', 'android');
  form.append('platform', 'chrome');
  form.append('platform', 'firefox');

  return form;
}
