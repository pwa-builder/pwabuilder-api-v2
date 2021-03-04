export enum ExceptionType {
  MANIFEST_NOT_FOUND = 'MANIFEST_NOT_FOUND',
  MANIFEST_FILE_UNSUPPORTED = 'MANIFEST_FILE_UNSUPPORTED',
  BLOB_STORAGE_FAILURE = 'BLOB_STORAGE_FAILURE',
  BLOB_STORAGE_FAILURE_IMAGE = 'BLOB_STORAGE_FAILURE_IMAGE',
  BLOB_READ_FAILURE = 'BLOB_READ_FAILURE',
  BROWSER_CLOSE_FAILURE = 'BROWSER_CLOSE_FAILURE',
  IMAGE_GEN_IMG_NETWORK_ERROR = 'IMAGE_GEN_IMG_NETWORK_ERROR',
  IMAGE_GEN_IMG_SERVICE_ERROR = 'IMAGE_GEN_IMG_SERVICE_ERROR',
  IMAGE_GEN_FILE_NOT_FOUND = 'IMAGE_GEN_FILE_NOT_FOUND',
}

export enum ExceptionMessage {
  MANIFEST_NOT_FOUND = 'failed to find the manifest',
  MANIFEST_FILE_UNSUPPORTED = 'failed to read the json of the submitted manifest file',
  BLOB_STORAGE_FAILURE = 'failed to create the azure resources for generating the app',
  BLOB_STORAGE_FAILURE_IMAGE = 'failed to upload image to blob storage',
  BLOB_READ_FAILURE = 'failed to fetch resource from blob storage',
  BROWSER_CLOSE_FAILURE = 'Failed to close browser',
  IMAGE_GEN_IMG_NETWORK_ERROR = 'failed to connect or receive a successful response from the image generator service',
  IMAGE_GEN_IMG_SERVICE_ERROR = 'the generator service returns an error',
  IMAGE_GEN_FILE_NOT_FOUND = 'failed to retrieve the image resource from the site, or the file blob',
}

/*
  Top Level exception wrapper for better error handling based on ExceptionTypes.
  Message and stack are the parents, just provides syntactic sugar on the name field for easier comparison.
 */
export class ExceptionWrap {
  type: ExceptionType;
  error: Error;

  constructor(type: ExceptionType, error: Error) {
    this.type = type;
    this.error = error;
  }

  get name(): string {
    return this.error.name;
  }

  get message(): string {
    return this.error.message;
  }

  get stack(): string | undefined {
    return this.error?.stack;
  }

  // Use to differentiate Exception wrap types easily, or use switch (exception.type) {}.
  isOf(type: ExceptionType): boolean {
    return this.type === type;
  }
}

export default function ExceptionOf(
  type: ExceptionType,
  error: Error
): ExceptionWrap {
  return new ExceptionWrap(ExceptionType[type], error);
}
