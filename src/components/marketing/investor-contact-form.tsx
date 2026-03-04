"use client";

/**
 * InvestorContactForm — Institutional-grade contact form
 * for the investor one-sheet page.
 *
 * TODO: Wire to API endpoint for lead capture (e.g., /api/investor-inquiry)
 */
export function InvestorContactForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    // TODO: POST to /api/investor-inquiry
    console.log("Investor inquiry submitted:", data);
    alert("Thank you for your inquiry. Our team will be in touch within 24 hours.");
    e.currentTarget.reset();
  };

  return (
    <form className="inv-form-grid" onSubmit={handleSubmit}>
      <div className="inv-form-field">
        <label htmlFor="inv-name">Full Name</label>
        <input type="text" id="inv-name" name="name" placeholder="James Atherton" required />
      </div>
      <div className="inv-form-field">
        <label htmlFor="inv-email">Company Email</label>
        <input type="email" id="inv-email" name="email" placeholder="james@firma.capital" required />
      </div>
      <div className="inv-form-field">
        <label htmlFor="inv-firm">Firm</label>
        <input type="text" id="inv-firm" name="firm" placeholder="Firma Capital Partners" />
      </div>
      <div className="inv-form-field">
        <label htmlFor="inv-type">Inquiry Type</label>
        <select id="inv-type" name="inquiry_type" defaultValue="">
          <option value="" disabled>Select…</option>
          <option value="series-a">Series A Investment</option>
          <option value="lp">Liquidity Partnership</option>
          <option value="pilot">Institutional Pilot</option>
          <option value="technical">Technical Due Diligence</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="inv-form-field full-width">
        <label htmlFor="inv-message">Message</label>
        <textarea id="inv-message" name="message" placeholder="Tell us about your interest in the Goldwire Protocol…" />
      </div>
      <div className="inv-form-submit">
        <button type="submit" className="inv-btn-primary">
          Submit Inquiry →
        </button>
      </div>
    </form>
  );
}
