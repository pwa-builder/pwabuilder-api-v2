import { Context } from '@azure/functions';
import * as Jimp from 'jimp';
import JSZip from 'jszip';
import fetch from 'node-fetch';
import ExceptionOf, { ExceptionType } from '../utils/Exception';
import {
  ImageGeneratorImageSpec,
  ImageGeneratorManifestImageResource,
  ImageGeneratorSources,
  ZipResult,
} from '../utils/interfaces';
import { setIntersection } from '../utils/set';
import { ManifestImageResource } from '../utils/w3c';

function imagesJsonUrl(source: ImageGeneratorSources) {
  return `https://raw.githubusercontent.com/pwa-builder/pwabuilder-Image-Generator/master/AppImageGenerator/App_Data/${source}.json`;
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
