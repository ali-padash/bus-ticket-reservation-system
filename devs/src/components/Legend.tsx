import Seat from "./Seat";

interface Props {
  className: string;
  // The booking page also explains the green "your choice" seat.
  showSelected?: boolean;
}

const Legend = ({ className, showSelected = false }: Props) => {
  return (
    <div className={className}>
      <div>
        <Seat size="20px" seatNumber={null} status="M" /> خریداری شده برای آقایان
      </div>
      <div>
        <Seat size="20px" seatNumber={null} status="F" /> خریداری شده برای بانوان
      </div>
      <div>
        <Seat size="20px" seatNumber={null} status="N" /> غیر قابل خرید
      </div>
      {showSelected && (
        <div>
          <Seat size="20px" seatNumber={null} status="S" /> انتخاب شما
        </div>
      )}
      <div>
        <Seat size="20px" seatNumber={null} status={null} /> قابل خرید
      </div>
    </div>
  );
};

export default Legend;
