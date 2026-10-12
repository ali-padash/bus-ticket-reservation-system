import { useLayoutEffect, useRef } from "react";
import { toLatinDigits } from "../util/Locale";
import { useLocale } from "../util/useLocale";

interface Props {
  // The text in Latin digits, which is also what `onChange` reports.
  value: string;
  onChange: (text: string) => void;
  type?: "text" | "tel";
  label: string;
}

// A text box for numbers. It shows the digits of the page's language (Persian digits in
// Persian, Latin digits in English), whichever keyboard typed them.
//
// The page keeps the text in Latin digits, the form the API takes, and this box only changes
// how it is shown. Because the box can show something other than what was typed, the browser
// would throw the caret to the end after each key. So the caret's place is noted when a key
// arrives and put back after React has drawn the new text; one digit replaces one digit, so
// the place is the same. (updated 2026-10-12)
const DigitInput = ({ value, onChange, type = "text", label }: Props) => {
  const { num } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caret.current === null) return;
    inputRef.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value]);

  return (
    <input
      ref={inputRef}
      type={type}
      placeholder={label}
      aria-label={label}
      value={num(value)}
      onChange={(e) => {
        caret.current = e.target.selectionStart;
        onChange(toLatinDigits(e.target.value));
      }}
    />
  );
};

export default DigitInput;
