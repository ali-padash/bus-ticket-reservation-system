import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import s from "../assets/css/booking.module.css";
import BookingFrame from "../components/BookingFrame";
import BookingSteps from "../components/BookingSteps";
import TripSummary from "../components/TripSummary";
import TicketReview from "../components/TicketReview";
import FakeBank from "../components/FakeBank";
import TicketIssued from "../components/TicketIssued";
import TicketFailed from "../components/TicketFailed";
import PhonePrompt from "../components/PhonePrompt";
import { Ticket } from "../util/Models";
import { ApiError, cancelTicket, errorTextKey, lookupTicket, payTicket } from "../util/FetchFunction";
import { readPhone, savePhone } from "../util/TicketStorage";
import { toLatinDigits } from "../util/Locale";
import { useLocale } from "../util/useLocale";

interface Props {
  // True on /<language>/tickets/<code>/payment, the demo bank page.
  bank?: boolean;
}

// Steps 4 and 5 of buying, at /<language>/tickets/<code>: the review with its countdown, the demo bank,
// and then either the ticket or the failure page.
//
// The page keeps almost nothing of its own. Every time it opens it asks the server for the
// ticket (code from the address, phone from this tab's sessionStorage) and shows whatever the
// ticket's Status says. That is why a refresh loses nothing. (written 2026-10-12)
function TicketPage({ bank = false }: Props) {
  // A code typed into the address with Persian digits is read as the same code.
  const code = toLatinDigits(useParams().code ?? "");
  const navigate = useNavigate();
  const { t, path, name, text } = useLocale();
  const [phone, setPhone] = useState(() => readPhone(code));

  const [ticket, setTicket] = useState<Ticket | null>(null);
  // The moment (on this computer's clock) the ticket above arrived. The countdown is the
  // server's SecondsLeft minus the time that has passed since then, so only the *length* of
  // time is measured here and a wrong clock on the visitor's computer does no harm.
  const [receivedAt, setReceivedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [lookupProblem, setLookupProblem] = useState<"not_found" | "failed" | null>(null);
  // Goes up by one each time the ticket should be asked for again.
  const [lookupVersion, setLookupVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  // Where the sentence for a failed "pay" or "cancel" is in the text files.
  const [actionError, setActionError] = useState<string | null>(null);
  // True from the moment "pay" succeeds until this page is left or refreshed. It decides
  // whether a paid ticket is shown as the end of a purchase or simply as a ticket. It is plain
  // state on purpose: the router's own navigation state is kept in the browser's history and
  // would survive a refresh, and the address or sessionStorage would outlive the moment even
  // longer. The two ticket routes draw this same component in the same place, so the state is
  // still here after the move from /payment back to /tickets/<code>. (written 2026-10-13)
  const [justPaid, setJustPaid] = useState(false);

  const receive = (newTicket: Ticket) => {
    setTicket(newTicket);
    setReceivedAt(Date.now());
    setNow(Date.now());
  };

  useEffect(() => {
    if (!phone) return;
    const abortController = new AbortController();
    setLookupProblem(null);
    lookupTicket(code, phone, abortController.signal)
      .then((newTicket) => {
        // Only a phone that really opens the ticket is remembered for this tab.
        savePhone(code, phone);
        receive(newTicket);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setLookupProblem(err instanceof ApiError && err.code === "ticket_not_found" ? "not_found" : "failed");
      });
    return () => abortController.abort();
  }, [code, phone, lookupVersion]);

  const onHold = ticket?.Status === "reserved";
  const secondsPassed = Math.max(0, Math.floor((now - receivedAt) / 1000));
  const secondsLeft = ticket && onHold ? Math.max(0, ticket.SecondsLeft - secondsPassed) : 0;
  const timeUp = onHold && secondsLeft === 0;

  // While the seats are on hold, redraw once a second so the countdown moves.
  useEffect(() => {
    if (!onHold) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [onHold]);

  // When the countdown reaches zero, ask the server once more: it is the judge of whether
  // the hold has really ended.
  useEffect(() => {
    if (timeUp) setLookupVersion((version) => version + 1);
  }, [timeUp]);

  // Both buttons of the demo bank work the same way: call the API, show the ticket it
  // returns, and go back to /tickets/<code>, which then shows the ticket or the failure page.
  const finish = (action: (code: string, phone: string) => Promise<Ticket>) => {
    setBusy(true);
    setActionError(null);
    action(code, phone)
      .then((newTicket) => {
        receive(newTicket);
        setJustPaid(action === payTicket);
        navigate(path(`/tickets/${code}`), { replace: true });
      })
      .catch((err) => {
        const settled = ["hold_expired", "ticket_cancelled", "ticket_already_paid"];
        if (err instanceof ApiError && settled.includes(err.code)) {
          // The ticket's fate was already decided. Read it again and show what it is.
          setLookupVersion((version) => version + 1);
          navigate(path(`/tickets/${code}`), { replace: true });
        } else {
          setActionError(errorTextKey(err));
        }
      })
      .finally(() => setBusy(false));
  };

  if (!phone || lookupProblem === "not_found") {
    return (
      <BookingFrame>
        <PhonePrompt
          notFound={lookupProblem === "not_found"}
          onSubmit={(newPhone) => {
            setPhone(newPhone);
            setLookupProblem(null);
            setLookupVersion((version) => version + 1);
          }}
        />
      </BookingFrame>
    );
  }

  if (!ticket) {
    return (
      <BookingFrame>
        <div className={`${s.card} ${s.centred}`}>
          {lookupProblem === "failed" ? (
            <>
              <p>{t("common.error")}</p>
              <div className={s.centredActions}>
                <button className={s.primary} onClick={() => setLookupVersion((version) => version + 1)}>
                  {t("common.retry")}
                </button>
              </div>
            </>
          ) : (
            <p>{t("common.loading")}</p>
          )}
        </div>
      </BookingFrame>
    );
  }

  if (ticket.Status === "paid") {
    return (
      <BookingFrame>
        <TicketIssued ticket={ticket} justPaid={justPaid} />
      </BookingFrame>
    );
  }

  if (ticket.Status !== "reserved" || timeUp) {
    // The way back to the results comes from the ticket, so it also works in a tab that never
    // saw the search.
    const { OriginCityID, DestinationCityID, DepartureDate } = ticket.Trip;
    const resultsLink = path(`/services?from=${OriginCityID}&to=${DestinationCityID}&date=${DepartureDate}`);
    return (
      <BookingFrame>
        <TicketFailed reason={ticket.Status === "cancelled" ? "cancelled" : "expired"} resultsLink={resultsLink} />
      </BookingFrame>
    );
  }

  if (bank) {
    return (
      <BookingFrame>
        <FakeBank
          ticket={ticket}
          busy={busy}
          actionError={actionError}
          onPay={() => finish(payTicket)}
          onCancel={() => finish(cancelTicket)}
        />
        <div className={s.centredActions}>
          <Link className={s.plain} to={path(`/tickets/${code}`)}>
            {t("bank.backToReview")}
          </Link>
        </div>
      </BookingFrame>
    );
  }

  return (
    <BookingFrame>
      <div className={s.container}>
        <TripSummary
          originName={name(ticket.Trip.OriginPersianName, ticket.Trip.OriginEnglishName)}
          destinationName={name(ticket.Trip.DestinationPersianName, ticket.Trip.DestinationEnglishName)}
          originTerminal={name(ticket.Trip.OriginTerminalPersianName, ticket.Trip.OriginTerminalName)}
          destinationTerminal={name(ticket.Trip.DestinationTerminalPersianName, ticket.Trip.DestinationTerminalName)}
          company={name(ticket.Trip.CompanyPersianName, ticket.Trip.CompanyName)}
          busType={text(ticket.Trip.BusType, ticket.Trip.BusTypeEnglish)}
          date={ticket.Trip.DepartureDate}
          time={ticket.Trip.DepartureTime}
          price={ticket.PricePerSeat}
        />
        <div className={`${s.card} ${s.main}`}>
          <BookingSteps current={4} />
          <TicketReview
            ticket={ticket}
            secondsLeft={secondsLeft}
            busy={busy}
            actionError={actionError}
            onPay={() => navigate(path(`/tickets/${code}/payment`))}
            onCancel={() => finish(cancelTicket)}
          />
        </div>
      </div>
    </BookingFrame>
  );
}

export default TicketPage;
