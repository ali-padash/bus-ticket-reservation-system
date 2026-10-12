import { useLayoutEffect, useRef } from "react";
import { toPersianNum } from "../util/Function";
import { toLatinDigits } from "../util/Validation";

interface Props {
  value: string;
  // Called with the text already turned into Persian digits.
  onChange: (text: string) => void;
  type?: "text" | "tel";
  label: string;
}

// A text box that shows every digit as a Persian one, whichever keyboard typed it.
//
// The page keeps the Persian text; it is turned back into Latin digits only when it is checked
// or sent to the API. Because the box shows something other than what was typed, the browser
// would throw the caret to the end after each key. So the caret's place is noted when a key
// arrives and put back after React has drawn the new text; one digit replaces one digit, so
// the place is the same. (written 2026-10-12)
const DigitInput = ({ value, onChange, type = "text", label }: Props) => {
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
      value={value}
      onChange={(e) => {
        caret.current = e.target.selectionStart;
        onChange(toPersianNum(toLatinDigits(e.target.value)) ?? "");
      }}
    />
  );
};

export default DigitInput;
