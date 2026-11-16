import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RotaProtegida } from './components/auth/RotaProtegida';
import { Login } from './components/auth/Login';
import { Cadastro } from './components/auth/Cadastro';
import { Layout } from './components/ui/Layout';
import { Dashboard } from './components/lancamentos/Dashboard';
import { Lancamentos } from './components/lancamentos/Lancamentos';
import { Categorias } from './components/cadastros/Categorias';
import { FontesDestinos } from './components/cadastros/FontesDestinos';
import { Relatorios } from './components/relatorios/Relatorios';
import { Faturas } from './components/relatorios/Faturas';
import { SaudeFinanceira } from './components/relatorios/SaudeFinanceira';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/fontes-destinos" element={<FontesDestinos />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/faturas" element={<Faturas />} />
            <Route path="/saude-financeira" element={<SaudeFinanceira />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
