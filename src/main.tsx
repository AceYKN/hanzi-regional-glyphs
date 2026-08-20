import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import HanGlyphApp from "../app/components/HanGlyphApp";
import "../app/globals.css";
import AboutPage from "./AboutPage";

function CharacterRoute() {
  const { char = "骨" } = useParams();
  return <HanGlyphApp key={char} initialCharacter={Array.from(decodeURIComponent(char))[0] || "骨"} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HanGlyphApp initialCharacter="骨" />} />
        <Route path="/char/:char" element={<CharacterRoute />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<HanGlyphApp initialCharacter="骨" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
