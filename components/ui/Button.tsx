import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonAsButton = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  href?: undefined;
};

type ButtonAsLink = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  href: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

const isLinkProps = (props: ButtonProps): props is ButtonAsLink =>
  typeof props.href === "string";

const Button = (props: ButtonProps) => {
  const { variant = "primary", className = "" } = props;
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition shadow-sm";
  const variants = {
    primary: "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black",
    secondary:
      "border border-gray-200/80 bg-white/70 text-gray-900 backdrop-blur hover:border-gray-300 dark:border-gray-700 dark:bg-white/5 dark:text-white",
  };

  const classes = `${base} ${variants[variant]} ${className}`.trim();

  if (isLinkProps(props)) {
    const { href, className: _className, variant: _variant, ...rest } = props;
    return <a href={href} className={classes} {...rest} />;
  }

  const { className: _className, variant: _variant, href: _href, ...rest } =
    props;
  return <button className={classes} {...rest} />;
};

export default Button;
