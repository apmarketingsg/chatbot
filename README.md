# Ryan: support chatbot for the website

A guided support chat. Customers tap buttons for the most common problems,
and each choice leads to a set of fixes. If the fixes don't work, Ryan raises
a support ticket. Customers can also type, and Ryan matches keywords such as
"slow", "wifi" or "bill" to the right topic.

## Status

UX prototype only. No live integrations: account data, outages and
ServiceNow tickets are simulated in `chatbot/api.js`.

## Try it

Open `index.html` in a browser and click the chat button. The demo page lists
sample accounts for each scenario (normal, line down, suspended, outage).

## How a chat runs

1. Ryan asks for the customer's name and billing number.
2. Both must match before any account detail is shown (two attempts, then the
   customer is directed to the hotline).
3. Ryan checks the account first:
   - suspended for an unpaid bill: tells them and how to pay
   - known outage in their area: tells them, with the expected fix time
   - otherwise: shows the main menu
4. The customer picks a problem. Ryan walks through fixes one step at a time
   and asks "Did that fix it?" after each.
5. If nothing works, Ryan offers a ticket, asks for a short description and a
   contact number, and gives a ticket reference. The ticket includes the
   problem, the steps already tried and the full chat transcript.

## Files

| File | What it is | Who changes it |
| --- | --- | --- |
| `chatbot/flows.js` | Every message, menu, troubleshooting step and keyword | Support team |
| `chatbot/api.js` | Account lookup, outage check and ticket creation. **Sample data today** | Developer |
| `chatbot/chatbot.js` | The engine that runs the flows | Rarely |
| `chatbot/chatbot.css` | Look and colours (brand colour at the top) | Web team |

## Before going live

- **Fill in the placeholders** at the top of `flows.js`: hotline, support
  email, billing portal link and ticket response time.
- **Connect `api.js` to a backend.** Replace the three sample functions with
  calls to your own server. Tickets would be raised as ServiceNow incidents. The server, not the browser, should check the
  name and billing number against the billing system, check line status and
  outages, and send tickets to your helpdesk or support inbox.
- **Rate-limit the account check** on the server so nobody can guess billing
  numbers.
- **Have the support team review the troubleshooting steps** to match your
  actual ONT and router models.

## Adding to the website

Copy the CSS link and the three script tags from `index.html` into your pages.
