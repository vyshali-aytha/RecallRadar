import { Icon } from "@/components/ui/icon";

type RowActionsProps = {
  label: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function ActionButton({
  label,
  icon,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: "arrow-up-right" | "edit" | "trash";
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      aria-label={`${label} ${icon === "arrow-up-right" ? "details" : icon === "edit" ? "record" : "record"}`}
      className={`flex size-8 items-center justify-center rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest ${destructive ? "text-muted hover:bg-red-50 hover:text-red-700" : "text-muted hover:bg-sage/55 hover:text-forest"}`}
      onClick={onClick}
      title={`${label} ${icon === "arrow-up-right" ? "details" : icon === "edit" ? "record" : "record"}`}
      type="button"
    >
      {icon === "arrow-up-right" ? <Icon name={icon} size={15} /> : icon === "edit" ? (
        <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 24 24" width="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
          <path d="m16 4 4 4M4 20l4.5-1 10-10a2.12 2.12 0 0 0-3-3l-10 10L4 20Z" />
        </svg>
      ) : (
        <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 24 24" width="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
          <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
        </svg>
      )}
    </button>
  );
}

export function RowActions({ label, onView, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton icon="arrow-up-right" label={`View ${label}`} onClick={onView} />
      <ActionButton icon="edit" label={`Edit ${label}`} onClick={onEdit} />
      <ActionButton destructive icon="trash" label={`Delete ${label}`} onClick={onDelete} />
    </div>
  );
}
