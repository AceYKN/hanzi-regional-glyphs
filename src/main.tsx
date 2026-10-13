import React, { Component, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  useLocation,
  useParams,
  Route,
  Routes,
} from "react-router-dom";
import HanGlyphApp from "../app/components/HanGlyphApp";
import "../app/globals.css";
import AboutPage from "./AboutPage";
import { parseCharacters } from "./lib/query";
import { readPreference } from "./lib/preferences";

function CharacterRoute() {
  const { char } = useParams();
  const location = useLocation();
  if (location.pathname === "/about") return <AboutPage />;
  const text = new URLSearchParams(location.search).get("text");
  const parsed = parseCharacters(text ?? char ?? "骨");
  const invalid =
    (!parsed.chars.length ||
      parsed.error ||
      !char ||
      !parseCharacters(char).chars.length) &&
    location.pathname !== "/";
  return (
    <HanGlyphApp
      initialCharacters={
        parsed.chars.length && !invalid ? parsed.chars : ["骨"]
      }
      routeError={
        invalid ? parsed.error || "链接中的字符无效，请重新查询。" : ""
      }
    />
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="error-page">
        <h1>页面暂时无法打开</h1>
        <p>请刷新页面重试，也可以返回首页查询。</p>
        <button onClick={() => window.location.reload()}>刷新页面</button>
        <a href="/">返回首页</a>
      </main>
    ) : (
      this.props.children
    );
  }
}

document.documentElement.dataset.theme = readPreference("theme", "system", [
  "system",
  "light",
  "dark",
]);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CharacterRoute />} />
          <Route path="/char/:char" element={<CharacterRoute />} />
          <Route path="/about" element={<CharacterRoute />} />
          <Route path="*" element={<CharacterRoute />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      /* Online usage stays available when offline storage is disabled. */
    });
  });
}
