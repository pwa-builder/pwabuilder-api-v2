import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import * as Jimp from 'jimp';

import JSZip from 'jszip';
import fetch from 'node-fetch';
import {
  generateAllImages,
  getBase64Images,
  setupFormData,
} from '../services/imageGenerator';
import { ManifestImageResource } from '../utils/w3c';
import ExceptionOf, { ExceptionType } from '../utils/Exception';
import { isValidImage } from '../utils/fetch-headers';

interface ImageBase64ResponseBody {
  icons: Array<ManifestImageResource>;
  successful: boolean;
}

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const body: ImageBase64ResponseBody = {
    icons: [],
    successful: false,
  };

  try {
    context.log.info('do something');

    // TODO this is failing the checks for formdata and buffer (for formdata) or
    context.log.info(req.headers);
    // context.log.info(
    //   req.body,
    //   req.params,
    //   req.query,
    //   req.body instanceof Buffer,
    //   req.body instanceof FormData,
    //   req.query.imgUrl
    // );

    const form = setupFormData();

    if (isValidImage(req)) {
      context.log.info('buffer path');

      // if file is sent, then create image generator
      const buf = req.body;

      form.append('fileName', buf);
    } else if (req.query.imgUrl) {
      // check site url and fetch and send image to image generation
      context.log.info('imgUrl path', req.query.imgUrl);

      const { imgUrl } = req.query;
      const headTest = await fetch(imgUrl, {
        method: 'HEAD',
      });

      if (!headTest.ok) {
        throw ExceptionOf(
          ExceptionType.IMAGE_GEN_IMG_NETWORK_ERROR,
          new Error(`Could not find requested resource at: ${imgUrl}`)
        );
      }

      const img = await Jimp.read(imgUrl);
      context.log.info(img._originalMime);

      if (img) {
        const buf = await img.getBufferAsync(Jimp.MIME_PNG);
        context.log.info(buf);

        form.append('fileName', buf);
      } else {
        throw ExceptionOf(
          ExceptionType.IMAGE_GEN_IMG_NETWORK_ERROR,
          new Error(`Could not find requested resource at: ${imgUrl}`)
        );
      }
    }

    context.log.info('passed the parsing of the stuffs.');

    const res = await generateAllImages(context, form);
    context.log.info('after gen all images');

    if (res) {
      const zip = new JSZip();
      zip.loadAsync(await res.arrayBuffer());
      body.icons = await getBase64Images(context, zip);
    }
  } catch (e) {
    context.log.error('error', e);
    // the file fetch path, check for HEAD and Jimp failures.
  }

  context.res = {
    status: 200,
    body,
  };
};

export default httpTrigger;
