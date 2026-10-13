import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import f from "../assets/css/findTicket.module.css";
import BookingFrame from "../components/BookingFrame";
import DigitInput from "../components/DigitInput";
import Icon from "../components/Icon";
import { errorTextKey, lookupTicket } from "../util/FetchFunction";
import { savePhone } from "../util/TicketStorage";
import { isValidPhone, isValidTicketCode } from "../util/Validation";
import { useLocale } from "../util/useLocale";

const NOT_FOUND = "errors.codes.ticket_not_found";

// The notes and the questions, by the names of their texts under `findTicket` in the text files.
const notes = ["noteKeepCode", "noteHold", "noteCancel", "noteDemo"];
const questions = ["notFound", "phone", "code", "hold"];

// "Find a ticket", at /<language>/tickets: the visitor types the 12-digit ticket code and the
// buyer's mobile number, and the page opens that ticket.
//
// Both values are asked for together because that is how the API opens a ticket. A search by
// mobile number alone does not exist, on purpose: it would show a person's tickets to anyone
// who knows their number.
//
// The page only checks that the pair opens a ticket. It then remembers the phone for this tab
// and moves to /<language>/tickets/<code>, which already knows what to show for a paid ticket,
// a hold, and a hold that ran out. The phone travels in the request body and in
// sessionStorage, never in the address. (written 2026-10-13)
function FindTicketPage() {
  const { t, path } = useLocale();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  // Where the sentence for a failed search is in the text files, so it follows the language.
  const [problem, setProblem] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    // The menu link can be pressed far down another page; this page starts at its top.
    window.scrollTo(0, 0);
    // A search still on its way when the visitor leaves is dropped.
    return () => request.current?.abort();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    // A code copied as "4430 6196 3810" is the same code.
    const cleanCode = code.replace(/\s/g, "");
    const cleanPhone = phone.trim();
    const codeOk = isValidTicketCode(cleanCode);
    const phoneOk = isValidPhone(cleanPhone);
    setCodeInvalid(!codeOk);
    setPhoneInvalid(!phoneOk);
    setProblem(null);
    if (!codeOk || !phoneOk) return;

    const abortController = new AbortController();
    request.current = abortController;
    setBusy(true);
    lookupTicket(cleanCode, cleanPhone, abortController.signal)
      .then(() => {
        savePhone(cleanCode, cleanPhone);
        navigate(path(`/tickets/${cleanCode}`));
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        // The API gives one answer for a wrong code and for a wrong phone, and so does the page.
        setProblem(errorTextKey(err));
        setBusy(false);
      });
  };

  const submitText = busy
    ? t("findTicket.searching")
    : problem && problem !== NOT_FOUND
      ? t("common.retry")
      : t("findTicket.submit");

  return (
    <BookingFrame>
      <div className={f.wrap}>
        <h1 className={f.title}>{t("findTicket.title")}</h1>
        <p className={f.intro}>{t("findTicket.intro")}</p>

        <form className={`${s.card} ${f.formCard}`} noValidate onSubmit={submit}>
          <div className={f.fields}>
            <label className={`${s.field} ${codeInvalid ? s.invalid : ""}`}>
              <span className={f.fieldLabel}>{t("findTicket.codeLabel")}</span>
              <DigitInput
                name="ticket-code"
                autoComplete="off"
                inputMode="numeric"
                label={t("findTicket.codePlaceholder")}
                value={code}
                onChange={(text) => {
                  setCode(text);
                  setCodeInvalid(false);
                  setProblem(null);
                }}
              />
              {codeInvalid && <p className={s.fieldError}>{t("errors.fields.TicketCode")}</p>}
            </label>
            <label className={`${s.field} ${phoneInvalid ? s.invalid : ""}`}>
              <span className={f.fieldLabel}>{t("passengers.phone")}</span>
              <DigitInput
                type="tel"
                name="tel"
                autoComplete="tel-national"
                label={t("findTicket.phonePlaceholder")}
                value={phone}
                onChange={(text) => {
                  setPhone(text);
                  setPhoneInvalid(false);
                  setProblem(null);
                }}
              />
              {phoneInvalid && <p className={s.fieldError}>{t("errors.fields.ContactPhone")}</p>}
            </label>
          </div>
          {problem && (
            <div role="alert" className={`${s.notice} ${s.errorNotice} ${f.message}`}>
              {t(problem)}
            </div>
          )}
          <div className={f.submitRow}>
            <button type="submit" className={`${s.primary} ${f.submit}`} disabled={busy}>
              {submitText}
            </button>
          </div>
        </form>

        <section className={`${s.card} ${f.info}`}>
          <h2>
            <Icon name="ticket-alt" />
            {t("findTicket.aboutTitle")}
          </h2>
          <p>{t("findTicket.aboutText")}</p>
          <hr className={f.rule} />
          <h2>
            <Icon name="exclamation-circle" className={f.warn} />
            {t("findTicket.notesTitle")}
          </h2>
          <ul className={f.notes}>
            {notes.map((note) => (
              <li key={note}>{t(`findTicket.${note}`)}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={f.faqTitle}>{t("findTicket.faqTitle")}</h2>
          {/* <details> is the browser's own open-and-close box: it works with the keyboard and
              with screen readers, and the browser's "find in page" can open it, with no state
              kept here. Each question opens and closes on its own. */}
          {questions.map((question) => (
            <details key={question} className={`${s.card} ${f.question}`}>
              <summary>
                <span>{t(`findTicket.${question}Question`)}</span>
                <Icon name="chevron-down" className={f.chevron} />
              </summary>
              <p className={f.answer}>{t(`findTicket.${question}Answer`)}</p>
            </details>
          ))}
        </section>
      </div>
    </BookingFrame>
  );
}

export default FindTicketPage;
