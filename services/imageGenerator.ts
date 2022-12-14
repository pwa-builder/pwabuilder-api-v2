import { Context } from '@azure/functions';
import * as Jimp from 'jimp';
import JSZip from 'jszip';
import FormData from 'form-data';
import ExceptionOf, { ExceptionType } from '../utils/Exception';
import {
  ImageGeneratorImageSpec,
  ImageGeneratorManifestImageResource,
  ImageGeneratorSources,
  IconManifestImageResource,
  ZipResult,
} from '../utils/interfaces';
import { setIntersection } from '../utils/set';
import { ManifestImageResource } from '../utils/w3c';

const baseUrl = 'https://appimagegenerator-prod.azurewebsites.net';
const uriUrl = `${baseUrl}/api/image`;

function imagesJsonUrl(source: ImageGeneratorSources) {
  return `https://raw.githubusercontent.com/pwa-builder/pwabuilder-Image-Generator/master/AppImageGenerator/App_Data/${source}.json`;
}

export async function generateAllImages(
  context: Context,
  form: FormData
): Promise<Response | undefined> {
  try {
    context.log.info('before generate all images');

    const generate = await fetch(uriUrl, {
      method: 'POST',
      headers: form.getHeaders(),
      body: form.getBuffer(),
      // compress: false,
    });
    context.log.info(generate.status, generate.statusText);

    const generateResponse = await generate.json() as { 
      Uri?: string | '/api/image/<hash>';
      Message?: string
    };

    // const generateResponse: {
    //   Uri?: string | '/api/image/<hash>';
    //   Message?: string;
    // } = await generate.json();

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

export async function generateAllImagesJimp(
  context: Context,
  image: Jimp,
  source: ImageGeneratorSources = ImageGeneratorSources.all
): Promise<Array<ImageGeneratorManifestImageResource>> {
  let output: Array<ImageGeneratorManifestImageResource> = [];

  try {
    const imgJsonRes = await fetch(imagesJsonUrl(source));
    const imgJson = (await imgJsonRes.json()) as Array<ImageGeneratorImageSpec>;

    output = imgJson.map((info: ImageGeneratorImageSpec) => {
      const cur = image.clone();
      const { width, height } = info;

      cur.resize(width, height);

      return {
        src: cur,
        sizes: `${width}x${height}`,
        type: Jimp.MIME_PNG,
        purpose: 'any',
      };
    });
  } catch (e) {
    context.log.error(e);
  }

  return output;
}

export async function convertToBase64(
  context: Context,
  images: Array<ImageGeneratorManifestImageResource>
): Promise<Array<ManifestImageResource>> {
  const output: Array<ManifestImageResource> = [];
  const eachSizeOnce = new Set(); // theres a lot of duplicate entries in the manifests... to save on performance.

  try {
    const len = images.length;
    for (let i = 0; i < len; i++) {
      const { src, sizes, type, purpose } = images[i];

      if (!eachSizeOnce.has(sizes)) {
        const base64 = await src.getBase64Async(Jimp.MIME_PNG);

        output.push({
          src: base64,
          sizes,
          type,
          purpose,
        });
        eachSizeOnce.add(sizes);
      }
    }
  } catch (e) {
    context.log.error(e);
  }

  return output;
}

export async function generateZip(
  context: Context,
  images: Array<ImageGeneratorManifestImageResource>
): Promise<ZipResult> {
  const zip = new JSZip();
  const eachSizeOnce = new Set<string>();

  try {
    const len = images.length;

    for (let i = 0; i < len; i++) {
      const { src, sizes } = images[i];

      // TODO finish using the duplicates to buffer and etc.
      const duplicates = setIntersection<string>(
        eachSizeOnce,
        new Set(sizes.split(' '))
      );

      if (!eachSizeOnce.has(sizes)) {
        const buffer = await src.getBufferAsync(Jimp.MIME_PNG);

        zip.file(`${sizes}.png`, buffer);
      }
    }
  } catch (e) {
    context.log.error(e);
  }
  return {
    zip,
    success: eachSizeOnce.size > 0,
  };
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
