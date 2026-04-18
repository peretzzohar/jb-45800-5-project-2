import { Navigate, Route, Routes } from 'react-router-dom'
import NotFound from '../not-found/NotFound'
import Feed from '../feed/Feed'
import Home from '../home/Home'
// import Templates from '../templates/Templates'
import About from '../about/About'

type MainProps = {
  searchTerm: string
}

export default function Main({ searchTerm }: MainProps) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" />} />
      <Route path="/Home" element={<Home searchTerm={searchTerm} />} />
      <Route path="/feed" element={<Feed />} />
      <Route path="/about" element={<About />} />
      {/* <Route path="/templates" element={<Templates />} /> */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
