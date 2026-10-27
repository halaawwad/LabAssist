declare module "pdf-buffer" {
  import { Buffer } from "buffer";
  export { Buffer };
  const browserModule: { Buffer: typeof Buffer };
  export default browserModule;
}
