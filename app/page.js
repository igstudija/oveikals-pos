const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/pos';

export default function Home() {
  return (
    <div className="nf">
      <div className="nf__box">
        <div className="nf__accent" />
        <h1 className="nf__title">Oveikals</h1>
        <p className="nf__sub">POS slaidrāde</p>
        <div className="nf__actions">
          <a className="btn" href={`${BASE}/`}>
            Atvērt slaidrādi
          </a>
          <a className="btn btn--ghost" href={`${BASE}/admin`}>
            Admin
          </a>
        </div>
      </div>
    </div>
  );
}
