"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: "md" | "lg";
};

export function Modal({ title, description, onClose, children, width = "md" }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 pt-[6vh] sm:p-6 sm:pt-[8vh]">
      <button
        aria-label="Close dialog"
        className="fixed inset-0 cursor-default bg-forest/40 backdrop-blur-[3px]"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={`relative z-10 w-full ${width === "lg" ? "max-w-3xl" : "max-w-xl"} overflow-hidden rounded-2xl border border-line bg-white shadow-float`}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-ink" id="dialog-title">{title}</h2>
            {description && <p className="mt-1.5 text-xs leading-5 text-muted">{description}</p>}
          </div>
          <button
            aria-label="Close dialog"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-stone-100 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </section>
    </div>
  );
}
