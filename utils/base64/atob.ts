type Base64String = string;

export default function atob(str: string | Buffer): Base64String {
  if (str instanceof Buffer) {
    return str.toString("base64");
  }

  return Buffer.from(str as string, "base64").toString("base64");
}
