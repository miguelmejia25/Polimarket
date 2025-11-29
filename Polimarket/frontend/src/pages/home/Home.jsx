import { useState } from "react";
import "../../styles/homeStyles.css"
import { Link } from "react-router-dom";

export const Home = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await login(email, password); 
      window.location.href = "/products";
    } catch (error) {
      console.error("Error de login:", error);
      alert("Error: Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div>
      <div className="login-container">
        <h1>POLIMARKET</h1>

        <form id="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            id="email"
            className="login-input"
            placeholder="usuario@espol.edu.ec"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            id="password"
            className="login-input"
            placeholder="Contraseña"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="login-btn">
            Ingresar
          </button>
        </form>
      </div>

      <div className="login-container">
        <a href="/recupera">Olvide mi contraseña</a>
        <br />
        ¿No tienes una cuenta? <Link to="/register"> Regístrate aquí </Link>
      </div>
    </div>
  );
};
