import localFont from "next/font/local";

export const satoshi = localFont({
  src: [
    {
      path: "../fonts/Satoshi-Variable.ttf",
      style: "normal",
    },
    {
      path: "../fonts/Satoshi-VariableItalic.ttf",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
});
