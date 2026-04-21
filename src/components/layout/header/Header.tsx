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
      <div className='brand-block'>
        <div className='logo'>
          <img src={NEWlogo} alt='Crypto dashboard logo' />
        </div>
      </div>

      <nav className='nav' aria-label='Main navigation'>
        <NavLink to='/Home'>Home</NavLink>
        <NavLink to='/feed'>Live Data</NavLink>
        <NavLink to='/recommendation'> A.I Recommendation</NavLink>
        <NavLink to='/about'>About</NavLink>
      </nav>

      <div className='header-tools'>

        <div className='search-bar'>
          <span className='search-icon' aria-hidden='true' />
          <input
            type='text'
            className='search-input'
            placeholder='Search coins by name or symbol...'
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label='Search currencies by name or symbol'
          />
        </div>
      </div>
    </div>
  )
}
