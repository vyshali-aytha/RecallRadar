import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-forest text-white shadow-sm hover:bg-forest/90 focus-visible:outline-forest",
  secondary:
    "bg-sage text-forest hover:bg-sage/75 focus-visible:outline-forest",
  ghost:
    "bg-transparent text-ink hover:bg-stone-100 focus-visible:outline-forest",
  outline:
    "border border-line bg-white text-ink hover:bg-stone-50 focus-visible:outline-forest",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 gap-2 px-3 text-xs",
  md: "min-h-11 gap-2.5 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      type={type}
      {...props}
    />
  );
}

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export function Card({
  padded = true,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white shadow-card ${padded ? "p-5 sm:p-6" : ""} ${className}`}
      {...props}
    />
  );
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "sage" | "amber" | "neutral" | "forest";
};

const badgeTones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  sage: "bg-sage text-forest",
  amber: "bg-amber-soft text-amber-ink",
  neutral: "bg-stone-100 text-muted",
  forest: "bg-forest text-white",
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${badgeTones[tone]} ${className}`}
      {...props}
    />
  );
}

const controlClasses =
  "min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted/70 focus:border-forest focus:ring-3 focus:ring-sage/60 disabled:bg-stone-50 disabled:text-muted";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`${controlClasses} ${className}`} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", ...props }: SelectProps) {
  return <select className={`${controlClasses} ${className}`} {...props} />;
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`${controlClasses} min-h-28 py-3 leading-6`}
      {...props}
    />
  );
}

type FormLabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function FormLabel({ className = "", ...props }: FormLabelProps) {
  return (
    <label
      className={`mb-2 block text-sm font-medium text-ink ${className}`}
      {...props}
    />
  );
}
