/*
 * Ryan's conversation flows.
 *
 * This is the file your support team edits. Every screen of the chat is a
 * "node". Each node has a type:
 *
 *   say    - Ryan says something. With `options`, the customer picks a button.
 *            Without options, Ryan moves straight on to `next`.
 *   ask    - Ryan asks a question and the customer types the answer.
 *            The answer is saved under `field`.
 *   steps  - A troubleshooting checklist. Ryan shows one step at a time and
 *            asks "Did that fix it?". Yes goes to `onFixed`, and running out
 *            of steps goes to `onNotFixed` (normally the ticket offer).
 *   action - Ryan does something behind the scenes (check the account,
 *            raise a ticket). Handled in chatbot.js.
 *
 * Text can include {placeholders} such as {firstName}, {plan} or {area}.
 * Setting `issue` on a node records the problem category on the ticket.
 */
window.RYAN_FLOWS = {
  botName: 'Ryan',
  company: 'Axclusive',
  hotline: '[support hotline]',
  supportEmail: '[support email]',
  billingPortal: '[customer portal link]',
  ticketResponseTime: '[e.g. 1 working day]',

  start: 'ask_name',

  // Used when a verified customer types instead of tapping a button.
  // The node with the most matching phrases wins.
  keywords: [
    { node: 'no_internet', words: ['no internet', 'internet down', 'internet is down', 'cannot connect', "can't connect", 'cant connect', 'not working', 'offline', 'no connection', 'down', 'cannot access', "can't access", 'cant access'] },
    { node: 'slow', words: ['slow', 'lag', 'buffer', 'speed', 'loading'] },
    { node: 'wifi', words: ['wifi', 'wi-fi', 'wireless', 'signal', 'password', 'weak'] },
    { node: 'drops', words: ['drop', 'disconnect', 'cutting', 'unstable', 'intermittent', 'on and off', 'keeps going'] },
    { node: 'billing', words: ['bill', 'billing', 'payment', 'pay', 'invoice', 'charge', 'suspend'] },
  ],

  nodes: {
    // ---- Identify the customer -------------------------------------------
    ask_name: {
      type: 'ask',
      text: "Hi, I'm Ryan from {company}. I'm here to help.\nMay I have your name, please?",
      field: 'name',
      placeholder: 'Your name',
      validate: 'name',
      invalid: 'Sorry, could you type your name again?',
      next: 'ask_billing',
    },
    ask_billing: {
      type: 'ask',
      text: 'Thank you, {name}. What is your account billing number? You can find it at the top of your monthly bill.',
      field: 'billingNumber',
      placeholder: 'Billing number',
      validate: 'billing',
      invalid: 'That doesn\'t look like a billing number. It should be digits only, for example 80880888.',
      next: 'verify',
    },
    verify: {
      type: 'action',
      text: 'Thank you. Please wait a moment while I confirm your account.',
      run: 'verifyAccount',
    },
    verify_failed: {
      type: 'say',
      text: "Sorry, I couldn't match that name and billing number. Let's try once more.",
      next: 'ask_name_retry',
    },
    ask_name_retry: {
      type: 'ask',
      text: 'Please type the name on the account.',
      field: 'name',
      placeholder: 'Name on the account',
      validate: 'name',
      invalid: 'Sorry, could you type your name again?',
      next: 'ask_billing',
    },
    verify_failed_final: {
      type: 'say',
      text: "I'm still unable to match those details, so for your security I can't go further here.\nPlease call us on {hotline} or email {supportEmail}, and our team will help you.",
      options: [{ label: 'Start again', next: 'restart' }],
    },
    check_status: { type: 'action', run: 'checkAccountStatus' },

    // ---- Account level problems found before asking anything -------------
    account_suspended: {
      type: 'say',
      issue: 'Billing: service suspended',
      text: 'Thank you, {firstName}. I can see your service is currently suspended because of an outstanding bill, which is why your internet is not working.\nYou can pay at {billingPortal}. Service is usually restored shortly after payment.',
      options: [
        { label: 'Ask the billing team to contact me', next: 'ticket_offer' },
        { label: 'Okay, thanks', next: 'anything_else' },
      ],
    },
    outage: {
      type: 'say',
      issue: 'Known outage',
      text: 'Thank you, {firstName}. There is a known service disruption affecting your area ({area}).\n{outageMessage}\nEstimated restoration: {outageEta}.\nYou don\'t need to do anything. Your service will come back on its own once it is fixed.',
      options: [
        { label: 'Okay, thanks', next: 'anything_else' },
        { label: 'My problem is something else', next: 'menu_again' },
      ],
    },

    // ---- Main menu ---------------------------------------------------------
    main_menu: {
      type: 'say',
      text: 'Thank you, {firstName}. Your account is active on our {plan} plan.\nWhat can I help you with today?',
      options: 'MAIN_MENU',
    },
    menu_again: {
      type: 'say',
      text: 'What can I help you with?',
      options: 'MAIN_MENU',
    },

    // ---- No internet -------------------------------------------------------
    no_internet: { type: 'action', issue: 'No internet', run: 'routeNoInternet' },
    no_internet_line_down: {
      type: 'steps',
      text: "I've checked from our side and I can't see a signal from your fibre modem (the ONT, the small box where the fibre cable comes in). This is usually a power or cable issue at home. Let's check a few things.",
      steps: [
        { title: 'Check the ONT has power', detail: 'The power light on the ONT should be on. If it is off, check the plug, the power switch at the wall, and the power adapter.' },
        { title: 'Check the fibre cable', detail: 'Make sure the thin fibre cable going into the ONT is plugged in firmly and is not bent sharply or pinched. Never look into the end of a fibre cable.' },
        { title: 'Restart the ONT', detail: 'Switch the ONT off at the wall, wait 30 seconds, then switch it on again. Give it about 3 minutes to start up.' },
      ],
      onFixed: 'resolved',
      onNotFixed: 'ticket_offer',
    },
    no_internet_line_up: {
      type: 'steps',
      text: 'Good news: your line is working normally from our side, so the problem is most likely with the equipment at home. Please try these steps one at a time.',
      steps: [
        { title: 'Restart your router', detail: 'Switch the router off at the power, wait 30 seconds, then switch it back on. Wait 2 to 3 minutes for the lights to settle, then try again.' },
        { title: 'Restart the ONT and router in order', detail: 'Switch both off. Turn on the ONT first and wait 2 minutes. Then turn on the router and wait another 2 to 3 minutes.' },
        { title: 'Check the cable between ONT and router', detail: 'The network cable should go from the ONT\'s LAN port into the router\'s WAN or Internet port. Unplug both ends and push them back in firmly until they click.' },
        { title: 'Try another device', detail: 'Check whether a different phone or laptop can get online. If one device works and another does not, the problem is with that device rather than your connection.' },
      ],
      onFixed: 'resolved',
      onNotFixed: 'ticket_offer',
    },

    // ---- Slow internet -----------------------------------------------------
    slow: {
      type: 'steps',
      issue: 'Slow internet',
      text: "Sorry to hear it's slow. Your line looks normal from our side, so let's try a few things.",
      steps: [
        { title: 'Restart your router', detail: 'Switch the router off at the power, wait 30 seconds, then switch it on again. Wait 2 to 3 minutes before testing.' },
        { title: 'Check for heavy use at home', detail: 'Large downloads, game updates, cloud backups or several 4K streams at once can slow everyone else down. Pause them and try again.' },
        { title: 'Move closer to the router or use a cable', detail: 'Wi-Fi gets slower through walls and over distance. Try next to the router, or plug a laptop in with a network cable to compare.' },
        { title: 'Check the device', detail: 'Older phones and laptops may not support faster Wi-Fi. Restart the device and check that it is up to date.' },
      ],
      onFixed: 'resolved',
      onNotFixed: 'ticket_offer',
    },

    // ---- Wi-Fi -------------------------------------------------------------
    wifi: {
      type: 'say',
      issue: 'Wi-Fi',
      text: 'Which of these best describes your Wi-Fi problem?',
      options: [
        { label: "I can't connect to the Wi-Fi", next: 'wifi_cant_connect' },
        { label: 'Signal is weak in some rooms', next: 'wifi_weak' },
        { label: 'I forgot my Wi-Fi password', next: 'wifi_password' },
      ],
    },
    wifi_cant_connect: {
      type: 'steps',
      issue: "Wi-Fi: can't connect",
      text: "Let's get your device connected.",
      steps: [
        { title: 'Forget the network and rejoin', detail: 'In your device\'s Wi-Fi settings, choose your network, tap "Forget", then connect again and re-enter the password.' },
        { title: 'Check the password', detail: 'Passwords are case-sensitive. If you never changed it, the default password is on the sticker on the back or bottom of the router.' },
        { title: 'Restart the device and the router', detail: 'Restart your phone or laptop. Then switch the router off for 30 seconds and back on, and wait 2 to 3 minutes.' },
      ],
      onFixed: 'resolved',
      onNotFixed: 'ticket_offer',
    },
    wifi_weak: {
      type: 'steps',
      issue: 'Wi-Fi: weak signal',
      text: 'Wi-Fi coverage depends a lot on where the router sits. Let\'s try these.',
      steps: [
        { title: 'Move the router', detail: 'Place it in an open, central spot, raised off the floor and not inside a cabinet. Keep it away from microwaves, fish tanks and thick walls.' },
        { title: 'Restart the router', detail: 'Switch it off for 30 seconds and back on. This lets it pick a less crowded Wi-Fi channel.' },
        { title: 'Try the 2.4 GHz network in far rooms', detail: 'If your router shows two networks (2.4 GHz and 5 GHz), the 2.4 GHz one reaches further, though it is slower.' },
      ],
      onFixed: 'resolved',
      onNotFixed: 'wifi_weak_next',
    },
    wifi_weak_next: {
      type: 'say',
      text: 'For larger homes, a mesh Wi-Fi system usually solves weak spots. Would you like our team to contact you about it?',
      options: [
        { label: 'Yes, please contact me', next: 'ticket_offer' },
        { label: 'No, thanks', next: 'anything_else' },
      ],
    },
    wifi_password: {
      type: 'say',
      issue: 'Wi-Fi: forgot password',
      text: 'If you never changed it, your Wi-Fi name and password are printed on the sticker on the back or bottom of your router.\nIf you changed it and can\'t remember, the router can be reset to factory settings by holding the reset button for 10 seconds. Please note this also removes any other settings you made.',
      options: [
        { label: 'Found it, thanks', next: 'resolved' },
        { label: 'I still need help', next: 'ticket_offer' },
      ],
    },

    // ---- Connection drops --------------------------------------------------
    drops: {
      type: 'steps',
      issue: 'Connection keeps dropping',
      text: 'A connection that keeps dropping is often caused by a loose cable or an overheating router. Let\'s check.',
      steps: [
        { title: 'Check all cables', detail: 'Push in the power cables and the network cable between the ONT and router until they click. Check the fibre cable is not bent sharply.' },
        { title: 'Give the router some air', detail: 'Routers can drop out when they overheat. Make sure it is not in a closed cabinet or stacked on other equipment.' },
        { title: 'Restart the ONT and router', detail: 'Switch both off. Turn on the ONT first and wait 2 minutes, then the router.' },
      ],
      onFixed: 'resolved',
      onNotFixed: 'ticket_offer',
    },

    // ---- Billing and other -------------------------------------------------
    billing: {
      type: 'say',
      issue: 'Billing or account',
      text: 'You can view and pay your bills at {billingPortal}.\nFor anything else about your bill or account, I can ask our billing team to contact you.',
      options: [
        { label: 'Ask the billing team to contact me', next: 'ticket_describe' },
        { label: "That's all, thanks", next: 'anything_else' },
      ],
    },
    other: {
      type: 'say',
      issue: 'Other',
      text: "No problem. I'll pass this to our support team.",
      next: 'ticket_describe',
    },

    // ---- Support ticket ----------------------------------------------------
    ticket_offer: {
      type: 'say',
      text: "Sorry I couldn't fix this here. I can raise a ticket for our support team, and someone will get back to you. Shall I go ahead?",
      options: [
        { label: 'Yes, raise a ticket', next: 'ticket_describe' },
        { label: 'No, thanks', next: 'anything_else' },
      ],
    },
    ticket_describe: {
      type: 'ask',
      text: 'Please describe the problem briefly, including when it started. This helps our team prepare before they call you.',
      field: 'description',
      placeholder: 'Describe the problem',
      validate: 'text',
      invalid: 'Please type a short description.',
      next: 'ticket_contact',
    },
    ticket_contact: {
      type: 'say',
      text: 'Can we contact you on the number we have on file, ending in {phoneLast4}?',
      options: [
        { label: 'Yes, use that number', next: 'ticket_create' },
        { label: 'Use a different number', next: 'ticket_phone' },
      ],
    },
    ticket_phone: {
      type: 'ask',
      text: 'What number should we call?',
      field: 'contactPhone',
      placeholder: 'Phone number',
      validate: 'phone',
      invalid: 'Please enter a valid phone number, digits only.',
      next: 'ticket_create',
    },
    ticket_create: {
      type: 'action',
      text: 'Raising your ticket now.',
      run: 'createTicket',
    },
    ticket_done: {
      type: 'say',
      text: 'Done. Your ticket number is {ticketId}.\nOur support team will contact you on {contactDisplay} within {ticketResponseTime}.',
      next: 'anything_else',
    },
    ticket_error: {
      type: 'say',
      text: "Sorry, I couldn't raise the ticket just now. Please call us on {hotline} or email {supportEmail}.",
      next: 'anything_else',
    },

    // ---- Wrap up -----------------------------------------------------------
    resolved: {
      type: 'say',
      text: "Great, I'm glad that's sorted.",
      next: 'anything_else',
    },
    anything_else: {
      type: 'say',
      text: 'Is there anything else I can help you with?',
      options: [
        { label: 'Yes', next: 'menu_again' },
        { label: 'No', next: 'goodbye' },
      ],
    },
    goodbye: {
      type: 'say',
      text: 'Thank you, {firstName}. Have a good day.',
      options: [{ label: 'Start a new chat', next: 'restart' }],
    },
    restart: { type: 'action', run: 'restart' },
  },

  // Shared by main_menu and menu_again.
  menus: {
    MAIN_MENU: [
      { label: 'No internet at all', next: 'no_internet' },
      { label: 'Internet is slow', next: 'slow' },
      { label: 'Wi-Fi problems', next: 'wifi' },
      { label: 'Connection keeps dropping', next: 'drops' },
      { label: 'Billing or account question', next: 'billing' },
      { label: 'Something else', next: 'other' },
    ],
  },
};
