import { NavLink } from 'react-router-dom'
// import { NavLink } from 'react-router-dom'
import './Header.css'
import NEWlogo from '../../../assets/logo2.png'

export default function Header() {
  return (
    <div className='Header'>
      <div className='logo'>
        <img src={NEWlogo} alt='Weather logo' />
      </div>

      <div className='nav'>
        <NavLink to='/Home'>Home</NavLink>
        <NavLink to='/feed'>Feed</NavLink>
      </div>

      <div className='user-info'>Welcome Message</div>
    </div>
  )
}
