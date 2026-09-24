import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium select-none transition-[transform,opacity,background-color] duration-(--duration-fast) ease-(--ease-out-soft) active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";

const VARIANT: Record<Variant, string> = {
  primary: "bg-action text-action-ink hover:opacity-90",
  secondary: "border border-rule bg-sheet text-ink hover:bg-sheet-sunk",
  ghost: "text-ink-soft hover:text-ink hover:bg-sheet-sunk",
  success: "bg-success text-sheet hover:opacity-90",
  danger: "bg-danger text-sheet hover:opacity-90",
};

const SIZE = { md: "h-11 px-5 text-[15px]", lg: "h-13 px-7 text-base", icon: "h-11 w-11" } as const;

export function buttonClass(variant: Variant = "primary", size: keyof typeof SIZE = "md", extra = "") {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${extra}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZE };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest} />;
});

/** Подсказка горячей клавиши: только для точного указателя (мышь), на тач-экранах скрыта. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="hidden rounded-md border border-current/25 px-1.5 py-0.5 font-sans text-[11px] leading-none opacity-70 [@media(pointer:fine)]:inline-block">
      {children}
    </kbd>
  );
}
