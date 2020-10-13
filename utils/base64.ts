type Base64String = string;

export function btoa(str: string): Base64String {
  return Buffer.from(str, "base64").toString();
}

export function atob(str: string | Buffer): Base64String {
  if (str instanceof Buffer) {
    return str.toString("base64");
  }

  return Buffer.from(str as string, "base64").toString("base64");
}
