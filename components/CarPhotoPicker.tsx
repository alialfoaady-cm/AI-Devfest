"use client";

// The car's listing photo: take it with the camera, right in the photo's own frame, or choose a file.
// The frame is the viewfinder, so the picture you line up is the picture borrowers will see.

import { Camera, Image as ImageIcon, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { fileToPhoto, shrinkToPhoto } from "@/lib/inspection/images";
import { CarPhoto, Notice, btnQuiet } from "./ui";

const CORNERS = [
  "left-3 top-3 rounded-tl-lg border-l-2 border-t-2",
  "right-3 top-3 rounded-tr-lg border-r-2 border-t-2",
  "bottom-3 left-3 rounded-bl-lg border-b-2 border-l-2",
  "bottom-3 right-3 rounded-br-lg border-b-2 border-r-2",
];

export function CarPhotoPicker({ photo, model, onChange }: { photo?: string; model: string; onChange: (photo: string) => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const phoneCamera = useRef<HTMLInputElement>(null);

  // Show the live picture while the camera is open, and always switch the camera off afterwards.
  useEffect(() => {
    if (!stream) return;
    if (video.current) video.current.srcObject = stream;
    return () => stream.getTracks().forEach((track) => track.stop());
  }, [stream]);

  async function openCamera() {
    setError("");
    // Browsers only give a page the live camera over https or on localhost. A phone that opened
    // the site by the laptop's address gets its own camera app instead, through the file input.
    if (!navigator.mediaDevices?.getUserMedia) return phoneCamera.current?.click();
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false }));
    } catch {
      setError("The camera did not open. Allow camera access for this site, or choose a photo instead.");
    }
  }

  function takePhoto() {
    const frame = video.current;
    if (!frame?.videoWidth) return; // the first frame has not arrived yet
    onChange(shrinkToPhoto(frame, frame.videoWidth, frame.videoHeight));
    setStream(null);
  }

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ""; // so the same file can be picked again
    if (!file) return;
    try {
      setError("");
      setStream(null);
      onChange(await fileToPhoto(file));
    } catch {
      setError("That photo could not be read. Try another one.");
    }
  }

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface">
        {stream ? (
          <>
            <video ref={video} autoPlay playsInline muted aria-label="Camera preview" className="size-full bg-black object-cover" />
            {CORNERS.map((corner) => (
              <span key={corner} aria-hidden className={`pointer-events-none absolute size-7 border-white/90 ${corner}`} />
            ))}
            <button
              type="button"
              autoFocus
              aria-label="Take photo"
              onClick={takePhoto}
              className="pop absolute bottom-4 left-1/2 size-16 -translate-x-1/2 rounded-full border-4 border-white bg-green outline-offset-4 transition-[scale] duration-150 ease-out active:scale-90"
            />
          </>
        ) : (
          <CarPhoto photo={photo} model={model} className="size-full" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={btnQuiet} onClick={stream ? () => setStream(null) : openCamera}>
          {stream ? <X size={20} aria-hidden /> : <Camera size={20} aria-hidden />}
          {stream ? "Close camera" : photo ? "Retake" : "Take a photo"}
        </button>
        <label className={`${btnQuiet} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink`}>
          <ImageIcon size={20} aria-hidden />
          {photo ? "Choose another" : "Choose a photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={pick} />
        </label>
      </div>
      {/* Only ever opened by openCamera, on phones without the live camera. */}
      <input ref={phoneCamera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />

      {error && (
        <div className="mt-3">
          <Notice>{error}</Notice>
        </div>
      )}
    </div>
  );
}
