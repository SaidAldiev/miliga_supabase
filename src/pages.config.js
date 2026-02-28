/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Groups from './pages/Groups';
import History from './pages/History';
import Home from './pages/Home';
import LiveMatch from './pages/LiveMatch';
import NewMatch from './pages/NewMatch';
import NewTournament from './pages/NewTournament';
import Players from './pages/Players';
import Profile from './pages/Profile';
import Standings from './pages/Standings';
import Statistics from './pages/Statistics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Groups": Groups,
    "History": History,
    "Home": Home,
    "LiveMatch": LiveMatch,
    "NewMatch": NewMatch,
    "NewTournament": NewTournament,
    "Players": Players,
    "Profile": Profile,
    "Standings": Standings,
    "Statistics": Statistics,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};