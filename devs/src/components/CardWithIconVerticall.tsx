import React from "react";
import "../assets/css/cardWithIconVerticall.css";
import { LineIcon, LineIconName } from "./Icon";

interface Props {
  title: string;
  icon: LineIconName;
  dir: "rtl" | "ltr";
  children: React.ReactNode;
}

const CardWithIconVerticall = ({ title, icon, dir, children }: Props) => {
  return (
    <div className="card-with-icon-verticall">
      <i className={`icon ${icon}`}>
        <LineIcon name={icon} />
      </i>
      <div className="card-with-icon-verticall-content" dir={dir}>
        <h4>{title}</h4>
        <p>{children}</p>
      </div>
    </div>
  );
};

export default CardWithIconVerticall;
