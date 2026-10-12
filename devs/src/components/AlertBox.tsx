import { ReactNode, useEffect, useRef, useState } from "react";
import s from "../assets/css/alertBox.module.css";

interface Props {
  children?: ReactNode;
  title?: string;
  showCondition: boolean;
  setShowCondition: (showCondition: boolean) => void;
}

const AlertBox = ({ children, title, showCondition, setShowCondition }: Props) => {
  const [render, setRender] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setShowCondition(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowCondition]);
  useEffect(() => {
    // This timer is for a CSS animation: the box fades and slides in through transitions on
    // the `show` class (alertBox.module.css). The class is added a moment after the box is
    // first drawn, because a transition only plays when the browser has drawn the starting
    // look first. (updated 2026-10-12)
    const timer = setTimeout(() => setRender(showCondition), 50);
    return () => clearTimeout(timer);
  }, [showCondition]);
  return (
    <div className={s.blackCover + (render ? " " + s.show : "")}>
      <div className={s.alertBox + (render ? " " + s.show : "")} ref={ref}>
        <i className={s.cross} onClick={() => setShowCondition(false)} />
        <h1>{title}</h1>
        <div className={s.content}>{children}</div>
      </div>
    </div>
  );
};

export default AlertBox;
