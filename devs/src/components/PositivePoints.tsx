import "../assets/css/positivePoints.css"
import CardWithIconVerticall from './CardWithIconVerticall'
import { useLocale } from "../util/useLocale"

const PositivePoints = () => {
    const { t, dir } = useLocale();
    return (
        <div className="positive-points">
            <h1>{t("trust.headingLine1")}</h1>
            <h4>{t("trust.headingLine2")}</h4>
            <div className='seperator-line-pp' />
            <p>{t("trust.text")}</p>
            {/* The grid keeps one order of cards in both languages (see positivePoints.css), so
                each card is told the direction of its own text. (updated 2026-10-12) */}
            <div className='cards-pp'>
                <CardWithIconVerticall dir={dir} title={t("trust.supportTitle")} icon='headphone'>{t("trust.supportText")}</CardWithIconVerticall>
                <CardWithIconVerticall dir={dir} title={t("trust.companiesTitle")} icon='diamond'>{t("trust.companiesText")}</CardWithIconVerticall>
                <CardWithIconVerticall dir={dir} title={t("trust.discountsTitle")} icon='discount'>{t("trust.discountsText")}</CardWithIconVerticall>
                <CardWithIconVerticall dir={dir} title={t("trust.buyingTitle")} icon='basket'>{t("trust.buyingText")}</CardWithIconVerticall>
            </div>
        </div>
    )
}

export default PositivePoints
