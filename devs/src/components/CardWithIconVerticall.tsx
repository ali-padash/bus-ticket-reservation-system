import React from "react";
import "../assets/css/cardWithIconVerticall.css";

interface Props {
  title: string;
  icon: string;
  dir: "rtl" | "ltr";
  children: React.ReactNode;
}

const CardWithIconVerticall = ({ title, icon, dir, children }: Props) => {
  return (
    <div className="card-with-icon-verticall">
      <i className={`icon ${icon}`}></i>
      <div className="card-with-icon-verticall-content" dir={dir}>
        <h4>{title}</h4>
        <p>{children}</p>
      </div>
    </div>
  );
};

export default CardWithIconVerticall;
