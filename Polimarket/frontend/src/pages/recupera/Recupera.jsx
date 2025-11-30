import { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/recuperaStyles.css"; // crea este archivo para estilos propios

export const Recupera = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación de correo institucional
    if (!email.toLowerCase().endsWith("@espol.edu.ec")) {
      alert("Solo se permiten correos institucionales @espol.edu.ec.");
      return;
    }

    try {
      // Aquí iría la llamada a tu backend o función de recuperación
      // await recoverPassword(email);

      alert(
        "Si tu correo está registrado, recibirás un enlace para recuperar tu contraseña."
      );

      setEmail(""); // limpiar campo
    } catch (error) {
      console.error("Error en la recuperación:", error);
      alert("Ocurrió un error, intenta nuevamente.");
    }
  };

  return (
    <div className="login-container">
      <h1>Recuperar Contraseña</h1>

      <form id="recupera-form" onSubmit={handleSubmit}>
        <input
          type="email"
          className="login-input"
          placeholder="Correo institucional"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="login-btn">
          Enviar enlace
        </button>
      </form>

      <div style={{ marginTop: "15px" }}>
        <Link to="/" className="got-account">
          Volver
        </Link>
      </div>
    </div>
  );
};
