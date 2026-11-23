import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

const NotFound = () => (
  <AuthLayout>
    <p className="m-0 font-display text-6xl font-semibold text-brand-text">404</p>
    <h1 className="m-0 mt-2 font-display text-2xl font-semibold">This page doesn't exist</h1>
    <p className="m-0 mt-2 text-ink-muted">The link may be old or mistyped.</p>
    <Link to="/" className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-white no-underline">Go home</Link>
  </AuthLayout>
);

export default NotFound;
