type Base64String = string;

export default function btoa(str: string): Base64String {
  return Buffer.from(str, "base64").toString();
}
