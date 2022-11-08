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
    const form = setupFormData();

    // if a image url is passed use that by default
    if (req.query.imgUrl) {
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

      if (img) {
        const buf = await img.getBufferAsync(Jimp.MIME_PNG);

        form.append('fileName', buf, { contentType: Jimp.MIME_PNG });
      } else {
        throw ExceptionOf(
          ExceptionType.IMAGE_GEN_IMG_NETWORK_ERROR,
          new Error(`Could not find requested resource at: ${imgUrl}`)
        );
      }
    } else if (req.body) {
      // azure functions defaults bodies to string, unless the header is specified as application/octet-stream. https://github.com/Azure/azure-functions-nodejs-worker/issues/294
      // how do we determine it is a valid image and not some garbage...
      // if file is sent, then create image generator
      const buf = Buffer.from(req.body, 'binary');
      const img = await Jimp.read(buf);

      form.append('fileName', await img.getBufferAsync(Jimp.MIME_PNG), {
        contentType: Jimp.MIME_PNG,
      });
    } else {
      throw ExceptionOf(
        ExceptionType.IMAGE_GEN_FILE_NOT_FOUND,
        new Error('the image generation code requires a file or a image url')
      );
    }

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
