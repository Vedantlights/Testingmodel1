import React, { useState, useEffect } from "react";
import "../styles/PlainTimerPage.css";

const PlainTimerPage = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="timer-page">
      <div className="timer-content">
        <div className="badge">
          LIMITED TIME OFFER
        </div>

        <h1 className="title">
          <span className="title-purple">3 Months Free</span>
          <br />
          <span className="title-white">Premium Property Upload Access</span>
        </h1>

        <div className="timer-card">
          <div className="timer-header">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="clock-icon"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2>Your Trial Expires In</h2>
          </div>

          <div className="timer-display">
            {["days", "hours", "minutes", "seconds"].map((unit, idx) => (
              <React.Fragment key={unit}>
                <div className="time-block">
                  <div className="time-box">{String(timeLeft[unit]).padStart(2, "0")}</div>
                  <div className="time-label">{unit.toUpperCase()}</div>
                </div>
                {idx < 3 && <div className="separator">:</div>}
              </React.Fragment>
            ))}
          </div>
        </div>

       
      </div>
    </div>
  );
};

export default PlainTimerPage;
