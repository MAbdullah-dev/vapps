import Image from "next/image";

type BrandLogoProps = {
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

/** Dark-on-light asset for light UI; light-on-dark asset when `html.dark` (see globals.css). */
export default function BrandLogo({
  width,
  height,
  className,
  priority,
  alt = "Vie",
}: BrandLogoProps) {
  return (
    <>
      <Image
        data-brand-logo="light-mode"
        className={className}
        src="/Images/dark-logo.png"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
      />
      <Image
        data-brand-logo="dark-mode"
        className={className}
        src="/Images/white-logo.png"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
      />
    </>
  );
}
