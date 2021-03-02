import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import * as Jimp from 'jimp';
import JSZip from 'jszip';
import fetch from 'node-fetch';
import FormData from 'form-data';
import {
  generateAllImages,
  getBase64Images,
  setupFormData,
} from '../services/imageGenerator';
import { ManifestImageResource } from '../utils/w3c';

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
    let form = setupFormData();

    if (req.body instanceof FormData) {
      // veneer of the image generator service
      console.log(req.body);
      form = req.body as FormData;
    } else if (req.body) {
      // if file is sent, then create image generator
      console.log(req.body as File);
    } else if (req.query.imgUrl) {
      // check site url and fetch and send image to image generation
      console.log(req.query.imgUrl);
      const { imgUrl } = req.query;
      const headTest = await fetch(imgUrl, {
        method: 'HEAD',
      });

      console.log(headTest.headers);
      const img = await Jimp.read(imgUrl);
      const buf = await img.getBufferAsync(Jimp.MIME_PNG);

      form.append('fileName', new Blob([new Uint8Array(buf)]));
    }

    const res = await generateAllImages(context, form);
    if (res) {
      // TODO test, might need to move this logic into a durable function setup.
      const zip = new JSZip();
      zip.loadAsync(await res.arrayBuffer());
      body.icons = await getBase64Images(context, zip);
    }
  } catch (e) {
    console.log('error', e);

    // the file fetch path, check for HEAD and Jimp failures.
  }

  context.res = {
    status: 200,
    body,
  };
};

export default httpTrigger;