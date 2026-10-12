import RefundBox from "./RefundBox";
import BusSchema from "./BusSchema";
import Legend from "./Legend";
import s from "../assets/css/busDetails.module.css";
import { useLocale } from "../util/useLocale";
import Icon from "./Icon";

interface Props {
  tripID: number;
  retry: () => void;
}

// A made-up bus drawn blurred behind the error message, so the box does not look empty.
const placeholderLayout = [
  [1, 4, 7, 10, 13, null, null, 18, 21, 24, 27, 30],
  [2, 5, 8, 11, 14, null, null, 19, 22, 25, 28, 31],
  [null, null, null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null],
  [3, 6, 9, 12, 15, 16, 17, 20, 23, 26, 29, 32],
];

const BusSchemaError = ({ tripID, retry }: Props) => {
  const { t } = useLocale();
  return (
    <div style={{ marginTop: "40px" }}>
      <div className={s.dividerLine} />
      <div className={s.cover + " " + s.errorCover}>
        <Icon name="times" />
        <h1>{t("seatMap.errorTitle")}</h1>
        <button className={s.retryButton} onClick={retry}>
          <span>{t("common.retry")}</span>
          <Icon name="sync-alt" />
        </button>
      </div>
      <div className={s.busInformation}>
        <BusSchema layout={placeholderLayout} seats={[]} blur={true} />
        <Legend className={s.legend} />
      </div>
      <RefundBox tripID={tripID} />
    </div>
  );
};

export default BusSchemaError;
