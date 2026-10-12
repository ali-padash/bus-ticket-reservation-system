import '../assets/css/twoColumns.css'
import CardWithIcon from './CardWithIcon'
import ExpandableCard from './ExpandableCard'
import { useLocale } from '../util/useLocale'

const questions = ["extraCost", "prices", "vip", "children", "pets", "cancel", "print"];

const TwoColumns = () => {
    const { t } = useLocale();
    return (
        <div className="two-columns">
            <div className='grid-three-rows'>
                <CardWithIcon title={t("info.printTitle")} icon="paper">{t("info.printText")}</CardWithIcon>
                <CardWithIcon title={t("info.trackTitle")} icon="magnifier">{t("info.trackText")}</CardWithIcon>
                <CardWithIcon title={t("info.refundTitle")} icon="circle-dollar">{t("info.refundText")}</CardWithIcon>
            </div>
            <div className='bus-common-questions' style={{ overflowY: 'scroll' }}>
                <h1>{t("faq.heading")}</h1>
                <div className='seperator-line-bcq'></div>
                {questions.map((question) => (
                    <ExpandableCard key={question} title={t(`faq.${question}Question`)}>{t(`faq.${question}Answer`)}</ExpandableCard>
                ))}
                <button className='more'>
                    <a>{t("faq.more")}</a>
                </button>
            </div>
        </div>
    )
}

export default TwoColumns
