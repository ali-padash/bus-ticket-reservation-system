import s from "../assets/css/booking.module.css";
import { toPersianNum } from "../util/Function";

interface Props {
  // The step the buyer is on, from 1 (choosing a trip) to 5 (the ticket).
  current: number;
}

const steps = ["انتخاب سرویس", "انتخاب صندلی", "ثبت مشخصات", "اطلاعات سفر", "صدور بلیط"];

const BookingSteps = ({ current }: Props) => {
  return (
    <ol className={s.steps}>
      {steps.map((label, index) => {
        const step = index + 1;
        const classes = [step <= current ? s.stepReached : "", step < current ? s.stepPassed : ""].join(" ");
        return (
          <li key={label} className={classes}>
            <span className={s.stepNumber}>{toPersianNum(step)}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
};

export default BookingSteps;
