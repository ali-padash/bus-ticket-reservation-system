import Logo from "./Logo";
import s from "../assets/css/busLoading.module.css";

const BusLoading = () => {
  return (
    <>
      <div className={s.quarterCircle} style={{ margin: "10px" }}></div>
      <div className={s.quarterCircle} style={{ padding: "5px", margin: "5px", animationDuration: "2s" }}></div>
      <div className={s.quarterCircle} style={{ padding: "10px", animationDuration: "2.5s" }}></div>
      <Logo markOnly size={80} className={s.logo} />
    </>
  );
};

export default BusLoading;
