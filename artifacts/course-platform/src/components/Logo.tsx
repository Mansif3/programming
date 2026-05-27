type Props = {
  size?: number;
  className?: string;
  src?: string;
};

export default function Logo({ size = 32, className = "", src }: Props) {
  return (
    <img
      src={src || "/logo.png"}
      alt="Logo"
      width={size}
      height={size}
      className={`shrink-0 select-none object-contain rounded-lg ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
