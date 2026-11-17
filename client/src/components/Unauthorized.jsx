export default function Unauthorized({ onReturn }) {
  return (
    <section className="page-content">
      <article className="panel unauthorized-card">
        <div className="stat-icon orange">!</div>
        <p className="eyebrow">ACCESS RESTRICTED</p>
        <h1>Unauthorized access</h1>
        <p className="muted">Your account does not have permission to view this page.</p>
        <button className="primary-button" onClick={onReturn}>Return to dashboard <span>→</span></button>
      </article>
    </section>
  );
}
