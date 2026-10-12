import { useEffect, useState } from "react";
import s from "../assets/css/refundBox.module.css";
import RefundItem from "./RefundItem";
import AlertBox from "./AlertBox";
import { useLocale } from "../util/useLocale";

const RefundBox = () => {
  const { t, num } = useLocale();
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

  return screenWidth < 1024 ? (
    <>
      <button className={s.seeCondition} onClick={() => setShowCondition(!showCondition)}>
        {t("refund.see")}
      </button>
      {render && (
        <AlertBox title={t("refund.title")} setShowCondition={setShowCondition} showCondition={showCondition}>
          <p>{t("refund.intro")}</p>
          <div className={s.cancelationCondition}>
            <RefundItem title={num(10)}>{t("refund.sampleEarly")}</RefundItem>
            <RefundItem title={num(50)}>{t("refund.sampleLate")}</RefundItem>
          </div>
        </AlertBox>
      )}
    </>
  ) : (
    <div className={s.cancelationCondition}>
      <span>{t("refund.title")}</span>
      <div className={s.divider} />
      <RefundItem title={num(10)}>{t("refund.sampleEarly")}</RefundItem>
      <RefundItem title={num(50)}>{t("refund.sampleLate")}</RefundItem>
    </div>
  );
};

export default RefundBox;
