// import Home from '../Home/Home'
import Footer from '../footer/Footer'
import Header from '../header/Header'
import Main from '../main/Main-Nav'
import './Layout.css'


export default function Layout() {

    return (
        <div className='Layout'>
            <header>
                <Header />
            </header>
           
            <main>
                <Main 

                />
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    )
}