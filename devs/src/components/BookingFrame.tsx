import React from "react";
import WholeNavbar from "./WholeNavbar";
import BottomNavbar from "./BottomNavbar";
import s from "../assets/css/booking.module.css";

interface Props {
  children: React.ReactNode;
}

// The frame every booking page sits in: the site's navbar above, its footer below.
const BookingFrame = ({ children }: Props) => {
  return (
    <>
      <div className="space" style={{ height: "135px", backgroundColor: "#f0f0f0", zIndex: -1000 }}></div>
      <WholeNavbar isFocused={false} />
      <div className={s.page}>{children}</div>
      <BottomNavbar />
    </>
  );
};

export default BookingFrame;
