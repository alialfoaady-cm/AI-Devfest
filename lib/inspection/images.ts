// Browser only: canvas work on photos before they are stored or uploaded.
import { STORED_PHOTO_EDGE_PX } from "../config";

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

/** Anything drawable (an image, a live video frame), shrunk to at most STORED_PHOTO_EDGE_PX on its long edge, as a JPEG data URL. */
export function shrinkToPhoto(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, STORED_PHOTO_EDGE_PX / Math.max(width, height));
  return toJpeg((ctx) => ctx.drawImage(source, 0, 0, width * scale, height * scale), width * scale, height * scale);
}

/** A camera or gallery file as a stored photo. */
export async function fileToPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    return shrinkToPhoto(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
