import { Route, Routes } from "react-router-dom"
import { Home } from "./pages/home/Home"
import { Register } from "./pages/register/Register"
import { ChatRoom } from "./pages/chat/ChatRoom"
import "./styles/general.css"

function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />}/>
      <Route path="/register" element={<Register />}/>
      <Route path="/chat-room" element={<ChatRoom />}/>
    </Routes>
  )
}

export default App
