declare namespace Exception {
  enum Type {
    MANIFEST_NOT_FOUND = "MANIFEST_NOT_FOUND",
    MANIFEST_FILE_UNSUPPORTED = "MANIFEST_FILE_UNSUPPORTED",
  }

  enum Message {
    MANIFEST_NOT_FOUND = "failed to find the manifest",
    MANIFEST_FILE_UNSUPPORTED = "failed to read the json of the submitted manifest file",
  }
}
