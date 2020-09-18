export enum ExceptionType {
  MANIFEST_NOT_FOUND = "MANIFEST_NOT_FOUND",
  MANIFEST_FILE_UNSUPPORTED = "MANIFEST_FILE_UNSUPPORTED",
}

export enum ExceptionMessage {
  MANIFEST_NOT_FOUND = "failed to find the manifest",
  MANIFEST_FILE_UNSUPPORTED = "failed to read the json of the submitted manifest file",
}

/*
  Top Level exception wrapper for better error handling based on ExceptionTypes.
  Message and stack are the parents, just provides syntactic sugar on the name field for easier comparison.
 */
export class ExceptionWrap {
  type: Exception.Type;
  error: Error;

  constructor(type: Exception.Type, error: Error) {
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
  isOf(type: Exception.Type): boolean {
    return this.type === type;
  }
}

export default function ExceptionOf(type: ExceptionType, error: Error) {
  return new ExceptionWrap(Exception.Type[type], error);
}
