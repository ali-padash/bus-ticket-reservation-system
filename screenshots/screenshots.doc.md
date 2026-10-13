# screenshots — pictures for the README

*Written 2026-10-13. Updated the same day: three Persian pictures added for the Persian README.*

Nine pictures of the running website, shown in `README.md` and `README.fa.md`. They are not used
by the website.

| File | Shows | Used in |
| --- | --- | --- |
| `results-en.png` | Search results, Tehran to Esfahan, with one trip opened: seat map and refund terms. | both |
| `seats-en.png` | The seat choice step with two seats chosen. | English |
| `ticket-en.png` | The issued ticket with its 12-digit code. | English |
| `results-fa.png` | The results page in Persian, right-to-left, with the Persian calendar and digits. | English |
| `phone-en.png` | Four screens at phone width (390 pixels): home, results, seat choice, ticket. | English |
| `trip-fa.png` | Persian results with one trip opened. | Persian |
| `seats-fa.png` | The seat choice step in Persian. | Persian |
| `ticket-fa.png` | The issued ticket in Persian. | Persian |
| `phone-fa.png` | The four phone screens in Persian. | Persian |

## How they were made

A script drove a browser through a real purchase on the local site (API, database and website
all running, demo data from the seed) and saved the window: 1280 by 800 pixels for the desktop
pictures, 390 by 780 for the phone screens, which were then placed side by side.

The passenger in them is made up, and so is the mobile number.

## When to retake them

When a page they show changes its look. The demo data is random, so trips, prices and taken
seats will differ in a new set; that does not matter.
