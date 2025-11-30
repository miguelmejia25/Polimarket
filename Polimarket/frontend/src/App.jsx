import { Route, Routes } from "react-router-dom"
import { Home } from "./pages/home/Home"
import { Register } from "./pages/register/Register"
import { ChatRoom } from "./pages/chat/ChatRoom"
import { Recupera } from "./pages/recupera/Recupera";
import "./styles/general.css"

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />}/>
      <Route path="/Register" element={<Register />}/>
      <Route path="/Recupera" element={<Recupera />}/>
      <Route path="/Chatroom" element={<ChatRoom />}/>
    </Routes>
  )
}

export default App
