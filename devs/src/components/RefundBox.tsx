import { useEffect, useState } from "react";
import s from "../assets/css/refundBox.module.css";
import RefundItem from "./RefundItem";
import AlertBox from "./AlertBox";
import { useLocale } from "../util/useLocale";
import { useRefundRules } from "../util/useRefundRules";

interface Props {
  tripID: number;
}

// The refund terms of one trip, beside its seat map. The lines are the trip's own terms from
// the API, the same ones the review step shows. Nothing is drawn until they have arrived.
// (updated 2026-10-12)
const RefundBox = ({ tripID }: Props) => {
  const { t } = useLocale();
  const lines = useRefundRules(tripID);
  const [showCondition, setShowCondition] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [render, setRender] = useState<boolean>(false);
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (showCondition) {
      setRender(true);
      return;
    }
    // This timer waits for a CSS animation: the popup takes 0.5s to fade out
    // (opacity in alertBox.module.css). It is removed from the page only after that.
    // (updated 2026-10-12)
    const timer = setTimeout(() => setRender(false), 600);
    return () => clearTimeout(timer);
  }, [showCondition])

  if (lines.length === 0) return null;

  // The same limit as the CSS (max-width: 1024px), where the bus drawing takes the full width
  // and leaves no room beside it: the terms then open from a button. (updated 2026-10-12)
  return screenWidth <= 1024 ? (
    <>
      <button className={s.seeCondition} onClick={() => setShowCondition(!showCondition)}>
        {t("refund.see")}
      </button>
      {render && (
        <AlertBox title={t("refund.title")} setShowCondition={setShowCondition} showCondition={showCondition}>
          <p>{t("refund.intro")}</p>
          <div className={s.cancelationCondition}>
            {lines.map((line) => (
            <RefundItem key={line.key} title={line.percent}>
              {line.text}
            </RefundItem>
            ))}
          </div>
        </AlertBox>
      )}
    </>
  ) : (
    <div className={s.cancelationCondition}>
      <span>{t("refund.title")}</span>
      <div className={s.divider} />
      {lines.map((line) => (
      <RefundItem key={line.key} title={line.percent}>
        {line.text}
      </RefundItem>
      ))}
    </div>
  );
};

export default RefundBox;
