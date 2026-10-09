/*
 * Connection to your back-office systems.
 *
 * Everything here is SAMPLE DATA so the chatbot can be demonstrated.
 * Before going live, replace each function with a call to your own backend
 * (for example `fetch('/api/chatbot/account', ...)`). Do not connect the
 * browser straight to the billing or network systems: the backend should
 * check the name and billing number and return only what Ryan needs.
 *
 * Each function returns a Promise, so swapping in real calls needs no
 * changes to chatbot.js.
 */
(function () {
  // Sample customers for testing.
  const SAMPLE_ACCOUNTS = {
    '80880888': { name: 'Alan Tan', plan: '1 Gbps Fibre', status: 'active', lineStatus: 'up', area: 'Tampines', phone: '91234567' },
    '80880001': { name: 'Mei Lin', plan: '500 Mbps Fibre', status: 'active', lineStatus: 'down', area: 'Jurong West', phone: '92345678' },
    '80880002': { name: 'Ravi Kumar', plan: '1 Gbps Fibre', status: 'suspended', lineStatus: 'up', area: 'Woodlands', phone: '93456789' },
    '80880003': { name: 'Sarah Lim', plan: '2 Gbps Fibre', status: 'active', lineStatus: 'down', area: 'Bishan', phone: '94567890' },
  };

  // Sample known outages, by area.
  const SAMPLE_OUTAGES = {
    Bishan: { message: 'A fibre cable in the area was damaged during roadworks and our engineers are repairing it.', eta: '[sample] 6pm today' },
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function nameMatches(typed, onFile) {
    const t = typed.trim().toLowerCase().replace(/\s+/g, ' ');
    const full = onFile.toLowerCase();
    return t === full || t === full.split(' ')[0];
  }

  window.RYAN_API = {
    /** Returns the account if the name and billing number match, otherwise null. */
    async lookupAccount(billingNumber, name) {
      await delay(900);
      const acc = SAMPLE_ACCOUNTS[billingNumber];
      if (!acc || !nameMatches(name, acc.name)) return null;
      return { billingNumber, ...acc };
    },

    /** Returns { suspended, lineStatus, outage } for a verified account. */
    async getServiceStatus(account) {
      await delay(600);
      return {
        suspended: account.status === 'suspended',
        lineStatus: account.lineStatus,
        outage: SAMPLE_OUTAGES[account.area] || null,
      };
    },

    /** Sends the ticket to the support team and returns its reference. */
    async createTicket(ticket) {
      await delay(800);
      const id = 'TKT-' + String(Date.now()).slice(-6);
      // Demo only: keep tickets in this browser so they can be inspected.
      try {
        const saved = JSON.parse(localStorage.getItem('ryan_tickets') || '[]');
        saved.push({ id, ...ticket });
        localStorage.setItem('ryan_tickets', JSON.stringify(saved));
      } catch (e) { /* storage unavailable, ignore in demo */ }
      console.log('[Ryan] Ticket created', id, ticket);
      return { id };
    },
  };
})();
