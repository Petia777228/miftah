"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode } from "react";
import { buttonClass } from "./button";

/** Общие классы модальных окон (Base UI Dialog и AlertDialog). */
export const BACKDROP =
  "fixed inset-0 bg-ink/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 print:hidden";
export const POPUP =
  "fixed top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-rule bg-sheet p-6 shadow-xl transition-[scale,opacity] duration-150 ease-out-soft data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 print:hidden";

/** Подтверждение опасного действия. */
export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = "Отмена",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={BACKDROP} />
        <AlertDialog.Popup className={POPUP}>
          <AlertDialog.Title className="font-serif text-xl font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-ink-soft">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Close className={buttonClass("secondary")}>{cancelLabel}</AlertDialog.Close>
            <button type="button" onClick={onConfirm} className={buttonClass("danger")}>
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
