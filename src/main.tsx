import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loader } from "@monaco-editor/react";
import "./index.css";
import App from "./App";

// Monaco 自托管：编辑器资源与站点同源（/monaco/vs），不再走 jsdelivr CDN。
// 必须在任何 Editor 挂载（触发 loader.init()）之前配置。
loader.config({ paths: { vs: `${import.meta.env.BASE_URL}monaco/vs` } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
