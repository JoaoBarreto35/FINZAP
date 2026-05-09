import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./styles.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}