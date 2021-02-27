import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import * as Jimp from 'jimp';
import fetch from 'node-fetch';
import { generateAllImages } from '../services/imageGenerator';
import { ManifestImageResource } from '../utils/w3c';

type Base64Image = ManifestImageResource;

interface ImageBase64ResponseBody {
  icons: Array<Base64Image>;
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
    let form = new FormData();

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
      const img = Jimp.read(imgUrl);
      //img.
    }

    const res = await generateAllImages(form);

    // read using archiver or jszip
    res.blob();

    // then read content and base64 all images.
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
