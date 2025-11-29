import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/homeStyles.css"

export const Register = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.toLowerCase().endsWith("@espol.edu.ec")) {
      alert("Error: Solo se permiten correos institucionales @espol.edu.ec.");
      return;
    }

    try {
      const response = await register(name, email, password);

      alert("¡Registro exitoso! Ahora serás redirigido para iniciar sesión.");
      navigate("/");
    } catch (error) {
      console.error("Error de registro:", error);
      alert("Error en el registro. Es probable que ese correo ya esté en uso.");
    }
  };

  return (
    <div className="login-container">
      <h1>Crear Cuenta</h1>

      <form id="register-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="login-input"
          placeholder="Nombre completo"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          className="login-input"
          placeholder="Correo electrónico"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="login-input"
          placeholder="Contraseña"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="login-btn">
          Registrarse
        </button>
      </form>

      <Link to="/" className="got-account">¿Ya tienes cuenta? Ingresa aquí</Link>
    </div>
  );
};
