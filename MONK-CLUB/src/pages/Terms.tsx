import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { TERMS } from "../lib/terms";

const Terms = () => (
  <AuthLayout wide>
    <h1 className="m-0 font-display text-3xl font-semibold">Terms and conditions</h1>
    <p className="m-0 mt-2 text-ink-muted">Amatugunda Monk Club (Monk Loyalty Club), Prof Bioresearch.</p>
    <ol className="mt-6 space-y-3 pl-5 text-[15px] leading-relaxed text-ink-soft">
      {TERMS.map((t) => <li key={t}>{t}</li>)}
    </ol>
    <Link to="/register" className="mt-8 font-semibold text-brand-text">Back to the application</Link>
  </AuthLayout>
);

export default Terms;
