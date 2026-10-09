"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import {
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { Button } from "./ui/button";

const SIZE = 260;

export function PhotoCropDialog({
  file,
  onClose,
  onSave,
}: {
  file: File | null;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [angle, setAngle] = useState(0);
  const [quarterTurns, setQuarterTurns] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    setZoom(1);
    setAngle(0);
    setQuarterTurns(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setOffset({ x: 0, y: 0 });
    setError("");
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const totalAngle = angle + quarterTurns * 90;
  const radians = (totalAngle * Math.PI) / 180;
  const cover =
    (SIZE * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)))) /
    Math.min(dimensions.width, dimensions.height);

  function save() {
    if (!image.current?.complete) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "white";
    context.fillRect(0, 0, 256, 256);
    context.translate(
      128 + (offset.x * 256) / SIZE,
      128 + (offset.y * 256) / SIZE,
    );
    context.rotate(radians);
    context.scale(
      (zoom * cover * 256 * (flipHorizontal ? -1 : 1)) / SIZE,
      (zoom * cover * 256 * (flipVertical ? -1 : 1)) / SIZE,
    );
    context.drawImage(
      image.current,
      -dimensions.width / 2,
      -dimensions.height / 2,
    );
    const result = canvas.toDataURL("image/jpeg", 0.78);
    if (result.length > 90_000) {
      setError("This photo is too detailed. Please choose another image.");
      return;
    }
    onSave(result);
  }

  return (
    <Dialog.Root
      open={!!file}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay photo-crop-overlay" />
        <Dialog.Content className="modal-card photo-crop-dialog">
          <Dialog.Close className="icon-button modal-close" aria-label="Close">
            <X size={20} />
          </Dialog.Close>
          <span className="eyebrow">PROFILE PHOTO</span>
          <Dialog.Title>Adjust your photo</Dialog.Title>
          <Dialog.Description>
            Drag to reposition, then adjust the zoom or rotation.
          </Dialog.Description>
          <div className="photo-crop-layout">
            <div
              className="photo-crop-stage"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = {
                  x: event.clientX,
                  y: event.clientY,
                  ox: offset.x,
                  oy: offset.y,
                };
              }}
              onPointerMove={(event) => {
                if (!drag.current) return;
                setOffset({
                  x: drag.current.ox + event.clientX - drag.current.x,
                  y: drag.current.oy + event.clientY - drag.current.y,
                });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
            >
              {url && (
                <img
                  ref={image}
                  src={url}
                  alt="Photo crop preview"
                  draggable={false}
                  onLoad={(event) =>
                    setDimensions({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })
                  }
                  style={{
                    width: dimensions.width * cover,
                    height: dimensions.height * cover,
                    marginLeft: (-dimensions.width * cover) / 2,
                    marginTop: (-dimensions.height * cover) / 2,
                    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${totalAngle}deg) scale(${zoom * (flipHorizontal ? -1 : 1)}, ${zoom * (flipVertical ? -1 : 1)})`,
                  }}
                />
              )}
              <span className="photo-crop-ring" aria-hidden="true" />
            </div>
            <div className="photo-crop-controls">
              <div
                className="photo-rotate-actions"
                role="group"
                aria-label="Rotate and flip photo"
              >
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Rotate anticlockwise 90 degrees"
                  onClick={() => {
                    setQuarterTurns((turns) => (turns + 3) % 4);
                    setOffset({ x: 0, y: 0 });
                  }}
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Rotate clockwise 90 degrees"
                  onClick={() => {
                    setQuarterTurns((turns) => (turns + 1) % 4);
                    setOffset({ x: 0, y: 0 });
                  }}
                >
                  <RotateCw size={20} />
                </button>
                <button
                  type="button"
                  className="icon-button photo-flip-first"
                  aria-label="Flip horizontally"
                  aria-pressed={flipHorizontal}
                  onClick={() => setFlipHorizontal((value) => !value)}
                >
                  <FlipHorizontal2 size={20} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Flip vertically"
                  aria-pressed={flipVertical}
                  onClick={() => setFlipVertical((value) => !value)}
                >
                  <FlipVertical2 size={20} />
                </button>
              </div>
              <label>
                Zoom{" "}
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </label>
              <label>
                <span className="photo-rotate-label">
                  Rotate <output>{angle}°</output>
                </span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="1"
                  value={angle}
                  onChange={(event) => setAngle(Number(event.target.value))}
                />
              </label>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="account-dialog-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Use photo
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
