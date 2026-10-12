import { Trans } from "react-i18next";
import { shortDate } from "../util/Locale";
import { ServiceResponse } from "../util/Models";
import { useLocale } from "../util/useLocale";

interface Props {
  data: ServiceResponse;
  minDepartureTime: string;
  maxDepartureTime: string;
}

// "4 trips found from Rasht to Tehran on ...". The whole sentence is one text with <b> marks
// in it, because the order of its parts differs between the languages. (updated 2026-10-12)
const ServicesDisplayTitle = ({ data, minDepartureTime, maxDepartureTime }: Props) => {
  const { lang, t, num, name } = useLocale();
  return (
    <h1>
      <Trans
        t={t}
        i18nKey="results.found"
        count={data.Items.length}
        values={{
          number: num(data.Items.length),
          origin: name(data.OriginPersianName, data.OriginEnglishName),
          destination: name(data.DestinationPersianName, data.DestinationEnglishName),
          date: shortDate(lang, data.Date),
          from: num(minDepartureTime),
          to: num(maxDepartureTime),
        }}
        components={{ b: <strong /> }}
      />
    </h1>
  );
};

export default ServicesDisplayTitle;
