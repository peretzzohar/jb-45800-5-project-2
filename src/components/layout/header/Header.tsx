import { NavLink } from 'react-router-dom'
import './Header.css'
import NEWlogo from '../../../assets/logo2.png'

type HeaderProps = {
  searchTerm: string
  onSearchChange: (value: string) => void
}

export default function Header({ searchTerm, onSearchChange }: HeaderProps) {
  return (
    <div className='Header'>
      <div className='logo'>
        <img src={NEWlogo} alt='Weather logo' />
      </div>

      <div className='nav'>
        <NavLink to='/Home'>Home</NavLink>
        <NavLink to='/feed'>Feed</NavLink>
        <NavLink to='/about'>About</NavLink>
        {/* <NavLink to='/templates'>Templates</NavLink> */}
      </div>

      <div className='search-bar'>
        <input
          type='text'
          className='search-input'
          placeholder='Search bar ...'
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label='Search currencies by name or symbol'
        />
      </div>
    </div>
  )
}
