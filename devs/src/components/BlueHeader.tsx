import Card from "./Card";
import "../assets/css/blueHeader.css";
import { useLocale } from "../util/useLocale";

const BlueHeader = () => {
  const { t } = useLocale();
  return (
    <div className="blue-header">
      <h1>
        {t("steps.headingLine1")}
        <br /> {t("steps.headingLine2")}
      </h1>
      <div className="separator-line-bold"></div>
      <div className="texts-container">
        <Card iconClass="smile" title={t("steps.codeTitle")}>
          {t("steps.codeText")}
        </Card>
        <Card iconClass="sit" title={t("steps.seatTitle")}>
          {t("steps.seatText")}
        </Card>
        <Card iconClass="bus" title={t("steps.busTitle")}>
          {t("steps.busText")}
        </Card>
        <Card iconClass="direction" title={t("steps.routeTitle")}>
          {t("steps.routeText")}
        </Card>
      </div>
    </div>
  );
};

export default BlueHeader;
