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
        <NavLink to='/about'>About</NavLink>
        <NavLink to='/templates'>Templates</NavLink>
      </div>

      <div className='search-bar'>search bar</div>
    </div>
  )
}
