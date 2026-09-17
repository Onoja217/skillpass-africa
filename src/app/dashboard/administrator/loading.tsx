export default function AdministratorLoading() {
  return (
    <div style={{ display: "grid", gap: 20 }} aria-busy="true" aria-label="Loading administrator dashboard">
      <section className="card" style={{ minHeight: 150, padding: 24 }} />
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {[1, 2, 3, 4].map((item) => <div className="card" key={item} style={{ minHeight: 130, padding: 22 }} />)}
      </section>
      <section className="card" style={{ minHeight: 260, padding: 24 }} />
    </div>
  );
}
