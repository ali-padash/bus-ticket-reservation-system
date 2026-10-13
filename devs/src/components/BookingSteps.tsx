import s from "../assets/css/booking.module.css";
import { useLocale } from "../util/useLocale";

interface Props {
  // The step the buyer is on, from 1 (choosing a trip) to 5 (the ticket).
  current: number;
}

// The names of the five steps in the text files, under `booking`.
const steps = ["stepTrip", "stepSeats", "stepPassengers", "stepReview", "stepTicket"];

const BookingSteps = ({ current }: Props) => {
  const { t, num } = useLocale();
  return (
    <>
      <ol className={s.steps}>
      {steps.map((name, index) => {
        const step = index + 1;
        const classes = [step <= current ? s.stepReached : "", step < current ? s.stepPassed : ""].join(" ");
        return (
          <li key={name} className={classes}>
            <span className={s.stepNumber}>{num(step)}</span>
            <span className={s.stepName}>{t(`booking.${name}`)}</span>
          </li>
        );
      })}
      </ol>
      {/* A phone has no room for five names in a row, so there the line shows the numbers only
          and this sentence names the current step. The stylesheet shows one or the other.
          (added 2026-10-13) */}
      <p className={s.stepCaption}>
        {t("booking.progress", { current: num(current), total: num(steps.length), name: t(`booking.${steps[current - 1]}`) })}
      </p>
    </>
  );
};

export default BookingSteps;
