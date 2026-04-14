import { NavLink } from 'react-router-dom'
// import { NavLink } from 'react-router-dom'
import './Header.css'
import NEWlogo from '../../../assets/logo2.png'

export default function Header() {
  return (
    <div className='Header'>
      <div className='logo'>
        {/* logo */}
      <img src={NEWlogo} />
      </div>

      <div>
       
        <NavLink to="/Home">Home</NavLink> | 
        <NavLink to="/feed">Feed</NavLink>
      </div>
      <div className='user-info'>
        Welcome Message 
      </div>
    </div>
  )
}
