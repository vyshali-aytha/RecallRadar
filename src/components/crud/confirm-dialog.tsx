"use client";

import { Button } from "@/components/ui/primitives";
import { Modal } from "@/components/crud/modal";

type ConfirmDialogProps = {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  blockedReason?: string;
  pending?: boolean;
};

export function ConfirmDialog({
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = "Delete record",
  blockedReason,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <Modal description="Review this action before continuing." onClose={onClose} title={title}>
      <p className="text-sm leading-6 text-muted">{description}</p>
      {blockedReason && (
        <div className="mt-4 rounded-xl border border-amber/25 bg-amber-soft/55 px-3.5 py-3 text-xs leading-5 text-amber-ink" role="alert">
          {blockedReason}
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Button onClick={onClose} variant="outline">Cancel</Button>
        <Button disabled={Boolean(blockedReason) || pending} onClick={onConfirm} variant="danger">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
