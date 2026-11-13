// Browser only: canvas work on photos before they are stored or uploaded.
import { MAX_IMAGE_EDGE_PX } from "../config";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That photo could not be read."));
    image.src = src;
  });
}

export function toJpeg(draw: (ctx: CanvasRenderingContext2D) => void, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  draw(canvas.getContext("2d")!);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** A camera or gallery file, shrunk to at most MAX_IMAGE_EDGE_PX on its long edge, as a JPEG data URL. */
export async function fileToPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(image.naturalWidth, image.naturalHeight));
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    return toJpeg((ctx) => ctx.drawImage(image, 0, 0, width, height), width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}
