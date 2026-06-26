import React from "react";
import AppUI from "./ui/App";
import { ApiProvider } from "./ui/contexts/ApiContext";
import "./index.css";

export default function App() {
  return (
    <ApiProvider>
      <AppUI />
    </ApiProvider>
  );
}
