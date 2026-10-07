import React from "react";
import { Route } from "react-router-dom";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";

export const authRoutes = (
  <>
    <Route path="/login" element={<Login />} />
    <Route path="/candidate-login" element={<Login />} />
    <Route path="/hr-login" element={<Login />} />
    <Route path="/create-account" element={<CreateAccount />} />
  </>
);

