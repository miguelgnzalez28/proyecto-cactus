import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Catalog from "./pages/Catalog";
import Admin from "./pages/Admin";
import { CartProvider } from "./context/CartContext";

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Catalog />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "9999px",
            border: "1px solid #F4DBD8",
          },
        }}
      />
    </CartProvider>
  );
}

export default App;
