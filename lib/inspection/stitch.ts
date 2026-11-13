// The strategy for showing the model two photos when the endpoint takes one image per request.
// To change strategy (stack top and bottom, or send two images), change this file and the
// wording in the prompt that says which side is which. Nothing else knows how the pair is packed.
import { MAX_IMAGE_EDGE_PX } from "../config";
import { loadImage, toJpeg } from "./images";

/** Pickup photo on the LEFT, return photo on the RIGHT, long edge at most MAX_IMAGE_EDGE_PX. */
export async function stitchPair(before: string, after: string): Promise<string> {
  const [left, right] = await Promise.all([loadImage(before), loadImage(after)]);
  const height = Math.max(left.naturalHeight, right.naturalHeight);
  const leftWidth = (left.naturalWidth * height) / left.naturalHeight;
  const rightWidth = (right.naturalWidth * height) / right.naturalHeight;
  const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(leftWidth + rightWidth, height));

  return toJpeg(
    (ctx) => {
      ctx.drawImage(left, 0, 0, leftWidth * scale, height * scale);
      ctx.drawImage(right, leftWidth * scale, 0, rightWidth * scale, height * scale);
    },
    (leftWidth + rightWidth) * scale,
    height * scale,
  );
}
