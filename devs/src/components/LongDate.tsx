import { Fragment } from "react";
import { longDateParts } from "../util/Locale";
import { useLocale } from "../util/useLocale";

interface Props {
  date: Date;
}

// A date written out in the page's language and calendar: weekday, day, month and year, each
// in its own span so the places that show it can space them. (written 2026-10-12)
const LongDate = ({ date }: Props) => {
  const { lang } = useLocale();
  return (
    <>
      {longDateParts(lang, date).map((part, index) => (
        // The four parts never change order, so their position is a safe key.
        <Fragment key={index}>
          {index > 0 && " "}
          <span>{part}</span>
        </Fragment>
      ))}
    </>
  );
};

export default LongDate;
