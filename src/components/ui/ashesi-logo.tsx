import Image, { ImageProps } from "next/image";
import { ComponentProps } from "react";

type LogoProps = ComponentProps<"div"> & {
  imgProps?: Partial<ImageProps>;
  lightClassName?: string;
  darkClassName?: string;
};

export function AshesiLogo({
  className,
  imgProps,
  lightClassName = "",
  darkClassName = "",
  ...props
}: LogoProps) {
  return (
    <div className={`relative ${className || ""}`} {...props}>
      {/* Light Mode Image */}
      <div className="block dark:hidden">
        <Image
          src="/images/ashesi-logo.png"
          alt="Ashesi University Logo"
          width={70}
          height={25}
          className={lightClassName || "h-auto w-[80px]"}
          {...imgProps}
        />
      </div>

      {/* Dark Mode Image */}
      <div className="hidden dark:block">
        <Image
          src="/images/ashesi-logo-dark.png"
          alt="Ashesi University Dark Logo"
          width={60}
          height={25}
          className={`ml-2 mt-2 ${darkClassName || "h-auto w-[70px]"}`}
          {...imgProps}
        />
      </div>
    </div>
  );
}

export function AshesiLogoBW({ className, imgProps, ...props }: LogoProps) {
  return (
    <div className={`relative ${className || ""}`} {...props}>
      <Image
        src="/images/ashesi-logo-dark.png"
        alt="Ashesi University Logo"
        width={60}
        height={25}
        className="h-auto w-[60px] invert dark:invert-0"
        {...imgProps}
      />
    </div>
  );
}
