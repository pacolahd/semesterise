// app/not-found.js
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}
