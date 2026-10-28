// Small inline icons (stroke style) so the app needs no icon package yet.
type IconProps = React.ComponentProps<"svg">;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function AnchorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 22V8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      <circle cx="12" cy="5" r="3" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.5 0 8.34 2.95 9.94 7a10.8 10.8 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A10.76 10.76 0 0 0 2.06 12c1.6 4.05 5.44 7 9.94 7a10.4 10.4 0 0 0 5.39-1.61" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="m2 2 20 20" />
    </Icon>
  );
}

export function SpinnerIcon({ className, ...props }: IconProps) {
  return (
    <Icon className={`animate-spin ${className ?? ""}`} {...props}>
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </Icon>
  );
}
