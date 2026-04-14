import { Navigate, Route, Routes } from 'react-router-dom'
import NotFound from '../not-found/NotFound'
import Feed from '../feed/Feed'
import Home from '../home/Home'
import Templates from '../templates/Templates'


export default function Main() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" />} />
      <Route path="/Home" element={<Home />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
